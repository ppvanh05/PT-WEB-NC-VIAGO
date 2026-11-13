import { Body, Controller, Get, Header, Param, Post, Query, Req, UploadedFiles, UseFilters, UseGuards, UseInterceptors, UsePipes } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AccountsDatabaseFilter } from '../../../shared/accounts/accounts-access';
import { SupportRateGuard } from '../chatbot/auth/chatbot.auth';
import { validation } from '../chatbot/common/chatbot.validation';
import {
  BookingVerifyQueryDto,
  LostClaimDto,
  LostReportDto,
  LostStatusQueryDto,
  PublicLostItemsQueryDto,
} from './lost-and-found.dto';
import { CustomerLostAndFoundService } from './lost-and-found.service';
import { LostItemMediaService, MAX_LOST_ITEM_IMAGES } from './lost-item-media.service';
import type { LostItemUpload } from './lost-item-media.service';

/** Giới hạn upload ảnh đồ thất lạc: tối đa 3 ảnh, mỗi ảnh 5 MB. */
export const LOST_ITEM_UPLOAD = FilesInterceptor('files', MAX_LOST_ITEM_IMAGES, {
  limits: { files: MAX_LOST_ITEM_IMAGES, fileSize: 5 * 1024 * 1024, fields: 20, fieldSize: 5000 },
});

@Controller('customer/lost-and-found')
@UseGuards(SupportRateGuard)
@UsePipes(validation)
@UseFilters(AccountsDatabaseFilter)
export class CustomerLostAndFoundController {
  constructor(
    private readonly service: CustomerLostAndFoundService,
    private readonly media: LostItemMediaService,
  ) {}

  @Get('items') items(@Query() q: PublicLostItemsQueryDto) {
    return this.service.items(q);
  }

  @Get('routes') routes() {
    return this.service.routes();
  }

  @Get('bookings/:code') booking(@Param('code') code: string, @Query() q: BookingVerifyQueryDto) {
    return this.service.booking(code, q.phone);
  }

  /** Gửi dạng multipart/form-data: các trường của form + tối đa 3 ảnh ở trường "files". */
  @Post('reports') @UseInterceptors(LOST_ITEM_UPLOAD)
  report(@Body() dto: LostReportDto, @Req() req: Request, @UploadedFiles() files?: LostItemUpload[]) {
    return this.service.report(dto, req, files);
  }

  @Get('media/:name')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'none'; sandbox")
  image(@Param('name') name: string) {
    return this.media.read(name);
  }

  @Post('items/:id/claims') claim(@Param('id') id: string, @Body() dto: LostClaimDto, @Req() req: Request) {
    return this.service.claim(id, dto, req);
  }

  @Get('status/:code') status(@Param('code') code: string, @Query() q: LostStatusQueryDto) {
    return this.service.status(code, q.phone);
  }
}
