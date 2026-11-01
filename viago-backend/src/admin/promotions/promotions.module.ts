import { Module } from '@nestjs/common';
import { AdminPromotionsController } from './promotions.controller';
import { AdminPromotionsService } from './promotions.service';

@Module({
  controllers: [AdminPromotionsController],
  providers: [AdminPromotionsService],
})
export class AdminPromotionsModule {}