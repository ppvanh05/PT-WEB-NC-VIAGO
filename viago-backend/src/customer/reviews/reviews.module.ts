import { Module } from '@nestjs/common';
import { CustomerReviewsController } from './reviews.controller';
import { CustomerReviewsService } from './reviews.service';

@Module({
  controllers: [CustomerReviewsController],
  providers: [CustomerReviewsService],
})
export class CustomerReviewsModule {}