import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { CounterGuard } from '../../customer/home/booking/counter.controller';
import type { CounterActor } from '../../customer/home/booking/counter.controller';
import { AdminBookingOrdersService } from './booking-orders.service';
import {
  AdminCancelOrderDto,
  AdminConfirmPaymentDto,
  AdminCreateOrderDto,
  AdminHoldDto,
  AdminOrdersQueryDto,
  AdminQuoteDto,
} from './booking-orders.dto';

type AdminRequest = Request & { counterActor: CounterActor };
@Controller('admin/booking-management')
@UseGuards(CounterGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  }),
)
export class AdminBookingOrdersController {
  constructor(private readonly service: AdminBookingOrdersService) {}
  @Get('options') options() {
    return this.service.options();
  }
  @Get('trips/:tripId/seats') seats(@Param('tripId') id: string) {
    return this.service.seats(id);
  }
  @Post('holds') @HttpCode(200) hold(
    @Req() req: AdminRequest,
    @Body() dto: AdminHoldDto,
  ) {
    return this.service.hold(req.counterActor, dto);
  }
  @Delete('holds/:holdId') release(
    @Req() req: AdminRequest,
    @Param('holdId', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.release(req.counterActor, id);
  }
  @Post('quote') @HttpCode(200) quote(
    @Req() req: AdminRequest,
    @Body() dto: AdminQuoteDto,
  ) {
    return this.service.quote(req.counterActor, dto);
  }
  @Post('orders') create(
    @Req() req: AdminRequest,
    @Body() dto: AdminCreateOrderDto,
  ) {
    return this.service.create(req.counterActor, dto);
  }
  @Get('orders') list(@Query() query: AdminOrdersQueryDto) {
    return this.service.list(query);
  }
  @Get('orders/:id') get(@Param('id') id: string) {
    return this.service.get(id);
  }
  @Post('orders/:id/confirm-payment') @HttpCode(200) confirm(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: AdminConfirmPaymentDto,
  ) {
    return this.service.confirm(req.counterActor, id, dto);
  }
  @Post('orders/:id/cancel') @HttpCode(200) cancel(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() dto: AdminCancelOrderDto,
  ) {
    return this.service.cancel(req.counterActor, id, dto);
  }
}
