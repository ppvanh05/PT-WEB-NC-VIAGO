import { Injectable } from '@nestjs/common';
import { Prisma, trang_thai_hoan_tien_enum } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { paginate } from '../../../../shared/http/pagination';
import { money } from '../../../../shared/rental-pricing';
import { VEHICLE_TYPE_LABELS } from '../../../../shared/review-scoring';
import { vnDate, vnDayRange, vnTime } from '../../../../shared/vn-time';
import { CancellationReportQueryDto } from '../reports.dto';
import { groupTotals, percent, sumBy } from '../report-common';

const REFUND_STATUS: Record<trang_thai_hoan_tien_enum, 'refunded' | 'pending' | 'processing' | 'failed'> = {
  ThanhCong: 'refunded',
  ChoXuLy: 'pending',
  DangXuLy: 'processing',
  ThatBai: 'failed',
  DaHuy: 'failed',
};
const REFUND_LABELS = { refunded: 'Đã hoàn', pending: 'Chờ hoàn', processing: 'Đang xử lý', failed: 'Hoàn thất bại', none: 'Không hoàn' } as const;
const SOURCE_LABELS = { KhachHang: 'Khách hàng', NhanVienBanVe: 'Nhân viên bán vé', HeThong: 'Hệ thống' } as const;
const CHANNEL_LABELS = { Online: 'Online', TaiQuay: 'Tại quầy', Hotline: 'Hotline' } as const;

