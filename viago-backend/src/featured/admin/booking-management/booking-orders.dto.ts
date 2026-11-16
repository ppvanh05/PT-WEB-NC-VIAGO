import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  HomePageDto,
  HomePassengerDto,
} from '../../customer/home/common/home.dto';

export class AdminHoldDto {
  @IsOptional() @IsUUID() holdId?: string;
  @IsString() @IsNotEmpty() @MaxLength(128) tripId: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  seatIds: string[];
}
export class AdminQuoteDto {
  @IsUUID() holdId: string;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  seatIds?: string[];
  @IsDefined()
  @ValidateNested()
  @Type(() => HomePassengerDto)
  customer: HomePassengerDto;
  @IsString() @IsNotEmpty() @MaxLength(128) pickupId: string;
  @IsString() @IsNotEmpty() @MaxLength(128) dropoffId: string;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MaxLength(50)
  voucherCode?: string;
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  doubleSeatIds: string[] = [];
}
export class AdminPaymentDto {
  @IsIn(['TIEN_MAT', 'VIETQR']) method: 'TIEN_MAT' | 'VIETQR';
  @IsBoolean() confirmReceived = false;
}
export class AdminCreateOrderDto extends AdminQuoteDto {
  @IsUUID() idempotencyKey: string;
  @IsInt() @Min(0) @Max(100000000000) expectedTotal: number;
  @IsIn(['TaiQuay', 'Hotline']) source: 'TaiQuay' | 'Hotline';
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
  @IsDefined()
  @ValidateNested()
  @Type(() => AdminPaymentDto)
  payment: AdminPaymentDto;
}
export class AdminConfirmPaymentDto {
  @IsUUID() idempotencyKey: string;
  @IsInt() @Min(0) @Max(100000000000) receivedAmount: number;
}
export class AdminCancelOrderDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
export class AdminOrdersQueryDto extends HomePageDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsIn(['all', 'pending']) status = 'all';
}
