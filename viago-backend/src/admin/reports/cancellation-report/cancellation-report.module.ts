import { Module } from '@nestjs/common';
import { AdminCancellationReportController } from './cancellation-report.controller';
import { AdminCancellationReportService } from './cancellation-report.service';

@Module({
  controllers: [AdminCancellationReportController],
  providers: [AdminCancellationReportService],
})
export class AdminCancellationReportModule {}