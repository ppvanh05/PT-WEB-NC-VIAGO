import { Module } from '@nestjs/common';
import { AccountsAccessModule } from '../../../shared/accounts/accounts-access';
import { AccountsModule } from '../../accounts.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { SupportRateGuard } from '../../customer/chatbot/auth/chatbot.auth';
@Module({
  imports: [PrismaModule, AccountsAccessModule, AccountsModule],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, SupportRateGuard],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
