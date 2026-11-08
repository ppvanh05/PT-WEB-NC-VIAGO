import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { HomeBookingService } from './booking.service';
import { HomeHoldDto, HomeOrderDto, HomeQuoteDto } from '../common/home.dto';
import { HomeSessionGuard, homeSession } from '../common/home.guard';
import type { Request } from 'express';
@Controller('customer/home')
@UseGuards(HomeSessionGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  }),
)
export class HomeBookingController {
  constructor(private readonly booking: HomeBookingService) {}
  @Get('holds') holds(@Req() req: Request) {
    return this.booking.holds(homeSession(req)!);
  }
  @Post('holds') @HttpCode(200) hold(
    @Body() dto: HomeHoldDto,
    @Req() req: Request,
  ) {
    return this.booking.hold(homeSession(req)!, dto);
  }
  @Delete('holds') release(@Req() req: Request) {
    return this.booking.release(homeSession(req)!);
  }
  @Post('quote') @HttpCode(200) quote(
    @Body() dto: HomeQuoteDto,
    @Req() req: Request,
  ) {
    return this.booking.quote(
      homeSession(req)!,
      dto,
      req.headers.authorization,
    );
  }
  @Post('orders') create(@Body() dto: HomeOrderDto, @Req() req: Request) {
    return this.booking.create(
      homeSession(req)!,
      dto,
      req.headers.authorization,
    );
  }
  @Get('orders/pending') pending(@Req() req: Request) {
    return this.booking.pending(homeSession(req)!);
  }
  @Get('orders/:id') order(@Param('id') id: string, @Req() req: Request) {
    return this.booking.get(homeSession(req)!, id);
  }
  @Post('orders/:id/cancel') @HttpCode(200) cancel(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.booking.cancel(homeSession(req)!, id);
  }
  @Get('orders/:id/payment') payment(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.booking.payment(homeSession(req)!, id);
  }
  @Post('orders/:id/print') @HttpCode(200) print(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    return this.booking.print(homeSession(req)!, id);
  }
  @Get('tickets/:token') ticket(@Param('token') token: string) {
    return this.booking.ticket(token);
  }
  @Post('tickets/:token/print') @HttpCode(200) printTicket(
    @Param('token') token: string,
  ) {
    return this.booking.printTicket(token);
  }
}
