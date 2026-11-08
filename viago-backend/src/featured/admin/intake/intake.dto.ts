import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  IsISO8601,
  IsIn,
} from 'class-validator';
import {
  chu_de_lien_he_enum,
  trang_thai_ho_so_enum,
  trang_thai_lien_he_enum,
} from '@prisma/client';

export class IntakeQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(150)
  search?: string;
}
export class ContactsQueryDto extends IntakeQueryDto {
  @IsOptional()
  @IsEnum(trang_thai_lien_he_enum)
  status?: trang_thai_lien_he_enum;
  @IsOptional() @IsEnum(chu_de_lien_he_enum) subject?: chu_de_lien_he_enum;
}
export class ApplicationsQueryDto extends IntakeQueryDto {
  @IsOptional() @IsEnum(trang_thai_ho_so_enum) status?: trang_thai_ho_so_enum;
  @IsOptional() @IsString() @MaxLength(100) jobId?: string;
}
export class WorkflowDto {
  @IsOptional() @IsInt() @Min(0) expectedVersion?: number;
  @IsOptional() @IsString() @MaxLength(100) assignedStaffId?: string;
  @IsOptional()
  @IsIn(['Thap', 'BinhThuong', 'Cao', 'KhanCap'])
  priority?: string;
  @IsOptional() @IsString() @MaxLength(5000) evaluation?: string;
  @IsOptional() @IsString() @MaxLength(40) @IsISO8601() interviewAt?:
    string | null;
  @IsOptional() @IsString() @MaxLength(5000) replyDraft?: string;
}
export class ContactStatusDto extends WorkflowDto {
  @IsEnum(trang_thai_lien_he_enum) status: trang_thai_lien_he_enum;
  @IsEnum(trang_thai_lien_he_enum) expectedStatus: trang_thai_lien_he_enum;
  @IsOptional() @IsString() @MaxLength(3000) note?: string;
}
export class ApplicationStatusDto extends WorkflowDto {
  @IsEnum(trang_thai_ho_so_enum) status: trang_thai_ho_so_enum;
  @IsEnum(trang_thai_ho_so_enum) expectedStatus: trang_thai_ho_so_enum;
  @IsOptional() @IsString() @MaxLength(3000) note?: string;
}
