import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { loai_ghi_nhan_enum, trang_thai_do_that_lac_enum } from '@prisma/client';
import { DateRangeQueryDto, Trimmed } from '../../../../shared/http/pagination';
import { VN_PHONE_PATTERN } from '../../../../shared/phone';

const PHONE_MESSAGE = 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.';
/** Ảnh: đường dẫn http(s) hoặc đường dẫn nội bộ bắt đầu bằng /. */
const IMAGE_PATTERN = /^(https?:\/\/\S+|\/\S+)$/;

export class AdminLostItemsQueryDto extends DateRangeQueryDto {
  @IsOptional() @IsEnum(trang_thai_do_that_lac_enum) status?: trang_thai_do_that_lac_enum;
  @IsOptional() @IsEnum(loai_ghi_nhan_enum) type?: loai_ghi_nhan_enum;
  /** Chỉ lấy đồ đang có yêu cầu nhận chờ xác minh. */
  @IsOptional() @IsIn(['true', 'false']) hasPendingClaims?: 'true' | 'false';
  @IsOptional() @IsIn(['newest', 'oldest']) sort: 'newest' | 'oldest' = 'newest';
}

export class LostItemCreateDto {
  /** KhachBaoMat: nhân viên nhập hộ khách báo mất; NhanVienNhatDuoc: đồ nhặt được trên xe. */
  @IsEnum(loai_ghi_nhan_enum) type!: loai_ghi_nhan_enum;
  /** Mã vé (hoặc mã đơn) liên quan nếu đã xác định được. */
  @IsOptional() @Trimmed() @Matches(/^[A-Za-z0-9_-]{3,60}$/) bookingCode?: string;
  /** Lịch trình nơi nhặt được đồ, khi chưa rõ vé của ai. */
  @IsOptional() @Trimmed() @IsString() @MaxLength(30) scheduleId?: string;
  @Trimmed() @IsString() @MinLength(3) @MaxLength(150) itemName!: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @Trimmed() @IsString() @MinLength(2) @MaxLength(100) reporterName?: string;
  @IsOptional() @Trimmed() @Matches(VN_PHONE_PATTERN, { message: PHONE_MESSAGE }) phone?: string;
  @IsOptional() @Trimmed() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(30) seat?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(5) @Matches(IMAGE_PATTERN, { each: true }) images?: string[];
  @IsOptional() @Trimmed() @IsString() @MaxLength(300) foundLocation?: string;
  @IsOptional() @IsISO8601({ strict: true }) foundAt?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(5) @Matches(IMAGE_PATTERN, { each: true }) foundImages?: string[];
  @IsOptional() @Trimmed() @IsString() @MaxLength(300) storageLocation?: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(1000) note?: string;
}

/** Sửa thông tin mô tả và vị trí lưu kho (không đổi trạng thái). */
export class LostItemUpdateDto {
  @IsOptional() @Trimmed() @IsString() @MinLength(3) @MaxLength(150) itemName?: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(30) seat?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(5) @Matches(IMAGE_PATTERN, { each: true }) images?: string[];
  @IsOptional() @Trimmed() @IsString() @MaxLength(300) foundLocation?: string;
  @IsOptional() @IsISO8601({ strict: true }) foundAt?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(5) @Matches(IMAGE_PATTERN, { each: true }) foundImages?: string[];
  @IsOptional() @Trimmed() @IsString() @MaxLength(300) storageLocation?: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(1000) note?: string;
}

export class LostItemStatusDto {
  @IsIn(['DaTimThay', 'DaTraKhach', 'DongYeuCau']) status!: 'DaTimThay' | 'DaTraKhach' | 'DongYeuCau';
  @IsOptional() @Trimmed() @IsString() @MaxLength(300) foundLocation?: string;
  @IsOptional() @IsISO8601({ strict: true }) foundAt?: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(300) storageLocation?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(5) @Matches(IMAGE_PATTERN, { each: true }) foundImages?: string[];
  @IsOptional() @Trimmed() @IsString() @MaxLength(1000) note?: string;
}

export class ClaimDecisionDto {
  @IsIn(['approve', 'reject']) decision!: 'approve' | 'reject';
  @IsOptional() @Trimmed() @IsString() @MaxLength(500) note?: string;
}
