import { Module } from '@nestjs/common';
import { AdminNewsController } from './news.controller';
import { AdminNewsService } from './news.service';

@Module({
  controllers: [AdminNewsController],
  providers: [AdminNewsService],
})
export class AdminNewsModule {}