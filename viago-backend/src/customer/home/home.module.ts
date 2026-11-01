import { Module } from '@nestjs/common';
import { CustomerHomeController } from './home.controller';
import { CustomerHomeService } from './home.service';

@Module({
  controllers: [CustomerHomeController],
  providers: [CustomerHomeService],
})
export class CustomerHomeModule {}