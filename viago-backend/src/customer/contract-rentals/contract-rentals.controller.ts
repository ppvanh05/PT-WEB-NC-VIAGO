import { Controller } from '@nestjs/common';
import { CustomerContractRentalsService } from './contract-rentals.service';

@Controller('customer/contract-rentals')
export class CustomerContractRentalsController {
  constructor(private readonly service: CustomerContractRentalsService) {}
}