import { Module } from '@nestjs/common';
import { AdminBookingManagementController } from './booking-management.controller';
import { AdminBookingManagementService } from './booking-management.service';

@Module({
  controllers: [AdminBookingManagementController],
  providers: [AdminBookingManagementService],
})
export class AdminBookingManagementModule {}
