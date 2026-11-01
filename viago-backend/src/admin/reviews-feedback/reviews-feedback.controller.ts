import { Controller } from '@nestjs/common';
import { AdminReviewsFeedbackService } from './reviews-feedback.service';

@Controller('admin/reviews-feedback')
export class AdminReviewsFeedbackController {
  constructor(private readonly service: AdminReviewsFeedbackService) {}
}