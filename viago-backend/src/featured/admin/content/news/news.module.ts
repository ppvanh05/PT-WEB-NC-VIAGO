import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { AdminNewsController } from './news.controller';
import { AdminNewsService } from './news.service';
import { ContentAccessModule } from '../content-access.module';

@Module({
  imports: [PrismaModule, ContentAccessModule],
  controllers: [AdminNewsController],
  providers: [AdminNewsService],
})
export class AdminNewsModule {}
