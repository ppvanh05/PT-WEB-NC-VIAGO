import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Prisma, trang_thai_do_that_lac_enum } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountsAccess } from '../../../shared/accounts/accounts-access';
import { pageMeta } from '../../../shared/http/pagination';
import { maskPhone, normalizePhone, samePhone } from '../../../shared/phone';
import { nextCode, withCodeRetry } from '../../../shared/sequential-code';
import { vnDate, vnDayRange } from '../../../shared/vn-time';
import { LostItemMediaService } from './lost-item-media.service';
import type { LostItemUpload } from './lost-item-media.service';
import {
  LostClaimDto,
  LostReportDto,
  PublicLostItemsQueryDto,
} from './lost-and-found.dto';

export const LOST_STATUS_LABELS: Record<trang_thai_do_that_lac_enum, string> = {
  DangTimKiem: 'Đang tìm kiếm',
  DaTimThay: 'Đã tìm thấy',
  DaTraKhach: 'Đã trả khách',
  DongYeuCau: 'Đóng yêu cầu',
};
const CLAIM_STATUS_LABELS = { ChoXacMinh: 'Chờ xác minh', DaXacNhan: 'Đã xác nhận', TuChoi: 'Từ chối' } as const;

/** Đồ hiển thị công khai: đã có trong kho (đã tìm thấy) hoặc đã trả. Báo mất của khách là thông tin riêng. */
const PUBLIC_STATUSES: trang_thai_do_that_lac_enum[] = ['DaTimThay', 'DaTraKhach'];

const BOOKING_SELECT = {
  madonhang: true,
  makhachhang: true,
  hotennguoidat: true,
  sodienthoainguoidat: true,
  emailnguoidat: true,
  lich_trinh: {
    select: {
      malichtrinh: true,
      thoigiankhoihanh: true,
      tuyen_xe: { select: { tentuyen: true, diemdi: true, diemden: true } },
    },
  },
  ve_xe: {
    select: {
      mave: true,
      hotenhanhkhach: true,
      trangthaive: true,
      ghe_chuyen: { select: { ghe: { select: { soghe: true } } } },
    },
    orderBy: { mave: 'asc' as const },
  },
} satisfies Prisma.don_hangSelect;
type BookingRow = Prisma.don_hangGetPayload<{ select: typeof BOOKING_SELECT }>;

