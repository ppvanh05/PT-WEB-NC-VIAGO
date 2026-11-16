import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
} from '../../../../shared/accounts/accounts-access';
import type { AccountRequest } from '../../../../shared/accounts/accounts-access';
import {
  CustomerCreateDto,
  CustomerUpdateDto,
  LogQueryDto,
  PageDto,
  StatusDto,
  TicketQueryDto,
  AdminCustomerPasswordDto,
} from '../../../../shared/accounts/accounts.dto';
import { validation } from '../../../customer/chatbot/common/chatbot.validation';
import { SupportRateGuard } from '../../../customer/chatbot/auth/chatbot.auth';
import { CustomerProfileService } from '../../../customer/profile/customer-profile.service';
import { ActivityLogsService } from '../../activity-logs/activity-logs.service';
import { CustomersService } from './customers.service';
@Controller('admin/customers')
@UseGuards(SupportRateGuard, AccountsGuard)
@AccountScope('admin')
@Permission('QuanLyTaiKhoanKhachHang')
@UsePipes(validation)
@UseFilters(AccountsDatabaseFilter)
export class CustomersController {
  constructor(
    private readonly service: CustomersService,
    private readonly profile: CustomerProfileService,
    private readonly logs: ActivityLogsService,
  ) {}
  @Post(':id/password') password(
    @Param('id') id: string,
    @Body() dto: AdminCustomerPasswordDto,
    @Req() req: AccountRequest,
  ) {
    return this.service.password(id, dto, req.identity, req);
  }
  @Get('options') options() {
    return this.service.options();
  }
  @Get() list(@Query() q: PageDto) {
    return this.service.list(q);
  }
  @Get(':id') detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
  @Post() create(@Body() dto: CustomerCreateDto, @Req() req: AccountRequest) {
    return this.service.create(dto, req.identity, req);
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: CustomerUpdateDto,
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
  @Get(':id/tickets') async tickets(
    @Param('id') id: string,
    @Query() q: TicketQueryDto,
  ) {
    await this.service.detail(id);
    return this.profile.tickets(id, q);
  }
  @Get(':id/logs') @Permission('QuanLyNhatKyHoatDong') async activity(
    @Param('id') id: string,
    @Query() q: LogQueryDto,
  ) {
    const customer = await this.service.detail(id);
    return this.logs.list(q, id, customer.accountId);
  }
}
