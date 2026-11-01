import { Module } from '@nestjs/common';
import { AdminReviewsFeedbackController } from './reviews-feedback.controller';
import { AdminReviewsFeedbackService } from './reviews-feedback.service';

@Module({
  controllers: [AdminReviewsFeedbackController],
  providers: [AdminReviewsFeedbackService],
})
export class AdminReviewsFeedbackModule {}