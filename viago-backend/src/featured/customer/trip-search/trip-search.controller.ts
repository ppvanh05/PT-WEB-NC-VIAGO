import { Controller, Get, Query } from '@nestjs/common';
import { CustomerTripSearchService } from './trip-search.service';

@Controller('customer/trip-search')
export class CustomerTripSearchController {
  constructor(private readonly service: CustomerTripSearchService) {}
  @Get() search(@Query('from') from: string, @Query('to') to: string, @Query('date') date: string) { return this.service.search(from, to, date); }
}
