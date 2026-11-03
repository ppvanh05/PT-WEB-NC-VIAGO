import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CustomerNewsController } from './news.controller';
import { CustomerNewsService } from './news.service';
import { NewsInteractionGuard } from './news-interaction.guard';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerNewsController],
  providers: [CustomerNewsService, NewsInteractionGuard],
})
export class CustomerNewsModule {}
