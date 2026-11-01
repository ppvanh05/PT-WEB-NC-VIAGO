import { Controller } from '@nestjs/common';
import { CustomerHomeService } from './home.service';

@Controller('customer/home')
export class CustomerHomeController {
  constructor(private readonly service: CustomerHomeService) {}
}