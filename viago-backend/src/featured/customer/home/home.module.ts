import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CustomerNewsModule } from '../news/news.module';
import { CustomerHomeController } from './catalog/home.controller';
import { HomeBookingController } from './booking/booking.controller';
import { HomePromotionsController } from './promotions/promotions.controller';
import { CustomerHomeService } from './catalog/home.service';
import { HomeBookingService } from './booking/booking.service';
import { HomePromotionsService } from './promotions/promotions.service';
import { HomePaymentWebhookController } from './payments/payments.controller';
import { HomeSessionGuard, SepayWebhookGuard } from './common/home.guard';
import { AdminAuthModule } from '../../admin/auth/admin-auth.module';
import {
  CounterGuard,
  CounterOrdersController,
} from './booking/counter.controller';
@Module({
  imports: [PrismaModule, CustomerNewsModule, AdminAuthModule],
  controllers: [
    CustomerHomeController,
    HomeBookingController,
    HomePromotionsController,
    CounterOrdersController,
    HomePaymentWebhookController,
  ],
  providers: [
    CustomerHomeService,
    HomeBookingService,
    HomePromotionsService,
    HomeSessionGuard,
    CounterGuard,
    SepayWebhookGuard,
  ],
  exports: [CustomerHomeService, HomePromotionsService],
})
export class CustomerHomeModule {}
