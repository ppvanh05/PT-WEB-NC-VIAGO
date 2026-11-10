import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  AccountScope,
  AccountsDatabaseFilter,
  AccountsGuard,
  Permission,
} from '../../../shared/accounts/accounts-access';
import type { AccountRequest } from '../../../shared/accounts/accounts-access';
import {
  EmployeeCreateDto,
  EmployeeUpdateDto,
  LogQueryDto,
  PageDto,
  StatusDto,
} from '../../../shared/accounts/accounts.dto';
import { validation } from '../../customer/chatbot/common/chatbot.validation';
import { SupportRateGuard } from '../../customer/chatbot/auth/chatbot.auth';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { EmployeesService } from './employees.service';
@Controller('admin/employees')
@UseGuards(SupportRateGuard, AccountsGuard)
@AccountScope('admin')
@Permission('QuanLyTaiKhoanNhanVien')
@UsePipes(validation)
@UseFilters(AccountsDatabaseFilter)
export class EmployeesController {
  constructor(
    private readonly service: EmployeesService,
    private readonly logs: ActivityLogsService,
  ) {}
  @Get('options') options() {
    return this.service.options();
  }
  @Get() list(@Query() q: PageDto) {
    return this.service.list(q);
  }
  @Get(':id') detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
  @Post() create(@Body() dto: EmployeeCreateDto, @Req() req: AccountRequest) {
    return this.service.create(dto, req.identity, req);
  }
  @Put(':id') update(
    @Param('id') id: string,
    @Body() dto: EmployeeUpdateDto,
    @Req() req: AccountRequest,
  ) {
    return this.service.update(id, dto, req.identity, req);
  }
  @Patch(':id/status') status(
    @Param('id') id: string,
    @Body() dto: StatusDto,
    @Req() req: AccountRequest,
  ) {
    return this.service.status(id, dto, req.identity, req);
  }
  @Get(':id/logs') @Permission('QuanLyNhatKyHoatDong') async activity(
    @Param('id') id: string,
    @Query() q: LogQueryDto,
  ) {
    const employee = await this.service.detail(id);
    return this.logs.list(q, id, employee.accountId);
  }
}
