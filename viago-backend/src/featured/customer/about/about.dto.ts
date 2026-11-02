import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  chu_de_lien_he_enum,
  hinh_thuc_lam_viec_enum,
  loai_chinh_sach_enum,
} from '@prisma/client';

const Optional = () => ValidateIf((_object, value) => value !== undefined);
const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
const OptionalText = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  );
const Phone = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .trim()
          .replace(/[\s().-]/g, '')
          .replace(/^\+84/, '0')
      : value,
  );
const Email = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || undefined : value,
  );

export const CONTACT_SUBJECTS: Record<chu_de_lien_he_enum, string> = {
  HoTroDatVe: 'Hỗ trợ đặt vé',
  KhieuNaiDichVu: 'Khiếu nại dịch vụ',
  HoanHuyVe: 'Hoàn/Hủy vé',
  GopYPhatTrien: 'Góp ý phát triển',
  Khac: 'Khác',
};
export const WORK_TYPES: Record<hinh_thuc_lam_viec_enum, string> = {
  ToanThoiGian: 'Toàn thời gian',
  BanThoiGian: 'Bán thời gian',
  ThoiVu: 'Thời vụ',
  ThucTap: 'Thực tập',
};
export const CV_MAX_SIZE = 5 * 1024 * 1024;
export const CV_EXTENSIONS = ['.pdf', '.doc', '.docx'];
export const LEGAL_TYPES: Record<loai_chinh_sach_enum, string> = {
  DatVe: 'Chính sách đặt vé',
  ChinhSuaVe: 'Chính sách chỉnh sửa vé',
  HoanHuy: 'Chính sách hoàn hủy',
  DieuKhoanDichVu: 'Điều khoản dịch vụ',
  BaoMat: 'Chính sách bảo mật',
};
const EnumLabel = (labels: Record<string, string>) =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? (Object.entries(labels).find(
          ([, label]) => label === value.trim(),
        )?.[0] ?? value.trim())
      : value,
  );

export class AboutPaginationDto {
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
  @MaxLength(200)
  search?: string;
}

export class PublicFaqQueryDto extends AboutPaginationDto {
  @Optional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  category?: string;
}

export class PublicPoliciesQueryDto extends AboutPaginationDto {
  @Optional()
  @EnumLabel(LEGAL_TYPES)
  @IsEnum(loai_chinh_sach_enum)
  type?: loai_chinh_sach_enum;
}

export class PublicCareersQueryDto extends AboutPaginationDto {
  @Optional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  department?: string;

  @Optional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  location?: string;

  @Optional()
  @EnumLabel(WORK_TYPES)
  @IsEnum(hinh_thuc_lam_viec_enum)
  workType?: hinh_thuc_lam_viec_enum;
}

export class ContactRequestDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName: string;

  @Phone()
  @IsString()
  @Matches(/^(?:0\d{8,10}|\+[1-9]\d{7,14})$/)
  phone: string;

  @Optional()
  @Email()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @EnumLabel(CONTACT_SUBJECTS)
  @IsEnum(chu_de_lien_he_enum)
  subject: chu_de_lien_he_enum = 'HoTroDatVe';

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  message: string;
}

export class CareerApplicationDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName: string;

  @Phone()
  @IsString()
  @Matches(/^(?:0\d{8,10}|\+[1-9]\d{7,14})$/)
  phoneNumber: string;

  @Email()
  @IsEmail()
  @MaxLength(254)
  email: string;

  @Optional()
  @OptionalText()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dateOfBirth?: string;

  @Optional()
  @OptionalText()
  @IsString()
  @MaxLength(1000)
  address?: string;

  @Optional()
  @OptionalText()
  @IsString()
  @MaxLength(255)
  education?: string;

  @Optional()
  @OptionalText()
  @IsString()
  @MaxLength(5000)
  experience?: string;

  @Optional()
  @OptionalText()
  @IsUrl({
    protocols: ['https', 'http'],
    require_protocol: true,
    disallow_auth: true,
  })
  @MaxLength(2048)
  portfolioLink?: string;

  @Optional()
  @OptionalText()
  @IsString()
  @MaxLength(10000)
  introduction?: string;

  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value,
  )
  @Equals(true)
  agreeTerms: boolean;
}

export interface UploadedCv {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const vietnamDate = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
export const pagination = (query: AboutPaginationDto, total: number) => ({
  page: query.page,
  pageSize: query.pageSize,
  total,
  totalPages: Math.ceil(total / query.pageSize),
});
