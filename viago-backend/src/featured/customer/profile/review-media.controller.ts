import {
  Controller,
  Get,
  Header,
  Param,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AccountsDatabaseFilter } from '../../../shared/accounts/accounts-access';
import { SupportRateGuard } from '../chatbot/auth/chatbot.auth';
import { ReviewMediaService } from './review-media.service';
@Controller('customer/review-media')
@UseGuards(SupportRateGuard)
@UseFilters(AccountsDatabaseFilter)
export class ReviewMediaController {
  constructor(private readonly service: ReviewMediaService) {}
  @Get(':id')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'none'; sandbox")
  read(@Param('id') id: string) {
    return this.service.read(id);
  }
}
