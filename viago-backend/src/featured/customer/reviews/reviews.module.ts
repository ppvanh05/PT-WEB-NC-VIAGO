import { Module } from '@nestjs/common';
import { AccountsAccessModule } from '../../../shared/accounts/accounts-access';
import { SupportRateGuard } from '../chatbot/auth/chatbot.auth';
import { NewsInteractionGuard } from '../news/news-interaction.guard';
import { CustomerReviewsController } from './reviews.controller';
import { CustomerReviewOrdersService } from './review-orders.service';
import { CustomerReviewsService } from './reviews.service';

@Module({
  imports: [AccountsAccessModule],
  controllers: [CustomerReviewsController],
  providers: [CustomerReviewsService, CustomerReviewOrdersService, SupportRateGuard, NewsInteractionGuard],
})
export class CustomerReviewsModule {}
