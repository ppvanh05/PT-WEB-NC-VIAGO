import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Cắt khoảng trắng hai đầu cho chuỗi trong query/body. */
export const Trimmed = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

/** Query phân trang + tìm kiếm dùng chung cho các danh sách. */
export class PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 10;
  @IsOptional() @Trimmed() @IsString() @MaxLength(150) search?: string;
}

/** Khoảng ngày theo lịch Việt Nam, định dạng yyyy-MM-dd. */
export class DateRangeQueryDto extends PageQueryDto {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) from?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) to?: string;
}

export function pageMeta(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function paginate<T>(rows: T[], page: number, pageSize: number) {
  return {
    items: rows.slice((page - 1) * pageSize, page * pageSize),
    pagination: pageMeta(page, pageSize, rows.length),
  };
}
