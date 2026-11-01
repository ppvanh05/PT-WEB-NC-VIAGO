import { Controller } from '@nestjs/common';
import { CustomerPaymentService } from './payment.service';

@Controller('customer/payment')
export class CustomerPaymentController {
  constructor(private readonly service: CustomerPaymentService) {}
}