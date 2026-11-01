import { Controller } from '@nestjs/common';
import { CustomerLostAndFoundService } from './lost-and-found.service';

@Controller('customer/lost-and-found')
export class CustomerLostAndFoundController {
  constructor(private readonly service: CustomerLostAndFoundService) {}
}