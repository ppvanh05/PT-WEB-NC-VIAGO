import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountsAccess } from '../../../shared/accounts/accounts-access';
import { normalizePhone, samePhone } from '../../../shared/phone';
import {
  RENTAL_STATUS_LABELS,
  applyRentalPromotion,
  findStandardPrice,
  money,
  rentalUnits,
} from '../../../shared/rental-pricing';
import { dedupKey, nextCode, nextCodes, withCodeRetry } from '../../../shared/sequential-code';
import { HOUR_MS, vnDate } from '../../../shared/vn-time';
import { QuoteDecisionDto, RentalEstimateDto, RentalRequestDto } from './contract-rentals.dto';

/** Thời gian tối thiểu từ lúc gửi yêu cầu đến giờ đi, để kịp báo giá và điều xe. */
const MIN_LEAD_HOURS = 12;

@Injectable()
export class CustomerContractRentalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccountsAccess,
  ) {}

  /** Danh sách loại xe cho thuê kèm giá niêm yết đang áp dụng. */
  async vehicles() {
    const rows = await this.prisma.loai_xe_thue.findMany({
      where: { trangthai: 'HoatDong' },
      include: { bang_gia_chuan: { where: { trangthai: 'DangApDung' } } },
      orderBy: { maloaixe: 'asc' },
    });
    return rows.map((row) => this.toVehicle(row));
  }

  async vehicle(id: string) {
    const row = await this.prisma.loai_xe_thue.findFirst({
      where: { maloaixe: id, trangthai: 'HoatDong' },
      include: { bang_gia_chuan: { where: { trangthai: 'DangApDung' } } },
    });
    if (!row) throw new NotFoundException('Không tìm thấy loại xe.');
    return this.toVehicle(row);
  }

  /** Tài xế có thể chọn khi thuê kèm tài xế (không trả SĐT, CCCD). */
  async drivers() {
    const rows = await this.prisma.tai_xe_phu_xe.findMany({
      where: { vaitro: 'TaiXe', trangthai: 'DangHoatDong', OR: [{ hangplx: null }, { hangplx: { gte: new Date() } }] },
      select: { manhansu: true, hoten: true, hanggplx: true, anhchandung: true, thoigiantao: true },
      orderBy: { hoten: 'asc' },
    });
    return rows.map((d) => ({
      id: d.manhansu,
      name: d.hoten,
      licenseClass: d.hanggplx,
      avatar: d.anhchandung,
    }));
  }

  /** Khuyến mãi thuê xe đang chạy. */
  async promotions() {
    const now = new Date();
    const rows = await this.prisma.khuyen_mai.findMany({
      where: { phamvidichvu: { in: ['ThueXe', 'TatCa'] }, trangthai: 'HoatDong', ngaybatdau: { lte: now }, ngayketthuc: { gte: now } },
      orderBy: { uutien: 'desc' },
    });
    return rows
      .filter((p) => p.soluongtoida == null || p.soluongdadung < p.soluongtoida)
      .map((p) => ({
        code: p.magiamgia,
        name: p.tenkhuyenmai,
        description: p.mota,
        type: p.loaikhuyenmai,
        value: money(p.giatrigiam),
        maxDiscount: p.giamtoida == null ? null : money(p.giamtoida),
        minOrder: money(p.donhangtoithieu),
        firstOrderOnly: p.chiapdungdondautien,
        conditions: p.cauhinhquyenloi,
        endsAt: p.ngayketthuc.toISOString(),
      }));
  }

  /** Giá tạm tính để khách xem trước khi gửi. Giá chốt nằm trong báo giá của nhân viên. */
  async estimate(dto: RentalEstimateDto) {
    return this.prisma.$transaction((tx) => this.calculate(tx, dto, dto.phone ?? ''));
  }

  async create(dto: RentalRequestDto, req: Request) {
    const phone = normalizePhone(dto.phone);
    // Khóa gửi do trình duyệt sinh (chống bấm gửi 2 lần / mạng gửi lại) được lưu trong
    // lich_su_thue_xe.dulieubosung.KhoaGui; cột khoachonglap giữ đúng mẫu YCTX20261114-006.
    const submitKey = dto.idempotencyKey ?? null;
    if (submitKey) {
      const existing = await this.prisma.lich_su_thue_xe.findFirst({
        where: { loaisukien: 'TaoYeuCau', dulieubosung: { path: ['KhoaGui'], equals: submitKey } },
        select: { yeu_cau_thue_xe: { select: { mayeucau: true, sodienthoai: true } } },
      });
      const request = existing?.yeu_cau_thue_xe;
      if (request && samePhone(request.sodienthoai, phone)) return this.lookup(request.mayeucau, phone);
      if (request) throw new BadRequestException('Khóa gửi yêu cầu đã được dùng.');
    }

    const vehicleType = await this.prisma.loai_xe_thue.findFirst({ where: { maloaixe: dto.vehicleTypeId, trangthai: 'HoatDong' } });
    if (!vehicleType) throw new BadRequestException('Loại xe không tồn tại hoặc đã ngừng cho thuê.');
    if (dto.passengers > vehicleType.sokhachtoida * dto.vehicles)
      throw new BadRequestException(`${dto.vehicles} xe ${vehicleType.tenloaixe} chở tối đa ${vehicleType.sokhachtoida * dto.vehicles} khách.`);
    if (dto.driverId) {
      if (dto.rentalType !== 'CoTaiXe') throw new BadRequestException('Chỉ chọn tài xế khi thuê xe có tài xế.');
      const driver = await this.prisma.tai_xe_phu_xe.findFirst({ where: { manhansu: dto.driverId, vaitro: 'TaiXe', trangthai: 'DangHoatDong' } });
      if (!driver) throw new BadRequestException('Tài xế đã chọn không còn nhận chuyến.');
    }
    const customer = await this.prisma.khach_hang.findFirst({ where: { sodienthoai: phone, trangthai: 'HoatDong' }, select: { makhachhang: true } });

    const code = await withCodeRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const price = await this.calculate(tx, dto, phone);
        const now = new Date();
        const id = await nextCode(tx, 'yeu_cau_thue_xe', 'YCTX', 3);
        const historyId = await nextCode(tx, 'lich_su_thue_xe', 'LSTX', 3);
        await tx.yeu_cau_thue_xe.create({
          data: {
            mayeucau: id,
            khoachonglap: dedupKey(id, 'YCTX', vnDate(now)),
            makhachhang: customer?.makhachhang ?? null,
            hotennguoiyeucau: dto.fullName,
            sodienthoai: phone,
            emailnguoiyeucau: dto.email || null,
            diemdi: dto.pickup,
            diemden: dto.destination,
            thoigiandi: new Date(dto.startAt),
            thoigianve: dto.endAt ? new Date(dto.endAt) : null,
            loaixeyeucau: dto.vehicleTypeId,
            soluongkhach: dto.passengers,
            soluongxeyeucau: dto.vehicles,
            hinhthucthue: dto.rentalType,
            mataixemongmuon: dto.driverId || null,
            makhuyenmai: price.promotionId,
            mabanggiathamchieu: price.priceListId,
            dongiatamtinh: price.unitPrice,
            donvitinhgiatamtinh: price.unit,
            sodonvitinhtamtinh: price.units,
            tongtiencobantamtinh: price.basePrice,
            tongphuphitamtinh: 0,
            sotiengiamtamtinh: price.discount,
            giatamtinh: price.total,
            thoigiantinhgia: now,
            ghichu: dto.note || null,
            trangthaiyeucau: 'ChoBaoGia',
            ngaytao: now,
            thoigiancapnhat: now,
          },
        });
        await tx.lich_su_thue_xe.create({
          data: {
            malichsuthuexe: historyId,
            mayeucau: id,
            loaisukien: 'TaoYeuCau',
            noidung: 'Khách gửi yêu cầu',
            trangthaisau: 'ChoBaoGia',
            thoigianthuchien: now,
            dulieubosung: submitKey ? { ThucThe: 'YeuCau', KhoaGui: submitKey } : { ThucThe: 'YeuCau' },
          },
        });
        await this.access.audit(tx, null, req, 'CREATE_RENTAL_REQUEST', 'yeu_cau_thue_xe', id, 'Khách gửi yêu cầu thuê xe hợp đồng.');
        return id;
      }),
    );
    return this.lookup(code, phone);
  }

  /** Tiến trình yêu cầu thuê xe theo mã + SĐT người gửi. */
  async lookup(code: string, phone: string) {
    const request = await this.prisma.yeu_cau_thue_xe.findUnique({
      where: { mayeucau: code.trim().toUpperCase() },
      include: {
        loai_xe_thue: { select: { tenloaixe: true, phanloaihienthi: true, hinhanh: true } },
        tai_xe_phu_xe: { select: { hoten: true } },
        khuyen_mai: { select: { magiamgia: true } },
        bao_gia_thue_xe: { orderBy: { phienban: 'desc' }, include: { hop_dong_thue_xe: true } },
      },
    });
    if (!request || !samePhone(request.sodienthoai, phone)) throw new NotFoundException('Không tìm thấy yêu cầu với số điện thoại này.');

    const quote = request.bao_gia_thue_xe.find((q) => q.trangthaibaogia !== 'Nhap') ?? null;
    const quoteExpired = quote?.trangthaibaogia === 'ChoKhachDuyet' && !!quote.thoigianhethan && quote.thoigianhethan < new Date();
    const quoteStatus = quote ? (quoteExpired ? 'HetHan' : quote.trangthaibaogia) : null;
    const contract = request.bao_gia_thue_xe.map((q) => q.hop_dong_thue_xe).find(Boolean) ?? null;
    const images = Array.isArray(request.loai_xe_thue.hinhanh) ? (request.loai_xe_thue.hinhanh as { url?: string }[]) : [];
    const confirmed = contract && ['DaCoc', 'DangThucHien', 'HoanThanh'].includes(contract.trangthaihopdong);
    const step = (key: string, label: string, time: Date | null | undefined, done: boolean) => ({ key, label, time: time?.toISOString() ?? null, done });
    const steps = [
      step('submitted', 'Đã gửi yêu cầu', request.ngaytao, true),
      step('quoted', 'Đã nhận báo giá', quote?.thoigiangui, !!quote),
      step('contract', 'Đã ký hợp đồng', contract?.thoigianky, !!contract && contract.trangthaihopdong !== 'MoiTao'),
      step('confirmed', 'Đã đặt cọc, xác nhận chuyến', confirmed ? contract.thoigiancapnhat : null, !!confirmed),
    ];
    const activeIndex = steps.findIndex((s) => !s.done);

    return {
      code: request.mayeucau,
      status: request.trangthaiyeucau,
      statusLabel: RENTAL_STATUS_LABELS.request[request.trangthaiyeucau],
      cancelReason: request.lydohuy,
      vehicle: {
        id: request.loaixeyeucau,
        name: request.loai_xe_thue.tenloaixe,
        category: request.loai_xe_thue.phanloaihienthi,
        image: images[0]?.url ?? null,
      },
      rentalType: request.hinhthucthue,
      driverName: request.tai_xe_phu_xe?.hoten ?? null,
      fullName: request.hotennguoiyeucau,
      pickup: request.diemdi,
      destination: request.diemden,
      startAt: request.thoigiandi.toISOString(),
      endAt: request.thoigianve?.toISOString() ?? null,
      passengers: request.soluongkhach,
      vehicles: request.soluongxeyeucau,
      promoCode: request.khuyen_mai?.magiamgia ?? null,
      note: request.ghichu,
      submittedAt: request.ngaytao.toISOString(),
      estimate: {
        unitPrice: money(request.dongiatamtinh),
        unit: request.donvitinhgiatamtinh,
        units: money(request.sodonvitinhtamtinh),
        basePrice: money(request.tongtiencobantamtinh),
        surcharge: money(request.tongphuphitamtinh),
        discount: money(request.sotiengiamtamtinh),
        total: money(request.giatamtinh),
      },
      quote: quote && {
        code: quote.mabaogia,
        version: quote.phienban,
        status: quoteStatus,
        statusLabel: RENTAL_STATUS_LABELS.quote[quoteStatus!],
        basePrice: money(quote.giacoban),
        surcharge: money(quote.tongphuphi),
        discount: money(quote.sotiengiam),
        total: money(quote.tongtien),
        deposit: money(quote.yeucautiencoc),
        terms: quote.dieukhoanbaogia,
        sentAt: quote.thoigiangui?.toISOString() ?? null,
        expiresAt: quote.thoigianhethan?.toISOString() ?? null,
        canRespond: quoteStatus === 'ChoKhachDuyet',
      },
      contract: contract && {
        code: contract.mahopdong,
        status: contract.trangthaihopdong,
        statusLabel: RENTAL_STATUS_LABELS.contract[contract.trangthaihopdong],
        total: money(contract.tongtienhopdong),
        depositRequired: money(contract.yeucautiencoc),
        depositPaid: money(contract.tiencocdathu),
        startAt: contract.thoigianbatdau.toISOString(),
        endAt: contract.thoigianketthuc.toISOString(),
      },
      steps: steps.map((s, i) => ({ ...s, status: s.done ? 'done' : i === activeIndex ? 'active' : 'pending' })),
    };
  }

  /** Khách đồng ý hoặc từ chối báo giá đang chờ duyệt. */
  async decideQuote(code: string, dto: QuoteDecisionDto, req: Request) {
    const requestCode = code.trim().toUpperCase();
    await this.prisma.$transaction(async (tx) => {
      const request = await tx.yeu_cau_thue_xe.findUnique({ where: { mayeucau: requestCode } });
      if (!request || !samePhone(request.sodienthoai, dto.phone)) throw new NotFoundException('Không tìm thấy yêu cầu với số điện thoại này.');
      const quote = await tx.bao_gia_thue_xe.findFirst({ where: { mayeucau: requestCode, trangthaibaogia: 'ChoKhachDuyet' }, orderBy: { phienban: 'desc' } });
      if (!quote) throw new BadRequestException('Không có báo giá nào đang chờ bạn phản hồi.');
      const now = new Date();
      if (quote.thoigianhethan && quote.thoigianhethan < now)
        throw new BadRequestException('Báo giá đã hết hiệu lực, vui lòng liên hệ để nhận báo giá mới.');
      const accept = dto.decision === 'accept';
      if (!accept && !dto.reason) throw new BadRequestException('Vui lòng cho biết lý do từ chối.');
      await tx.bao_gia_thue_xe.update({
        where: { mabaogia: quote.mabaogia },
        data: { trangthaibaogia: accept ? 'DongY' : 'TuChoi', lydotuchoi: accept ? null : dto.reason, thoigianphanhoi: now, thoigiancapnhat: now },
      });
      await tx.yeu_cau_thue_xe.update({
        where: { mayeucau: requestCode },
        data: { trangthaiyeucau: accept ? 'DongY' : 'TuChoi', thoigiancapnhat: now },
      });
      await tx.lich_su_thue_xe.create({
        data: {
          malichsuthuexe: (await nextCodes(tx, 'lich_su_thue_xe', 'LSTX', 3, 1))[0],
          mayeucau: requestCode,
          mabaogia: quote.mabaogia,
          loaisukien: accept ? 'KhachDongY' : 'KhachTuChoi',
          noidung: accept ? 'Khách xác nhận báo giá' : `Khách từ chối báo giá: ${dto.reason}`,
          trangthaitruoc: request.trangthaiyeucau,
          trangthaisau: accept ? 'DongY' : 'TuChoi',
          thoigianthuchien: now,
          dulieubosung: { ThucThe: 'BaoGia', Kenh: 'Website' },
        },
      });
      await this.access.audit(tx, null, req, accept ? 'ACCEPT_RENTAL_QUOTE' : 'REJECT_RENTAL_QUOTE', 'bao_gia_thue_xe', quote.mabaogia, 'Khách phản hồi báo giá thuê xe.');
    });
    return this.lookup(requestCode, dto.phone);
  }

  /** Tính giá tạm: bảng giá chuẩn × số đơn vị × số xe − khuyến mãi. */
  private async calculate(tx: Prisma.TransactionClient, dto: RentalEstimateDto, phone: string) {
    const start = new Date(dto.startAt);
    const end = dto.endAt ? new Date(dto.endAt) : null;
    if (start.getTime() < Date.now() + MIN_LEAD_HOURS * HOUR_MS)
      throw new BadRequestException(`Thời gian đi phải sau thời điểm gửi ít nhất ${MIN_LEAD_HOURS} giờ.`);
    if (end && end <= start) throw new BadRequestException('Thời gian về phải sau thời gian đi.');
    if (dto.rentalType === 'TuLai' && !end) throw new BadRequestException('Thuê tự lái cần chọn thời gian trả xe.');
    if (dto.rentalType === 'TuLai' && dto.tripScope) throw new BadRequestException('Thuê tự lái tính giá theo ngày, không chọn phạm vi chuyến.');

    const scope = dto.rentalType === 'TuLai' ? 'TheoNgay' : (dto.tripScope ?? 'LienTinh');
    const priceList = await findStandardPrice(tx, dto.vehicleTypeId, dto.rentalType, scope);
    if (!priceList) throw new BadRequestException('Loại xe này chưa có bảng giá cho hình thức thuê đã chọn.');
    const units = rentalUnits(priceList.donvitinh, start, end);
    const unitPrice = money(priceList.gianiemyet);
    const basePrice = unitPrice * units * dto.vehicles;
    const { promotion, discount } = await applyRentalPromotion(tx, {
      code: dto.promoCode,
      phone,
      base: basePrice,
      days: Math.max(1, Math.ceil(((end ?? start).getTime() - start.getTime()) / (24 * HOUR_MS))),
    });
    return {
      priceListId: priceList.mabanggia,
      scope,
      unit: priceList.donvitinh,
      unitPrice,
      units,
      vehicles: dto.vehicles,
      basePrice,
      surcharge: 0,
      surchargeNote: priceList.motaphuphi,
      promotionId: promotion?.makhuyenmai ?? null,
      promoCode: promotion?.magiamgia ?? null,
      discount,
      total: basePrice - discount,
      note: 'Giá tạm tính, chưa gồm phụ phí phát sinh. Giá chính thức theo báo giá của VIAGO.',
    };
  }

  private toVehicle(
    row: Prisma.loai_xe_thueGetPayload<{ include: { bang_gia_chuan: true } }>,
  ) {
    const price = (scope: string) => {
      const item = row.bang_gia_chuan.find((p) => p.loaitinhgia === scope);
      return item ? { id: item.mabanggia, price: money(item.gianiemyet), unit: item.donvitinh, rentalScope: item.phamvihinhthucthue, surchargeNote: item.motaphuphi } : null;
    };
    return {
      id: row.maloaixe,
      name: row.tenloaixe,
      category: row.phanloaihienthi,
      maxPassengers: row.sokhachtoida,
      description: row.mota,
      engine: row.dongco,
      fuel: row.nhienlieu,
      year: row.namsanxuatthamkhao,
      transmission: row.hopso,
      amenities: row.tiennghi,
      images: Array.isArray(row.hinhanh) ? row.hinhanh : [],
      depositRequired: row.dieukienthechap,
      rating: row.diemdanhgiatrungbinh == null ? null : Number(row.diemdanhgiatrungbinh),
      reviewsCount: row.soluotdanhgia,
      prices: { inland: price('NoiTinh'), intercity: price('LienTinh'), daily: price('TheoNgay') },
    };
  }
}
