import { Controller } from '@nestjs/common';
import { CustomerBookingService } from './booking.service';

@Controller('customer/booking')
export class CustomerBookingController {
  constructor(private readonly service: CustomerBookingService) {}
}