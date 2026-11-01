import { Module } from '@nestjs/common';
import { AdminRouteReportController } from './route-report.controller';
import { AdminRouteReportService } from './route-report.service';

@Module({
  controllers: [AdminRouteReportController],
  providers: [AdminRouteReportService],
})
export class AdminRouteReportModule {}