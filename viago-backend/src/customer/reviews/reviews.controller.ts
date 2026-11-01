import { Controller } from '@nestjs/common';
import { CustomerReviewsService } from './reviews.service';

@Controller('customer/reviews')
export class CustomerReviewsController {
  constructor(private readonly service: CustomerReviewsService) {}
}