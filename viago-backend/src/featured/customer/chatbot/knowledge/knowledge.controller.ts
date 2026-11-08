import { ChatbotIdPipe } from '../common/chatbot.id';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
  UsePipes,
  Delete,
} from '@nestjs/common';
import { SupportRateGuard, SupportKnowledgeGuard } from '../auth/chatbot.auth';
import { KnowledgeDocumentDto } from '../common/chatbot.dto';
import { ChatbotRagService } from './rag.service';
import { validation } from '../common/chatbot.validation';

@Controller('admin/knowledge')
@UseGuards(SupportRateGuard, SupportKnowledgeGuard)
@UsePipes(validation)
export class SupportKnowledgeController {
  constructor(private readonly rag: ChatbotRagService) {}
  @Get('documents') list() {
    return this.rag.list();
  }
  @Get('documents/:id') get(@Param('id', ChatbotIdPipe) id: string) {
    return this.rag.get(id);
  }
  @Post('documents') create(@Body() dto: KnowledgeDocumentDto) {
    return this.rag.save(dto, true);
  }
  @Delete('documents/:id') remove(@Param('id', ChatbotIdPipe) id: string) {
    return this.rag.remove(id);
  }
  @Post('documents/:id/reprocess') @HttpCode(200) reprocess(
    @Param('id', ChatbotIdPipe) id: string,
  ) {
    return this.rag.reprocess(id);
  }
  @Post('sync-project') @HttpCode(200) sync() {
    return this.rag.syncProject();
  }
}
