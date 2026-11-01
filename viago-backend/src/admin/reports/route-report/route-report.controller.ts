import { Controller } from '@nestjs/common';
import { AdminRouteReportService } from './route-report.service';

@Controller('admin/reports/route-report')
export class AdminRouteReportController {
  constructor(private readonly service: AdminRouteReportService) {}
}