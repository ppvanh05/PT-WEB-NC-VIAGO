import { Module } from '@nestjs/common';
import { AccountsAccessModule } from '../../../shared/accounts/accounts-access';
import { SupportRateGuard } from '../chatbot/auth/chatbot.auth';
import { CustomerLostAndFoundController } from './lost-and-found.controller';
import { CustomerLostAndFoundService } from './lost-and-found.service';
import { LostItemMediaService } from './lost-item-media.service';

@Module({
  imports: [AccountsAccessModule],
  controllers: [CustomerLostAndFoundController],
  providers: [CustomerLostAndFoundService, LostItemMediaService, SupportRateGuard],
})
export class CustomerLostAndFoundModule {}
