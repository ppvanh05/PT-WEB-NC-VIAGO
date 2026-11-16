import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { muc_do_khan_cap_enum } from '@prisma/client';
import { PageQueryDto, Trimmed } from '../../../../shared/http/pagination';

export const PROCESSING_STATUSES = ['moi', 'dang-xu-ly', 'da-xong', 'dong'] as const;
export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];
/** Nguyên nhân CSKH gắn cho phản ánh nghiệp vụ (cột danh_gia.tagnguyennhan). */
export const CAUSE_TAGS = ['tai-xe', 'van-hanh', 'thoi-tiet', 'khach-chu-quan'] as const;
export type CauseTag = (typeof CAUSE_TAGS)[number];
export const CAUSE_TAG_LABELS: Record<CauseTag, string> = { 'tai-xe': 'Tài xế', 'van-hanh': 'Vận hành', 'thoi-tiet': 'Thời tiết', 'khach-chu-quan': 'Khách chủ quan' };

export class AdminReviewsQueryDto extends PageQueryDto {
  @IsOptional() @IsString() @MaxLength(50) routeId?: string;
  /** Giờ khởi hành HH:mm. */
  @IsOptional() @Matches(/^\d{2}:\d{2}$/) departureTime?: string;
  /** Ngày đánh giá yyyy-MM-dd. */
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) date?: string;
  /** pending: chưa xong (mới/đang xử lý); done: đã xong hoặc đã đóng; hoặc đúng một trạng thái. */
  @IsOptional() @IsIn(['pending', 'done', ...PROCESSING_STATUSES]) processing?: 'pending' | 'done' | ProcessingStatus;
  /** Danh sách số sao, ví dụ stars=1,2 hoặc stars=1&stars=2. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    (Array.isArray(value) ? value : String(value).split(',')).map((v) => Number(v)),
  )
  @IsArray() @ArrayMaxSize(5) @IsInt({ each: true }) @Min(1, { each: true }) @Max(5, { each: true })
  stars?: number[];
  /** needs_reply: chưa phản hồi; low_rating: từ 3 sao trở xuống. */
  @IsOptional() @IsIn(['all', 'needs_reply', 'low_rating']) queue: 'all' | 'needs_reply' | 'low_rating' = 'all';
  @IsOptional() @IsIn(['visible', 'hidden']) visibility?: 'visible' | 'hidden';
  @IsOptional() @IsEnum(muc_do_khan_cap_enum) urgency?: muc_do_khan_cap_enum;
  /** Lọc theo nguyên nhân; none = chưa gắn nguyên nhân. */
  @IsOptional() @IsIn([...CAUSE_TAGS, 'none']) causeTag?: CauseTag | 'none';
  @IsOptional() @IsIn(['newest', 'oldest', 'urgent', 'rating_low']) sort: 'newest' | 'oldest' | 'urgent' | 'rating_low' = 'urgent';
}

export class ReviewReplyDto {
  @Trimmed() @IsString() @MinLength(10, { message: 'Phản hồi tối thiểu 10 ký tự.' }) @MaxLength(2000) content!: string;
}

export class ReviewWorkflowDto {
  @IsOptional() @IsIn(PROCESSING_STATUSES) processingStatus?: ProcessingStatus;
  @IsOptional() @IsEnum(muc_do_khan_cap_enum) urgency?: muc_do_khan_cap_enum;
  @IsOptional() @Trimmed() @IsString() @MaxLength(2000) internalNote?: string;
  /** "" để bỏ nguyên nhân đã gắn. */
  @IsOptional() @IsIn([...CAUSE_TAGS, '']) causeTag?: CauseTag | '';
}

/** Ẩn chỉ dùng cho nội dung vi phạm quy định/thuần phong mỹ tục; bắt buộc ghi lý do. */
export class ReviewVisibilityDto {
  @Type(() => Boolean) @IsBoolean() visible!: boolean;
  @IsOptional() @Trimmed() @IsString() @MinLength(5) @MaxLength(500) reason?: string;
}
