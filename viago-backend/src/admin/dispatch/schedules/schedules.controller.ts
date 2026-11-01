import { Controller } from '@nestjs/common';
import { AdminSchedulesService } from './schedules.service';

@Controller('admin/dispatch/schedules')
export class AdminSchedulesController {
  constructor(private readonly service: AdminSchedulesService) {}
}