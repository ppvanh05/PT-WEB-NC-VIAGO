import { Controller } from '@nestjs/common';
import { CustomerAboutService } from './about.service';

@Controller('customer/about')
export class CustomerAboutController {
  constructor(private readonly service: CustomerAboutService) {}
}