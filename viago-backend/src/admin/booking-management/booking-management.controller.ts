import { Controller } from '@nestjs/common';
import { AdminBookingManagementService } from './booking-management.service';

@Controller('admin/booking-management')
export class AdminBookingManagementController {
  constructor(private readonly service: AdminBookingManagementService) {}
}