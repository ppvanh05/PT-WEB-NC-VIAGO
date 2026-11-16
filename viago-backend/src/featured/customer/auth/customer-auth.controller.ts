import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseFilters,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  AccountScope,
  AccountsDatabaseFilter,
  AccountsGuard,
} from '../../../shared/accounts/accounts-access';
import type { AccountRequest } from '../../../shared/accounts/accounts-access';
import {
  LoginDto,
  OtpRequestDto,
  OtpVerifyDto,
  RegisterDto,
  ResetPasswordDto,
} from '../../../shared/accounts/accounts.dto';
import { validation } from '../chatbot/common/chatbot.validation';
import { SupportRateGuard } from '../chatbot/auth/chatbot.auth';
import { CustomerProfileService } from '../profile/customer-profile.service';
import { CustomerAuthService } from './customer-auth.service';
@Controller('customer/auth')
@UseGuards(SupportRateGuard)
@UsePipes(validation)
@UseFilters(AccountsDatabaseFilter)
export class CustomerAuthController {
  constructor(
    private readonly auth: CustomerAuthService,
    private readonly profile: CustomerProfileService,
  ) {}
  @Post('login') @HttpCode(200) login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ) {
    return this.auth.login(dto, req);
  }
  @Post('register') register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, req);
  }
  @Post('otp/request') @HttpCode(200) otp(
    @Body() dto: OtpRequestDto,
    @Req() req: Request,
  ) {
    return this.auth.sendOtp(dto, req);
  }
  @Post('otp/verify') @HttpCode(200) verify(
    @Body() dto: OtpVerifyDto,
    @Req() req: Request,
  ) {
    return this.auth.verifyOtp(dto, req);
  }
  @Post('reset-password') @HttpCode(200) reset(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
  ) {
    return this.auth.resetPassword(dto, req);
  }
  @Get('me') @UseGuards(AccountsGuard) @AccountScope('customer') me(
    @Req() req: AccountRequest,
  ) {
    return this.profile.current(req.identity);
  }
  @Post('logout')
  @HttpCode(200)
  @UseGuards(AccountsGuard)
  @AccountScope('customer')
  logout(@Req() req: AccountRequest) {
    return this.auth.logout(req.identity, req);
  }
}