@Injectable()
export class CancellationReportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Báo cáo hủy vé: tổng hợp số vé hủy, phí hủy, tiền hoàn, lý do, xu hướng theo ngày và danh sách chi tiết. */
  async report(q: CancellationReportQueryDto) {
    const and: Prisma.lich_su_huy_veWhereInput[] = [{ trangthaihuy: 'DaHuy' }];
    const range = vnDayRange(q.from, q.to);
    if (range) and.push({ OR: [{ thoigianhuy: range }, { thoigianhuy: null, thoigianyeucau: range }] });
    if (q.cancelledBy) and.push({ nguonhuy: q.cancelledBy });
    if (q.channel) and.push({ ve_xe: { don_hang: { nguondat: q.channel } } });
    if (q.routeId) and.push({ ve_xe: { don_hang: { lich_trinh: { matuyenduong: q.routeId } } } });
    if (q.vehicleType) and.push({ ve_xe: { don_hang: { lich_trinh: { xe: { loaixe: q.vehicleType } } } } });
    if (q.search) {
      const s = { contains: q.search, mode: 'insensitive' as const };
      and.push({ OR: [{ malichsuhuy: s }, { mave: s }, { lydohuy: s }, { ve_xe: { hotenhanhkhach: s } }, { ve_xe: { sodienthoaihanhkhach: s } }, { ve_xe: { madonhang: s } }] });
    }
    const rows = await this.prisma.lich_su_huy_ve.findMany({
      where: { AND: and },
      include: {
        tai_khoan_lich_su_huy_ve_nguoithuchienhuyTotai_khoan: { select: { nhan_vien: { select: { manhanvien: true, hoten: true } } } },
        hoan_tien: { orderBy: { thoigiantao: 'desc' }, take: 1 },
        ve_xe: {
          select: {
            mave: true,
            hotenhanhkhach: true,
            sodienthoaihanhkhach: true,
            loaiphong: true,
            ghe_chuyen: { select: { ghe: { select: { soghe: true, loaighe: true } } } },
            don_hang: {
              select: {
                madonhang: true,
                makhachhang: true,
                nguondat: true,
                trangthaidonhang: true,
                _count: { select: { ve_xe: true } },
                ve_xe: { where: { trangthaive: 'DaHuy' }, select: { mave: true } },
                thanh_toan: { where: { trangthaithanhtoan: 'ThanhCong' }, select: { phuongthucthanhtoan: true }, take: 1 },
                lich_trinh: { select: { thoigiankhoihanh: true, tuyen_xe: { select: { matuyenduong: true, tentuyen: true } }, xe: { select: { maxe: true, tenxe: true, biensoxe: true, loaixe: true } } } },
              },
            },
          },
        },
      },
      orderBy: [{ thoigianhuy: { sort: 'desc', nulls: 'last' } }, { malichsuhuy: 'desc' }],
    });

    const items = rows.map((r) => {
      const order = r.ve_xe.don_hang;
      const trip = order.lich_trinh;
      const refund = r.hoan_tien[0];
      const refundStatus = refund ? REFUND_STATUS[refund.trangthaihoantien] : money(r.tienhoanlai) > 0 ? 'pending' : 'none';
      const cancelledAt = r.thoigianhuy ?? r.thoigianyeucau;
      return {
        id: r.malichsuhuy,
        ticketId: r.mave,
        orderId: order.madonhang,
        customerId: order.makhachhang,
        policyId: r.machinhsach,
        cancelledBy: r.nguonhuy,
        cancelledByLabel: SOURCE_LABELS[r.nguonhuy],
        staff: r.tai_khoan_lich_su_huy_ve_nguoithuchienhuyTotai_khoan?.nhan_vien ? { id: r.tai_khoan_lich_su_huy_ve_nguoithuchienhuyTotai_khoan.nhan_vien.manhanvien, name: r.tai_khoan_lich_su_huy_ve_nguoithuchienhuyTotai_khoan.nhan_vien.hoten } : null,
        channel: order.nguondat,
        channelLabel: CHANNEL_LABELS[order.nguondat],
        passengerName: r.ve_xe.hotenhanhkhach,
        passengerPhone: r.ve_xe.sodienthoaihanhkhach,
        routeId: trip.tuyen_xe.matuyenduong,
        route: trip.tuyen_xe.tentuyen,
        departureDate: vnDate(trip.thoigiankhoihanh),
        departureTime: vnTime(trip.thoigiankhoihanh),
        seat: r.ve_xe.ghe_chuyen.ghe.soghe,
        seatType: r.ve_xe.ghe_chuyen.ghe.loaighe,
        roomType: r.ve_xe.loaiphong,
        vehicle: { id: trip.xe.maxe, name: trip.xe.tenxe, plateNumber: trip.xe.biensoxe, type: VEHICLE_TYPE_LABELS[trip.xe.loaixe] },
        originalPrice: money(r.tienvegoc),
        refundBase: money(r.sotienlamcancuhoan),
        feeRate: r.tylephihuyapdung == null ? null : Number(r.tylephihuyapdung),
        fee: money(r.phihuy),
        refundAmount: money(r.tienhoanlai),
        refundTransactionId: refund?.magiaodichhoan ?? null,
        refundStatus,
        refundStatusLabel: REFUND_LABELS[refundStatus],
        reasonCode: r.malydohuy,
        reason: r.lydohuy,
        cancelledAt: cancelledAt.toISOString(),
        orderStatus: order.trangthaidonhang,
        orderFullyCancelled: order.trangthaidonhang === 'DaHuy',
        ticketsInOrder: order._count.ve_xe,
        cancelledTicketsInOrder: order.ve_xe.length,
        paymentMethod: order.thanh_toan[0]?.phuongthucthanhtoan ?? null,
      };
    });
    const filtered = q.refundStatus ? items.filter((i) => i.refundStatus === q.refundStatus) : items;

    // Tỷ lệ hủy = vé hủy / tổng vé của các chuyến khởi hành trong kỳ
    const ticketsInPeriod = await this.prisma.ve_xe.count({
      where: range ? { don_hang: { lich_trinh: { thoigiankhoihanh: range } } } : {},
    });
    const cancelledInPeriod = await this.prisma.ve_xe.count({
      where: { trangthaive: 'DaHuy', ...(range ? { don_hang: { lich_trinh: { thoigiankhoihanh: range } } } : {}) },
    });
    const byDay = new Map<string, { count: number; refund: number; fee: number }>();
    for (const i of filtered) {
      const day = vnDate(new Date(i.cancelledAt));
      const entry = byDay.get(day) ?? { count: 0, refund: 0, fee: 0 };
      entry.count++;
      entry.refund += i.refundAmount;
      entry.fee += i.fee;
      byDay.set(day, entry);
    }
    return {
      summary: {
        cancelledTickets: filtered.length,
        originalValue: sumBy(filtered, (i) => i.originalPrice),
        totalFee: sumBy(filtered, (i) => i.fee),
        totalRefund: sumBy(filtered, (i) => i.refundAmount),
        refundPending: sumBy(filtered.filter((i) => i.refundStatus === 'pending' || i.refundStatus === 'processing'), (i) => i.refundAmount),
        refundCompleted: sumBy(filtered.filter((i) => i.refundStatus === 'refunded'), (i) => i.refundAmount),
        cancellationRate: percent(cancelledInPeriod, ticketsInPeriod),
        ticketsInPeriod,
      },
      byReason: groupTotals(filtered, (i) => i.reason).map((g) => ({ reason: g.key, count: g.value })),
      byCancelledBy: groupTotals(filtered, (i) => i.cancelledByLabel).map((g) => ({ label: g.key, count: g.value })),
      byChannel: groupTotals(filtered, (i) => i.channelLabel).map((g) => ({ label: g.key, count: g.value })),
      byRefundStatus: groupTotals(filtered, (i) => i.refundStatusLabel).map((g) => ({ label: g.key, count: g.value })),
      trend: [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v })),
      ...paginate(filtered, q.page, q.pageSize),
    };
  }
}
