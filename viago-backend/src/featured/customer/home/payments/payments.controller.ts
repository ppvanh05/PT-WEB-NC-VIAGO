import {
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { HomeBookingService } from '../booking/booking.service';
import { SepayWebhookDto } from '../common/home.dto';
import { SepayWebhookGuard } from '../common/home.guard';
@Controller('customer/home/payments')
@UseGuards(SepayWebhookGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidUnknownValues: true,
  }),
)
export class HomePaymentWebhookController {
  constructor(private readonly booking: HomeBookingService) {}
  @Post('sepay') @HttpCode(200) webhook(@Body() dto: SepayWebhookDto) {
    return this.booking.webhook(dto);
  }
}
