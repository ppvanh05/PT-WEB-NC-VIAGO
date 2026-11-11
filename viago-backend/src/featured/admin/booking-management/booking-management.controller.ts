import { Controller, Get, Query } from '@nestjs/common';
import { AdminBookingManagementService } from './booking-management.service';

@Controller('admin/booking-management')
export class AdminBookingManagementController {
  constructor(private readonly service: AdminBookingManagementService) {}

  @Get('getAllPoint')
  getAllPoint() {
    return this.service.getAllPoints();
  }

  @Get('getAllVehicleTypes')
  getAllVehicleTypes() {
    return this.service.getAllVehicleTypes();
  }

  @Get('getAllRoutes')
  getAllRoutes(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('vehicleType') vehicleType: string | undefined,
    @Query('date') date: string,
  ) {
    return this.service.getAllRoutes({ from, to, vehicleType, date });
  }

  @Get('getCustomerInfoByPhone')
  getCustomerInfoByPhone(@Query('phone') phone: string) {
    return this.service.getCustomerInfoByPhone(phone);
  }

  @Get('getAllRoutesName')
  getAllRoutesName() {
    return this.service.getAllRoutesName();
  }

  @Get('getAllTickets')
  getAllTickets() {
    return this.service.getAllTickets();
  }
}
