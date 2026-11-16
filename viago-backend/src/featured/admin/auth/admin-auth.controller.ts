import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
  UseFilters,
  UsePipes,
} from '@nestjs/common';
import type { Request } from 'express';
import { SupportRateGuard } from '../../customer/chatbot/auth/chatbot.auth';
import { validation } from '../../customer/chatbot/common/chatbot.validation';
import { AdminLoginDto } from './admin-auth.dto';
import { AdminAuthService } from './admin-auth.service';
import {
  AccountsDatabaseFilter,
  AccountsGuard,
  AccountScope,
} from '../../../shared/accounts/accounts-access';
import type { AccountRequest } from '../../../shared/accounts/accounts-access';
import {
  OtpRequestDto,
  OtpVerifyDto,
  PasswordDto,
} from '../../../shared/accounts/accounts.dto';
import { CustomerAuthService } from '../../customer/auth/customer-auth.service';
import { CustomerProfileService } from '../../customer/profile/customer-profile.service';
@Controller('admin/auth')
@UseGuards(SupportRateGuard)
@UsePipes(validation)
@UseFilters(AccountsDatabaseFilter)
export class AdminAuthController {
  constructor(
    private readonly service: AdminAuthService,
    private readonly auth: CustomerAuthService,
    private readonly profile: CustomerProfileService,
  ) {}
  @Post('otp/request') @HttpCode(200) otp(
    @Body() dto: OtpRequestDto,
    @Req() req: Request,
  ) {
    return this.auth.sendOtp(dto, req, 'admin');
  }
  @Post('otp/verify') @HttpCode(200) verify(
    @Body() dto: OtpVerifyDto,
    @Req() req: Request,
  ) {
    return this.auth.verifyOtp(dto, req);
  }
  @Post('change-password')
  @UseGuards(AccountsGuard)
  @AccountScope('admin')
  password(@Body() dto: PasswordDto, @Req() req: AccountRequest) {
    return this.profile.password(req.identity, dto, req);
  }
  @Get('sessions') @UseGuards(AccountsGuard) @AccountScope('admin') sessions(
    @Req() req: AccountRequest,
  ) {
    return this.profile.sessions(req.identity);
  }
  @Delete('sessions')
  @UseGuards(AccountsGuard)
  @AccountScope('admin')
  revokeAll(@Req() req: AccountRequest) {
    return this.profile.revoke(req.identity, undefined, req);
  }
  @Delete('sessions/:id')
  @UseGuards(AccountsGuard)
  @AccountScope('admin')
  revoke(@Param('id') id: string, @Req() req: AccountRequest) {
    return this.profile.revoke(req.identity, id, req);
  }
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
    @Req() req?: Request,
  ) {
    return this.service.logout(authorization, req);
  }
}
