import { Controller } from '@nestjs/common';
import { AdminActivityLogsService } from './activity-logs.service';

@Controller('admin/activity-logs')
export class AdminActivityLogsController {
  constructor(private readonly service: AdminActivityLogsService) {}
}