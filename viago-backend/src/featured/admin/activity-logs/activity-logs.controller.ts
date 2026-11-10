import {
  Controller,
  Get,
  Param,
  Query,
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
import { LogQueryDto } from '../../../shared/accounts/accounts.dto';
import { validation } from '../../customer/chatbot/common/chatbot.validation';
import { SupportRateGuard } from '../../customer/chatbot/auth/chatbot.auth';
import { ActivityLogsService } from './activity-logs.service';
@Controller('admin/activity-logs')
@UseGuards(SupportRateGuard, AccountsGuard)
@AccountScope('admin')
@Permission('QuanLyNhatKyHoatDong')
@UsePipes(validation)
@UseFilters(AccountsDatabaseFilter)
export class ActivityLogsController {
  constructor(private readonly service: ActivityLogsService) {}
  @Get('statistics') statistics() {
    return this.service.statistics();
  }
  @Get() list(@Query() q: LogQueryDto) {
    return this.service.list(q);
  }
  @Get(':id') detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
}
