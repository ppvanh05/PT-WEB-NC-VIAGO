import {
  Controller,
  ExecutionContext,
  CanActivate,
  Injectable,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminAuthService } from '../../../admin/auth/admin-auth.service';
import { HomeBookingService } from './booking.service';
import { HomePageDto } from '../common/home.dto';
import type { Request, Response } from 'express';
export type CounterActor = { id: string; staffId: string };
type CounterRequest = Request & { counterActor: CounterActor };
export class CounterQueryDto extends HomePageDto {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsIn(['pending', 'all']) status = 'pending';
}
@Injectable()
export class CounterGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<CounterRequest>();
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader('Cache-Control', 'no-store');
    request.counterActor = (
      await this.auth.current(request.headers.authorization)
    ).account;
    return true;
  }
}
@Controller('admin/counter-orders')
@UseGuards(CounterGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class CounterOrdersController {
  constructor(private readonly booking: HomeBookingService) {}
  @Get() list(@Query() query: CounterQueryDto) {
    return this.booking.counterOrders(query);
  }
  @Post(':id/confirm') confirm(
    @Param('id') id: string,
    @Req() request: CounterRequest,
  ) {
    return this.booking.confirmCounter(id, request.counterActor);
  }
}
