import { Controller } from '@nestjs/common';
import { AdminCustomersService } from './customers.service';

@Controller('admin/customers')
export class AdminCustomersController {
  constructor(private readonly service: AdminCustomersService) {}
}