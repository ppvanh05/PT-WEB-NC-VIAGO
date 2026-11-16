import { Module } from '@nestjs/common';
import { AccountsAccessModule } from '../shared/accounts/accounts-access';
import { SupportRateGuard } from './customer/chatbot/auth/chatbot.auth';
import { CustomerAuthController } from './customer/auth/customer-auth.controller';
import { CustomerAuthService } from './customer/auth/customer-auth.service';
import { CustomerProfileController } from './customer/profile/customer-profile.controller';
import { CustomerProfileService } from './customer/profile/customer-profile.service';
import { ReviewMediaService } from './customer/profile/review-media.service';
import { ReviewMediaController } from './customer/profile/review-media.controller';
import { EmployeesController } from './admin/employees/employees.controller';
import { EmployeesService } from './admin/employees/employees.service';
import { CustomersController } from './admin/customers/accounts/customers.controller';
import { CustomersService } from './admin/customers/accounts/customers.service';
import { ActivityLogsController } from './admin/activity-logs/activity-logs.controller';
import { ActivityLogsService } from './admin/activity-logs/activity-logs.service';
@Module({
  imports: [AccountsAccessModule],
  controllers: [
    ReviewMediaController,
    CustomerAuthController,
    CustomerProfileController,
    EmployeesController,
    CustomersController,
    ActivityLogsController,
  ],
  providers: [
    ReviewMediaService,
    SupportRateGuard,
    CustomerAuthService,
    CustomerProfileService,
    EmployeesService,
    CustomersService,
    ActivityLogsService,
  ],
  exports: [CustomerAuthService, CustomerProfileService],
})
export class AccountsModule {}
