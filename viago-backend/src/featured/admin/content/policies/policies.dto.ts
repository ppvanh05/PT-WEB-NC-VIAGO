import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  loai_chinh_sach_enum,
  trang_thai_chinh_sach_chung_enum,
} from '@prisma/client';

export const POLICY_TYPES: Record<loai_chinh_sach_enum, string> = {
  DatVe: 'Chính sách đặt vé',
  ChinhSuaVe: 'Chính sách chỉnh sửa vé',
  HoanHuy: 'Chính sách hoàn hủy',
  DieuKhoanDichVu: 'Điều khoản dịch vụ',
  BaoMat: 'Chính sách bảo mật',
};

export const POLICY_STATUSES: Record<trang_thai_chinh_sach_chung_enum, string> =
  {
    DangApDung: 'Đang áp dụng',
    DaKhoa: 'Đã khóa',
  };

// Omitted fields are optional; explicit null is invalid.
const Optional = () => ValidateIf((_object, value) => value !== undefined);
const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
const EnumLabel = (labels: Record<string, string>) =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? (Object.entries(labels).find(
          ([, label]) => label === value.trim(),
        )?.[0] ?? value.trim())
      : value,
  );

export class CancellationRuleDto {
  @IsInt()
  @Min(0)
  @Max(8760)
  truocGio: number;

  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  phiHuy: number;

  @Optional()
  @IsBoolean()
  choPhepHuy?: boolean;
}

export class PolicyActorDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  maNhanVien: string;
}

export class CreatePolicyDto extends PolicyActorDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  tenChinhSach: string;

  @EnumLabel(POLICY_TYPES)
  @IsEnum(loai_chinh_sach_enum)
  loaiChinhSach: loai_chinh_sach_enum;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100000)
  noiDungChinhSach: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  ngayApDung: string;

  @Optional()
  @EnumLabel(POLICY_STATUSES)
  @IsEnum(trang_thai_chinh_sach_chung_enum)
  trangThai?: trang_thai_chinh_sach_chung_enum;

  @Optional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CancellationRuleDto)
  mocThoiGianHuyVe?: CancellationRuleDto[];
}

export class UpdatePolicyDto extends PolicyActorDto {
  @Optional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  tenChinhSach?: string;

  @Optional()
  @EnumLabel(POLICY_TYPES)
  @IsEnum(loai_chinh_sach_enum)
  loaiChinhSach?: loai_chinh_sach_enum;

  @Optional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100000)
  noiDungChinhSach?: string;

  @Optional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  ngayApDung?: string;

  @Optional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CancellationRuleDto)
  mocThoiGianHuyVe?: CancellationRuleDto[];
}

export class UpdatePolicyStatusDto extends PolicyActorDto {
  @EnumLabel(POLICY_STATUSES)
  @IsEnum(trang_thai_chinh_sach_chung_enum)
  trangThai: trang_thai_chinh_sach_chung_enum;
}

export class ListPoliciesDto {
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

  @Optional()
  @Trim()
  @IsString()
  @MaxLength(255)
  search?: string;

  @Optional()
  @EnumLabel(POLICY_TYPES)
  @IsEnum(loai_chinh_sach_enum)
  loaiChinhSach?: loai_chinh_sach_enum;

  @Optional()
  @EnumLabel(POLICY_STATUSES)
  @IsEnum(trang_thai_chinh_sach_chung_enum)
  trangThai?: trang_thai_chinh_sach_chung_enum;

  @IsIn(['newest', 'oldest', 'name'])
  sort: 'newest' | 'oldest' | 'name' = 'newest';
}
