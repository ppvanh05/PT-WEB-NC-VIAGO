import { Controller } from '@nestjs/common';
import { CustomerTripSearchService } from './trip-search.service';

@Controller('customer/trip-search')
export class CustomerTripSearchController {
  constructor(private readonly service: CustomerTripSearchService) {}
}