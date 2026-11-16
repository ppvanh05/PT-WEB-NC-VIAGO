import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DateRangeQueryDto, Trimmed } from '../../../shared/http/pagination';
import { VN_PHONE_PATTERN } from '../../../shared/phone';

const PHONE_MESSAGE = 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.';
const CODE_PATTERN = /^[A-Za-z0-9_-]{3,60}$/;

export class PublicLostItemsQueryDto extends DateRangeQueryDto {
  @IsOptional() @IsString() @MaxLength(50) routeId?: string;
  /** stored: đang lưu giữ; processing: đang có người yêu cầu nhận; returned: đã trả. */
  @IsOptional() @IsIn(['stored', 'processing', 'returned']) status?: 'stored' | 'processing' | 'returned';
}

/** Mã đơn hoặc mã vé + SĐT người đặt để chứng minh là chủ đơn. */
export class BookingVerifyQueryDto {
  @Trimmed() @Matches(VN_PHONE_PATTERN, { message: PHONE_MESSAGE }) phone!: string;
}

export class LostReportDto {
  @Trimmed() @Matches(CODE_PATTERN, { message: 'Mã đơn hoặc mã vé không hợp lệ.' }) bookingCode!: string;
  @Trimmed() @Matches(VN_PHONE_PATTERN, { message: PHONE_MESSAGE }) phone!: string;
  /** Khi đơn có nhiều vé: chọn đúng vé của người để quên đồ. */
  @IsOptional() @Trimmed() @Matches(CODE_PATTERN) ticketId?: string;
  @Trimmed() @IsString() @MinLength(3) @MaxLength(150) itemName!: string;
  @Trimmed() @IsString() @MinLength(10) @MaxLength(1000) description!: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(30) seat?: string;
  @Trimmed() @IsString() @MinLength(2) @MaxLength(100) fullName!: string;
  @IsOptional() @Trimmed() @IsEmail({}, { message: 'Email không hợp lệ.' }) @MaxLength(254) email?: string;
}

export class LostClaimDto {
  @Trimmed() @Matches(CODE_PATTERN, { message: 'Mã đơn hoặc mã vé không hợp lệ.' }) bookingCode!: string;
  @Trimmed() @Matches(VN_PHONE_PATTERN, { message: PHONE_MESSAGE }) phone!: string;
  /** Đặc điểm nhận dạng để nhân viên đối chiếu (màu sắc, vết trầy, đồ bên trong...). */
  @Trimmed() @IsString() @MinLength(10) @MaxLength(1000) description!: string;
}

export class LostStatusQueryDto {
  @Trimmed() @Matches(VN_PHONE_PATTERN, { message: PHONE_MESSAGE }) phone!: string;
}
