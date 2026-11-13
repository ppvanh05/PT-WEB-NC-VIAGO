import { Module } from '@nestjs/common';
import { AccountsAccessModule } from '../../../shared/accounts/accounts-access';
import { SupportRateGuard } from '../chatbot/auth/chatbot.auth';
import { CustomerContractRentalsController } from './contract-rentals.controller';
import { CustomerContractRentalsService } from './contract-rentals.service';

@Module({
  imports: [AccountsAccessModule],
  controllers: [CustomerContractRentalsController],
  providers: [CustomerContractRentalsService, SupportRateGuard],
})
export class CustomerContractRentalsModule {}
