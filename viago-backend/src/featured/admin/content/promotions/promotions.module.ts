import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { AdminPromotionsController } from './promotions.controller';
import { AdminPromotionsService } from './promotions.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminPromotionsController],
  providers: [AdminPromotionsService],
})
export class AdminPromotionsModule {}
