import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { Prisma, trang_thai_do_that_lac_enum } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AccountsAccess, Identity } from '../../../../shared/accounts/accounts-access';
import { pageMeta } from '../../../../shared/http/pagination';
import { normalizePhone, samePhone } from '../../../../shared/phone';
import { nextCode, withCodeRetry } from '../../../../shared/sequential-code';
import { vnDate, vnDayRange } from '../../../../shared/vn-time';
import { LOST_STATUS_LABELS } from '../../../customer/lost-and-found/lost-and-found.service';
import {
  AdminLostItemsQueryDto,
  ClaimDecisionDto,
  LostItemCreateDto,
  LostItemStatusDto,
  LostItemUpdateDto,
} from './lost-and-found.dto';

const CLAIM_LABELS = { ChoXacMinh: 'Chờ xác minh', DaXacNhan: 'Đã xác nhận', TuChoi: 'Từ chối' } as const;

/** Trạng thái được phép chuyển tới từ mỗi trạng thái hiện tại. */
const TRANSITIONS: Record<trang_thai_do_that_lac_enum, trang_thai_do_that_lac_enum[]> = {
  DangTimKiem: ['DaTimThay', 'DongYeuCau'],
  DaTimThay: ['DaTraKhach', 'DongYeuCau'],
  DaTraKhach: [],
  DongYeuCau: [],
};

const ITEM_INCLUDE = {
  khach_hang: { select: { hotenkhachhang: true } },
  nhan_vien: { select: { hoten: true } },
  ve_xe: { select: { mave: true, madonhang: true, hotenhanhkhach: true, ghe_chuyen: { select: { ghe: { select: { soghe: true } } } } } },
  lich_trinh: { select: { malichtrinh: true, thoigiankhoihanh: true, tuyen_xe: { select: { tentuyen: true, diemdi: true, diemden: true } }, xe: { select: { biensoxe: true } } } },
  yeu_cau_nhan_do: { orderBy: { thoigiangui: 'desc' as const }, include: { nhan_vien: { select: { hoten: true } } } },
} satisfies Prisma.do_that_lacInclude;
type ItemRow = Prisma.do_that_lacGetPayload<{ include: typeof ITEM_INCLUDE }>;

