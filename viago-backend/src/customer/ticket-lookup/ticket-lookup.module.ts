import { Module } from '@nestjs/common';
import { CustomerTicketLookupController } from './ticket-lookup.controller';
import { CustomerTicketLookupService } from './ticket-lookup.service';

@Module({
  controllers: [CustomerTicketLookupController],
  providers: [CustomerTicketLookupService],
})
export class CustomerTicketLookupModule {}