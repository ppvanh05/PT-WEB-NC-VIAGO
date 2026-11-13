import { Module } from '@nestjs/common';
import { AccountsAccessModule } from '../../../../shared/accounts/accounts-access';
import { SupportRateGuard } from '../../../customer/chatbot/auth/chatbot.auth';
import { AdminLostAndFoundController } from './lost-and-found.controller';
import { AdminLostAndFoundService } from './lost-and-found.service';
import { LostItemMediaService } from '../../../customer/lost-and-found/lost-item-media.service';

@Module({
  imports: [AccountsAccessModule],
  controllers: [AdminLostAndFoundController],
  providers: [AdminLostAndFoundService, LostItemMediaService, SupportRateGuard],
})
export class AdminLostAndFoundModule {}