@Injectable()
export class AdminLostAndFoundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccountsAccess,
  ) {}

  async summary() {
    const [byStatus, pendingClaims, byType] = await Promise.all([
      this.prisma.do_that_lac.groupBy({ by: ['trangthai'], _count: true }),
      this.prisma.yeu_cau_nhan_do.count({ where: { trangthai: 'ChoXacMinh' } }),
      this.prisma.do_that_lac.groupBy({ by: ['loaighinhan'], _count: true }),
    ]);
    const count = (s: trang_thai_do_that_lac_enum) => byStatus.find((r) => r.trangthai === s)?._count ?? 0;
    return {
      total: byStatus.reduce((sum, r) => sum + r._count, 0),
      searching: count('DangTimKiem'),
      found: count('DaTimThay'),
      returned: count('DaTraKhach'),
      closed: count('DongYeuCau'),
      pendingClaims,
      customerReports: byType.find((r) => r.loaighinhan === 'KhachBaoMat')?._count ?? 0,
      staffFound: byType.find((r) => r.loaighinhan === 'NhanVienNhatDuoc')?._count ?? 0,
    };
  }

  async list(q: AdminLostItemsQueryDto) {
    const and: Prisma.do_that_lacWhereInput[] = [];
    if (q.status) and.push({ trangthai: q.status });
    if (q.type) and.push({ loaighinhan: q.type });
    if (q.hasPendingClaims === 'true') and.push({ yeu_cau_nhan_do: { some: { trangthai: 'ChoXacMinh' } } });
    if (q.hasPendingClaims === 'false') and.push({ yeu_cau_nhan_do: { none: { trangthai: 'ChoXacMinh' } } });
    const range = vnDayRange(q.from, q.to);
    if (range) and.push({ thoigianbao: range });
    if (q.search) {
      const s = { contains: q.search, mode: 'insensitive' as const };
      and.push({
        OR: [{ madothatlac: s }, { tenvatpham: s }, { motavatpham: s }, { tennguoibao: s }, { sodienthoai: s }, { mave: s }, { ve_xe: { madonhang: s } }],
      });
    }
    const where: Prisma.do_that_lacWhereInput = { AND: and };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.do_that_lac.count({ where }),
      this.prisma.do_that_lac.findMany({
        where,
        include: ITEM_INCLUDE,
        orderBy: [{ thoigianbao: q.sort === 'oldest' ? 'asc' : 'desc' }, { madothatlac: 'desc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    return { items: rows.map((r) => this.toItem(r)), pagination: pageMeta(q.page, q.pageSize, total) };
  }

  async detail(id: string) {
    const row = await this.prisma.do_that_lac.findUnique({ where: { madothatlac: id }, include: ITEM_INCLUDE });
    if (!row) throw new NotFoundException('Không tìm thấy hồ sơ đồ thất lạc.');
    return this.toItem(row);
  }

  /** Tra mã vé hoặc mã đơn để nhân viên điền nhanh thông tin chuyến, ghế, người đặt. */
  async ticket(code: string) {
    const upper = code.trim().toUpperCase();
    const ticket = await this.prisma.ve_xe.findFirst({
      where: { OR: [{ mave: upper }, { madonhang: upper }] },
      orderBy: { mave: 'asc' },
      select: {
        mave: true,
        hotenhanhkhach: true,
        ghe_chuyen: { select: { ghe: { select: { soghe: true } } } },
        don_hang: {
          select: {
            madonhang: true,
            makhachhang: true,
            hotennguoidat: true,
            sodienthoainguoidat: true,
            emailnguoidat: true,
            lich_trinh: { select: { malichtrinh: true, thoigiankhoihanh: true, tuyen_xe: { select: { tentuyen: true, diemdi: true, diemden: true } } } },
            ve_xe: { select: { mave: true, ghe_chuyen: { select: { ghe: { select: { soghe: true } } } } } },
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Không tìm thấy vé hoặc đơn hàng.');
    const order = ticket.don_hang;
    return {
      ticketId: upper === order.madonhang ? null : ticket.mave,
      orderId: order.madonhang,
      customerId: order.makhachhang,
      customerName: order.hotennguoidat,
      phone: normalizePhone(order.sodienthoainguoidat),
      email: order.emailnguoidat,
      scheduleId: order.lich_trinh.malichtrinh,
      route: order.lich_trinh.tuyen_xe.tentuyen,
      travelDate: vnDate(order.lich_trinh.thoigiankhoihanh),
      seat: upper === order.madonhang ? null : ticket.ghe_chuyen.ghe.soghe,
      tickets: order.ve_xe.map((v) => ({ id: v.mave, seat: v.ghe_chuyen.ghe.soghe })),
    };
  }

  async create(dto: LostItemCreateDto, identity: Identity, req: Request) {
    let ticketId: string | null = null;
    let scheduleId = dto.scheduleId ?? null;
    let customerId: string | null = null;
    let orderInfo: Awaited<ReturnType<AdminLostAndFoundService['ticket']>> | null = null;
    if (dto.bookingCode) {
      orderInfo = await this.ticket(dto.bookingCode);
      ticketId = orderInfo.ticketId ?? (orderInfo.tickets.length === 1 ? orderInfo.tickets[0].id : null);
      scheduleId = orderInfo.scheduleId;
      customerId = orderInfo.customerId;
    } else if (scheduleId) {
      const schedule = await this.prisma.lich_trinh.findUnique({ where: { malichtrinh: scheduleId }, select: { malichtrinh: true } });
      if (!schedule) throw new BadRequestException('Không tìm thấy lịch trình.');
    }
    if (dto.type === 'KhachBaoMat' && !(dto.phone || orderInfo?.phone))
      throw new BadRequestException('Khách báo mất cần có số điện thoại liên hệ hoặc mã vé.');
    if (dto.type === 'NhanVienNhatDuoc' && !scheduleId)
      throw new BadRequestException('Đồ nhặt được cần gắn với lịch trình hoặc mã vé.');
    if (dto.type === 'NhanVienNhatDuoc' && !dto.storageLocation)
      throw new BadRequestException('Cần ghi nơi lưu giữ đồ nhặt được.');

    const now = new Date();
    const found = dto.type === 'NhanVienNhatDuoc';
    const id = await withCodeRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const code = await nextCode(tx, 'do_that_lac', 'DTL', 5);
        await tx.do_that_lac.create({
          data: {
            madothatlac: code,
            loaighinhan: dto.type,
            makhachhang: customerId,
            mave: ticketId,
            malichtrinh: scheduleId,
            manhanvienghinhan: identity.staffId ?? null,
            tenvatpham: dto.itemName,
            motavatpham: dto.description || null,
            tennguoibao: dto.reporterName ?? orderInfo?.customerName ?? null,
            sodienthoai: dto.phone ? normalizePhone(dto.phone) : (orderInfo?.phone ?? null),
            email: dto.email ?? orderInfo?.email ?? null,
            thoigianbao: now,
            vitrighe: dto.seat ?? orderInfo?.seat ?? null,
            hinhanh: dto.images ?? [],
            vitritimthay: dto.foundLocation ?? null,
            thoigiantimthay: found ? (dto.foundAt ? new Date(dto.foundAt) : now) : null,
            hinhanhtimthay: dto.foundImages ?? [],
            vitriluutru: dto.storageLocation ?? null,
            ghichu: dto.note ?? null,
            trangthai: found ? 'DaTimThay' : 'DangTimKiem',
            thoigiantao: now,
            thoigiancapnhat: now,
          },
        });
        await this.access.audit(tx, identity, req, 'CREATE_LOST_ITEM', 'do_that_lac', code, found ? 'Ghi nhận đồ nhặt được trên xe.' : 'Nhập hộ khách báo mất đồ.');
        return code;
      }),
    );
    return this.detail(id);
  }

  async update(id: string, dto: LostItemUpdateDto, identity: Identity, req: Request) {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.do_that_lac.findUnique({ where: { madothatlac: id } });
      if (!current) throw new NotFoundException('Không tìm thấy hồ sơ đồ thất lạc.');
      if (current.trangthai === 'DaTraKhach' || current.trangthai === 'DongYeuCau')
        throw new BadRequestException('Hồ sơ đã kết thúc, không thể sửa.');
      const data: Prisma.do_that_lacUncheckedUpdateInput = {
        ...(dto.itemName !== undefined ? { tenvatpham: dto.itemName } : {}),
        ...(dto.description !== undefined ? { motavatpham: dto.description || null } : {}),
        ...(dto.seat !== undefined ? { vitrighe: dto.seat || null } : {}),
        ...(dto.images !== undefined ? { hinhanh: dto.images } : {}),
        ...(dto.foundLocation !== undefined ? { vitritimthay: dto.foundLocation || null } : {}),
        ...(dto.foundAt !== undefined ? { thoigiantimthay: new Date(dto.foundAt) } : {}),
        ...(dto.foundImages !== undefined ? { hinhanhtimthay: dto.foundImages } : {}),
        ...(dto.storageLocation !== undefined ? { vitriluutru: dto.storageLocation || null } : {}),
        ...(dto.note !== undefined ? { ghichu: dto.note || null } : {}),
      };
      if (!Object.keys(data).length) throw new BadRequestException('Không có thay đổi nào.');
      await tx.do_that_lac.update({ where: { madothatlac: id }, data: { ...data, thoigiancapnhat: new Date() } });
      await this.access.audit(tx, identity, req, 'UPDATE_LOST_ITEM', 'do_that_lac', id, 'Cập nhật thông tin đồ thất lạc.');
    });
    return this.detail(id);
  }

  /**
   * Đổi trạng thái theo đúng luồng: Đang tìm kiếm → Đã tìm thấy → Đã trả khách,
   * hoặc Đóng yêu cầu. Trả khách cần yêu cầu nhận đã xác nhận hoặc hồ sơ do chính khách báo mất.
   */
  async status(id: string, dto: LostItemStatusDto, identity: Identity, req: Request) {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.do_that_lac.findUnique({ where: { madothatlac: id }, include: { yeu_cau_nhan_do: true } });
      if (!current) throw new NotFoundException('Không tìm thấy hồ sơ đồ thất lạc.');
      if (!TRANSITIONS[current.trangthai].includes(dto.status))
        throw new BadRequestException(`Không thể chuyển từ "${LOST_STATUS_LABELS[current.trangthai]}" sang "${LOST_STATUS_LABELS[dto.status]}".`);
      const now = new Date();
      const data: Prisma.do_that_lacUncheckedUpdateInput = { trangthai: dto.status, thoigiancapnhat: now };
      if (dto.status === 'DaTimThay') {
        const storage = dto.storageLocation ?? current.vitriluutru;
        const location = dto.foundLocation ?? current.vitritimthay;
        if (!storage || !location) throw new BadRequestException('Cần ghi vị trí tìm thấy và nơi lưu giữ.');
        Object.assign(data, {
          vitriluutru: storage,
          vitritimthay: location,
          thoigiantimthay: dto.foundAt ? new Date(dto.foundAt) : now,
          ...(dto.foundImages ? { hinhanhtimthay: dto.foundImages } : {}),
        });
      }
      if (dto.status === 'DaTraKhach') {
        const approved = current.yeu_cau_nhan_do.some((c) => c.trangthai === 'DaXacNhan');
        if (!approved && current.loaighinhan !== 'KhachBaoMat')
          throw new BadRequestException('Cần xác nhận một yêu cầu nhận đồ trước khi trả khách.');
      }
      if (dto.status === 'DongYeuCau' && !dto.note) throw new BadRequestException('Cần ghi lý do đóng yêu cầu.');
      if (dto.note) data.ghichu = [current.ghichu, `[${vnDate(now)}] ${dto.note}`].filter(Boolean).join('\n');
      await tx.do_that_lac.update({ where: { madothatlac: id }, data });
      // Kết thúc hồ sơ thì từ chối các yêu cầu nhận còn đang chờ
      if (dto.status === 'DaTraKhach' || dto.status === 'DongYeuCau')
        await tx.yeu_cau_nhan_do.updateMany({
          where: { madothatlac: id, trangthai: 'ChoXacMinh' },
          data: { trangthai: 'TuChoi', manhanvienxuly: identity.staffId ?? null, thoigianxuly: now },
        });
      await this.access.audit(tx, identity, req, 'UPDATE_LOST_ITEM_STATUS', 'do_that_lac', id,
        `Chuyển trạng thái đồ thất lạc sang ${LOST_STATUS_LABELS[dto.status]}.`,
        { trangthai: current.trangthai }, { trangthai: dto.status });
    });
    return this.detail(id);
  }

  /** Duyệt hoặc từ chối yêu cầu nhận đồ. Duyệt một yêu cầu thì các yêu cầu khác của món đồ bị từ chối. */
  async decideClaim(claimId: string, dto: ClaimDecisionDto, identity: Identity, req: Request) {
    let itemId = '';
    await this.prisma.$transaction(async (tx) => {
      const claim = await tx.yeu_cau_nhan_do.findUnique({
        where: { mayeucaunhando: claimId },
        include: { do_that_lac: true, don_hang: { select: { sodienthoainguoidat: true } } },
      });
      if (!claim) throw new NotFoundException('Không tìm thấy yêu cầu nhận đồ.');
      itemId = claim.madothatlac;
      if (claim.trangthai !== 'ChoXacMinh') throw new BadRequestException('Yêu cầu này đã được xử lý.');
      const approve = dto.decision === 'approve';
      if (approve && claim.do_that_lac.trangthai !== 'DaTimThay')
        throw new BadRequestException('Chỉ xác nhận được khi món đồ đang được lưu giữ.');
      if (approve && claim.don_hang && !samePhone(claim.don_hang.sodienthoainguoidat, claim.sodienthoaixacthuc))
        throw new BadRequestException('SĐT xác thực không khớp người đặt của đơn, không thể xác nhận.');
      if (!approve && !dto.note) throw new BadRequestException('Cần ghi lý do từ chối.');
      const now = new Date();
      await tx.yeu_cau_nhan_do.update({
        where: { mayeucaunhando: claimId },
        data: { trangthai: approve ? 'DaXacNhan' : 'TuChoi', manhanvienxuly: identity.staffId ?? null, thoigianxuly: now },
      });
      if (approve)
        await tx.yeu_cau_nhan_do.updateMany({
          where: { madothatlac: claim.madothatlac, trangthai: 'ChoXacMinh', mayeucaunhando: { not: claimId } },
          data: { trangthai: 'TuChoi', manhanvienxuly: identity.staffId ?? null, thoigianxuly: now },
        });
      if (dto.note)
        await tx.do_that_lac.update({
          where: { madothatlac: claim.madothatlac },
          data: { ghichu: [claim.do_that_lac.ghichu, `[${vnDate(now)}] ${claimId}: ${dto.note}`].filter(Boolean).join('\n'), thoigiancapnhat: now },
        });
      await this.access.audit(tx, identity, req, approve ? 'APPROVE_LOST_CLAIM' : 'REJECT_LOST_CLAIM', 'yeu_cau_nhan_do', claimId,
        approve ? 'Xác nhận yêu cầu nhận đồ.' : `Từ chối yêu cầu nhận đồ: ${dto.note}`);
    });
    return this.detail(itemId);
  }

  private toItem(row: ItemRow) {
    const trip = row.lich_trinh;
    return {
      id: row.madothatlac,
      type: row.loaighinhan,
      orderId: row.ve_xe?.madonhang ?? null,
      ticketId: row.mave,
      unknownOwner: row.loaighinhan === 'NhanVienNhatDuoc' && !row.mave && !row.makhachhang,
      customerId: row.makhachhang,
      customerName: row.tennguoibao ?? row.khach_hang?.hotenkhachhang ?? row.ve_xe?.hotenhanhkhach ?? null,
      phone: row.sodienthoai,
      email: row.email,
      scheduleId: trip?.malichtrinh ?? null,
      route: trip ? trip.tuyen_xe.tentuyen : null,
      plateNumber: trip?.xe.biensoxe ?? null,
      travelDate: trip ? vnDate(trip.thoigiankhoihanh) : null,
      reportedAt: row.thoigianbao.toISOString(),
      seat: row.vitrighe ?? row.ve_xe?.ghe_chuyen.ghe.soghe ?? null,
      itemName: row.tenvatpham,
      description: row.motavatpham,
      images: row.hinhanh,
      foundLocation: row.vitritimthay,
      foundAt: row.thoigiantimthay?.toISOString() ?? null,
      foundImages: row.hinhanhtimthay,
      storageLocation: row.vitriluutru,
      note: row.ghichu,
      status: row.trangthai,
      statusLabel: LOST_STATUS_LABELS[row.trangthai],
      nextStatuses: TRANSITIONS[row.trangthai],
      recordedBy: row.nhan_vien?.hoten ?? null,
      createdAt: row.thoigiantao.toISOString(),
      updatedAt: row.thoigiancapnhat.toISOString(),
      claims: row.yeu_cau_nhan_do.map((c) => ({
        id: c.mayeucaunhando,
        orderId: c.madonhang,
        ticketId: c.mave,
        phone: c.sodienthoaixacthuc,
        description: c.dacdiemnhandang,
        submittedAt: c.thoigiangui.toISOString(),
        status: c.trangthai,
        statusLabel: CLAIM_LABELS[c.trangthai],
        handledBy: c.nhan_vien?.hoten ?? null,
        handledAt: c.thoigianxuly?.toISOString() ?? null,
      })),
      pendingClaims: row.yeu_cau_nhan_do.filter((c) => c.trangthai === 'ChoXacMinh').length,
    };
  }
}
