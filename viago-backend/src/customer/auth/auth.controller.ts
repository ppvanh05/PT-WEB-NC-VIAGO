import { Controller } from '@nestjs/common';
import { CustomerAuthService } from './auth.service';

@Controller('customer/auth')
export class CustomerAuthController {
  constructor(private readonly service: CustomerAuthService) {}
}