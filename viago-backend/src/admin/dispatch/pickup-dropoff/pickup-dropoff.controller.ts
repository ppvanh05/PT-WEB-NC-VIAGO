import { Controller } from '@nestjs/common';
import { AdminPickupDropoffService } from './pickup-dropoff.service';

@Controller('admin/dispatch/pickup-dropoff')
export class AdminPickupDropoffController {
  constructor(private readonly service: AdminPickupDropoffService) {}
}