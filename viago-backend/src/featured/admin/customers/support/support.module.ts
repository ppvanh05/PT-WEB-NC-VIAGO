import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../../prisma/prisma.module';
import { CustomerChatbotModule } from '../../../customer/chatbot/chatbot.module';
import { SupportStaffController } from './controllers/support.controller';
import { SupportInboxService } from './services/inbox.service';
import { SupportOperatorGuard } from './services/operator.guard';
import { AdminAuthModule } from '../../auth/admin-auth.module';

@Module({
  imports: [PrismaModule, CustomerChatbotModule, AdminAuthModule],
  controllers: [SupportStaffController],
  providers: [SupportInboxService, SupportOperatorGuard],
})
export class AdminCustomerSupportModule {}
