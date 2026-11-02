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
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateBy,
  ValidateIf,
} from 'class-validator';
import {
  danh_muc_tin_tuc_enum,
  trang_thai_hien_thi_enum,
  trang_thai_tin_tuc_enum,
} from '@prisma/client';

export const NEWS_CATEGORIES: Record<danh_muc_tin_tuc_enum, string> = {
  TinTucNhaXe: 'Tin tức nhà xe',
  KhuyenMai: 'Khuyến mãi',
  CamNangDiChuyen: 'Cẩm nang di chuyển',
  SuKien: 'Sự kiện',
  TuyenDung: 'Tuyển dụng',
};
export const NEWS_STATUSES: Record<trang_thai_tin_tuc_enum, string> = {
  DangHienThi: 'Đang hiển thị',
  LichHenDang: 'Lịch hẹn đăng',
  BanNhap: 'Bản nháp',
  DaAn: 'Đã ẩn',
};
export const COMMENT_STATUSES: Record<trang_thai_hien_thi_enum, string> = {
  HienThi: 'Đang hiển thị',
  DaAn: 'Đã ẩn',
};
export const NEWS_AUTHORS: Record<danh_muc_tin_tuc_enum, string> = {
  TinTucNhaXe: 'Ban Vận Hành',
  KhuyenMai: 'Viago Rewards',
  CamNangDiChuyen: 'Viago Guide',
  SuKien: 'Viago Events',
  TuyenDung: 'Nhân sự Viago',
};
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
const CoverUrl = () =>
  ValidateBy({
    name: 'coverUrl',
    validator: {
      validate(value: unknown) {
        if (typeof value !== 'string' || /[\s\\<>"']/.test(value)) return false;
        if (/^\/?(?:assets|uploads|asset\/images)\/[^?#]+$/.test(value)) {
          return !value.split('/').some((segment) => {
            try {
              return decodeURIComponent(segment) === '..';
            } catch {
              return true;
            }
          });
        }
        try {
          const url = new URL(value);
          return (
            ['https:', 'http:'].includes(url.protocol) &&
            !!url.hostname &&
            !url.username &&
            !url.password
          );
        } catch {
          return false;
        }
      },
      defaultMessage: () =>
        'image phải là URL HTTP(S) hoặc đường dẫn assets/uploads hợp lệ.',
    },
  });

export class NewsActorDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  maNhanVien: string;
}

class NewsMetadataDto extends NewsActorDto {
  @Optional()
  @EnumLabel(NEWS_STATUSES)
  @IsEnum(trang_thai_tin_tuc_enum)
  trangThai?: trang_thai_tin_tuc_enum;

  @Optional()
  @IsDateString({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  henDangLuc?: string;

  @Optional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  nguoiDang?: string;

  @Optional()
  @IsBoolean()
  noiBat?: boolean;

  @Optional()
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((tag: unknown) =>
          typeof tag === 'string' ? tag.trim() : tag,
        )
      : value,
  )
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @Optional()
  @Trim()
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  duongDan?: string;
}

export class CreateNewsDto extends NewsMetadataDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  tieuDe: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  moTa: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  @CoverUrl()
  image: string;

  @EnumLabel(NEWS_CATEGORIES)
  @IsEnum(danh_muc_tin_tuc_enum)
  loai: danh_muc_tin_tuc_enum;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100000)
  noiDung: string;
}

export class UpdateNewsDto extends NewsMetadataDto {
  @Optional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  tieuDe?: string;

  @Optional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  moTa?: string;

  @Optional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  @CoverUrl()
  image?: string;

  @Optional()
  @EnumLabel(NEWS_CATEGORIES)
  @IsEnum(danh_muc_tin_tuc_enum)
  loai?: danh_muc_tin_tuc_enum;

  @Optional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100000)
  noiDung?: string;
}

export class UpdateNewsStatusDto extends NewsActorDto {
  @EnumLabel(NEWS_STATUSES)
  @IsEnum(trang_thai_tin_tuc_enum)
  trangThai: trang_thai_tin_tuc_enum;

  @Optional()
  @IsDateString({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  henDangLuc?: string;
}

class PaginationDto {
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

export class ListNewsDto extends PaginationDto {
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(255)
  search?: string;

  @Optional()
  @EnumLabel(NEWS_CATEGORIES)
  @IsEnum(danh_muc_tin_tuc_enum)
  loai?: danh_muc_tin_tuc_enum;

  @Optional()
  @EnumLabel(NEWS_STATUSES)
  @IsEnum(trang_thai_tin_tuc_enum)
  trangThai?: trang_thai_tin_tuc_enum;

  @Optional()
  @Matches(/^(?:19\d{2}|[2-9]\d{3})-(?:0[1-9]|1[0-2])$/)
  thang?: string;

  @Optional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  noiBat?: boolean;

  @IsIn(['newest', 'oldest', 'title-az', 'title-za'])
  sort: 'newest' | 'oldest' | 'title-az' | 'title-za' = 'newest';
}

export class ListNewsCommentsDto extends PaginationDto {
  @EnumLabel(COMMENT_STATUSES)
  @IsEnum(trang_thai_hien_thi_enum)
  trangThai: trang_thai_hien_thi_enum = 'HienThi';
}

export class UpdateNewsCommentStatusDto extends NewsActorDto {
  @EnumLabel(COMMENT_STATUSES)
  @IsEnum(trang_thai_hien_thi_enum)
  trangThai: trang_thai_hien_thi_enum;
}
