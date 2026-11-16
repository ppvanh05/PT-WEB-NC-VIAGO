import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { paginate } from '../../../../shared/http/pagination';
import { money } from '../../../../shared/rental-pricing';
import { isLateTrip, round1 } from '../../../../shared/review-scoring';
import { vnDayRange } from '../../../../shared/vn-time';
import { RouteReportQueryDto } from '../reports.dto';
import { isSoldTicket, percent, sumBy } from '../report-common';

/** Chuyến được coi là quá tải khi lấp đầy từ 95% trở lên. */
const OVERLOAD_RATE = 95;

@Injectable()
export class RouteReportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Hiệu quả theo tuyến: doanh thu, vé bán, lấp đầy, đúng giờ/trễ/hủy, đánh giá. */
  async report(q: RouteReportQueryDto) {
    const range = vnDayRange(q.from, q.to);
    const routes = await this.prisma.tuyen_xe.findMany({
      where: {
        ...(q.status ? { trangthai: q.status } : {}),
        ...(q.search ? { OR: [{ matuyenduong: { contains: q.search, mode: 'insensitive' } }, { tentuyen: { contains: q.search, mode: 'insensitive' } }] } : {}),
      },
      include: {
        lich_trinh: {
          where: range ? { thoigiankhoihanh: range } : {},
          select: {
            trangthai: true,
            thoigiandendukien: true,
            thoigiandenthucte: true,
            _count: { select: { ghe_chuyen: true } },
            don_hang: {
              select: {
                trangthaidonhang: true,
                ve_xe: { select: { trangthaive: true, giave: true, danh_gia: { select: { diemtongquat: true } } } },
              },
            },
          },
        },
      },
      orderBy: { matuyenduong: 'asc' },
    });

    const rows = routes.map((r) => {
      const trips = r.lich_trinh;
      const operated = trips.filter((t) => t.trangthai !== 'DaHuy');
      const finished = trips.filter((t) => t.trangthai === 'HoanThanh' && t.thoigiandenthucte);
      const late = finished.filter((t) => isLateTrip(t.thoigiandendukien, t.thoigiandenthucte)).length;
      let sold = 0;
      let revenue = 0;
      let seats = 0;
      let overloaded = 0;
      const ratings: number[] = [];
      for (const t of operated) {
        const tickets = t.don_hang.flatMap((o) => o.ve_xe.filter((v) => isSoldTicket(v, o.trangthaidonhang)));
        sold += tickets.length;
        revenue += sumBy(tickets, (v) => money(v.giave));
        seats += t._count.ghe_chuyen;
        if (percent(tickets.length, t._count.ghe_chuyen) >= OVERLOAD_RATE) overloaded++;
        for (const o of t.don_hang) for (const v of o.ve_xe) if (v.danh_gia) ratings.push(v.danh_gia.diemtongquat);
      }
      return {
        routeId: r.matuyenduong,
        name: r.tentuyen,
        from: r.diemdi,
        to: r.diemden,
        distanceKm: money(r.khoangcach),
        durationMinutes: r.thoigiandichuyenphut,
        status: r.trangthai,
        revenue: {
          total: revenue,
          averagePerTrip: operated.length ? Math.round(revenue / operated.length) : 0,
          ticketsSold: sold,
          averageTicketPrice: sold ? Math.round(revenue / sold) : 0,
        },
        fill: {
          trips: operated.length,
          ticketsSold: sold,
          emptySeats: Math.max(0, seats - sold),
          averageFillRate: percent(sold, seats),
          overloadedTrips: overloaded,
        },
        performance: {
          onTimeTrips: finished.length - late,
          lateTrips: late,
          cancelledTrips: trips.length - operated.length,
          complaints: ratings.filter((s) => s <= 2).length,
          averageRating: ratings.length ? round1(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null,
          ratingCount: ratings.length,
        },
      };
    });

    const sortValue = (r: (typeof rows)[number]) =>
      q.sort === 'tickets' ? r.revenue.ticketsSold : q.sort === 'fill_rate' ? r.fill.averageFillRate : q.sort === 'rating' ? (r.performance.averageRating ?? 0) : r.revenue.total;
    rows.sort((a, b) => sortValue(b) - sortValue(a));
    const totalRevenue = sumBy(rows, (r) => r.revenue.total);
    return {
      summary: {
        routes: rows.length,
        activeRoutes: rows.filter((r) => r.status === 'HoatDong').length,
        totalRevenue,
        ticketsSold: sumBy(rows, (r) => r.revenue.ticketsSold),
        trips: sumBy(rows, (r) => r.fill.trips),
        averageFillRate: percent(sumBy(rows, (r) => r.fill.ticketsSold), sumBy(rows, (r) => r.fill.ticketsSold + r.fill.emptySeats)),
        lateTrips: sumBy(rows, (r) => r.performance.lateTrips),
        cancelledTrips: sumBy(rows, (r) => r.performance.cancelledTrips),
        topRoute: rows[0] ? { routeId: rows[0].routeId, name: rows[0].name } : null,
      },
      revenueShare: rows.map((r) => ({ routeId: r.routeId, name: r.name, revenue: r.revenue.total, share: percent(r.revenue.total, totalRevenue) })),
      ...paginate(rows, q.page, q.pageSize),
    };
  }
}
