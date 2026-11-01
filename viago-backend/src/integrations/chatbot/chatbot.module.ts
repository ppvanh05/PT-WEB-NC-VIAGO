import { Module } from '@nestjs/common';
import { ChatbotIntegrationService } from './chatbot.service';

@Module({
  providers: [ChatbotIntegrationService],
  exports: [ChatbotIntegrationService],
})
export class ChatbotIntegrationModule {}