@Injectable()
export class CustomerLostAndFoundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccountsAccess,
    private readonly media: LostItemMediaService,
  ) {}

  /** Danh sách đồ thất lạc công khai (không có thông tin cá nhân của người bị mất). */
  async items(q: PublicLostItemsQueryDto) {
    const and: Prisma.do_that_lacWhereInput[] = [{ trangthai: { in: PUBLIC_STATUSES } }];
    if (q.status === 'returned') and.push({ trangthai: 'DaTraKhach' });
    if (q.status === 'stored') and.push({ trangthai: 'DaTimThay', yeu_cau_nhan_do: { none: { trangthai: 'ChoXacMinh' } } });
    if (q.status === 'processing') and.push({ trangthai: 'DaTimThay', yeu_cau_nhan_do: { some: { trangthai: 'ChoXacMinh' } } });
    if (q.routeId) and.push({ lich_trinh: { matuyenduong: q.routeId } });
    const range = vnDayRange(q.from, q.to);
    if (range) and.push({ OR: [{ thoigiantimthay: range }, { thoigiantimthay: null, thoigianbao: range }] });
    if (q.search) and.push({ tenvatpham: { contains: q.search, mode: 'insensitive' } });
    const where: Prisma.do_that_lacWhereInput = { AND: and };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.do_that_lac.count({ where }),
      this.prisma.do_that_lac.findMany({
        where,
        select: {
          madothatlac: true,
          tenvatpham: true,
          hinhanh: true,
          hinhanhtimthay: true,
          thoigiantimthay: true,
          thoigianbao: true,
          vitriluutru: true,
          trangthai: true,
          lich_trinh: { select: { tuyen_xe: { select: { tentuyen: true, diemdi: true, diemden: true } } } },
          _count: { select: { yeu_cau_nhan_do: { where: { trangthai: 'ChoXacMinh' } } } },
        },
        orderBy: [{ thoigiantimthay: { sort: 'desc', nulls: 'last' } }, { madothatlac: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.madothatlac,
        name: row.tenvatpham,
        image: row.hinhanhtimthay[0] ?? row.hinhanh[0] ?? null,
        foundDate: vnDate(row.thoigiantimthay ?? row.thoigianbao),
        route: row.lich_trinh ? row.lich_trinh.tuyen_xe.tentuyen : null,
        storage: row.vitriluutru,
        status:
          row.trangthai === 'DaTraKhach' ? 'returned' : row._count.yeu_cau_nhan_do > 0 ? 'processing' : 'stored',
      })),
      pagination: pageMeta(q.page, q.pageSize, total),
    };
  }

  async routes() {
    const routes = await this.prisma.tuyen_xe.findMany({
      where: { trangthai: 'HoatDong' },
      select: { matuyenduong: true, tentuyen: true },
      orderBy: { matuyenduong: 'asc' },
    });
    return routes.map((r) => ({ value: r.matuyenduong, label: r.tentuyen }));
  }

  /** Tra mã đơn/mã vé để điền sẵn form. Chỉ trả dữ liệu khi SĐT khớp người đặt. */
  async booking(code: string, phone: string) {
    const { order, ticket } = await this.verifyBooking(code, phone);
    return {
      orderId: order.madonhang,
      ticketId: ticket?.mave ?? null,
      route: order.lich_trinh.tuyen_xe.tentuyen,
      date: vnDate(order.lich_trinh.thoigiankhoihanh),
      fullName: order.hotennguoidat,
      email: order.emailnguoidat,
      // Vé đã hủy không có người đi nên không thể để quên đồ
      tickets: order.ve_xe.filter((v) => v.trangthaive !== 'DaHuy').map((v) => ({
        id: v.mave,
        seat: v.ghe_chuyen.ghe.soghe,
        passenger: v.hotenhanhkhach,
      })),
    };
  }

  /** Khách báo mất đồ: tạo hồ sơ "Đang tìm kiếm" gắn với vé và chuyến. */
  async report(dto: LostReportDto, req: Request, files: LostItemUpload[] = []) {
    const { order, ticket: byCode } = await this.verifyBooking(dto.bookingCode, dto.phone);
    const ticket =
      byCode ?? (dto.ticketId ? order.ve_xe.find((v) => v.mave === dto.ticketId) : order.ve_xe.length === 1 ? order.ve_xe[0] : undefined);
    if (dto.ticketId && !ticket) throw new BadRequestException('Mã vé không thuộc đơn hàng này.');
    if (!ticket) throw new BadRequestException('Đơn có nhiều vé, vui lòng chọn vé của người để quên đồ.');
    if (ticket.trangthaive === 'DaHuy') throw new BadRequestException('Vé đã hủy, không thể báo mất đồ cho chuyến này.');
    if (order.lich_trinh.thoigiankhoihanh.getTime() > Date.now())
      throw new BadRequestException('Chuyến xe chưa khởi hành, chưa thể báo mất đồ cho vé này.');

    const duplicate = await this.prisma.do_that_lac.findFirst({
      where: { mave: ticket.mave, trangthai: 'DangTimKiem', tenvatpham: { equals: dto.itemName, mode: 'insensitive' } },
      select: { madothatlac: true },
    });
    if (duplicate) throw new ConflictException(`Bạn đã báo mất món đồ này (mã ${duplicate.madothatlac}).`);

    const now = new Date();
    const images = await this.media.store(files);
    const created = await withCodeRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const id = await nextCode(tx, 'do_that_lac', 'DTL', 5);
        await tx.do_that_lac.create({
          data: {
            madothatlac: id,
            loaighinhan: 'KhachBaoMat',
            makhachhang: order.makhachhang,
            mave: ticket.mave,
            malichtrinh: order.lich_trinh.malichtrinh,
            tenvatpham: dto.itemName,
            motavatpham: dto.description,
            tennguoibao: dto.fullName,
            sodienthoai: normalizePhone(dto.phone),
            email: dto.email || null,
            thoigianbao: now,
            vitrighe: dto.seat || ticket.ghe_chuyen.ghe.soghe,
            hinhanh: images.urls,
            hinhanhtimthay: [],
            trangthai: 'DangTimKiem',
            thoigiantao: now,
            thoigiancapnhat: now,
          },
        });
        await this.access.audit(tx, null, req, 'CREATE_LOST_REPORT', 'do_that_lac', id, `Khách báo mất đồ cho vé ${ticket.mave}.`);
        return id;
      }),
    ).catch(async (error: unknown) => {
      await this.media.remove(images.paths);
      throw error;
    });
    return { code: created, images: images.urls, status: 'DangTimKiem', statusLabel: LOST_STATUS_LABELS.DangTimKiem, createdAt: now.toISOString() };
  }

  /** Khách yêu cầu nhận lại một món đồ đang lưu giữ. */
  async claim(itemId: string, dto: LostClaimDto, req: Request) {
    const item = await this.prisma.do_that_lac.findUnique({
      where: { madothatlac: itemId },
      select: { madothatlac: true, trangthai: true, malichtrinh: true },
    });
    if (!item || !PUBLIC_STATUSES.includes(item.trangthai)) throw new NotFoundException('Không tìm thấy món đồ.');
    if (item.trangthai !== 'DaTimThay') throw new BadRequestException('Món đồ này đã được trả cho chủ sở hữu.');

    const { order, ticket } = await this.verifyBooking(dto.bookingCode, dto.phone);
    if (item.malichtrinh && order.lich_trinh.malichtrinh !== item.malichtrinh)
      throw new BadRequestException('Đơn hàng không thuộc chuyến xe nhặt được món đồ này.');

    const phone = normalizePhone(dto.phone);
    const pending = await this.prisma.yeu_cau_nhan_do.findFirst({
      where: { madothatlac: itemId, sodienthoaixacthuc: phone, trangthai: 'ChoXacMinh' },
      select: { mayeucaunhando: true },
    });
    if (pending) throw new ConflictException(`Bạn đã gửi yêu cầu nhận món đồ này (mã ${pending.mayeucaunhando}).`);

    const now = new Date();
    const id = await withCodeRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const code = await nextCode(tx, 'yeu_cau_nhan_do', 'YCND', 3);
        await tx.yeu_cau_nhan_do.create({
          data: {
            mayeucaunhando: code,
            madothatlac: itemId,
            makhachhang: order.makhachhang,
            madonhang: order.madonhang,
            mave: ticket?.mave ?? null,
            sodienthoaixacthuc: phone,
            dacdiemnhandang: dto.description,
            thoigiangui: now,
            trangthai: 'ChoXacMinh',
          },
        });
        await this.access.audit(tx, null, req, 'CREATE_LOST_CLAIM', 'yeu_cau_nhan_do', code, `Khách yêu cầu nhận lại đồ ${itemId}.`);
        return code;
      }),
    );
    return { code: id, status: 'ChoXacMinh', statusLabel: CLAIM_STATUS_LABELS.ChoXacMinh, createdAt: now.toISOString() };
  }

  /** Tra cứu tình trạng theo mã báo mất (DTL...) hoặc mã yêu cầu nhận đồ (YCND...). */
  async status(code: string, phone: string) {
    const upper = code.trim().toUpperCase();
    if (upper.startsWith('YCND')) {
      const claim = await this.prisma.yeu_cau_nhan_do.findUnique({
        where: { mayeucaunhando: upper },
        include: { do_that_lac: { select: { madothatlac: true, tenvatpham: true, vitriluutru: true, trangthai: true } } },
      });
      if (!claim || !samePhone(claim.sodienthoaixacthuc, phone)) throw new NotFoundException('Không tìm thấy yêu cầu với số điện thoại này.');
      return {
        type: 'claim',
        code: claim.mayeucaunhando,
        itemId: claim.do_that_lac.madothatlac,
        itemName: claim.do_that_lac.tenvatpham,
        status: claim.trangthai,
        statusLabel: CLAIM_STATUS_LABELS[claim.trangthai],
        storage: claim.trangthai === 'DaXacNhan' ? claim.do_that_lac.vitriluutru : null,
        timeline: [
          { label: 'Đã gửi yêu cầu', time: claim.thoigiangui.toISOString() },
          ...(claim.thoigianxuly ? [{ label: CLAIM_STATUS_LABELS[claim.trangthai], time: claim.thoigianxuly.toISOString() }] : []),
        ],
      };
    }
    const item = await this.prisma.do_that_lac.findUnique({ where: { madothatlac: upper } });
    if (!item || !samePhone(item.sodienthoai, phone)) throw new NotFoundException('Không tìm thấy hồ sơ với số điện thoại này.');
    return {
      type: 'report',
      code: item.madothatlac,
      itemName: item.tenvatpham,
      status: item.trangthai,
      statusLabel: LOST_STATUS_LABELS[item.trangthai],
      storage: item.trangthai === 'DaTimThay' ? item.vitriluutru : null,
      contactPhone: maskPhone(item.sodienthoai),
      timeline: [
        { label: 'Đã tiếp nhận báo mất', time: item.thoigianbao.toISOString() },
        ...(item.thoigiantimthay ? [{ label: 'Đã tìm thấy', time: item.thoigiantimthay.toISOString() }] : []),
        ...(item.trangthai === 'DaTraKhach' || item.trangthai === 'DongYeuCau'
          ? [{ label: LOST_STATUS_LABELS[item.trangthai], time: item.thoigiancapnhat.toISOString() }]
          : []),
      ],
    };
  }

  /** Tìm đơn theo mã đơn hoặc mã vé và xác minh SĐT người đặt. */
  private async verifyBooking(code: string, phone: string): Promise<{ order: BookingRow; ticket?: BookingRow['ve_xe'][number] }> {
    const upper = code.trim().toUpperCase();
    let order = await this.prisma.don_hang.findUnique({ where: { madonhang: upper }, select: BOOKING_SELECT });
    let ticketId: string | undefined;
    if (!order) {
      const ticket = await this.prisma.ve_xe.findUnique({ where: { mave: upper }, select: { madonhang: true } });
      if (ticket) {
        order = await this.prisma.don_hang.findUnique({ where: { madonhang: ticket.madonhang }, select: BOOKING_SELECT });
        ticketId = upper;
      }
    }
    // Cùng một thông báo cho "không có mã" và "sai SĐT" để không dò được mã đơn của người khác
    if (!order || !samePhone(order.sodienthoainguoidat, phone))
      throw new NotFoundException('Mã đơn/mã vé hoặc số điện thoại người đặt không đúng.');
    return { order, ticket: ticketId ? order.ve_xe.find((v) => v.mave === ticketId) : undefined };
  }
}
