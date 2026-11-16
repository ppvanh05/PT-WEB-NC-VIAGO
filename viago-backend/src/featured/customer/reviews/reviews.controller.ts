import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req, UploadedFiles, UseFilters, UseGuards, UseInterceptors, UsePipes } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import {
  AccountScope,
  AccountsDatabaseFilter,
  AccountsGuard,
} from '../../../shared/accounts/accounts-access';
import type { AccountRequest } from '../../../shared/accounts/accounts-access';
import { SupportRateGuard } from '../chatbot/auth/chatbot.auth';
import { validation } from '../chatbot/common/chatbot.validation';
import { NewsInteractionGuard, newsVisitor } from '../news/news-interaction.guard';
import type { ReviewUpload } from '../profile/review-media.service';
import { CustomerReviewOrdersService } from './review-orders.service';
import { GuestReviewDto, OrderPhoneQueryDto, PublicReviewsQueryDto } from './reviews.dto';
import { CustomerReviewsService } from './reviews.service';

/**
 * Trang đánh giá tổng và kiểm tra điều kiện đánh giá.
 * Gửi đánh giá: POST /customer/profile/tickets/:id/review (module tài khoản).
 */
@Controller('customer/reviews')
@UseGuards(SupportRateGuard)
@UsePipes(validation)
@UseFilters(AccountsDatabaseFilter)
export class CustomerReviewsController {
  constructor(
    private readonly service: CustomerReviewsService,
    private readonly orders: CustomerReviewOrdersService,
  ) {}

  @Get('summary') summary() {
    return this.service.summary();
  }

  @Get('options') options() {
    return this.service.options();
  }

  /** Dùng chung cookie khách ẩn danh với tin tức để biết khách đã bấm "Hữu ích" chưa. */
  @Get() @UseGuards(NewsInteractionGuard)
  list(@Query() q: PublicReviewsQueryDto, @Req() req: Request) {
    return this.service.list(q, newsVisitor(req));
  }

  @Post(':id/helpful') @HttpCode(200) @UseGuards(NewsInteractionGuard)
  markHelpful(@Param('id') id: string, @Req() req: Request) {
    return this.service.helpful(id, newsVisitor(req), true);
  }

  @Delete(':id/helpful') @UseGuards(NewsInteractionGuard)
  unmarkHelpful(@Param('id') id: string, @Req() req: Request) {
    return this.service.helpful(id, newsVisitor(req), false);
  }

  // ─── Trang Tra cứu vé: đơn thật để khách đánh giá chuyến đi ───────────────

  /** Đơn của tài khoản đang đăng nhập. Đặt trước 'orders/:code' để không bị hiểu là mã đơn. */
  @Get('orders/mine')
  @UseGuards(AccountsGuard)
  @AccountScope('customer')
  myOrders(@Req() req: AccountRequest) {
    return this.orders.mine(req.identity);
  }

  /** Khách chưa đăng nhập: mã đơn/mã vé + SĐT người đặt. */
  @Get('orders/:code')
  orderByCode(@Param('code') code: string, @Query() q: OrderPhoneQueryDto) {
    return this.orders.byCode(code, q.phone);
  }

  /** Khách chưa đăng nhập gửi đánh giá (multipart: phone, ticketId, scores, comment, files). */
  @Post('orders/:code/review')
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      limits: { files: 3, fileSize: 20 * 1024 * 1024, fields: 4, fieldSize: 5000 },
    }),
  )
  guestReview(
    @Param('code') code: string,
    @Body() dto: GuestReviewDto,
    @Req() req: Request,
    @UploadedFiles() files?: ReviewUpload[],
  ) {
    return this.orders.review(code, dto.phone, dto.ticketId, dto, req, files);
  }

  @Get('eligibility/:ticketId')
  @UseGuards(AccountsGuard)
  @AccountScope('customer')
  eligibility(@Param('ticketId') ticketId: string, @Req() req: AccountRequest) {
    return this.service.eligibility(req.identity, ticketId);
  }
}
