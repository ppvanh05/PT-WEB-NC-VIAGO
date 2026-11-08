import { ChatbotIdPipe } from '../../../../customer/chatbot/common/chatbot.id';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { CustomerChatbotService } from '../../../../customer/chatbot/conversation/chatbot.service';
import {
  SupportRateGuard,
  type SupportRequest,
} from '../../../../customer/chatbot/auth/chatbot.auth';
import {
  DraftReplyDto,
  ResolveConversationDto,
  StaffMessageDto,
  TranslateMessageDto,
  ReassignConversationDto,
} from '../../../../customer/chatbot/common/chatbot.dto';
import { validation } from '../../../../customer/chatbot/common/chatbot.validation';
import { SupportInboxService } from '../services/inbox.service';
import { SupportOperatorGuard } from '../services/operator.guard';
import {
  HistoryQueryDto,
  InboxQueryDto,
  WorkspaceQueryDto,
} from '../dto/support.dto';

@Controller('admin/support')
@UseGuards(SupportRateGuard, SupportOperatorGuard)
@UsePipes(validation)
export class SupportStaffController {
  constructor(
    private readonly service: CustomerChatbotService,
    private readonly inbox: SupportInboxService,
  ) {}
  @Get('context') async context(@Req() req: SupportRequest) {
    return {
      agent: req.supportAgent ?? null,
      agents: (await this.inbox.agents()).data,
    };
  }
  @Get('agents') agents() {
    return this.inbox.agents();
  }
  @Get('workspace') workspace(
    @Query() query: WorkspaceQueryDto,
    @Req() req: SupportRequest,
  ) {
    return this.inbox.workspace(query.ids, req.supportAgent!);
  }
  @Get('conversations') queue(
    @Query() query: InboxQueryDto,
    @Req() req: SupportRequest,
  ) {
    return this.inbox.queue(query, req.supportAgent);
  }
  @Get('conversations/:id') get(
    @Param('id', ChatbotIdPipe) id: string,
    @Query() query: HistoryQueryDto,
  ) {
    return this.inbox.detail(id, query.before);
  }
  @Post('conversations/:id/claim') @HttpCode(200) claim(
    @Param('id', ChatbotIdPipe) id: string,
    @Req() req: SupportRequest,
  ) {
    return this.service.claim(id, req.supportAgent!);
  }
  @Post('conversations/:id/reassign') @HttpCode(200) reassign(
    @Param('id', ChatbotIdPipe) id: string,
    @Req() req: SupportRequest,
    @Body() dto: ReassignConversationDto,
  ) {
    return this.service.reassign(id, req.supportAgent!, dto.staffId);
  }
  @Post('conversations/:id/release') @HttpCode(200) release(
    @Param('id', ChatbotIdPipe) id: string,
    @Req() req: SupportRequest,
  ) {
    return this.service.release(id, req.supportAgent!);
  }
  @Post('conversations/:id/messages') @HttpCode(200) send(
    @Param('id', ChatbotIdPipe) id: string,
    @Req() req: SupportRequest,
    @Body() body: StaffMessageDto,
  ) {
    return this.service.staffSend(id, req.supportAgent!, body);
  }
  @Post('conversations/:id/draft') @HttpCode(200) draft(
    @Param('id', ChatbotIdPipe) id: string,
    @Req() req: SupportRequest,
    @Body() body: DraftReplyDto,
  ) {
    return this.service.draft(id, req.supportAgent!, body.instruction ?? '');
  }
  @Post('conversations/:id/translate') @HttpCode(200) translate(
    @Param('id', ChatbotIdPipe) id: string,
    @Body() body: TranslateMessageDto,
  ) {
    return this.service.translateMessage(id, body.messageId, body.language);
  }
  @Post('conversations/:id/resolve') @HttpCode(200) resolve(
    @Param('id', ChatbotIdPipe) id: string,
    @Req() req: SupportRequest,
    @Body() body: ResolveConversationDto,
  ) {
    return this.service.resolve(id, req.supportAgent!, body.resolution);
  }
  @Post('conversations/:id/close') @HttpCode(200) close(
    @Param('id', ChatbotIdPipe) id: string,
    @Req() req: SupportRequest,
    @Body() body: ResolveConversationDto,
  ) {
    return this.service.resolve(id, req.supportAgent!, body.resolution, true);
  }
}
