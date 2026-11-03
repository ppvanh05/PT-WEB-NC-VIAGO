import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { doi_tuong_gioi_han_enum, pham_vi_dich_vu_enum } from '@prisma/client';

export const DISCOUNT_TYPES = {
  percentage: 'PhanTram',
  fixed: 'TruTienThang',
  gift: 'QuaTang',
} as const;
export const ROUTE_SCOPES = {
  all: 'TatCa',
  specific: 'ChiTuyenDuocChon',
  exclude: 'LoaiTruTuyenDuocChon',
} as const;
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export type DiscountType = keyof typeof DISCOUNT_TYPES;
export type PromotionStatus =
  'running' | 'upcoming' | 'paused' | 'expired' | 'locked';
const Optional = () => ValidateIf((_object, value) => value !== undefined);
const Nullable = () =>
  ValidateIf((_object, value) => value !== undefined && value !== null);
const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
const Code = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  );
const Strings = () =>
  Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((item: unknown) =>
          typeof item === 'string' ? item.trim() : item,
        )
      : value,
  );
const Money = () =>
  IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 });

export class PromotionActorDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  maNhanVien: string;
}

export class AssignedCustomerDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  emailOrPhone: string;

  @IsIn(['complaint', 'delay_cancel', 'system_error', 'custom_compensation'])
  reason: 'complaint' | 'delay_cancel' | 'system_error' | 'custom_compensation';

  @Optional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

class PromotionSettingsDto extends PromotionActorDto {
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Nullable()
  @Money()
  @Min(0.01)
  @Max(1000000000000)
  maxDiscount?: number | null;

  @Optional()
  @Money()
  @Min(0)
  @Max(1000000000000)
  minOrderValue?: number;

  @Optional()
  @IsEnum(pham_vi_dich_vu_enum)
  serviceScope?: pham_vi_dich_vu_enum;

  @Optional()
  @Strings()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(128, { each: true })
  memberTiers?: string[];

  @Optional()
  @IsBoolean()
  firstOrderOnly?: boolean;

  @Optional()
  @IsBoolean()
  birthdayMonthOnly?: boolean;

  @Optional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((month: unknown) =>
          typeof month === 'number' || typeof month === 'string'
            ? String(month).trim().padStart(2, '0')
            : month,
        )
      : value,
  )
  @IsArray()
  @ArrayMaxSize(12)
  @ArrayUnique()
  @IsIn(
    Array.from({ length: 12 }, (_, index) =>
      String(index + 1).padStart(2, '0'),
    ),
    { each: true },
  )
  birthdayMonths?: string[];

  @Nullable()
  @ValidateNested()
  @Type(() => AssignedCustomerDto)
  assignedCustomer?: AssignedCustomerDto | null;

  @Optional()
  @IsIn(['all', 'specific', 'exclude'])
  routesType?: keyof typeof ROUTE_SCOPES;

  @Optional()
  @Strings()
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(255, { each: true })
  selectedRoutes?: string[];

  @Optional()
  @IsArray()
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsIn(WEEKDAYS, { each: true })
  daysOfWeek?: string[];

  @Optional()
  @IsBoolean()
  referralRequired?: boolean;

  @Optional()
  @IsBoolean()
  emailFollowRequired?: boolean;

  @Optional()
  @IsIn(['high', 'normal'])
  priority?: 'high' | 'normal';

  @Optional()
  @IsIn(['running', 'paused', 'locked'])
  status?: 'running' | 'paused' | 'locked';

  @Nullable()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  maxUsage?: number | null;

  @Nullable()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  limitPerUser?: number | null;

  @Optional()
  @IsEnum(doi_tuong_gioi_han_enum)
  limitSubject?: doi_tuong_gioi_han_enum;

  @Nullable()
  @IsObject()
  benefitConfig?: Record<string, unknown> | null;
}

export class CreatePromotionDto extends PromotionSettingsDto {
  @Code()
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9_-]{2,49}$/)
  code: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsIn(['percentage', 'fixed', 'gift'])
  discountType: DiscountType;

  @Money()
  @Min(0)
  @Max(1000000000000)
  discountValue: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  startDate: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  endDate: string;
}

export class UpdatePromotionDto extends PromotionSettingsDto {
  @Optional()
  @Code()
  @IsString()
  @Matches(/^[A-Z0-9][A-Z0-9_-]{2,49}$/)
  code?: string;

  @Optional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @Optional()
  @IsIn(['percentage', 'fixed', 'gift'])
  discountType?: DiscountType;

  @Optional()
  @Money()
  @Min(0)
  @Max(1000000000000)
  discountValue?: number;

  @Optional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  startDate?: string;

  @Optional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  endDate?: string;
}

export class PromotionStatusDto extends PromotionActorDto {
  @IsIn(['running', 'paused', 'locked'])
  status: 'running' | 'paused' | 'locked';
}

export class PromotionPaginationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;
}

export class ListPromotionsDto extends PromotionPaginationDto {
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(255)
  search?: string;

  @Optional()
  @IsIn(['running', 'upcoming', 'paused', 'expired', 'locked', 'all'])
  status?: PromotionStatus | 'all';

  @Optional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  tier?: string;

  @Optional()
  @IsIn(['percentage', 'fixed', 'gift'])
  discountType?: DiscountType;

  @IsIn(['newest', 'oldest', 'code'])
  sort: 'newest' | 'oldest' | 'code' = 'newest';
}
