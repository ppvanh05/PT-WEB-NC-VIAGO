import { BadRequestException } from '@nestjs/common';
import {
  Prisma,
  don_vi_tinh_gia_enum,
  hinh_thuc_thue_enum,
  loai_tinh_gia_enum,
  loai_xe_enum,
} from '@prisma/client';
import { normalizePhone } from './phone';
import { DAY_MS } from './vn-time';

export const RENTAL_STATUS_LABELS = {
  request: { ChoBaoGia: 'Chờ báo giá', DaBaoGia: 'Đã báo giá', DongY: 'Đồng ý', TuChoi: 'Từ chối', DaHuy: 'Đã hủy' },
  quote: { Nhap: 'Nháp', ChoKhachDuyet: 'Chờ khách duyệt', DongY: 'Đã chấp nhận', TuChoi: 'Đã từ chối', HetHan: 'Hết hiệu lực', DaHuy: 'Đã hủy' },
  contract: { MoiTao: 'Mới tạo', DaKy: 'Đã ký', DaCoc: 'Đã cọc', DangThucHien: 'Đang thực hiện', HoanThanh: 'Hoàn thành', DaHuy: 'Đã hủy' },
} as const;

/** Loại xe cho thuê (LXT...) ứng với loại xe trong đội xe để phân công. */
export const RENTAL_VEHICLE_FLEET_TYPE: Record<string, loai_xe_enum> = {
  LXT001: 'Limousine9Cho',
  LXT002: 'GiuongNam34Cho',
  LXT003: 'Cabin22Cho',
};

/** Tỷ lệ cọc mặc định khi lập báo giá/hợp đồng. */
export const DEFAULT_DEPOSIT_RATE = 0.3;

/** Phí hủy hợp đồng thuê xe, tính trên tiền cọc theo thời gian còn lại trước giờ bắt đầu. */
export function rentalCancellationFeeRate(start: Date, now = new Date()) {
  const hours = (start.getTime() - now.getTime()) / (60 * 60 * 1000);
  if (hours >= 7 * 24) return 0;
  if (hours >= 3 * 24) return 0.3;
  if (hours >= 24) return 0.5;
  return 1;
}

/** Số đơn vị tính giá: theo ngày thì làm tròn lên, theo chuyến thì 1 chuyến/xe. */
export function rentalUnits(unit: don_vi_tinh_gia_enum, start: Date, end?: Date | null) {
  if (unit === 'Chuyen') return 1;
  if (!end) return 1;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_MS));
}

export function money(value: Prisma.Decimal | number | null | undefined) {
  return value == null ? 0 : Number(value);
}

/** Bảng giá chuẩn đang áp dụng cho loại xe + hình thức thuê + phạm vi. */
export async function findStandardPrice(
  tx: Prisma.TransactionClient,
  vehicleTypeId: string,
  rentalType: hinh_thuc_thue_enum,
  scope: loai_tinh_gia_enum,
  at = new Date(),
) {
  return tx.bang_gia_chuan.findFirst({
    where: {
      maloaixe: vehicleTypeId,
      trangthai: 'DangApDung',
      loaitinhgia: scope,
      phamvihinhthucthue: { in: [rentalType, 'TatCa'] },
      ngayapdung: { lte: at },
      OR: [{ ngayngungapdung: null }, { ngayngungapdung: { gt: at } }],
    },
    orderBy: { ngayapdung: 'desc' },
  });
}

type PromoInput = { code?: string; phone: string; base: number; days: number; at?: Date };

/**
 * Kiểm tra mã khuyến mãi thuê xe và tính số tiền giảm.
 * Ném lỗi 400 kèm lý do khi mã không dùng được.
 */
export async function applyRentalPromotion(tx: Prisma.TransactionClient, input: PromoInput) {
  if (!input.code) return { promotion: null, discount: 0 };
  const at = input.at ?? new Date();
  const promo = await tx.khuyen_mai.findFirst({
    where: { magiamgia: { equals: input.code.trim(), mode: 'insensitive' }, phamvidichvu: { in: ['ThueXe', 'TatCa'] } },
  });
  if (!promo) throw new BadRequestException('Mã khuyến mãi không tồn tại hoặc không áp dụng cho thuê xe.');
  if (promo.trangthai !== 'HoatDong' || promo.ngaybatdau > at || promo.ngayketthuc < at)
    throw new BadRequestException('Mã khuyến mãi đã hết hạn hoặc tạm ngưng.');
  if (promo.soluongtoida != null && promo.soluongdadung >= promo.soluongtoida)
    throw new BadRequestException('Mã khuyến mãi đã hết lượt sử dụng.');
  if (input.base < money(promo.donhangtoithieu))
    throw new BadRequestException(`Đơn tối thiểu ${money(promo.donhangtoithieu).toLocaleString('vi-VN')}đ để dùng mã này.`);
  const config = (promo.cauhinhquyenloi ?? {}) as Record<string, unknown>;
  const minDays = Number(config.SoNgayThueToiThieu ?? 0);
  if (minDays && input.days < minDays) throw new BadRequestException(`Mã này áp dụng cho thuê xe từ ${minDays} ngày.`);

  const phone = normalizePhone(input.phone);
  const usedStatuses = { notIn: ['DaHuy', 'TuChoi'] as ('DaHuy' | 'TuChoi')[] };
  if (promo.chiapdungdondautien) {
    const previous = await tx.yeu_cau_thue_xe.count({ where: { sodienthoai: phone, trangthaiyeucau: usedStatuses } });
    if (previous > 0) throw new BadRequestException('Mã này chỉ áp dụng cho lần thuê xe đầu tiên.');
  }
  if (promo.gioihanmoikhach != null) {
    const used = await tx.yeu_cau_thue_xe.count({
      where: { sodienthoai: phone, makhuyenmai: promo.makhuyenmai, trangthaiyeucau: usedStatuses },
    });
    if (used >= promo.gioihanmoikhach) throw new BadRequestException('Bạn đã dùng hết lượt của mã khuyến mãi này.');
  }

  return { promotion: promo, discount: promotionDiscount(promo, input.base) };
}

/** Số tiền giảm của một khuyến mãi trên giá cơ bản (không kiểm tra điều kiện lượt dùng). */
export function promotionDiscount(
  promo: Pick<Prisma.khuyen_maiGetPayload<object>, 'loaikhuyenmai' | 'giatrigiam' | 'giamtoida'>,
  base: number,
) {
  let discount =
    promo.loaikhuyenmai === 'PhanTram'
      ? (base * money(promo.giatrigiam)) / 100
      : promo.loaikhuyenmai === 'TruTienThang'
        ? money(promo.giatrigiam)
        : 0;
  if (promo.giamtoida != null) discount = Math.min(discount, money(promo.giamtoida));
  return Math.round(Math.min(discount, base));
}
