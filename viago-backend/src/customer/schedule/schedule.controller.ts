import { Controller } from '@nestjs/common';
import { CustomerScheduleService } from './schedule.service';

@Controller('customer/schedule')
export class CustomerScheduleController {
  constructor(private readonly service: CustomerScheduleService) {}
}