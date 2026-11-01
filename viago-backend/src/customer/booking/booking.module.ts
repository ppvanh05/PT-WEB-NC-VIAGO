import { Module } from '@nestjs/common';
import { CustomerBookingController } from './booking.controller';
import { CustomerBookingService } from './booking.service';

@Module({
  controllers: [CustomerBookingController],
  providers: [CustomerBookingService],
})
export class CustomerBookingModule {}