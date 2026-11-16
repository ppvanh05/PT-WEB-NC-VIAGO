import { Body, Controller, Get, Param, Patch, Post, Query, Req, UploadedFiles, UseFilters, UseGuards, UseInterceptors, UsePipes } from '@nestjs/common';
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
  AdminLostItemsQueryDto,
  ClaimDecisionDto,
  LostItemCreateDto,
  LostItemStatusDto,
  LostItemUpdateDto,
} from './lost-and-found.dto';
import { AdminLostAndFoundService } from './lost-and-found.service';
import { LOST_ITEM_UPLOAD } from '../../../customer/lost-and-found/lost-and-found.controller';
import { LostItemMediaService } from '../../../customer/lost-and-found/lost-item-media.service';
import type { LostItemUpload } from '../../../customer/lost-and-found/lost-item-media.service';

@Controller('admin/lost-and-found')
@UseGuards(SupportRateGuard, AccountsGuard)
@AccountScope('admin')
@Permission('QuanLyDoThatLac')
@UsePipes(validation)
@UseFilters(AccountsDatabaseFilter)
export class AdminLostAndFoundController {
  constructor(
    private readonly service: AdminLostAndFoundService,
    private readonly media: LostItemMediaService,
  ) {}

  /**
   * Tải ảnh lên trước (multipart, trường "files", tối đa 3 ảnh), nhận lại danh sách đường dẫn
   * rồi gửi vào images/foundImages khi tạo, sửa hoặc đổi trạng thái hồ sơ.
   */
  @Post('media') @UseInterceptors(LOST_ITEM_UPLOAD)
  async upload(@UploadedFiles() files?: LostItemUpload[]) {
    const { urls } = await this.media.store(files ?? []);
    return { urls };
  }

  @Get('summary') summary() {
    return this.service.summary();
  }

  @Get('tickets/:code') ticket(@Param('code') code: string) {
    return this.service.ticket(code);
  }

  @Get() list(@Query() q: AdminLostItemsQueryDto) {
    return this.service.list(q);
  }

  @Get(':id') detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @Post() create(@Body() dto: LostItemCreateDto, @Req() req: AccountRequest) {
    return this.service.create(dto, req.identity, req);
  }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: LostItemUpdateDto, @Req() req: AccountRequest) {
    return this.service.update(id, dto, req.identity, req);
  }

  @Patch(':id/status') status(@Param('id') id: string, @Body() dto: LostItemStatusDto, @Req() req: AccountRequest) {
    return this.service.status(id, dto, req.identity, req);
  }

  @Patch('claims/:claimId') decideClaim(@Param('claimId') claimId: string, @Body() dto: ClaimDecisionDto, @Req() req: AccountRequest) {
    return this.service.decideClaim(claimId, dto, req.identity, req);
  }
}
