import { Module } from '@nestjs/common';
import { CustomerLostAndFoundController } from './lost-and-found.controller';
import { CustomerLostAndFoundService } from './lost-and-found.service';

@Module({
  controllers: [CustomerLostAndFoundController],
  providers: [CustomerLostAndFoundService],
})
export class CustomerLostAndFoundModule {}