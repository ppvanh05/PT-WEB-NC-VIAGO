import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountsAccess } from '../../../shared/accounts/accounts-access';
import type { Identity } from '../../../shared/accounts/accounts-access';
import type { ReviewDto } from '../../../shared/accounts/accounts.dto';
import { normalizePhone, samePhone } from '../../../shared/phone';
import { ReviewMediaService } from '../profile/review-media.service';
import type { ReviewUpload } from '../profile/review-media.service';
import { writeTicketReview } from './review-writer';

const PAYMENT_LABELS: Record<string, string> = {
  VIETQR: 'VietQR',
  VNPAY: 'VNPAY',
  MOMO: 'Ví MoMo',
  ZALOPAY: 'ZaloPay',
  TIEN_MAT: 'Tiền mặt',
  CHUYEN_KHOAN: 'Chuyển khoản ngân hàng',
  THE: 'Thẻ ngân hàng',
};

const ORDER_SELECT = {
  madonhang: true,
  makhachhang: true,
  hotennguoidat: true,
  sodienthoainguoidat: true,
  emailnguoidat: true,
  thoigiandat: true,
  thoigiancomattruocphut: true,
  tongthanhtoan: true,
  trangthaidonhang: true,
  solanchinhsua: true,
  gioihanchinhsua: true,
  madiemdon: true,
  madiemtra: true,
  diem_don_tra_don_hang_madiemdonTodiem_don_tra: { select: { tendiem: true } },
  diem_don_tra_don_hang_madiemtraTodiem_don_tra: { select: { tendiem: true } },
  lich_trinh: {
    select: {
      malichtrinh: true,
      thoigiankhoihanh: true,
      thoigiandendukien: true,
      xe: { select: { biensoxe: true } },
      tuyen_xe: { select: { tentuyen: true } },
    },
  },
  thanh_toan: {
    where: { trangthaithanhtoan: 'ThanhCong' as const },
    orderBy: { thoigiantao: 'desc' as const },
    take: 1,
    select: { phuongthucthanhtoan: true },
  },
  ve_xe: {
    orderBy: { mave: 'asc' as const },
    select: {
      mave: true,
      hotenhanhkhach: true,
      giave: true,
      maqrve: true,
      trangthaive: true,
      danh_gia: { select: { madanhgia: true } },
      ghe_chuyen: { select: { ghe: { select: { soghe: true } } } },
    },
  },
} satisfies Prisma.don_hangSelect;
type OrderRow = Prisma.don_hangGetPayload<{ select: typeof ORDER_SELECT }>;

/**
 * Đơn hàng THẬT cho trang Tra cứu vé, chỉ phục vụ phần đánh giá chuyến đi.
 * - Khách chưa đăng nhập: phải biết mã đơn/mã vé + SĐT người đặt (giống đồ thất lạc).
 * - Khách đã đăng nhập: lấy các đơn của chính tài khoản.
 */
