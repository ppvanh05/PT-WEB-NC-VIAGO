import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  don_vi_tinh_gia_enum,
  phuong_thuc_thanh_toan_enum,
  trang_thai_bao_gia_enum,
  trang_thai_hop_dong_enum,
  trang_thai_yeu_cau_enum,
} from '@prisma/client';
import { DateRangeQueryDto, Trimmed } from '../../../shared/http/pagination';

export class RentalRequestsQueryDto extends DateRangeQueryDto {
  @IsOptional() @IsEnum(trang_thai_yeu_cau_enum) status?: trang_thai_yeu_cau_enum;
}
export class RentalQuotesQueryDto extends DateRangeQueryDto {
  @IsOptional() @IsEnum(trang_thai_bao_gia_enum) status?: trang_thai_bao_gia_enum;
}
export class RentalContractsQueryDto extends DateRangeQueryDto {
  @IsOptional() @IsEnum(trang_thai_hop_dong_enum) status?: trang_thai_hop_dong_enum;
}

export class CancelDto {
  @Trimmed() @IsString() @MinLength(5) @MaxLength(500) reason!: string;
}

export class PriceListUpdateDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1_000_000_000) price?: number;
  @IsOptional() @IsIn(['DangApDung', 'NgungApDung']) status?: 'DangApDung' | 'NgungApDung';
  @IsOptional() @Trimmed() @IsString() @MaxLength(300) surchargeNote?: string;
}

/** Lập báo giá từ yêu cầu. Trường nào bỏ trống sẽ lấy theo yêu cầu và bảng giá chuẩn. */
export class QuoteCreateDto {
  @IsOptional() @IsIn(['NoiTinh', 'LienTinh', 'TheoNgay']) scope?: 'NoiTinh' | 'LienTinh' | 'TheoNgay';
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) unitPrice?: number;
  @IsOptional() @IsEnum(don_vi_tinh_gia_enum) unit?: don_vi_tinh_gia_enum;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.5) @Max(60) units?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10) vehicles?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) surcharge?: number;
  /** Bỏ trống để dùng mã khuyến mãi khách đã nhập; "" để bỏ khuyến mãi. */
  @IsOptional() @Trimmed() @IsString() @MaxLength(50) promoCode?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1) depositRate?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(30) validDays?: number;
  @IsOptional() @Trimmed() @IsString() @MaxLength(4000) terms?: string;
}

/** Nhân viên ghi nhận phản hồi của khách với báo giá (qua điện thoại, email...). */
export class QuoteDecisionDto {
  @IsIn(['accept', 'reject']) decision!: 'accept' | 'reject';
  @IsOptional() @Trimmed() @IsString() @MaxLength(500) reason?: string;
}

export class ContractCreateDto {
  @IsOptional() @IsISO8601({ strict: true }) startAt?: string;
  @IsOptional() @IsISO8601({ strict: true }) endAt?: string;
  /** Nhân viên phụ trách; mặc định là người lập hợp đồng. */
  @IsOptional() @Trimmed() @IsString() @MaxLength(20) staffInChargeId?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(1000, { each: true }) terms?: string[];
}

export class PaymentCreateDto {
  @IsIn(['TienCoc', 'ThanhToanConLai', 'PhatSinh']) type!: 'TienCoc' | 'ThanhToanConLai' | 'PhatSinh';
  @IsEnum(phuong_thuc_thanh_toan_enum) method!: phuong_thuc_thanh_toan_enum;
  @Type(() => Number) @IsNumber() @Min(1000) amount!: number;
  @IsOptional() @Trimmed() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(100) partnerTransactionId?: string;
}

export class AssignmentItemDto {
  @Trimmed() @IsString() @MaxLength(20) vehicleId!: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(20) driverId?: string;
  @IsOptional() @Trimmed() @IsString() @MaxLength(300) note?: string;
}
export class AssignmentsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => AssignmentItemDto)
  items!: AssignmentItemDto[];
}

export class ContractStatusDto {
  @IsIn(['DangThucHien', 'HoanThanh', 'DaHuy']) status!: 'DangThucHien' | 'HoanThanh' | 'DaHuy';
  @IsOptional() @Trimmed() @IsString() @MaxLength(500) reason?: string;
}
