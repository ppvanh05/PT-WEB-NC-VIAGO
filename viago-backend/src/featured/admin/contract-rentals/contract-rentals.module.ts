import { Module } from '@nestjs/common';
import { AccountsAccessModule } from '../../../shared/accounts/accounts-access';
import { SupportRateGuard } from '../../customer/chatbot/auth/chatbot.auth';
import { AdminContractRentalsController } from './contract-rentals.controller';
import { AdminContractRentalsService } from './contract-rentals.service';

@Module({
  imports: [AccountsAccessModule],
  controllers: [AdminContractRentalsController],
  providers: [AdminContractRentalsService, SupportRateGuard],
})
export class AdminContractRentalsModule {}
