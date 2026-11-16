import { Module } from '@nestjs/common';
import { AccountsAccessModule } from '../../../shared/accounts/accounts-access';
import { SupportRateGuard } from '../../customer/chatbot/auth/chatbot.auth';
import { CancellationReportService } from './cancellation-report/cancellation-report.service';
import { CustomerReportService } from './customer-report/customer-report.service';
import { DetailedReportService } from './detailed-report/detailed-report.service';
import { DriverAssistantReportService } from './driver-assistant-report/driver-assistant-report.service';
import { AdminReportsController } from './reports.controller';
import { RouteReportService } from './route-report/route-report.service';

@Module({
  imports: [AccountsAccessModule],
  controllers: [AdminReportsController],
  providers: [
    SupportRateGuard,
    CancellationReportService,
    DetailedReportService,
    RouteReportService,
    CustomerReportService,
    DriverAssistantReportService,
  ],
})
export class AdminReportsModule {}
