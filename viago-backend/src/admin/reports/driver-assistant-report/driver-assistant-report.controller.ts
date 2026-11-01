import { Controller } from '@nestjs/common';
import { AdminDriverAssistantReportService } from './driver-assistant-report.service';

@Controller('admin/reports/driver-assistant-report')
export class AdminDriverAssistantReportController {
  constructor(private readonly service: AdminDriverAssistantReportService) {}
}