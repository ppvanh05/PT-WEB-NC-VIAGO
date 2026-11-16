import { Module } from '@nestjs/common';
import { AdminBookingManagementController } from './booking-management.controller';
import { AdminBookingManagementService } from './booking-management.service';
import { CustomerHomeModule } from '../../customer/home/home.module';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { AdminBookingOrdersController } from './booking-orders.controller';
import { AdminBookingOrdersService } from './booking-orders.service';

@Module({
  imports: [CustomerHomeModule, AdminAuthModule],
  controllers: [AdminBookingManagementController, AdminBookingOrdersController],
  providers: [AdminBookingManagementService, AdminBookingOrdersService],
})
export class AdminBookingManagementModule {}
