import { Module } from '@nestjs/common';
import { AdminDriverAssistantReportController } from './driver-assistant-report.controller';
import { AdminDriverAssistantReportService } from './driver-assistant-report.service';

@Module({
  controllers: [AdminDriverAssistantReportController],
  providers: [AdminDriverAssistantReportService],
})
export class AdminDriverAssistantReportModule {}