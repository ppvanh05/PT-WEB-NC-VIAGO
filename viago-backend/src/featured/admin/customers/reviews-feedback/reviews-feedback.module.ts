import { Module } from '@nestjs/common';
import { AccountsAccessModule } from '../../../../shared/accounts/accounts-access';
import { SupportRateGuard } from '../../../customer/chatbot/auth/chatbot.auth';
import { AdminReviewsFeedbackController } from './reviews-feedback.controller';
import { AdminReviewsFeedbackService } from './reviews-feedback.service';

@Module({
  imports: [AccountsAccessModule],
  controllers: [AdminReviewsFeedbackController],
  providers: [AdminReviewsFeedbackService, SupportRateGuard],
})
export class AdminReviewsFeedbackModule {}
