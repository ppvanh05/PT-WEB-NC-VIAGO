import { Injectable } from '@nestjs/common';
import { Prisma, trang_thai_lich_trinh_enum } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { paginate } from '../../../../shared/http/pagination';
import { money } from '../../../../shared/rental-pricing';
import { VEHICLE_TYPE_LABELS } from '../../../../shared/review-scoring';
import { vnDate, vnDayRange, vnTime } from '../../../../shared/vn-time';
import { RevenueReportQueryDto } from '../reports.dto';
import { groupTotals, isSoldTicket, percent, sumBy } from '../report-common';

/** Trạng thái lịch trình theo cách hiển thị của trang báo cáo. */
const TRIP_STATE: Record<trang_thai_lich_trinh_enum, 'waiting' | 'running' | 'completed' | 'locked' | 'cancelled'> = {
  ChuaMoBan: 'waiting',
  DangMoBan: 'waiting',
  DaDongBan: 'locked',
  DangChay: 'running',
  HoanThanh: 'completed',
  DaHuy: 'cancelled',
};

@Injectable()
export class DetailedReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Báo cáo chi tiết theo chuyến: doanh thu vé, số khách, lấp đầy, chi phí vận hành
   * (bảng chi_phi_chuyen) và lợi nhuận. Kèm doanh thu thuê xe hợp đồng trong kỳ.
   */
  async report(q: RevenueReportQueryDto) {
    const range = vnDayRange(q.from, q.to);
    const where: Prisma.lich_trinhWhereInput = {
      ...(range ? { thoigiankhoihanh: range } : {}),
      ...(q.routeId ? { matuyenduong: q.routeId } : {}),
      ...(q.vehicleType ? { xe: { loaixe: q.vehicleType } } : {}),
      ...(q.status ? { trangthai: q.status } : {}),
      ...(q.search
        ? { OR: [{ malichtrinh: { contains: q.search, mode: 'insensitive' } }, { xe: { biensoxe: { contains: q.search, mode: 'insensitive' } } }, { tuyen_xe: { tentuyen: { contains: q.search, mode: 'insensitive' } } }] }
        : {}),
    };
    const [trips, rentalPayments] = await Promise.all([
      this.prisma.lich_trinh.findMany({
        where,
        include: {
          tuyen_xe: { select: { matuyenduong: true, tentuyen: true } },
          xe: { select: { biensoxe: true, loaixe: true } },
          tai_xe_phu_xe_lich_trinh_mataixechinhTotai_xe_phu_xe: { select: { hoten: true } },
          tai_xe_phu_xe_lich_trinh_maphuxeTotai_xe_phu_xe: { select: { hoten: true } },
          chi_phi_chuyen: true,
          _count: { select: { ghe_chuyen: true } },
          don_hang: { select: { trangthaidonhang: true, ve_xe: { select: { trangthaive: true, giave: true, tienbaohiem: true } } } },
        },
        orderBy: [{ thoigiankhoihanh: 'asc' }, { malichtrinh: 'asc' }],
      }),
      this.prisma.thanh_toan_thue_xe.aggregate({
        where: { trangthaithanhtoan: 'ThanhCong', ...(range ? { thoigianthanhtoan: range } : {}) },
        _sum: { sotienthanhtoan: true },
        _count: true,
      }),
    ]);

    const rows = trips.map((t) => {
      const sold = t.don_hang.flatMap((o) => o.ve_xe.filter((v) => isSoldTicket(v, o.trangthaidonhang)));
      const ticketRevenue = sumBy(sold, (v) => money(v.giave));
      const insurance = sumBy(sold, (v) => money(v.tienbaohiem));
      const cost = t.chi_phi_chuyen
        ? {
            fuel: money(t.chi_phi_chuyen.chiphinhienlieu),
            toll: money(t.chi_phi_chuyen.chiphicauduong),
            salary: money(t.chi_phi_chuyen.chiphiluong),
            other: money(t.chi_phi_chuyen.chiphikhac),
          }
        : null;
      const totalCost = cost ? cost.fuel + cost.toll + cost.salary + cost.other : null;
      return {
        scheduleId: t.malichtrinh,
        routeId: t.tuyen_xe.matuyenduong,
        route: t.tuyen_xe.tentuyen,
        plateNumber: t.xe.biensoxe,
        vehicleType: VEHICLE_TYPE_LABELS[t.xe.loaixe],
        departureDate: vnDate(t.thoigiankhoihanh),
        departureTime: vnTime(t.thoigiankhoihanh),
        passengers: sold.length,
        totalSeats: t._count.ghe_chuyen,
        fillRate: percent(sold.length, t._count.ghe_chuyen),
        ticketRevenue,
        insurance,
        cost,
        totalCost,
        profit: totalCost == null ? null : ticketRevenue - totalCost,
        driver: t.tai_xe_phu_xe_lich_trinh_mataixechinhTotai_xe_phu_xe.hoten,
        assistant: t.tai_xe_phu_xe_lich_trinh_maphuxeTotai_xe_phu_xe?.hoten ?? null,
        status: TRIP_STATE[t.trangthai],
        rawStatus: t.trangthai,
      };
    });

    const withCost = rows.filter((r) => r.totalCost != null);
    const byDay = new Map<string, { revenue: number; passengers: number; trips: number }>();
    for (const r of rows) {
      const entry = byDay.get(r.departureDate) ?? { revenue: 0, passengers: 0, trips: 0 };
      entry.revenue += r.ticketRevenue;
      entry.passengers += r.passengers;
      entry.trips++;
      byDay.set(r.departureDate, entry);
    }
    const ticketRevenue = sumBy(rows, (r) => r.ticketRevenue);
    return {
      summary: {
        trips: rows.length,
        passengers: sumBy(rows, (r) => r.passengers),
        totalSeats: sumBy(rows, (r) => r.totalSeats),
        averageFillRate: percent(sumBy(rows, (r) => r.passengers), sumBy(rows, (r) => r.totalSeats)),
        ticketRevenue,
        insurance: sumBy(rows, (r) => r.insurance),
        rentalRevenue: money(rentalPayments._sum.sotienthanhtoan),
        rentalPayments: rentalPayments._count,
        // Chi phí và lợi nhuận chỉ tính trên các chuyến đã nhập chi phí
        tripsWithCost: withCost.length,
        totalCost: sumBy(withCost, (r) => r.totalCost!),
        profitOfTripsWithCost: sumBy(withCost, (r) => r.profit!),
        costBreakdown: {
          fuel: sumBy(withCost, (r) => r.cost!.fuel),
          toll: sumBy(withCost, (r) => r.cost!.toll),
          salary: sumBy(withCost, (r) => r.cost!.salary),
          other: sumBy(withCost, (r) => r.cost!.other),
        },
      },
      byDay: [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v })),
      byRoute: groupTotals(rows, (r) => r.route, (r) => r.ticketRevenue).map((g) => ({ route: g.key, revenue: g.value })),
      byVehicleType: groupTotals(rows, (r) => r.vehicleType, (r) => r.ticketRevenue).map((g) => ({ vehicleType: g.key, revenue: g.value })),
      byStatus: groupTotals(rows, (r) => r.status).map((g) => ({ status: g.key, count: g.value })),
      ...paginate(rows, q.page, q.pageSize),
    };
  }
}
