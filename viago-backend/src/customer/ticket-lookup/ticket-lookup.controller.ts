import { Controller } from '@nestjs/common';
import { CustomerTicketLookupService } from './ticket-lookup.service';

@Controller('customer/ticket-lookup')
export class CustomerTicketLookupController {
  constructor(private readonly service: CustomerTicketLookupService) {}
}