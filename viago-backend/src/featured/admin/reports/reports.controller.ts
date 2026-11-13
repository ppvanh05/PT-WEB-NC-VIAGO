import { Controller, Get, Param, Post, Query, Req, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import {
  AccountScope,
  AccountsDatabaseFilter,
  AccountsGuard,
  Permission,
} from '../../../shared/accounts/accounts-access';
import type { AccountRequest } from '../../../shared/accounts/accounts-access';
import { SupportRateGuard } from '../../customer/chatbot/auth/chatbot.auth';
import { validation } from '../../customer/chatbot/common/chatbot.validation';
import { CancellationReportService } from './cancellation-report/cancellation-report.service';
import { CustomerReportService } from './customer-report/customer-report.service';
import { DetailedReportService } from './detailed-report/detailed-report.service';
import { DriverAssistantReportService } from './driver-assistant-report/driver-assistant-report.service';
import { RouteReportService } from './route-report/route-report.service';
import {
  CancellationReportQueryDto,
  CustomerReportQueryDto,
  DriverReportQueryDto,
  RevenueReportQueryDto,
  RouteReportQueryDto,
} from './reports.dto';

/** Mỗi báo cáo yêu cầu đúng quyền báo cáo tương ứng trong bảng quyen_han. */
@Controller('admin/reports')
@UseGuards(SupportRateGuard, AccountsGuard)
@AccountScope('admin')
@UsePipes(validation)
@UseFilters(AccountsDatabaseFilter)
export class AdminReportsController {
  constructor(
    private readonly cancellations: CancellationReportService,
    private readonly detailed: DetailedReportService,
    private readonly routes: RouteReportService,
    private readonly customers: CustomerReportService,
    private readonly drivers: DriverAssistantReportService,
  ) {}

  @Get('cancellations') @Permission('BaoCaoHoanHuy')
  cancellationReport(@Query() q: CancellationReportQueryDto) {
    return this.cancellations.report(q);
  }

  @Get('revenue') @Permission('BaoCaoDoanhThu')
  revenueReport(@Query() q: RevenueReportQueryDto) {
    return this.detailed.report(q);
  }

  @Get('routes') @Permission('BaoCaoTuyenXe')
  routeReport(@Query() q: RouteReportQueryDto) {
    return this.routes.report(q);
  }

  @Get('customers') @Permission('BaoCaoKhachHang')
  customerReport(@Query() q: CustomerReportQueryDto) {
    return this.customers.report(q);
  }

  @Get('drivers') @Permission('BaoCaoTaiXePhuXe')
  driverReport(@Query() q: DriverReportQueryDto) {
    return this.drivers.report(q);
  }

  @Post('drivers/:id/license-reminders') @Permission('BaoCaoTaiXePhuXe')
  remindLicense(@Param('id') id: string, @Req() req: AccountRequest) {
    return this.drivers.remind(id, req.identity, req);
  }
}
