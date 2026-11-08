import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { AdminPromotionsController } from './promotions.controller';
import { AdminPromotionsService } from './promotions.service';
import { ContentAccessModule } from '../content-access.module';

@Module({
  imports: [PrismaModule, ContentAccessModule],
  controllers: [AdminPromotionsController],
  providers: [AdminPromotionsService],
})
export class AdminPromotionsModule {}
