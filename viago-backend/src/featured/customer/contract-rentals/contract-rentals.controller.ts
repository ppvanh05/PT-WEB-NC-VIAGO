import { Body, Controller, Get, Param, Post, Query, Req, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import type { Request } from 'express';
import { AccountsDatabaseFilter } from '../../../shared/accounts/accounts-access';
import { SupportRateGuard } from '../chatbot/auth/chatbot.auth';
import { validation } from '../chatbot/common/chatbot.validation';
import {
  QuoteDecisionDto,
  RentalEstimateDto,
  RentalLookupQueryDto,
  RentalRequestDto,
} from './contract-rentals.dto';
import { CustomerContractRentalsService } from './contract-rentals.service';

@Controller('customer/contract-rentals')
@UseGuards(SupportRateGuard)
@UsePipes(validation)
@UseFilters(AccountsDatabaseFilter)
export class CustomerContractRentalsController {
  constructor(private readonly service: CustomerContractRentalsService) {}

  @Get('vehicles') vehicles() {
    return this.service.vehicles();
  }

  @Get('vehicles/:id') vehicle(@Param('id') id: string) {
    return this.service.vehicle(id);
  }

  @Get('drivers') drivers() {
    return this.service.drivers();
  }

  @Get('promotions') promotions() {
    return this.service.promotions();
  }

  @Post('estimate') estimate(@Body() dto: RentalEstimateDto) {
    return this.service.estimate(dto);
  }

  @Post('requests') create(@Body() dto: RentalRequestDto, @Req() req: Request) {
    return this.service.create(dto, req);
  }

  @Get('requests/:code') lookup(@Param('code') code: string, @Query() q: RentalLookupQueryDto) {
    return this.service.lookup(code, q.phone);
  }

  @Post('requests/:code/quote-decision') decide(@Param('code') code: string, @Body() dto: QuoteDecisionDto, @Req() req: Request) {
    return this.service.decideQuote(code, dto, req);
  }
}
