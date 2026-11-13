import { Module } from '@nestjs/common';
import { AccountsModule } from './featured/accounts.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { SharedModule } from './shared/shared.module';
import { AdminPoliciesModule } from './featured/admin/content/policies/policies.module';
import { AdminNewsModule } from './featured/admin/content/news/news.module';
import { AdminPromotionsModule } from './featured/admin/content/promotions/promotions.module';
import { CustomerAboutModule } from './featured/customer/about/about.module';
import { CustomerNewsModule } from './featured/customer/news/news.module';
import { CustomerHomeModule } from './featured/customer/home/home.module';
import { CustomerChatbotModule } from './featured/customer/chatbot/chatbot.module';
import { AdminCustomerSupportModule } from './featured/admin/customers/support/support.module';
import { AdminAuthModule } from './featured/admin/auth/admin-auth.module';
import { AdminIntakeModule } from './featured/admin/intake/intake.module';

import { AdminDispatchModule } from './featured/admin/dispatch/dispatch.module';
import { CustomerTripSearchModule } from './featured/customer/trip-search/trip-search.module';
import { CustomerReviewsModule } from './featured/customer/reviews/reviews.module';
import { CustomerLostAndFoundModule } from './featured/customer/lost-and-found/lost-and-found.module';
import { CustomerContractRentalsModule } from './featured/customer/contract-rentals/contract-rentals.module';
import { AdminReviewsFeedbackModule } from './featured/admin/customers/reviews-feedback/reviews-feedback.module';
import { AdminLostAndFoundModule } from './featured/admin/customers/lost-and-found/lost-and-found.module';
import { AdminContractRentalsModule } from './featured/admin/contract-rentals/contract-rentals.module';
import { AdminReportsModule } from './featured/admin/reports/reports.module';

@Module({
  imports: [
    AccountsModule,
    PrismaModule,
    IntegrationsModule,
    SharedModule,
    AdminPoliciesModule,
    AdminNewsModule,
    AdminPromotionsModule,
    CustomerAboutModule,
    CustomerNewsModule,
    CustomerHomeModule,
    CustomerChatbotModule,
    AdminCustomerSupportModule,
    AdminAuthModule,
    AdminIntakeModule,
    AdminDispatchModule,
    CustomerTripSearchModule,
    CustomerReviewsModule,
    CustomerLostAndFoundModule,
    CustomerContractRentalsModule,
    AdminReviewsFeedbackModule,
    AdminLostAndFoundModule,
    AdminContractRentalsModule,
    AdminReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
