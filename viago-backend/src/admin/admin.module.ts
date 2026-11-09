import { Module } from '@nestjs/common';
import { AdminAuthModule } from './auth/auth.module';
import { AdminEmployeesModule } from './employees/employees.module';
import { AdminCustomersModule } from './customers/customers.module';
import { AdminActivityLogsModule } from './activity-logs/activity-logs.module';
import { AdminBookingManagementModule } from './booking-management/booking-management.module';
import { AdminReviewsFeedbackModule } from './reviews-feedback/reviews-feedback.module';
import { AdminDispatchModule } from './dispatch/dispatch.module';
import { AdminReportsModule } from './reports/reports.module';
import { AdminPromotionsModule } from './promotions/promotions.module';
import { AdminContractRentalsModule } from './contract-rentals/contract-rentals.module';
import { AdminNewsModule } from './news/news.module';
import { AdminPoliciesModule } from './policies/policies.module';
import { AdminLostAndFoundModule } from './lost-and-found/lost-and-found.module';

@Module({
  imports: [
    AdminAuthModule,
    AdminEmployeesModule,
    AdminCustomersModule,
    AdminActivityLogsModule,
    AdminBookingManagementModule,
    AdminReviewsFeedbackModule,
    AdminDispatchModule,
    AdminReportsModule,
    AdminPromotionsModule,
    AdminContractRentalsModule,
    AdminNewsModule,
    AdminPoliciesModule,
    AdminLostAndFoundModule,
  ],
})
export class AdminModule {}
