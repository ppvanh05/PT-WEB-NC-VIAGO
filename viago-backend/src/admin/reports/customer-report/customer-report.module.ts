import { Module } from '@nestjs/common';
import { AdminCustomerReportController } from './customer-report.controller';
import { AdminCustomerReportService } from './customer-report.service';

@Module({
  controllers: [AdminCustomerReportController],
  providers: [AdminCustomerReportService],
})
export class AdminCustomerReportModule {}