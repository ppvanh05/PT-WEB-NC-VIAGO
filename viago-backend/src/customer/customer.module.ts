import { Module } from '@nestjs/common';
import { CustomerHomeModule } from './home/home.module';
import { CustomerAuthModule } from './auth/auth.module';
import { CustomerProfileModule } from './profile/profile.module';
import { CustomerTripSearchModule } from './trip-search/trip-search.module';
import { CustomerScheduleModule } from './schedule/schedule.module';
import { CustomerBookingModule } from './booking/booking.module';
import { CustomerPaymentModule } from './payment/payment.module';
import { CustomerTicketLookupModule } from './ticket-lookup/ticket-lookup.module';
import { CustomerInvoiceModule } from './invoice/invoice.module';
import { CustomerReviewsModule } from './reviews/reviews.module';
import { CustomerNewsModule } from './news/news.module';
import { CustomerContractRentalsModule } from './contract-rentals/contract-rentals.module';
import { CustomerLostAndFoundModule } from './lost-and-found/lost-and-found.module';
import { CustomerAboutModule } from './about/about.module';

@Module({
  imports: [
    CustomerHomeModule,
    CustomerAuthModule,
    CustomerProfileModule,
    CustomerTripSearchModule,
    CustomerScheduleModule,
    CustomerBookingModule,
    CustomerPaymentModule,
    CustomerTicketLookupModule,
    CustomerInvoiceModule,
    CustomerReviewsModule,
    CustomerNewsModule,
    CustomerContractRentalsModule,
    CustomerLostAndFoundModule,
    CustomerAboutModule,
  ],
})
export class CustomerModule {}
