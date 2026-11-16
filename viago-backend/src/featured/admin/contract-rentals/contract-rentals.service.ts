import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { Prisma, trang_thai_hop_dong_enum } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountsAccess, Identity } from '../../../shared/accounts/accounts-access';
import { pageMeta } from '../../../shared/http/pagination';
import {
  DEFAULT_DEPOSIT_RATE,
  RENTAL_STATUS_LABELS,
  RENTAL_VEHICLE_FLEET_TYPE,
  findStandardPrice,
  money,
  promotionDiscount,
  rentalCancellationFeeRate,
  rentalUnits,
} from '../../../shared/rental-pricing';
import { dedupKey, nextCode, withCodeRetry } from '../../../shared/sequential-code';
import { DAY_MS, vnDate, vnDayRange } from '../../../shared/vn-time';
import {
  AssignmentsDto,
  CancelDto,
  ContractCreateDto,
  ContractStatusDto,
  PaymentCreateDto,
  PriceListUpdateDto,
  QuoteCreateDto,
  QuoteDecisionDto,
  RentalContractsQueryDto,
  RentalQuotesQueryDto,
  RentalRequestsQueryDto,
} from './contract-rentals.dto';

type Tx = Prisma.TransactionClient;
const ACTIVE_CONTRACT: trang_thai_hop_dong_enum[] = ['MoiTao', 'DaKy', 'DaCoc', 'DangThucHien'];

const REQUEST_INCLUDE = {
  loai_xe_thue: { select: { tenloaixe: true, sokhachtoida: true } },
  khuyen_mai: { select: { magiamgia: true } },
  tai_xe_phu_xe: { select: { manhansu: true, hoten: true } },
  bao_gia_thue_xe: { orderBy: { phienban: 'desc' as const }, select: { mabaogia: true, phienban: true, trangthaibaogia: true, tongtien: true, thoigianhethan: true, hop_dong_thue_xe: { select: { mahopdong: true, trangthaihopdong: true } } } },
} satisfies Prisma.yeu_cau_thue_xeInclude;

const QUOTE_INCLUDE = {
  nhan_vien: { select: { hoten: true } },
  khuyen_mai: { select: { magiamgia: true } },
  hop_dong_thue_xe: { select: { mahopdong: true, trangthaihopdong: true } },
  yeu_cau_thue_xe: { include: { loai_xe_thue: { select: { tenloaixe: true } } } },
} satisfies Prisma.bao_gia_thue_xeInclude;

const CONTRACT_INCLUDE = {
  nhan_vien: { select: { manhanvien: true, hoten: true } },
  thanh_toan_thue_xe: { orderBy: { thoigiantao: 'asc' as const }, include: { nhan_vien: { select: { hoten: true } } } },
  phan_cong_xe_thue: { include: { xe: { select: { biensoxe: true, tenxe: true, loaixe: true } }, tai_xe_phu_xe: { select: { hoten: true, sodienthoai: true } } } },
  bao_gia_thue_xe: { include: { yeu_cau_thue_xe: { include: { loai_xe_thue: { select: { tenloaixe: true } } } } } },
} satisfies Prisma.hop_dong_thue_xeInclude;
type ContractRow = Prisma.hop_dong_thue_xeGetPayload<{ include: typeof CONTRACT_INCLUDE }>;

