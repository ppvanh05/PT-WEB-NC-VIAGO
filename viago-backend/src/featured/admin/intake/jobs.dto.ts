import {
  hinh_thuc_lam_viec_enum,
  trang_thai_tin_tuyen_dung_enum,
} from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IntakeQueryDto } from './intake.dto';
const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
export class JobsQueryDto extends IntakeQueryDto {
  @IsOptional()
  @IsEnum(trang_thai_tin_tuyen_dung_enum)
  status?: trang_thai_tin_tuyen_dung_enum;
}
export class JobDto {
  @Trim() @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(150) department: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(500) location: string;
  @IsEnum(hinh_thuc_lam_viec_enum) workType: hinh_thuc_lam_viec_enum;
  @IsOptional() @Trim() @IsString() @MaxLength(150) salary?: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsISO8601({ strict: true }) deadline: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(20000) description: string;
  @Trim() @IsString() @IsNotEmpty() @MaxLength(20000) requirements: string;
  @IsOptional() @Trim() @IsString() @MaxLength(20000) benefits?: string;
  @IsOptional() @Trim() @IsString() @MaxLength(5000) workHours?: string;
  @IsOptional() @Trim() @IsString() @MaxLength(5000) workEnvironment?: string;
  @IsOptional() @Trim() @IsString() @MaxLength(5000) howToApply?: string;
  @IsOptional() @IsEmail() @MaxLength(200) email?: string;
  @IsOptional() @Matches(/^[+\d ().-]{8,30}$/) hotline?: string;
  @IsEnum(trang_thai_tin_tuyen_dung_enum)
  status: trang_thai_tin_tuyen_dung_enum;
  @IsOptional() @IsISO8601() expectedUpdatedAt?: string;
}
