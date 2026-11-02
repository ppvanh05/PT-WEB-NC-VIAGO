import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { AdminNewsController } from './news.controller';
import { AdminNewsService } from './news.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminNewsController],
  providers: [AdminNewsService],
})
export class AdminNewsModule {}
