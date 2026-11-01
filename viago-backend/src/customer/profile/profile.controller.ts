import { Controller } from '@nestjs/common';
import { CustomerProfileService } from './profile.service';

@Controller('customer/profile')
export class CustomerProfileController {
  constructor(private readonly service: CustomerProfileService) {}
}