@Injectable()
export class AdminContractRentalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccountsAccess,
  ) {}

  // ===================== Tổng quan, bảng giá =====================

  async summary() {
    const [requests, quotes, contracts, paid] = await Promise.all([
      this.prisma.yeu_cau_thue_xe.groupBy({ by: ['trangthaiyeucau'], _count: true }),
      this.prisma.bao_gia_thue_xe.groupBy({ by: ['trangthaibaogia'], _count: true }),
      this.prisma.hop_dong_thue_xe.groupBy({ by: ['trangthaihopdong'], _count: true, _sum: { tongtienhopdong: true } }),
      this.prisma.thanh_toan_thue_xe.aggregate({ where: { trangthaithanhtoan: 'ThanhCong' }, _sum: { sotienthanhtoan: true } }),
    ]);
    const pick = <K extends string>(rows: ({ _count: number } & Record<string, unknown>)[], key: string, labels: Record<K, string>) =>
      Object.fromEntries((Object.keys(labels) as K[]).map((k) => [k, rows.find((r) => r[key] === k)?._count ?? 0]));
    return {
      requests: pick(requests, 'trangthaiyeucau', RENTAL_STATUS_LABELS.request),
      quotes: pick(quotes, 'trangthaibaogia', RENTAL_STATUS_LABELS.quote),
      contracts: pick(contracts, 'trangthaihopdong', RENTAL_STATUS_LABELS.contract),
      completedContractValue: money(contracts.find((c) => c.trangthaihopdong === 'HoanThanh')?._sum.tongtienhopdong),
      collected: money(paid._sum.sotienthanhtoan),
    };
  }

  async vehicleTypes() {
    const rows = await this.prisma.loai_xe_thue.findMany({ orderBy: { maloaixe: 'asc' } });
    return rows.map((r) => ({ id: r.maloaixe, name: r.tenloaixe, category: r.phanloaihienthi, maxPassengers: r.sokhachtoida, status: r.trangthai, fleetType: RENTAL_VEHICLE_FLEET_TYPE[r.maloaixe] ?? null }));
  }

  /** Bảng giá chuẩn, gom theo loại xe: nội tỉnh / liên tỉnh / theo ngày. */
  async priceList() {
    const types = await this.prisma.loai_xe_thue.findMany({ include: { bang_gia_chuan: { orderBy: { ngayapdung: 'desc' } } }, orderBy: { maloaixe: 'asc' } });
    return types.map((t) => {
      const pick = (scope: string) => {
        const row = t.bang_gia_chuan.find((p) => p.loaitinhgia === scope && p.trangthai === 'DangApDung') ?? t.bang_gia_chuan.find((p) => p.loaitinhgia === scope);
        return row ? { id: row.mabanggia, price: money(row.gianiemyet), unit: row.donvitinh, rentalScope: row.phamvihinhthucthue, status: row.trangthai, surchargeNote: row.motaphuphi } : null;
      };
      return {
        vehicleTypeId: t.maloaixe,
        vehicleType: t.tenloaixe,
        seats: t.sokhachtoida,
        inland: pick('NoiTinh'),
        intercity: pick('LienTinh'),
        daily: pick('TheoNgay'),
        status: t.bang_gia_chuan.some((p) => p.trangthai === 'DangApDung') ? 'DangApDung' : 'NgungApDung',
      };
    });
  }

  async updatePrice(id: string, dto: PriceListUpdateDto, identity: Identity, req: Request) {
    if (dto.price === undefined && dto.status === undefined && dto.surchargeNote === undefined) throw new BadRequestException('Không có thay đổi nào.');
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.bang_gia_chuan.findUnique({ where: { mabanggia: id } });
      if (!current) throw new NotFoundException('Không tìm thấy bảng giá.');
      const now = new Date();
      await tx.bang_gia_chuan.update({
        where: { mabanggia: id },
        data: {
          ...(dto.price !== undefined ? { gianiemyet: dto.price } : {}),
          ...(dto.status ? { trangthai: dto.status, ngayngungapdung: dto.status === 'NgungApDung' ? now : null } : {}),
          ...(dto.surchargeNote !== undefined ? { motaphuphi: dto.surchargeNote || null } : {}),
          nguoicapnhat: identity.accountId,
          thoigiancapnhat: now,
        },
      });
      await this.access.audit(tx, identity, req, 'UPDATE_RENTAL_PRICE', 'bang_gia_chuan', id, 'Cập nhật bảng giá thuê xe.',
        { gianiemyet: money(current.gianiemyet), trangthai: current.trangthai },
        { ...(dto.price !== undefined ? { gianiemyet: dto.price } : {}), ...(dto.status ? { trangthai: dto.status } : {}) });
    });
    return this.priceList();
  }

  // ===================== Yêu cầu thuê xe =====================

  async requests(q: RentalRequestsQueryDto) {
    const and: Prisma.yeu_cau_thue_xeWhereInput[] = [];
    if (q.status) and.push({ trangthaiyeucau: q.status });
    const range = vnDayRange(q.from, q.to);
    if (range) and.push({ thoigiandi: range });
    if (q.search) {
      const s = { contains: q.search, mode: 'insensitive' as const };
      and.push({ OR: [{ mayeucau: s }, { hotennguoiyeucau: s }, { sodienthoai: s }, { emailnguoiyeucau: s }, { diemdi: s }, { diemden: s }] });
    }
    const where = { AND: and };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.yeu_cau_thue_xe.count({ where }),
      this.prisma.yeu_cau_thue_xe.findMany({ where, include: REQUEST_INCLUDE, orderBy: [{ ngaytao: 'desc' }, { mayeucau: 'desc' }], skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    return { items: rows.map((r) => this.toRequest(r)), pagination: pageMeta(q.page, q.pageSize, total) };
  }

  async request(id: string) {
    const row = await this.prisma.yeu_cau_thue_xe.findUnique({ where: { mayeucau: id }, include: REQUEST_INCLUDE });
    if (!row) throw new NotFoundException('Không tìm thấy yêu cầu thuê xe.');
    const history = await this.prisma.lich_su_thue_xe.findMany({
      where: { mayeucau: id },
      include: { tai_khoan: { select: { nhan_vien: { select: { hoten: true } } } } },
      orderBy: [{ thoigianthuchien: 'asc' }, { malichsuthuexe: 'asc' }],
    });
    return {
      ...this.toRequest(row),
      history: history.map((h) => ({
        id: h.malichsuthuexe,
        event: h.loaisukien,
        content: h.noidung,
        fromStatus: h.trangthaitruoc,
        toStatus: h.trangthaisau,
        quoteId: h.mabaogia,
        contractId: h.mahopdong,
        by: h.tai_khoan?.nhan_vien?.hoten ?? (h.nguoithuchien ? h.nguoithuchien : 'Khách hàng'),
        at: h.thoigianthuchien.toISOString(),
        extra: h.dulieubosung,
      })),
    };
  }

  async cancelRequest(id: string, dto: CancelDto, identity: Identity, req: Request) {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.yeu_cau_thue_xe.findUnique({ where: { mayeucau: id }, include: { bao_gia_thue_xe: { include: { hop_dong_thue_xe: true } } } });
      if (!current) throw new NotFoundException('Không tìm thấy yêu cầu thuê xe.');
      if (['DaHuy', 'TuChoi'].includes(current.trangthaiyeucau)) throw new BadRequestException('Yêu cầu đã kết thúc.');
      if (current.bao_gia_thue_xe.some((q) => q.hop_dong_thue_xe && ACTIVE_CONTRACT.includes(q.hop_dong_thue_xe.trangthaihopdong)))
        throw new BadRequestException('Yêu cầu đã có hợp đồng, hãy hủy hợp đồng thay vì hủy yêu cầu.');
      const now = new Date();
      await tx.yeu_cau_thue_xe.update({ where: { mayeucau: id }, data: { trangthaiyeucau: 'DaHuy', lydohuy: dto.reason, thoigiancapnhat: now } });
      await tx.bao_gia_thue_xe.updateMany({ where: { mayeucau: id, trangthaibaogia: { in: ['Nhap', 'ChoKhachDuyet'] } }, data: { trangthaibaogia: 'DaHuy', thoigiancapnhat: now } });
      await this.history(tx, { requestId: id, event: 'HuyYeuCau', content: dto.reason, from: current.trangthaiyeucau, to: 'DaHuy', identity, entity: 'YeuCau' });
      await this.access.audit(tx, identity, req, 'CANCEL_RENTAL_REQUEST', 'yeu_cau_thue_xe', id, `Hủy yêu cầu thuê xe: ${dto.reason}`);
    });
    return this.request(id);
  }

  // ===================== Báo giá =====================

  async createQuote(requestId: string, dto: QuoteCreateDto, identity: Identity, req: Request) {
    if (!identity.staffId) throw new BadRequestException('Chỉ nhân viên mới lập được báo giá.');
    const quoteId = await withCodeRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const request = await tx.yeu_cau_thue_xe.findUnique({ where: { mayeucau: requestId }, include: { khuyen_mai: true, loai_xe_thue: true } });
        if (!request) throw new NotFoundException('Không tìm thấy yêu cầu thuê xe.');
        if (!['ChoBaoGia', 'DaBaoGia'].includes(request.trangthaiyeucau))
          throw new BadRequestException(`Không lập báo giá cho yêu cầu ở trạng thái "${RENTAL_STATUS_LABELS.request[request.trangthaiyeucau]}".`);

        const scope = dto.scope ?? (request.hinhthucthue === 'TuLai' ? 'TheoNgay' : 'LienTinh');
        const priceList =
          (dto.scope ? null : request.mabanggiathamchieu ? await tx.bang_gia_chuan.findUnique({ where: { mabanggia: request.mabanggiathamchieu } }) : null) ??
          (await findStandardPrice(tx, request.loaixeyeucau, request.hinhthucthue, scope));
        const unitPrice = dto.unitPrice ?? (priceList ? money(priceList.gianiemyet) : undefined);
        const unit = dto.unit ?? priceList?.donvitinh;
        if (unitPrice === undefined || !unit) throw new BadRequestException('Chưa có bảng giá, vui lòng nhập đơn giá và đơn vị tính.');
        const units = dto.units ?? rentalUnits(unit, request.thoigiandi, request.thoigianve);
        const vehicles = dto.vehicles ?? request.soluongxeyeucau;
        if (request.soluongkhach > request.loai_xe_thue.sokhachtoida * vehicles)
          throw new BadRequestException(`${vehicles} xe không đủ chỗ cho ${request.soluongkhach} khách.`);
        const basePrice = Math.round(unitPrice * units * vehicles);
        const surcharge = Math.round(dto.surcharge ?? 0);
        const promo =
          dto.promoCode === undefined
            ? request.khuyen_mai
            : dto.promoCode === ''
              ? null
              : await tx.khuyen_mai.findFirst({ where: { magiamgia: { equals: dto.promoCode, mode: 'insensitive' }, phamvidichvu: { in: ['ThueXe', 'TatCa'] }, trangthai: 'HoatDong' } });
        if (dto.promoCode && !promo) throw new BadRequestException('Mã khuyến mãi không hợp lệ cho thuê xe.');
        const discount = promo ? promotionDiscount(promo, basePrice) : 0;
        const total = basePrice + surcharge - discount;
        const deposit = Math.round(total * (dto.depositRate ?? DEFAULT_DEPOSIT_RATE));
        const now = new Date();
        const versions = await tx.bao_gia_thue_xe.aggregate({ where: { mayeucau: requestId }, _max: { phienban: true } });
        const id = await nextCode(tx, 'bao_gia_thue_xe', 'BGTX', 3);
        const summary = {
          HoTen: request.hotennguoiyeucau,
          SoDienThoai: request.sodienthoai,
          Email: request.emailnguoiyeucau,
          DiemDi: request.diemdi,
          DiemDen: request.diemden,
          ThoiGianDi: request.thoigiandi.toISOString(),
          ThoiGianVe: request.thoigianve?.toISOString() ?? null,
          MaLoaiXe: request.loaixeyeucau,
          SoLuongKhach: request.soluongkhach,
          SoLuongXe: vehicles,
          HinhThucThue: request.hinhthucthue,
          MaKhachHang: request.makhachhang,
        };
        // Báo giá mới thay thế báo giá cũ còn đang chờ khách
        await tx.bao_gia_thue_xe.updateMany({ where: { mayeucau: requestId, trangthaibaogia: { in: ['Nhap', 'ChoKhachDuyet'] } }, data: { trangthaibaogia: 'DaHuy', thoigiancapnhat: now } });
        await tx.bao_gia_thue_xe.create({
          data: {
            mabaogia: id,
            mayeucau: requestId,
            phienban: (versions._max.phienban ?? 0) + 1,
            manhanviensale: identity.staffId!,
            mabanggiathamchieu: priceList?.mabanggia ?? null,
            makhuyenmai: promo?.makhuyenmai ?? null,
            dongia: unitPrice,
            donvitinh: unit,
            sodonvitinh: units,
            soluongxe: vehicles,
            giacoban: basePrice,
            tongphuphi: surcharge,
            sotiengiam: discount,
            tongtien: total,
            yeucautiencoc: deposit,
            thongtinyeucauchot: summary,
            dieukhoanbaogia: dto.terms ?? this.defaultQuoteTerms(vehicles, request.soluongkhach, request.hinhthucthue, request.diemdi, request.diemden),
            trangthaibaogia: 'ChoKhachDuyet',
            thoigiantao: now,
            thoigiangui: now,
            thoigianhethan: new Date(now.getTime() + (dto.validDays ?? 3) * DAY_MS),
            thoigiancapnhat: now,
          },
        });
        await tx.yeu_cau_thue_xe.update({ where: { mayeucau: requestId }, data: { trangthaiyeucau: 'DaBaoGia', thoigiancapnhat: now } });
        await this.history(tx, { requestId, quoteId: id, event: 'GuiBaoGia', content: 'Nhân viên gửi báo giá', from: request.trangthaiyeucau, to: 'DaBaoGia', identity, entity: 'BaoGia', extra: { TongTien: total, TienCoc: deposit } });
        await this.access.audit(tx, identity, req, 'CREATE_RENTAL_QUOTE', 'bao_gia_thue_xe', id, `Lập báo giá cho yêu cầu ${requestId}.`);
        return id;
      }),
    );
    return this.quote(quoteId);
  }

  async quotes(q: RentalQuotesQueryDto) {
    await this.expireQuotes();
    const and: Prisma.bao_gia_thue_xeWhereInput[] = [];
    if (q.status) and.push({ trangthaibaogia: q.status });
    const range = vnDayRange(q.from, q.to);
    if (range) and.push({ thoigiantao: range });
    if (q.search) {
      const s = { contains: q.search, mode: 'insensitive' as const };
      and.push({ OR: [{ mabaogia: s }, { mayeucau: s }, { yeu_cau_thue_xe: { hotennguoiyeucau: s } }, { yeu_cau_thue_xe: { sodienthoai: s } }] });
    }
    const where = { AND: and };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.bao_gia_thue_xe.count({ where }),
      this.prisma.bao_gia_thue_xe.findMany({ where, include: QUOTE_INCLUDE, orderBy: [{ thoigiantao: 'desc' }, { mabaogia: 'desc' }], skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    return { items: rows.map((r) => this.toQuote(r)), pagination: pageMeta(q.page, q.pageSize, total) };
  }

  async quote(id: string) {
    await this.expireQuotes();
    const row = await this.prisma.bao_gia_thue_xe.findUnique({ where: { mabaogia: id }, include: QUOTE_INCLUDE });
    if (!row) throw new NotFoundException('Không tìm thấy báo giá.');
    return this.toQuote(row);
  }

  async decideQuote(id: string, dto: QuoteDecisionDto, identity: Identity, req: Request) {
    if (dto.decision === 'reject' && !dto.reason) throw new BadRequestException('Cần ghi lý do khách từ chối.');
    await this.expireQuotes();
    await this.prisma.$transaction(async (tx) => {
      const quote = await tx.bao_gia_thue_xe.findUnique({ where: { mabaogia: id }, include: { yeu_cau_thue_xe: true } });
      if (!quote) throw new NotFoundException('Không tìm thấy báo giá.');
      if (quote.trangthaibaogia !== 'ChoKhachDuyet')
        throw new BadRequestException(`Báo giá đang ở trạng thái "${RENTAL_STATUS_LABELS.quote[quote.trangthaibaogia]}".`);
      const accept = dto.decision === 'accept';
      const now = new Date();
      await tx.bao_gia_thue_xe.update({ where: { mabaogia: id }, data: { trangthaibaogia: accept ? 'DongY' : 'TuChoi', lydotuchoi: accept ? null : dto.reason, thoigianphanhoi: now, thoigiancapnhat: now } });
      await tx.yeu_cau_thue_xe.update({ where: { mayeucau: quote.mayeucau }, data: { trangthaiyeucau: accept ? 'DongY' : 'TuChoi', thoigiancapnhat: now } });
      await this.history(tx, { requestId: quote.mayeucau, quoteId: id, event: accept ? 'KhachDongY' : 'KhachTuChoi', content: accept ? 'Khách xác nhận báo giá (nhân viên ghi nhận)' : `Khách từ chối: ${dto.reason}`, from: quote.yeu_cau_thue_xe.trangthaiyeucau, to: accept ? 'DongY' : 'TuChoi', identity, entity: 'BaoGia' });
      await this.access.audit(tx, identity, req, accept ? 'ACCEPT_RENTAL_QUOTE' : 'REJECT_RENTAL_QUOTE', 'bao_gia_thue_xe', id, 'Ghi nhận phản hồi báo giá của khách.');
    });
    return this.quote(id);
  }

  // ===================== Hợp đồng =====================

  async createContract(quoteId: string, dto: ContractCreateDto, identity: Identity, req: Request) {
    const contractId = await withCodeRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const quote = await tx.bao_gia_thue_xe.findUnique({ where: { mabaogia: quoteId }, include: { yeu_cau_thue_xe: { include: { loai_xe_thue: true } }, hop_dong_thue_xe: true } });
        if (!quote) throw new NotFoundException('Không tìm thấy báo giá.');
        if (quote.trangthaibaogia !== 'DongY') throw new BadRequestException('Chỉ lập hợp đồng từ báo giá khách đã đồng ý.');
        if (quote.hop_dong_thue_xe) throw new BadRequestException(`Báo giá đã có hợp đồng ${quote.hop_dong_thue_xe.mahopdong}.`);
        const request = quote.yeu_cau_thue_xe;
        const start = dto.startAt ? new Date(dto.startAt) : request.thoigiandi;
        const end = dto.endAt ? new Date(dto.endAt) : (request.thoigianve ?? new Date(start.getTime() + DAY_MS));
        if (end <= start) throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu.');
        const staffId = dto.staffInChargeId ?? identity.staffId;
        if (!staffId) throw new BadRequestException('Cần chọn nhân viên phụ trách.');
        const staff = await tx.nhan_vien.findFirst({ where: { manhanvien: staffId, trangthai: 'HoatDong' }, select: { manhanvien: true } });
        if (!staff) throw new BadRequestException('Nhân viên phụ trách không hợp lệ.');

        const now = new Date();
        const id = await nextCode(tx, 'hop_dong_thue_xe', 'HDTX', 3);
        const total = money(quote.tongtien);
        const deposit = money(quote.yeucautiencoc);
        await tx.hop_dong_thue_xe.create({
          data: {
            mahopdong: id,
            mabaogia: quoteId,
            tongtienhopdong: total,
            yeucautiencoc: deposit,
            tiencocdathu: 0,
            thongtinbenthue: { MaKhachHang: request.makhachhang, HoTen: request.hotennguoiyeucau, SoDienThoai: request.sodienthoai, Email: request.emailnguoiyeucau },
            thongtinhanhtrinh: { DiemDi: request.diemdi, DiemDen: request.diemden, ThoiGianDi: start.toISOString(), ThoiGianVe: end.toISOString(), MaLoaiXe: request.loaixeyeucau, SoLuongXe: quote.soluongxe, SoLuongKhach: request.soluongkhach, HinhThucThue: request.hinhthucthue },
            dieukhoanhopdong: dto.terms ?? this.defaultContractTerms(request.hinhthucthue, request.loai_xe_thue.tenloaixe, quote.soluongxe, request.soluongkhach, total, deposit, request.loai_xe_thue.dieukienthechap),
            trangthaihopdong: 'DaKy',
            manhanvienphutrach: staffId,
            nguoitao: identity.accountId,
            thoigiantao: now,
            thoigianky: now,
            thoigianbatdau: start,
            thoigianketthuc: end,
            thoigiancapnhat: now,
          },
        });
        if (quote.makhuyenmai)
          await tx.khuyen_mai.update({ where: { makhuyenmai: quote.makhuyenmai }, data: { soluongdadung: { increment: 1 } } });
        await this.history(tx, { requestId: request.mayeucau, quoteId, contractId: id, event: 'TaoHopDong', content: 'Tạo hợp đồng', to: 'DaKy', identity, entity: 'HopDong' });
        await this.access.audit(tx, identity, req, 'CREATE_RENTAL_CONTRACT', 'hop_dong_thue_xe', id, `Lập hợp đồng từ báo giá ${quoteId}.`);
        return id;
      }),
    );
    return this.contract(contractId);
  }

  async contracts(q: RentalContractsQueryDto) {
    const and: Prisma.hop_dong_thue_xeWhereInput[] = [];
    if (q.status) and.push({ trangthaihopdong: q.status });
    const range = vnDayRange(q.from, q.to);
    if (range) and.push({ thoigianbatdau: range });
    if (q.search) {
      const s = { contains: q.search, mode: 'insensitive' as const };
      and.push({ OR: [{ mahopdong: s }, { mabaogia: s }, { bao_gia_thue_xe: { yeu_cau_thue_xe: { hotennguoiyeucau: s } } }, { bao_gia_thue_xe: { yeu_cau_thue_xe: { sodienthoai: s } } }] });
    }
    const where = { AND: and };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.hop_dong_thue_xe.count({ where }),
      this.prisma.hop_dong_thue_xe.findMany({ where, include: CONTRACT_INCLUDE, orderBy: [{ thoigiantao: 'desc' }, { mahopdong: 'desc' }], skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    return { items: rows.map((r) => this.toContract(r)), pagination: pageMeta(q.page, q.pageSize, total) };
  }

  async contract(id: string) {
    const row = await this.prisma.hop_dong_thue_xe.findUnique({ where: { mahopdong: id }, include: CONTRACT_INCLUDE });
    if (!row) throw new NotFoundException('Không tìm thấy hợp đồng.');
    return this.toContract(row);
  }

  /** Ghi nhận khoản thu. Đủ tiền cọc thì hợp đồng chuyển sang "Đã cọc". */
  async addPayment(id: string, dto: PaymentCreateDto, identity: Identity, req: Request) {
    await withCodeRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const contract = await tx.hop_dong_thue_xe.findUnique({ where: { mahopdong: id }, include: { thanh_toan_thue_xe: true, bao_gia_thue_xe: { select: { mayeucau: true } } } });
        if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng.');
        if (['DaHuy', 'HoanThanh'].includes(contract.trangthaihopdong)) throw new BadRequestException('Hợp đồng đã kết thúc, không thu thêm.');
        const paid = contract.thanh_toan_thue_xe.filter((p) => p.trangthaithanhtoan === 'ThanhCong' && p.loaithanhtoan !== 'PhatSinh').reduce((s, p) => s + money(p.sotienthanhtoan), 0);
        const total = money(contract.tongtienhopdong);
        if (dto.type === 'TienCoc' && contract.trangthaihopdong !== 'DaKy') throw new BadRequestException('Chỉ thu cọc khi hợp đồng vừa ký.');
        if (dto.type === 'ThanhToanConLai' && !['DaCoc', 'DangThucHien'].includes(contract.trangthaihopdong)) throw new BadRequestException('Cần thu cọc trước khi thanh toán phần còn lại.');
        if (dto.type !== 'PhatSinh' && paid + dto.amount > total) throw new BadRequestException(`Số tiền vượt quá phần còn phải thu (${(total - paid).toLocaleString('vi-VN')}đ).`);
        if (dto.type === 'PhatSinh' && !dto.note) throw new BadRequestException('Khoản phát sinh cần ghi nội dung.');
        const now = new Date();
        const paymentId = await nextCode(tx, 'thanh_toan_thue_xe', 'TTTX', 3);
        await tx.thanh_toan_thue_xe.create({
          data: {
            mathanhtoantx: paymentId,
            mahopdong: id,
            khoachonglap: dedupKey(paymentId, 'TTTX', vnDate(now)),
            loaithanhtoan: dto.type,
            phuongthucthanhtoan: dto.method,
            kenhthanhtoan: 'TaiQuay',
            sotienthanhtoan: dto.amount,
            noidungthanhtoan: dto.note ?? (dto.type === 'TienCoc' ? `Thu cọc ${id}` : `Thanh toán phần còn lại ${id}`),
            trangthaithanhtoan: 'ThanhCong',
            magiaodichdoitac: dto.partnerTransactionId ?? null,
            manhanvienthu: identity.staffId ?? null,
            thoigiantao: now,
            thoigianthanhtoan: now,
            thoigiancapnhat: now,
          },
        });
        const depositPaid = money(contract.tiencocdathu) + (dto.type === 'TienCoc' ? dto.amount : 0);
        const reachedDeposit = dto.type === 'TienCoc' && depositPaid >= money(contract.yeucautiencoc);
        await tx.hop_dong_thue_xe.update({
          where: { mahopdong: id },
          data: { tiencocdathu: depositPaid, ...(reachedDeposit ? { trangthaihopdong: 'DaCoc' } : {}), thoigiancapnhat: now },
        });
        await this.history(tx, {
          requestId: contract.bao_gia_thue_xe.mayeucau, contractId: id, event: dto.type === 'TienCoc' ? 'ThuCoc' : dto.type === 'PhatSinh' ? 'ThuPhatSinh' : 'ThuConLai',
          content: `Thu ${dto.amount.toLocaleString('vi-VN')}đ (${dto.method})`, from: contract.trangthaihopdong, to: reachedDeposit ? 'DaCoc' : contract.trangthaihopdong, identity, entity: 'HopDong',
        });
        await this.access.audit(tx, identity, req, 'CREATE_RENTAL_PAYMENT', 'thanh_toan_thue_xe', paymentId, `Ghi nhận thanh toán hợp đồng ${id}.`);
      }),
    );
    return this.contract(id);
  }

  /** Phân công xe (và tài xế với thuê có tài xế). Kiểm tra đúng loại xe, còn hạn, không trùng lịch. */
  async assign(id: string, dto: AssignmentsDto, identity: Identity, req: Request) {
    await this.prisma.$transaction(async (tx) => {
      const contract = await tx.hop_dong_thue_xe.findUnique({ where: { mahopdong: id }, include: { bao_gia_thue_xe: { include: { yeu_cau_thue_xe: true } } } });
      if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng.');
      if (!['DaKy', 'DaCoc'].includes(contract.trangthaihopdong)) throw new BadRequestException('Chỉ phân công khi hợp đồng chưa bắt đầu.');
      const request = contract.bao_gia_thue_xe.yeu_cau_thue_xe;
      const quoteVehicles = contract.bao_gia_thue_xe.soluongxe;
      if (dto.items.length !== quoteVehicles) throw new BadRequestException(`Hợp đồng cần đúng ${quoteVehicles} xe.`);
      const vehicleIds = dto.items.map((i) => i.vehicleId);
      if (new Set(vehicleIds).size !== vehicleIds.length) throw new BadRequestException('Một xe được chọn hai lần.');
      const driverIds = dto.items.map((i) => i.driverId).filter((d): d is string => !!d);
      if (new Set(driverIds).size !== driverIds.length) throw new BadRequestException('Một tài xế được chọn cho hai xe.');
      const needDriver = request.hinhthucthue === 'CoTaiXe';
      if (needDriver && driverIds.length !== dto.items.length) throw new BadRequestException('Thuê có tài xế: mỗi xe cần một tài xế.');
      if (!needDriver && driverIds.length) throw new BadRequestException('Thuê tự lái: không phân công tài xế.');

      const start = contract.thoigianbatdau;
      const end = contract.thoigianketthuc;
      const fleetType = RENTAL_VEHICLE_FLEET_TYPE[request.loaixeyeucau];
      const vehicles = await tx.xe.findMany({ where: { maxe: { in: vehicleIds } } });
      for (const vid of vehicleIds) {
        const v = vehicles.find((x) => x.maxe === vid);
        if (!v) throw new BadRequestException(`Không tìm thấy xe ${vid}.`);
        if (v.trangthai !== 'DangHoatDong') throw new BadRequestException(`Xe ${v.biensoxe} đang bảo trì hoặc đã khóa.`);
        if (fleetType && v.loaixe !== fleetType) throw new BadRequestException(`Xe ${v.biensoxe} không đúng loại xe khách thuê.`);
        if (v.handangkiem < end || v.hanbaohiem < end) throw new BadRequestException(`Xe ${v.biensoxe} hết hạn đăng kiểm/bảo hiểm trước khi kết thúc hợp đồng.`);
      }
      const drivers = driverIds.length ? await tx.tai_xe_phu_xe.findMany({ where: { manhansu: { in: driverIds } } }) : [];
      for (const did of driverIds) {
        const d = drivers.find((x) => x.manhansu === did);
        if (!d || d.vaitro !== 'TaiXe') throw new BadRequestException(`Không tìm thấy tài xế ${did}.`);
        if (d.trangthai !== 'DangHoatDong') throw new BadRequestException(`Tài xế ${d.hoten} không ở trạng thái hoạt động.`);
        if (!d.hanggplx || !['D', 'E'].includes(d.hanggplx)) throw new BadRequestException(`Tài xế ${d.hoten} không có bằng hạng D/E.`);
        if (!d.hangplx || d.hangplx < end) throw new BadRequestException(`Bằng lái của ${d.hoten} hết hạn trước khi kết thúc hợp đồng.`);
      }
      // Trùng lịch với chuyến xe khách
      const busyTrips = await tx.lich_trinh.findMany({
        where: {
          trangthai: { not: 'DaHuy' },
          thoigiankhoihanh: { lt: end },
          thoigiandendukien: { gt: start },
          OR: [{ maxe: { in: vehicleIds } }, ...(driverIds.length ? [{ mataixechinh: { in: driverIds } }, { maphuxe: { in: driverIds } }] : [])],
        },
        select: { malichtrinh: true, maxe: true, mataixechinh: true, maphuxe: true },
      });
      if (busyTrips.length) throw new BadRequestException(`Xe hoặc tài xế đã có lịch chạy trùng thời gian (lịch trình ${busyTrips.map((t) => t.malichtrinh).join(', ')}).`);
      // Trùng với hợp đồng thuê khác đang hiệu lực
      const busyContracts = await tx.phan_cong_xe_thue.findMany({
        where: {
          mahopdong: { not: id },
          hop_dong_thue_xe: { trangthaihopdong: { in: ACTIVE_CONTRACT }, thoigianbatdau: { lt: end }, thoigianketthuc: { gt: start } },
          OR: [{ maxe: { in: vehicleIds } }, ...(driverIds.length ? [{ mataixe: { in: driverIds } }] : [])],
        },
        select: { mahopdong: true },
      });
      if (busyContracts.length) throw new BadRequestException(`Xe hoặc tài xế đã được phân cho hợp đồng ${[...new Set(busyContracts.map((c) => c.mahopdong))].join(', ')}.`);

      await tx.phan_cong_xe_thue.deleteMany({ where: { mahopdong: id } });
      await tx.phan_cong_xe_thue.createMany({ data: dto.items.map((i) => ({ mahopdong: id, maxe: i.vehicleId, mataixe: i.driverId ?? null, ghichu: i.note ?? null })) });
      await tx.hop_dong_thue_xe.update({ where: { mahopdong: id }, data: { thoigiancapnhat: new Date() } });
      await this.history(tx, { requestId: request.mayeucau, contractId: id, event: 'PhanCongXe', content: `Phân công ${dto.items.length} xe`, identity, entity: 'HopDong', extra: { Xe: vehicleIds, TaiXe: driverIds } });
      await this.access.audit(tx, identity, req, 'ASSIGN_RENTAL_VEHICLES', 'hop_dong_thue_xe', id, 'Phân công xe/tài xế cho hợp đồng thuê.');
    });
    return this.contract(id);
  }

  /** Bắt đầu, hoàn thành hoặc hủy hợp đồng. Hủy tính phí trên tiền cọc theo thời gian còn lại. */
  async updateContractStatus(id: string, dto: ContractStatusDto, identity: Identity, req: Request) {
    let cancellation: { feeRate: number; fee: number; refund: number } | null = null;
    await this.prisma.$transaction(async (tx) => {
      const contract = await tx.hop_dong_thue_xe.findUnique({ where: { mahopdong: id }, include: { thanh_toan_thue_xe: true, phan_cong_xe_thue: true, bao_gia_thue_xe: true } });
      if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng.');
      const from = contract.trangthaihopdong;
      const now = new Date();
      const data: Prisma.hop_dong_thue_xeUncheckedUpdateInput = { trangthaihopdong: dto.status, thoigiancapnhat: now };
      if (dto.status === 'DangThucHien') {
        if (from !== 'DaCoc') throw new BadRequestException('Chỉ bắt đầu hợp đồng đã thu cọc.');
        if (contract.phan_cong_xe_thue.length !== contract.bao_gia_thue_xe.soluongxe) throw new BadRequestException('Cần phân công đủ xe trước khi bắt đầu.');
        data.thoigianbatdauthucte = now;
      } else if (dto.status === 'HoanThanh') {
        if (from !== 'DangThucHien') throw new BadRequestException('Chỉ hoàn thành hợp đồng đang thực hiện.');
        const paid = contract.thanh_toan_thue_xe.filter((p) => p.trangthaithanhtoan === 'ThanhCong' && p.loaithanhtoan !== 'PhatSinh').reduce((s, p) => s + money(p.sotienthanhtoan), 0);
        if (paid < money(contract.tongtienhopdong)) throw new BadRequestException(`Còn thiếu ${(money(contract.tongtienhopdong) - paid).toLocaleString('vi-VN')}đ chưa thu.`);
        data.thoigianketthucthucte = now;
      } else {
        if (!['MoiTao', 'DaKy', 'DaCoc'].includes(from)) throw new BadRequestException('Chỉ hủy hợp đồng chưa bắt đầu.');
        if (!dto.reason) throw new BadRequestException('Cần ghi lý do hủy hợp đồng.');
        const feeRate = rentalCancellationFeeRate(contract.thoigianbatdau, now);
        const deposit = money(contract.tiencocdathu);
        cancellation = { feeRate, fee: Math.round(deposit * feeRate), refund: Math.round(deposit * (1 - feeRate)) };
        Object.assign(data, { lydohuy: dto.reason, thoigianhuy: now });
        await tx.yeu_cau_thue_xe.update({ where: { mayeucau: contract.bao_gia_thue_xe.mayeucau }, data: { trangthaiyeucau: 'DaHuy', lydohuy: dto.reason, thoigiancapnhat: now } });
      }
      await tx.hop_dong_thue_xe.update({ where: { mahopdong: id }, data });
      await this.history(tx, {
        requestId: contract.bao_gia_thue_xe.mayeucau, contractId: id,
        event: dto.status === 'DangThucHien' ? 'BatDau' : dto.status === 'HoanThanh' ? 'HoanThanh' : 'HuyHopDong',
        content: dto.status === 'DaHuy' ? `Hủy hợp đồng: ${dto.reason}` : RENTAL_STATUS_LABELS.contract[dto.status],
        from, to: dto.status, identity, entity: 'HopDong', extra: cancellation ? { PhiHuy: cancellation.fee, HoanCoc: cancellation.refund, TyLePhi: cancellation.feeRate } : undefined,
      });
      await this.access.audit(tx, identity, req, 'UPDATE_RENTAL_CONTRACT_STATUS', 'hop_dong_thue_xe', id, `Chuyển hợp đồng sang ${RENTAL_STATUS_LABELS.contract[dto.status]}.`, { trangthai: from }, { trangthai: dto.status });
    });
    return { ...(await this.contract(id)), cancellation };
  }

  /** Lựa chọn xe và tài xế còn trống trong thời gian của hợp đồng. */
  async assignmentOptions(id: string) {
    const contract = await this.prisma.hop_dong_thue_xe.findUnique({ where: { mahopdong: id }, include: { bao_gia_thue_xe: { include: { yeu_cau_thue_xe: true } } } });
    if (!contract) throw new NotFoundException('Không tìm thấy hợp đồng.');
    const request = contract.bao_gia_thue_xe.yeu_cau_thue_xe;
    const start = contract.thoigianbatdau;
    const end = contract.thoigianketthuc;
    const busyTrips = await this.prisma.lich_trinh.findMany({ where: { trangthai: { not: 'DaHuy' }, thoigiankhoihanh: { lt: end }, thoigiandendukien: { gt: start } }, select: { maxe: true, mataixechinh: true, maphuxe: true } });
    const busyRentals = await this.prisma.phan_cong_xe_thue.findMany({ where: { mahopdong: { not: id }, hop_dong_thue_xe: { trangthaihopdong: { in: ACTIVE_CONTRACT }, thoigianbatdau: { lt: end }, thoigianketthuc: { gt: start } } }, select: { maxe: true, mataixe: true } });
    const busyVehicles = new Set([...busyTrips.map((t) => t.maxe), ...busyRentals.map((r) => r.maxe)]);
    const busyDrivers = new Set([...busyTrips.flatMap((t) => [t.mataixechinh, t.maphuxe]), ...busyRentals.map((r) => r.mataixe)].filter(Boolean) as string[]);
    const fleetType = RENTAL_VEHICLE_FLEET_TYPE[request.loaixeyeucau];
    const vehicles = await this.prisma.xe.findMany({ where: { trangthai: 'DangHoatDong', ...(fleetType ? { loaixe: fleetType } : {}), handangkiem: { gte: end }, hanbaohiem: { gte: end } }, orderBy: { maxe: 'asc' } });
    const drivers = request.hinhthucthue === 'CoTaiXe'
      ? await this.prisma.tai_xe_phu_xe.findMany({ where: { vaitro: 'TaiXe', trangthai: 'DangHoatDong', hanggplx: { in: ['D', 'E'] }, hangplx: { gte: end } }, orderBy: { hoten: 'asc' } })
      : [];
    return {
      vehiclesNeeded: contract.bao_gia_thue_xe.soluongxe,
      needDriver: request.hinhthucthue === 'CoTaiXe',
      preferredDriverId: request.mataixemongmuon,
      vehicles: vehicles.map((v) => ({ id: v.maxe, name: v.tenxe, plateNumber: v.biensoxe, type: v.loaixe, available: !busyVehicles.has(v.maxe) })),
      drivers: drivers.map((d) => ({ id: d.manhansu, name: d.hoten, licenseClass: d.hanggplx, available: !busyDrivers.has(d.manhansu) })),
    };
  }

  // ===================== Tiện ích =====================

  /** Báo giá quá hạn mà khách chưa phản hồi thì chuyển "Hết hiệu lực". */
  private async expireQuotes() {
    await this.prisma.bao_gia_thue_xe.updateMany({
      where: { trangthaibaogia: 'ChoKhachDuyet', thoigianhethan: { lt: new Date() } },
      data: { trangthaibaogia: 'HetHan', thoigiancapnhat: new Date() },
    });
  }

  private async history(
    tx: Tx,
    h: { requestId: string; quoteId?: string; contractId?: string; event: string; content: string; from?: string; to?: string; identity: Identity; entity: string; extra?: Record<string, unknown> },
  ) {
    await tx.lich_su_thue_xe.create({
      data: {
        malichsuthuexe: await nextCode(tx, 'lich_su_thue_xe', 'LSTX', 3),
        mayeucau: h.requestId,
        mabaogia: h.quoteId ?? null,
        mahopdong: h.contractId ?? null,
        loaisukien: h.event,
        noidung: h.content,
        trangthaitruoc: h.from ?? null,
        trangthaisau: h.to ?? null,
        nguoithuchien: h.identity.accountId,
        thoigianthuchien: new Date(),
        dulieubosung: JSON.parse(JSON.stringify({ ThucThe: h.entity, ...h.extra })) as Prisma.InputJsonObject,
      },
    });
  }

  private defaultQuoteTerms(vehicles: number, passengers: number, type: string, from: string, to: string) {
    return [
      `Báo giá áp dụng cho ${vehicles} xe, ${passengers} khách theo hình thức ${type === 'TuLai' ? 'thuê xe tự lái' : 'thuê xe có tài xế VIAGO'}, hành trình ${from} – ${to} và thời gian đã chốt trong yêu cầu.`,
      'Tổng tiền gồm giá cơ bản, phụ phí đã liệt kê và khoản giảm giá được xác nhận trong báo giá.',
      'Khách xác nhận trong thời hạn hiệu lực của báo giá. Hợp đồng chỉ được lập từ báo giá đã được đồng ý; tiền đặt cọc bằng 30% tổng tiền sau giảm giá.',
      'Hủy hoặc đổi lịch được đối chiếu theo điều khoản thuê xe trong hợp đồng; phí hủy thuê xe tính trên tiền đặt cọc.',
    ].join(' ');
  }

  private defaultContractTerms(type: string, vehicleName: string, vehicles: number, passengers: number, total: number, deposit: number, collateral: string | null) {
    const vnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
    return [
      type === 'TuLai'
        ? 'Hình thức thuê tự lái: người nhận xe xuất trình giấy tờ tùy thân và giấy phép lái xe còn hiệu lực, phù hợp với loại xe; hai bên lập biên bản bàn giao xe.'
        : 'Hình thức thuê có tài xế: tài xế VIAGO điều khiển xe theo hành trình đã xác nhận; khách không phải thế chấp tài sản.',
      `Phục vụ ${passengers} khách trên ${vehicles} xe ${vehicleName}.`,
      `Tổng tiền hợp đồng ${vnd(total)}; tiền đặt cọc ${vnd(deposit)}. Khoản còn lại ${vnd(total - deposit)} thanh toán khi hoàn tất dịch vụ.`,
      ...(type === 'TuLai' && collateral ? [`Điều kiện bảo đảm bàn giao xe: ${collateral}. Khoản bảo đảm tách biệt với tiền đặt cọc.`] : []),
      'Thay đổi lộ trình, ngày giờ, số khách hoặc số xe cần được hai bên xác nhận trước khi thực hiện.',
      'Hủy trước giờ bắt đầu từ 7 ngày trở lên: miễn phí, hoàn toàn bộ tiền cọc.',
      'Hủy từ 3 ngày đến dưới 7 ngày: phí hủy bằng 30% tiền cọc.',
      'Hủy từ 24 giờ đến dưới 3 ngày: phí hủy bằng 50% tiền cọc.',
      'Hủy dưới 24 giờ trước giờ bắt đầu: phí hủy bằng 100% tiền cọc.',
      'Không mang hóa chất, chất cháy nổ hoặc hàng cấm lên xe; không hút thuốc trong khoang xe.',
    ];
  }

  private toRequest(r: Prisma.yeu_cau_thue_xeGetPayload<{ include: typeof REQUEST_INCLUDE }>) {
    const latest = r.bao_gia_thue_xe[0];
    return {
      code: r.mayeucau,
      customerId: r.makhachhang,
      customer: r.hotennguoiyeucau,
      phone: r.sodienthoai,
      email: r.emailnguoiyeucau,
      vehicleTypeId: r.loaixeyeucau,
      vehicleType: r.loai_xe_thue.tenloaixe,
      rentalType: r.hinhthucthue,
      guests: r.soluongkhach,
      vehicles: r.soluongxeyeucau,
      pickup: r.diemdi,
      destination: r.diemden,
      departure: r.thoigiandi.toISOString(),
      returnAt: r.thoigianve?.toISOString() ?? null,
      preferredDriver: r.tai_xe_phu_xe ? { id: r.tai_xe_phu_xe.manhansu, name: r.tai_xe_phu_xe.hoten } : null,
      promoCode: r.khuyen_mai?.magiamgia ?? null,
      estimate: { unitPrice: money(r.dongiatamtinh), unit: r.donvitinhgiatamtinh, units: money(r.sodonvitinhtamtinh), basePrice: money(r.tongtiencobantamtinh), surcharge: money(r.tongphuphitamtinh), discount: money(r.sotiengiamtamtinh), total: money(r.giatamtinh) },
      note: r.ghichu,
      status: r.trangthaiyeucau,
      statusLabel: RENTAL_STATUS_LABELS.request[r.trangthaiyeucau],
      cancelReason: r.lydohuy,
      createdAt: r.ngaytao.toISOString(),
      updatedAt: r.thoigiancapnhat.toISOString(),
      latestQuote: latest ? { code: latest.mabaogia, version: latest.phienban, status: latest.trangthaibaogia, statusLabel: RENTAL_STATUS_LABELS.quote[latest.trangthaibaogia], total: money(latest.tongtien) } : null,
      contract: r.bao_gia_thue_xe.map((q) => q.hop_dong_thue_xe).find(Boolean) ?? null,
      canQuote: ['ChoBaoGia', 'DaBaoGia'].includes(r.trangthaiyeucau),
    };
  }

  private toQuote(q: Prisma.bao_gia_thue_xeGetPayload<{ include: typeof QUOTE_INCLUDE }>) {
    const r = q.yeu_cau_thue_xe;
    return {
      code: q.mabaogia,
      requestCode: q.mayeucau,
      version: q.phienban,
      customer: r.hotennguoiyeucau,
      phone: r.sodienthoai,
      email: r.emailnguoiyeucau,
      vehicleType: r.loai_xe_thue.tenloaixe,
      rentalType: r.hinhthucthue,
      vehicles: q.soluongxe,
      guests: r.soluongkhach,
      pickup: r.diemdi,
      destination: r.diemden,
      departure: r.thoigiandi.toISOString(),
      returnAt: r.thoigianve?.toISOString() ?? null,
      unitPrice: money(q.dongia),
      unit: q.donvitinh,
      units: money(q.sodonvitinh),
      basePrice: money(q.giacoban),
      fees: money(q.tongphuphi),
      discount: money(q.sotiengiam),
      total: money(q.tongtien),
      deposit: money(q.yeucautiencoc),
      promoCode: q.khuyen_mai?.magiamgia ?? null,
      terms: q.dieukhoanbaogia,
      status: q.trangthaibaogia,
      statusLabel: RENTAL_STATUS_LABELS.quote[q.trangthaibaogia],
      rejectReason: q.lydotuchoi,
      salesStaff: q.nhan_vien.hoten,
      createdAt: q.thoigiantao.toISOString(),
      sentAt: q.thoigiangui?.toISOString() ?? null,
      expiresAt: q.thoigianhethan?.toISOString() ?? null,
      respondedAt: q.thoigianphanhoi?.toISOString() ?? null,
      contract: q.hop_dong_thue_xe ? { code: q.hop_dong_thue_xe.mahopdong, status: q.hop_dong_thue_xe.trangthaihopdong } : null,
      canCreateContract: q.trangthaibaogia === 'DongY' && !q.hop_dong_thue_xe,
    };
  }

  private toContract(c: ContractRow) {
    const request = c.bao_gia_thue_xe.yeu_cau_thue_xe;
    const paid = c.thanh_toan_thue_xe.filter((p) => p.trangthaithanhtoan === 'ThanhCong' && p.loaithanhtoan !== 'PhatSinh').reduce((s, p) => s + money(p.sotienthanhtoan), 0);
    const total = money(c.tongtienhopdong);
    const status = c.trangthaihopdong;
    return {
      code: c.mahopdong,
      quoteCode: c.mabaogia,
      requestCode: request.mayeucau,
      customer: request.hotennguoiyeucau,
      phone: request.sodienthoai,
      email: request.emailnguoiyeucau,
      vehicleType: request.loai_xe_thue.tenloaixe,
      rentalType: request.hinhthucthue,
      vehicles: c.bao_gia_thue_xe.soluongxe,
      guests: request.soluongkhach,
      pickup: request.diemdi,
      destination: request.diemden,
      startAt: c.thoigianbatdau.toISOString(),
      endAt: c.thoigianketthuc.toISOString(),
      actualStartAt: c.thoigianbatdauthucte?.toISOString() ?? null,
      actualEndAt: c.thoigianketthucthucte?.toISOString() ?? null,
      price: money(c.bao_gia_thue_xe.giacoban),
      fees: money(c.bao_gia_thue_xe.tongphuphi),
      discount: money(c.bao_gia_thue_xe.sotiengiam),
      total,
      depositRequired: money(c.yeucautiencoc),
      depositPaid: money(c.tiencocdathu),
      paid,
      remaining: Math.max(0, total - paid),
      status,
      statusLabel: RENTAL_STATUS_LABELS.contract[status],
      staffInCharge: { id: c.nhan_vien.manhanvien, name: c.nhan_vien.hoten },
      terms: c.dieukhoanhopdong,
      file: c.filehopdong,
      cancelReason: c.lydohuy,
      createdAt: c.thoigiantao.toISOString(),
      signedAt: c.thoigianky?.toISOString() ?? null,
      cancelledAt: c.thoigianhuy?.toISOString() ?? null,
      payments: c.thanh_toan_thue_xe.map((p) => ({ id: p.mathanhtoantx, type: p.loaithanhtoan, method: p.phuongthucthanhtoan, amount: money(p.sotienthanhtoan), status: p.trangthaithanhtoan, content: p.noidungthanhtoan, collectedBy: p.nhan_vien?.hoten ?? null, paidAt: p.thoigianthanhtoan?.toISOString() ?? null })),
      assignments: c.phan_cong_xe_thue.map((a) => ({ vehicleId: a.maxe, vehicleName: a.xe.tenxe, plateNumber: a.xe.biensoxe, driverId: a.mataixe, driverName: a.tai_xe_phu_xe?.hoten ?? null, note: a.ghichu })),
      cancellationFeeRateIfCancelledNow: ['MoiTao', 'DaKy', 'DaCoc'].includes(status) ? rentalCancellationFeeRate(c.thoigianbatdau) : null,
      nextActions: {
        collectDeposit: status === 'DaKy',
        collectRemaining: ['DaCoc', 'DangThucHien'].includes(status) && paid < total,
        assign: ['DaKy', 'DaCoc'].includes(status),
        start: status === 'DaCoc',
        complete: status === 'DangThucHien',
        cancel: ['MoiTao', 'DaKy', 'DaCoc'].includes(status),
      },
    };
  }
}
