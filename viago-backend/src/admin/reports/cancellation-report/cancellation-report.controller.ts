import { Controller } from '@nestjs/common';
import { AdminCancellationReportService } from './cancellation-report.service';

@Controller('admin/reports/cancellation-report')
export class AdminCancellationReportController {
  constructor(private readonly service: AdminCancellationReportService) {}
}