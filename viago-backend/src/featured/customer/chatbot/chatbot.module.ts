import { SupportKnowledgeController } from './knowledge/knowledge.controller';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ChatbotIntegrationModule } from '../../../integrations/chatbot/chatbot.module';
import {
  SupportAuthService,
  SupportCustomerGuard,
  SupportRateGuard,
  SupportStaffGuard,
  SupportKnowledgeGuard,
} from './auth/chatbot.auth';
import { CustomerChatbotController } from './conversation/chatbot.controller';
import { SupportEventsService } from './realtime/chatbot.events';
import { SupportKnowledgeService } from './knowledge/knowledge.service';
import { CustomerChatbotService } from './conversation/chatbot.service';
import { CustomerHomeModule } from '../home/home.module';
import { ChatbotRagService } from './knowledge/rag.service';
import { SharedModule } from '../../../shared/shared.module';

@Module({
  imports: [PrismaModule, ChatbotIntegrationModule, CustomerHomeModule, SharedModule],
  controllers: [CustomerChatbotController, SupportKnowledgeController],
  providers: [
    CustomerChatbotService,
    SupportAuthService,
    SupportCustomerGuard,
    SupportRateGuard,
    SupportStaffGuard,
    SupportEventsService,
    SupportKnowledgeService,
    SupportKnowledgeGuard,
    ChatbotRagService,
  ],
  exports: [
    CustomerChatbotService,
    SupportAuthService,
    SupportRateGuard,
    SupportStaffGuard,
    SupportEventsService,
  ],
})
export class CustomerChatbotModule {}
