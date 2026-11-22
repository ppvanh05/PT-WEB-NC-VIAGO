import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, UseFilters, UseGuards, ValidationPipe } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  AccountScope,
  AccountsDatabaseFilter,
  AccountsGuard,
  Permission,
} from '../../../shared/accounts/accounts-access';
import type { AccountRequest } from '../../../shared/accounts/accounts-access';
import { CounterGuard } from '../../customer/home/booking/counter.controller';
import { AdminBookingManagementService } from './booking-management.service';

export class AdminCancelTicketDto {
  @IsString() @MinLength(3) @MaxLength(300) reason: string;
  @IsOptional() @IsBoolean() carrierFault?: boolean;
}
export class AdminRefundResultDto {
  @IsBoolean() success: boolean;
  @IsOptional() @IsString() @MaxLength(100) transactionCode?: string;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

@Controller('admin/booking-management')
@UseGuards(CounterGuard)
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

/** Hủy vé đã thanh toán và xác nhận hoàn tiền: chỉ nhân viên có quyền QuanLyDatVe. */
@Controller('admin/booking-management')
@UseGuards(AccountsGuard)
@AccountScope('admin')
@Permission('QuanLyDatVe')
@UseFilters(AccountsDatabaseFilter)
export class AdminTicketCancellationController {
  constructor(private readonly service: AdminBookingManagementService) {}

  @Post('tickets/:id/cancel')
  @HttpCode(200)
  cancelTicket(@Param('id') id: string, @Body(pipe) dto: AdminCancelTicketDto, @Req() req: AccountRequest) {
    return this.service.cancelTicket(id, dto, { id: req.identity.accountId, staffId: req.identity.staffId! });
  }

  @Post('refunds/:id/complete')
  @HttpCode(200)
  completeRefund(@Param('id') id: string, @Body(pipe) dto: AdminRefundResultDto, @Req() req: AccountRequest) {
    return this.service.completeRefund(id, dto, { id: req.identity.accountId, staffId: req.identity.staffId! });
  }
}
