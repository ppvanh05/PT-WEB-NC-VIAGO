import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { danh_muc_tin_tuc_enum } from '@prisma/client';

export const NEWS_CATEGORIES: Record<
  string,
  { code: danh_muc_tin_tuc_enum; label: string; author: string }
> = {
  news: {
    code: 'TinTucNhaXe',
    label: 'Tin tức nhà xe',
    author: 'Ban Vận Hành',
  },
  promotion: {
    code: 'KhuyenMai',
    label: 'Khuyến mãi',
    author: 'Viago Rewards',
  },
  guide: {
    code: 'CamNangDiChuyen',
    label: 'Cẩm nang di chuyển',
    author: 'Viago Guide',
  },
  event: { code: 'SuKien', label: 'Sự kiện', author: 'Viago Events' },
  recruitment: {
    code: 'TuyenDung',
    label: 'Tuyển dụng',
    author: 'Nhân sự Viago',
  },
};
const Optional = () => ValidateIf((_object, value) => value !== undefined);
const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
const Category = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const input = value.trim();
    return (
      Object.entries(NEWS_CATEGORIES).find(
        ([key, item]) =>
          key === input || item.code === input || item.label === input,
      )?.[0] ?? input
    );
  });

export class NewsPaginationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 12;
}

export class NewsCategoryQueryDto {
  @Category()
  @IsIn(['all', ...Object.keys(NEWS_CATEGORIES)])
  category = 'all';
}

export class PublicNewsQueryDto extends NewsPaginationDto {
  @Category()
  @IsIn(['all', ...Object.keys(NEWS_CATEGORIES)])
  category = 'all';

  @Optional()
  @Trim()
  @IsString()
  @MaxLength(200)
  search?: string;

  @Optional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tag?: string;

  @IsIn(['all', 'today', 'week', 'month', 'year'])
  time = 'all';

  @IsIn(['newest', 'oldest', 'popular'])
  sort = 'newest';
}

export class RelatedNewsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  limit = 4;
}

export class PublicCommentDto {
  @Optional()
  @Trim()
  @IsString()
  @MaxLength(150)
  authorName?: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}

export const newsPagination = (query: NewsPaginationDto, total: number) => ({
  page: query.page,
  pageSize: query.pageSize,
  total,
  totalPages: Math.ceil(total / query.pageSize),
});