@Injectable()
export class CustomerReviewOrdersService {
  private readonly media: ReviewMediaService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccountsAccess,
  ) {
    this.media = new ReviewMediaService(prisma);
  }

  async byCode(code: string, phone: string) {
    return this.toOrder(await this.verify(code, phone));
  }

  async mine(identity: Identity) {
    const rows = await this.prisma.don_hang.findMany({
      where: { makhachhang: identity.customerId ?? '__none__' },
      select: ORDER_SELECT,
      orderBy: { thoigiandat: 'desc' },
      take: 50,
    });
    return rows.map((row) => this.toOrder(row));
  }

  /** Khách chưa đăng nhập gửi đánh giá: xác minh lại mã đơn + SĐT ngay lúc ghi. */
  async review(code: string, phone: string, ticketId: string, dto: ReviewDto, req: Request, files: ReviewUpload[] = []) {
    const order = await this.verify(code, phone);
    if (!order.ve_xe.some((t) => t.mave === ticketId)) throw new BadRequestException('Vé không thuộc đơn hàng này.');
    return writeTicketReview(this.prisma, this.access, this.media, {
      where: { mave: ticketId, madonhang: order.madonhang },
      identity: null,
      dto,
      req,
      files,
    });
  }

  private async verify(code: string, phone: string): Promise<OrderRow> {
    const upper = (code ?? '').trim().toUpperCase();
    if (!upper) throw new BadRequestException('Cần mã đơn hàng hoặc mã vé.');
    let order = await this.prisma.don_hang.findUnique({ where: { madonhang: upper }, select: ORDER_SELECT });
    if (!order) {
      const ticket = await this.prisma.ve_xe.findUnique({ where: { mave: upper }, select: { madonhang: true } });
      if (ticket) order = await this.prisma.don_hang.findUnique({ where: { madonhang: ticket.madonhang }, select: ORDER_SELECT });
    }
    // Cùng một thông báo cho "sai mã" và "sai SĐT" để không dò được đơn của người khác
    if (!order || !samePhone(order.sodienthoainguoidat, phone))
      throw new NotFoundException('Mã đơn/mã vé hoặc số điện thoại người đặt không đúng.');
    return order;
  }

  private toOrder(o: OrderRow) {
    const trip = o.lich_trinh;
    const orderCancelled = ['DaHuy', 'HetHanThanhToan'].includes(o.trangthaidonhang);
    const pending = ['ChoThanhToanOnline', 'ChoThanhToanTrucTiep'].includes(o.trangthaidonhang);
    const ticketStatus = (t: OrderRow['ve_xe'][number]) =>
      orderCancelled || t.trangthaive === 'DaHuy'
        ? 'cancelled'
        : pending
          ? 'pending'
          : t.trangthaive === 'DaHoanThanh'
            ? t.danh_gia
              ? 'reviewed'
              : 'completed'
            : 'upcoming';
    const tickets = o.ve_xe.map((t) => ({
      id: t.mave,
      seat: t.ghe_chuyen.ghe.soghe,
      passenger: t.hotenhanhkhach,
      price: Number(t.giave),
      qr: t.maqrve,
      status: ticketStatus(t),
    }));
    const active = tickets.filter((t) => t.status !== 'cancelled');
    const status = orderCancelled || !active.length
      ? 'cancelled'
      : pending
        ? 'pending'
        : active.every((t) => t.status === 'reviewed')
          ? 'reviewed'
          : active.every((t) => t.status === 'completed' || t.status === 'reviewed')
            ? 'completed'
            : 'upcoming';
    return {
      id: o.madonhang,
      customerId: o.makhachhang,
      bookerName: o.hotennguoidat,
      phone: normalizePhone(o.sodienthoainguoidat),
      email: o.emailnguoidat,
      bookedAt: o.thoigiandat.toISOString(),
      route: trip.tuyen_xe.tentuyen,
      scheduleId: trip.malichtrinh,
      departureAt: trip.thoigiankhoihanh.toISOString(),
      arrivalAt: trip.thoigiandendukien.toISOString(),
      presenceMinutes: o.thoigiancomattruocphut,
      pickupId: o.madiemdon,
      pickup: o.diem_don_tra_don_hang_madiemdonTodiem_don_tra.tendiem,
      dropoffId: o.madiemtra,
      dropoff: o.diem_don_tra_don_hang_madiemtraTodiem_don_tra.tendiem,
      plate: trip.xe.biensoxe,
      total: Number(o.tongthanhtoan),
      paymentMethod: o.thanh_toan[0] ? PAYMENT_LABELS[o.thanh_toan[0].phuongthucthanhtoan] ?? o.thanh_toan[0].phuongthucthanhtoan : 'Chưa thanh toán',
      editCount: o.solanchinhsua,
      editLimit: o.gioihanchinhsua,
      status,
      tickets,
    };
  }
}
