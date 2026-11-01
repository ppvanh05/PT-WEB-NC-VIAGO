import { Controller } from '@nestjs/common';
import { AdminDetailedReportService } from './detailed-report.service';

@Controller('admin/reports/detailed-report')
export class AdminDetailedReportController {
  constructor(private readonly service: AdminDetailedReportService) {}
}