import { Body, Controller, Delete, Get, Param, Patch, Put, Query, Req, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import {
  AccountScope,
  AccountsDatabaseFilter,
  AccountsGuard,
  Permission,
} from '../../../../shared/accounts/accounts-access';
import type { AccountRequest } from '../../../../shared/accounts/accounts-access';
import { SupportRateGuard } from '../../../customer/chatbot/auth/chatbot.auth';
import { validation } from '../../../customer/chatbot/common/chatbot.validation';
import {
  AdminReviewsQueryDto,
  ReviewReplyDto,
  ReviewVisibilityDto,
  ReviewWorkflowDto,
} from './reviews-feedback.dto';
import { AdminReviewsFeedbackService } from './reviews-feedback.service';

@Controller('admin/reviews-feedback')
@UseGuards(SupportRateGuard, AccountsGuard)
@AccountScope('admin')
@Permission('QuanLyDanhGiaVaPhanHoi')
@UsePipes(validation)
@UseFilters(AccountsDatabaseFilter)
export class AdminReviewsFeedbackController {
  constructor(private readonly service: AdminReviewsFeedbackService) {}

  @Get('summary') summary() {
    return this.service.summary();
  }

  @Get('options') options() {
    return this.service.options();
  }

  @Get() list(@Query() q: AdminReviewsQueryDto) {
    return this.service.list(q);
  }

  @Get(':id') detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Put(':id/reply') reply(@Param('id') id: string, @Body() dto: ReviewReplyDto, @Req() req: AccountRequest) {
    return this.service.reply(id, dto, req.identity, req);
  }

  @Delete(':id/reply') removeReply(@Param('id') id: string, @Req() req: AccountRequest) {
    return this.service.removeReply(id, req.identity, req);
  }

  @Patch(':id/workflow') workflow(@Param('id') id: string, @Body() dto: ReviewWorkflowDto, @Req() req: AccountRequest) {
    return this.service.workflow(id, dto, req.identity, req);
  }

  @Patch(':id/visibility') visibility(@Param('id') id: string, @Body() dto: ReviewVisibilityDto, @Req() req: AccountRequest) {
    return this.service.visibility(id, dto, req.identity, req);
  }
}
