import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UsePipes,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { ReviewUpload } from './review-media.service';
import {
  AccountScope,
  AccountsDatabaseFilter,
  AccountsGuard,
} from '../../../shared/accounts/accounts-access';
import type { AccountRequest } from '../../../shared/accounts/accounts-access';
import {
  ConfirmPasswordDto,
  PageDto,
  PasswordDto,
  ProfileDto,
  TwoFactorDto,
  TicketQueryDto,
  ReviewDto,
} from '../../../shared/accounts/accounts.dto';
import { validation } from '../chatbot/common/chatbot.validation';
import { SupportRateGuard } from '../chatbot/auth/chatbot.auth';
import { CustomerProfileService } from './customer-profile.service';
@Controller('customer/profile')
@UseGuards(SupportRateGuard, AccountsGuard)
@AccountScope('customer')
@UsePipes(validation)
@UseFilters(AccountsDatabaseFilter)
export class CustomerProfileController {
  constructor(private readonly service: CustomerProfileService) {}
  @Post('tickets/:id/review')
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      limits: {
        files: 3,
        fileSize: 20 * 1024 * 1024,
        fields: 2,
        fieldSize: 5000,
      },
    }),
  )
  review(
    @Param('id') id: string,
    @Body() dto: ReviewDto,
    @Req() req: AccountRequest,
    @UploadedFiles() files?: ReviewUpload[],
  ) {
    return this.service.review(req.identity, id, dto, req, files);
  }
  @Get() current(@Req() req: AccountRequest) {
    return this.service.current(req.identity);
  }
  @Patch() update(@Body() dto: ProfileDto, @Req() req: AccountRequest) {
    return this.service.update(req.identity, dto, req);
  }
  @Post('change-password') password(
    @Body() dto: PasswordDto,
    @Req() req: AccountRequest,
  ) {
    return this.service.password(req.identity, dto, req);
  }
  @Get('sessions') sessions(@Req() req: AccountRequest) {
    return this.service.sessions(req.identity);
  }
  @Delete('sessions') allSessions(@Req() req: AccountRequest) {
    return this.service.revoke(req.identity, undefined, req);
  }
  @Delete('sessions/:id') session(
    @Param('id') id: string,
    @Req() req: AccountRequest,
  ) {
    return this.service.revoke(req.identity, id, req);
  }
  @Post('lock') lock(
    @Body() dto: ConfirmPasswordDto,
    @Req() req: AccountRequest,
  ) {
    return this.service.lock(req.identity, dto.password, req);
  }
  @Patch('two-factor') twoFactor(
    @Body() dto: TwoFactorDto,
    @Req() req: AccountRequest,
  ) {
    return this.service.twoFactor(req.identity, dto, req);
  }
  @Get('tickets') tickets(
    @Query() q: TicketQueryDto,
    @Req() req: AccountRequest,
  ) {
    return this.service.tickets(req.identity.customerId!, q);
  }
  @Get('vouchers') vouchers(@Query() q: PageDto, @Req() req: AccountRequest) {
    return this.service.vouchers(req.identity.customerId!, q);
  }
}
