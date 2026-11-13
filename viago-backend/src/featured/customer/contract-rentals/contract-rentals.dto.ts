import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Trimmed } from '../../../shared/http/pagination';
import { VN_PHONE_PATTERN } from '../../../shared/phone';

const PHONE_MESSAGE = 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.';

/** Trường dùng chung cho tính giá tạm và gửi yêu cầu. */
class RentalBaseDto {
  @Trimmed() @IsString() @MaxLength(20) vehicleTypeId!: string;
  /** CoTaiXe: thuê kèm tài xế VIAGO; TuLai: khách tự lái. */
  @IsIn(['CoTaiXe', 'TuLai']) rentalType!: 'CoTaiXe' | 'TuLai';
  /** Chỉ dùng cho thuê có tài xế: chạy trong tỉnh hay liên tỉnh. */
  @IsOptional() @IsIn(['NoiTinh', 'LienTinh']) tripScope?: 'NoiTinh' | 'LienTinh';
  @IsISO8601({ strict: true }) startAt!: string;
  @IsOptional() @IsISO8601({ strict: true }) endAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10) vehicles = 1;
  @IsOptional() @Trimmed() @IsString() @MaxLength(50) promoCode?: string;
}

export class RentalEstimateDto extends RentalBaseDto {
  /** Cần SĐT để kiểm tra giới hạn lượt dùng mã khuyến mãi. */
  @IsOptional() @Trimmed() @Matches(VN_PHONE_PATTERN, { message: PHONE_MESSAGE }) phone?: string;
}

export class RentalRequestDto extends RentalBaseDto {
  @Trimmed() @IsString() @MinLength(2) @MaxLength(100) fullName!: string;
  @Trimmed() @Matches(VN_PHONE_PATTERN, { message: PHONE_MESSAGE }) phone!: string;
  @IsOptional() @Trimmed() @IsEmail({}, { message: 'Email không hợp lệ.' }) @MaxLength(254) email?: string;
  @Trimmed() @IsString() @MinLength(3) @MaxLength(300) pickup!: string;
  @Trimmed() @IsString() @MinLength(3) @MaxLength(300) destination!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(500) passengers!: number;
  /** Tài xế mong muốn (chỉ với thuê có tài xế). */
  @IsOptional() @Trimmed() @IsString() @MaxLength(20) driverId?: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(1000) note?: string;
  /** Khóa chống gửi lặp do trình duyệt tạo; gửi lại cùng khóa sẽ trả về yêu cầu đã tạo. */
  @IsOptional() @Matches(/^[A-Za-z0-9_-]{8,64}$/) idempotencyKey?: string;
}

export class RentalLookupQueryDto {
  @Trimmed() @Matches(VN_PHONE_PATTERN, { message: PHONE_MESSAGE }) phone!: string;
}

export class QuoteDecisionDto {
  @Trimmed() @Matches(VN_PHONE_PATTERN, { message: PHONE_MESSAGE }) phone!: string;
  @IsIn(['accept', 'reject']) decision!: 'accept' | 'reject';
  @IsOptional() @Trimmed() @IsString() @MaxLength(500) reason?: string;
}
