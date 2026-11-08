import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { loai_xe_enum } from '@prisma/client';

const Optional = () => ValidateIf((_object, value) => value !== undefined);
const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
export const todayVN = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
export const homeId = (prefix: string) =>
  prefix + crypto.randomUUID().replaceAll('-', '').toUpperCase();
export const VEHICLES: Record<loai_xe_enum, string> = {
  Limousine9Cho: 'Limousine 9 chỗ',
  Cabin22Cho: 'Cabin 22 chỗ',
  GiuongNam34Cho: 'Giường nằm 34 chỗ',
};
export class HomePageDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 12;
}
export class HomeLimitDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(20) limit = 3;
}
export class HomeRoutesDto extends HomePageDto {
  @Optional() @Trim() @IsString() @MaxLength(200) search?: string;
}
export class HomeTripsDto extends HomePageDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(150) from: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(150) to: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) date: string;
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  roundTrip = false;
  @Optional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  returnDate?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) count = 1;
  @Optional()
  @Transform(
    ({ value }: { value: unknown }) =>
      Object.entries(VEHICLES).find(
        ([key, label]) => value === key || value === label,
      )?.[0] ?? value,
  )
  @IsEnum(loai_xe_enum)
  type?: loai_xe_enum;
  @IsIn(['all', 'morning', 'afternoon', 'evening', 'night']) time = 'all';
  @Optional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000)
  minPrice?: number;
  @Optional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100000000)
  maxPrice?: number;
  @IsIn(['early', 'late', 'price']) sort = 'early';
}
export class HomeLegDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(128) tripId: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  seats: string[];
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  doubleSeats: string[] = [];
  @Optional() @IsString() @MaxLength(128) pickupId?: string;
  @Optional() @IsString() @MaxLength(128) dropoffId?: string;
}
export class HomeHoldDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => HomeLegDto)
  legs: HomeLegDto[];
}
export class HomePassengerDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u)
  name: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .trim()
          .replace(/[\s().-]/g, '')
          .replace(/^\+84/, '0')
      : value,
  )
  @Matches(/^0[35789]\d{8}$/)
  phone: string;
  @Optional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || undefined : value,
  )
  @IsEmail()
  @MaxLength(254)
  email?: string;
}
export class HomeQuoteDto extends HomeHoldDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => HomePassengerDto)
  passenger: HomePassengerDto;
  @Optional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MaxLength(50)
  voucher?: string;
}
export class HomeOrderDto extends HomeQuoteDto {
  @IsIn(['counter', 'vietqr']) method: 'counter' | 'vietqr' = 'counter';
  @IsUUID() key: string;
  @Equals(true) terms: boolean;
}
export class HomeWeatherDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(150) city: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) date: string;
}
export class SepayWebhookDto {
  @IsInt() @Min(1) id: number;
  @IsString() @IsNotEmpty() @MaxLength(100) gateway: string;
  @IsString() @MaxLength(100) accountNumber: string;
  @IsIn(['in', 'out']) transferType: string;
  @IsInt() @Min(1) @Max(100000000000) transferAmount: number;
  @IsString() @MaxLength(2000) content: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
      ? value.replace(' ', 'T') + '+07:00'
      : value,
  )
  @IsDateString({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  transactionDate: string;
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(100)
  referenceCode?: string | null;
}
export const pageInfo = (query: HomePageDto, total: number) => ({
  page: query.page,
  pageSize: query.pageSize,
  total,
  totalPages: Math.ceil(total / query.pageSize),
});
