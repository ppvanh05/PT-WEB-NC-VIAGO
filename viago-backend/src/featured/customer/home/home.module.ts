import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CustomerNewsModule } from '../news/news.module';
import { CustomerHomeController } from './catalog/home.controller';
import { HomeBookingController } from './booking/booking.controller';
import { HomePromotionsController } from './promotions/promotions.controller';
import { HomePaymentWebhookController } from './payments/payments.controller';
import { CustomerHomeService } from './catalog/home.service';
import { HomeBookingService } from './booking/booking.service';
import { HomePromotionsService } from './promotions/promotions.service';
import { HomeSessionGuard, SepayWebhookGuard } from './common/home.guard';
@Module({
  imports: [PrismaModule, CustomerNewsModule],
  controllers: [
    CustomerHomeController,
    HomeBookingController,
    HomePromotionsController,
    HomePaymentWebhookController,
  ],
  providers: [
    CustomerHomeService,
    HomeBookingService,
    HomePromotionsService,
    HomeSessionGuard,
    SepayWebhookGuard,
  ],
  exports: [CustomerHomeService, HomePromotionsService],
})
export class CustomerHomeModule {}
