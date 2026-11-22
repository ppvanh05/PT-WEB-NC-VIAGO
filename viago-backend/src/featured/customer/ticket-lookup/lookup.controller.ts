import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ValidateIf,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { Request, Response } from 'express';
import { validation } from '../chatbot/common/chatbot.validation';
import { SupportRateGuard } from '../chatbot/auth/chatbot.auth';
import { LookupService } from './lookup.service';
class LookupSessionDto {
  @Matches(/^0\d{9}$/) phoneNumber: string;
  @IsString() @MaxLength(200) verificationToken: string;
}
export class LookupEditDto {
  @IsDateString() version: string;
  @ValidateIf((o) => o.email !== undefined && o.email !== '')
  @IsEmail()
  @MaxLength(254)
  email?: string;
  @IsOptional() @IsString() @MaxLength(80) pickupId?: string;
  @IsOptional() @IsString() @MaxLength(80) dropoffId?: string;
}
export class LookupCancelDto {
  @IsString() @MinLength(3) @MaxLength(300) reason: string;
}
@Controller('customer/ticket-lookup')
@UseGuards(SupportRateGuard)
@UsePipes(validation)
export class LookupController {
  constructor(private readonly service: LookupService) {}
  @Post('session') session(
    @Body() dto: LookupSessionDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.service.session(dto, res);
  }
  @Delete('session') logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.service.logout(req, res);
  }
  @Get('orders') list(@Req() req: Request) {
    return this.service.list(req);
  }
  @Get('orders/:id') detail(@Req() req: Request, @Param('id') id: string) {
    return this.service.detail(req, id);
  }
  @Patch('orders/:id') edit(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: LookupEditDto,
  ) {
    return this.service.edit(req, id, dto);
  }
  @Post('orders/:id/tickets/:ticketId/print') print(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('ticketId') ticket: string,
  ) {
    return this.service.print(req, id, ticket);
  }
  @Post('orders/:id/tickets/:ticketId/cancel') cancel(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('ticketId') ticket: string,
    @Body() dto: LookupCancelDto,
  ) {
    return this.service.cancelTicket(req, id, ticket, dto.reason);
  }
}
