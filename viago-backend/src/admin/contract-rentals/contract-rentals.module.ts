import { Module } from '@nestjs/common';
import { AdminContractRentalsController } from './contract-rentals.controller';
import { AdminContractRentalsService } from './contract-rentals.service';

@Module({
  controllers: [AdminContractRentalsController],
  providers: [AdminContractRentalsService],
})
export class AdminContractRentalsModule {}