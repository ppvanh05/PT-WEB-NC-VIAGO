import { Module } from '@nestjs/common';
import { AdminDetailedReportController } from './detailed-report.controller';
import { AdminDetailedReportService } from './detailed-report.service';

@Module({
  controllers: [AdminDetailedReportController],
  providers: [AdminDetailedReportService],
})
export class AdminDetailedReportModule {}