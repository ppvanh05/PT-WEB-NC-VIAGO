import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import type { Request } from 'express';
import { SupportRateGuard } from '../../customer/chatbot/auth/chatbot.auth';
import { validation } from '../../customer/chatbot/common/chatbot.validation';
import { AdminLoginDto } from './admin-auth.dto';
import { AdminAuthService } from './admin-auth.service';
@Controller('admin/auth')
@UseGuards(SupportRateGuard)
@UsePipes(validation)
export class AdminAuthController {
  constructor(private readonly service: AdminAuthService) {}
  @Post('login') @HttpCode(200) login(
    @Body() dto: AdminLoginDto,
    @Req() req: Request,
  ) {
    return this.service.login(dto, req);
  }
  @Get('me') me(@Headers('authorization') authorization?: string) {
    return this.service.current(authorization);
  }
  @Post('logout') @HttpCode(200) logout(
    @Headers('authorization') authorization?: string,
  ) {
    return this.service.logout(authorization);
  }
}
