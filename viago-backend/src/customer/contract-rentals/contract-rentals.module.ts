import { Module } from '@nestjs/common';
import { CustomerContractRentalsController } from './contract-rentals.controller';
import { CustomerContractRentalsService } from './contract-rentals.service';

@Module({
  controllers: [CustomerContractRentalsController],
  providers: [CustomerContractRentalsService],
})
export class CustomerContractRentalsModule {}