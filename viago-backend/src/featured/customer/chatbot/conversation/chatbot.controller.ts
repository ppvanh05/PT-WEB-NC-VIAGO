import { ChatbotIdPipe } from '../common/chatbot.id';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { CustomerChatbotService } from './chatbot.service';
import {
  SupportCustomerGuard,
  SupportRateGuard,
  type SupportRequest,
} from '../auth/chatbot.auth';
import {
  CreateConversationDto,
  SupportEventsDto,
  SupportMessageDto,
} from '../common/chatbot.dto';
import { SupportEventsService } from '../realtime/chatbot.events';
import { validation, cursor } from '../common/chatbot.validation';

@Controller('customer/chatbot')
@UseGuards(SupportRateGuard, SupportCustomerGuard)
@UsePipes(validation)
export class CustomerChatbotController {
  constructor(
    private readonly service: CustomerChatbotService,
    private readonly events: SupportEventsService,
  ) {}
  @Get('health') health() {
    return this.service.health();
  }
  @Post('conversations') create(
    @Req() req: SupportRequest,
    @Body() body: CreateConversationDto,
  ) {
    return this.service.create(req.supportOwner!, body.language);
  }
  @Get('conversations/:id') get(
    @Param('id', ChatbotIdPipe) id: string,
    @Req() req: SupportRequest,
  ) {
    return this.service.get(id, req.supportOwner!);
  }
  @Get('conversations') list(@Req() req: SupportRequest) {
    return this.service.list(req.supportOwner!);
  }
  @Get('conversations/:id/messages') messages(
    @Param('id', ChatbotIdPipe) id: string,
    @Req() req: SupportRequest,
  ) {
    return this.service
      .get(id, req.supportOwner!)
      .then((data) => ({ data: data.messages }));
  }
  @Post('conversations/:id/handoff/confirm') @HttpCode(200) confirm(
    @Param('id', ChatbotIdPipe) id: string,
    @Req() req: SupportRequest,
  ) {
    return this.service.handoff(id, req.supportOwner!, true);
  }
  @Post('conversations/:id/handoff/decline') @HttpCode(200) decline(
    @Param('id', ChatbotIdPipe) id: string,
    @Req() req: SupportRequest,
  ) {
    return this.service.resume(id, req.supportOwner!);
  }
  @Post('conversations/:id/close') @HttpCode(200) close(
    @Param('id', ChatbotIdPipe) id: string,
    @Req() req: SupportRequest,
  ) {
    return this.service.close(id, req.supportOwner!);
  }
  @Post('conversations/:id/messages') @HttpCode(200) send(
    @Param('id', ChatbotIdPipe) id: string,
    @Req() req: SupportRequest,
    @Body() body: SupportMessageDto,
  ) {
    return this.service.send(
      id,
      req.supportOwner!,
      body,
      req.headers.authorization,
    );
  }
  @Post('conversations/:id/handoff') @HttpCode(200) handoff(
    @Param('id', ChatbotIdPipe) id: string,
    @Req() req: SupportRequest,
  ) {
    return this.service.handoff(id, req.supportOwner!);
  }
  @Post('conversations/:id/resume') @HttpCode(200) resume(
    @Param('id', ChatbotIdPipe) id: string,
    @Req() req: SupportRequest,
  ) {
    return this.service.resume(id, req.supportOwner!);
  }
  @Sse('conversations/:id/events') stream(
    @Param('id', ChatbotIdPipe) id: string,
    @Req() req: SupportRequest,
    @Query() query: SupportEventsDto,
    @Headers('last-event-id') last?: string,
  ) {
    return this.events.customer(
      id,
      req.supportOwner!,
      cursor(query.after, last),
    );
  }
}
