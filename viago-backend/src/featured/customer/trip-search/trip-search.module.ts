import { Module } from '@nestjs/common';
import { CustomerTripSearchController } from './trip-search.controller';
import { CustomerTripSearchService } from './trip-search.service';

@Module({
  controllers: [CustomerTripSearchController],
  providers: [CustomerTripSearchService],
})
export class CustomerTripSearchModule {}