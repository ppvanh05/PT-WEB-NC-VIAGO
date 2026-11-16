import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { ReviewDto } from '../../../shared/accounts/accounts.dto';
import { loai_xe_enum } from '@prisma/client';
import { PageQueryDto } from '../../../shared/http/pagination';
import { CRITERION_KEYS } from '../../../shared/review-scoring';
import type { CriterionKey } from '../../../shared/review-scoring';

export class PublicReviewsQueryDto extends PageQueryDto {
  /** all: tất cả; has_comment: có nhận xét; has_media: có ảnh/video. */
  @IsOptional() @IsIn(['all', 'has_comment', 'has_media']) tab: 'all' | 'has_comment' | 'has_media' = 'all';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) rating?: number;
  @IsOptional() @IsEnum(loai_xe_enum) vehicleType?: loai_xe_enum;
  @IsOptional() @IsString() @MaxLength(50) routeId?: string;
  /** Chỉ lấy đánh giá có chấm tiêu chí này từ 4 sao trở lên. */
  @IsOptional() @IsIn(CRITERION_KEYS) criterion?: CriterionKey;
  @IsOptional() @IsIn(['newest', 'oldest', 'rating_high', 'rating_low', 'helpful'])
  sort: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful' = 'newest';
}

/** SĐT người đặt dùng để xác minh đơn khi khách chưa đăng nhập (trang Tra cứu vé). */
export class OrderPhoneQueryDto {
  @IsString() @Matches(/^0\d{9}$/, { message: 'Số điện thoại phải có 10 chữ số và bắt đầu bằng 0.' }) phone!: string;
}

/** Khách chưa đăng nhập gửi đánh giá từ trang Tra cứu vé: thêm SĐT người đặt và mã vé. */
export class GuestReviewDto extends ReviewDto {
  @IsString() @Matches(/^0\d{9}$/, { message: 'Số điện thoại phải có 10 chữ số và bắt đầu bằng 0.' }) phone!: string;
  @IsString() @MaxLength(60) ticketId!: string;
}
