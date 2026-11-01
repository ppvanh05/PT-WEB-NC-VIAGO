import { Module } from '@nestjs/common';
import { CustomerNewsController } from './news.controller';
import { CustomerNewsService } from './news.service';

@Module({
  controllers: [CustomerNewsController],
  providers: [CustomerNewsService],
})
export class CustomerNewsModule {}