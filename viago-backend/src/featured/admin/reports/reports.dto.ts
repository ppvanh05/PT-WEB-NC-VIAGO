import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  loai_xe_enum,
  nguon_dat_enum,
  nguon_huy_enum,
  trang_thai_lich_trinh_enum,
  trang_thai_nhan_su_xe_enum,
  vai_tro_nhan_su_xe_enum,
} from '@prisma/client';
import { DateRangeQueryDto } from '../../../shared/http/pagination';

export class CancellationReportQueryDto extends DateRangeQueryDto {
  @IsOptional() @IsEnum(nguon_huy_enum) cancelledBy?: nguon_huy_enum;
  @IsOptional() @IsEnum(nguon_dat_enum) channel?: nguon_dat_enum;
  @IsOptional() @IsIn(['refunded', 'pending', 'processing', 'failed', 'none']) refundStatus?: 'refunded' | 'pending' | 'processing' | 'failed' | 'none';
  @IsOptional() @IsString() @MaxLength(50) routeId?: string;
  @IsOptional() @IsEnum(loai_xe_enum) vehicleType?: loai_xe_enum;
}

export class RevenueReportQueryDto extends DateRangeQueryDto {
  @IsOptional() @IsString() @MaxLength(50) routeId?: string;
  @IsOptional() @IsEnum(loai_xe_enum) vehicleType?: loai_xe_enum;
  @IsOptional() @IsEnum(trang_thai_lich_trinh_enum) status?: trang_thai_lich_trinh_enum;
}

export class RouteReportQueryDto extends DateRangeQueryDto {
  @IsOptional() @IsIn(['HoatDong', 'NgungHoatDong']) status?: 'HoatDong' | 'NgungHoatDong';
  @IsOptional() @IsIn(['revenue', 'tickets', 'fill_rate', 'rating']) sort: 'revenue' | 'tickets' | 'fill_rate' | 'rating' = 'revenue';
}

export class CustomerReportQueryDto extends DateRangeQueryDto {
  @IsOptional() @IsIn(['member', 'guest']) type?: 'member' | 'guest';
  @IsOptional() @IsString() @MaxLength(20) tierId?: string;
  @IsOptional() @IsIn(['HoatDong', 'DaKhoa']) status?: 'HoatDong' | 'DaKhoa';
  @IsOptional() @IsIn(['spent', 'tickets', 'newest']) sort: 'spent' | 'tickets' | 'newest' = 'spent';
}

export class DriverReportQueryDto extends DateRangeQueryDto {
  @IsOptional() @IsEnum(vai_tro_nhan_su_xe_enum) role?: vai_tro_nhan_su_xe_enum;
  @IsOptional() @IsEnum(trang_thai_nhan_su_xe_enum) status?: trang_thai_nhan_su_xe_enum;
  /** D, E hoặc none (phụ xe không yêu cầu bằng). */
  @IsOptional() @IsIn(['D', 'E', 'none']) licenseClass?: 'D' | 'E' | 'none';
  @IsOptional() @IsIn(['valid', 'expiring', 'expired', 'none']) licenseState?: 'valid' | 'expiring' | 'expired' | 'none';
}
