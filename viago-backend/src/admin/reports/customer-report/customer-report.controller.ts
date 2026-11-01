import { Controller } from '@nestjs/common';
import { AdminCustomerReportService } from './customer-report.service';

@Controller('admin/reports/customer-report')
export class AdminCustomerReportController {
  constructor(private readonly service: AdminCustomerReportService) {}
}