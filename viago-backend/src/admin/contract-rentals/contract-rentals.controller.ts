import { Controller } from '@nestjs/common';
import { AdminContractRentalsService } from './contract-rentals.service';

@Controller('admin/contract-rentals')
export class AdminContractRentalsController {
  constructor(private readonly service: AdminContractRentalsService) {}
}