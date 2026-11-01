import { Module } from '@nestjs/common';
import { AdminCancellationReportModule } from './cancellation-report/cancellation-report.module';
import { AdminDetailedReportModule } from './detailed-report/detailed-report.module';
import { AdminRouteReportModule } from './route-report/route-report.module';
import { AdminCustomerReportModule } from './customer-report/customer-report.module';
import { AdminDriverAssistantReportModule } from './driver-assistant-report/driver-assistant-report.module';

@Module({
  imports: [
    AdminCancellationReportModule,
    AdminDetailedReportModule,
    AdminRouteReportModule,
    AdminCustomerReportModule,
    AdminDriverAssistantReportModule,
  ],
})
export class AdminReportsModule {}