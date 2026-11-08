import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { SupportRateGuard } from '../../customer/chatbot/auth/chatbot.auth';
@Module({
  imports: [PrismaModule],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, SupportRateGuard],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}
