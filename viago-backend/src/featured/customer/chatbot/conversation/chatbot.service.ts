import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Prisma,
  type nguoi_gui_chatbot_enum,
  type hoi_thoai_chatbot,
  type tin_nhan_chatbot,
} from '@prisma/client';
import { chatbotId } from '../common/chatbot.id';
import { PrismaService } from '../../../../prisma/prisma.service';
import { ChatbotIntegrationService } from '../../../../integrations/chatbot/chatbot.service';
import { supportPriority } from '../../../../integrations/chatbot/chatbot.priority';
import {
  assessConversation,
  normalize,
  type ModelAssessment,
  type SupportAssessment,
} from '../../../../integrations/chatbot/chatbot.analysis';
import { SupportKnowledgeService } from '../knowledge/knowledge.service';
import {
  publicKnowledgeSources,
  type ChatbotMemory,
  type ChatbotToolkit,
  type KnowledgeSource,
} from '../../../../integrations/chatbot/chatbot.tools';
import { conversationStatus, senderRole } from '../common/chatbot.state';
import type { StaffIdentity } from '../auth/chatbot.auth';
import type { StaffMessageDto, SupportMessageDto } from '../common/chatbot.dto';

type Tx = Prisma.TransactionClient;
const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export const publicMessage = (m: tin_nhan_chatbot) => ({
  id: m.id,
  sequence: m.sequence,
  role: senderRole[m.role],
  text: m.text,
  createdAt: m.createdAt.toISOString(),
  clientMessageId: m.clientMessageId,
});
export const publicConversation = (c: hoi_thoai_chatbot) => ({
  id: c.id,
  status: conversationStatus[c.status],
  confirmationExpiresAt: c.confirmationExpiresAt?.toISOString() ?? null,
  language: c.language,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
  processing:
    !!c.processingToken &&
    !!c.processingUntil &&
    c.processingUntil > new Date(),
});

@Injectable()
export class CustomerChatbotService {
  private readonly logger = new Logger(CustomerChatbotService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly model: ChatbotIntegrationService,
    private readonly knowledge: SupportKnowledgeService,
  ) {}
  health() {
    return this.model.health();
  }
  async create(ownerHash: string, language: string) {
    return this.prisma.$transaction(
      async (tx) => {
        if (
          (await tx.hoi_thoai_chatbot.count({
            where: { ownerHash, status: { notIn: ['DaGiaiQuyet', 'DaDong'] } },
          })) >= 5
        )
          throw new ConflictException(
            'Bạn đã có 5 hội thoại đang mở. Hãy tiếp tục hội thoại hiện tại.',
          );
        const conversation = await tx.hoi_thoai_chatbot.create({
          data: { id: chatbotId('HT'), ownerHash, language },
        });
        return publicConversation(conversation);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async owned(id: string, ownerHash: string, db: Tx = this.prisma) {
    const row = await db.hoi_thoai_chatbot.findFirst({
      where: { id, ownerHash },
    });
    if (!row) throw new NotFoundException('Không tìm thấy hội thoại.');
    return row;
  }
  async get(id: string, ownerHash: string) {
    await this.owned(id, ownerHash);
    await this.recover(id);
    return this.prisma.$transaction(
      async (tx) => {
        const row = await this.owned(id, ownerHash, tx);
        const messages = await tx.tin_nhan_chatbot.findMany({
          where: { conversationId: id },
          orderBy: { sequence: 'asc' },
          take: 500,
        });
        const cursor = await tx.su_kien_chatbot.findFirst({
          where: { conversationId: id },
          orderBy: { id: 'desc' },
          select: { id: true },
        });
        const sourceEvents = await tx.su_kien_chatbot.findMany({
          where: { conversationId: id, type: 'sources' },
          orderBy: { id: 'desc' },
          take: 500,
          select: { data: true },
        });
        const sources = new Map<string, KnowledgeSource[]>();
        for (const event of sourceEvents) {
          const data = event.data as {
            messageId?: string;
            items?: unknown;
          } | null;
          if (data?.messageId && !sources.has(data.messageId))
            sources.set(data.messageId, publicKnowledgeSources(data.items));
        }
        return {
          ...publicConversation(row),
          messages: messages.map((message) => ({
            ...publicMessage(message),
            ...(sources.get(message.id)?.length
              ? { sources: sources.get(message.id) }
              : {}),
          })),
          cursor: cursor?.id ?? 0,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  private async locked<T>(
    id: string,
    action: (tx: Tx, row: hoi_thoai_chatbot) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT mahoithoai FROM hoi_thoai_chatbot WHERE mahoithoai = ${id} FOR UPDATE`;
      const row = await tx.hoi_thoai_chatbot.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Không tìm thấy hội thoại.');
      return action(tx, row);
    });
  }
  private async event(tx: Tx, id: string, type: string, data: unknown) {
    await tx.su_kien_chatbot.create({
      data: { conversationId: id, type, data: json(data) },
    });
  }
  private async saveMessage(
    tx: Tx,
    id: string,
    role: nguoi_gui_chatbot_enum,
    text: string,
    extra: {
      clientMessageId?: string;
      agentId?: string;
      originalText?: string;
      id?: string;
    } = {},
  ) {
    const message = await tx.tin_nhan_chatbot.create({
      data: { id: chatbotId('TN'), conversationId: id, role, text, ...extra },
    });
    await this.event(tx, id, 'message', publicMessage(message));
    return message;
  }
  private busy(row: hoi_thoai_chatbot) {
    return (
      !!row.processingToken &&
      !!row.processingUntil &&
      row.processingUntil > new Date()
    );
  }
  private async transcript(id: string) {
    const rows = await this.prisma.tin_nhan_chatbot.findMany({
      where: {
        conversationId: id,
        role: { in: ['KhachHang', 'TroLyAI', 'NhanVien'] },
      },
      orderBy: { sequence: 'desc' },
      take: 24,
    });
    return rows
      .reverse()
      .map((m) => ({ id: m.id, role: senderRole[m.role], text: m.text }));
  }
  async send(
    id: string,
    ownerHash: string,
    dto: SupportMessageDto,
    authorization?: string,
  ) {
    await this.owned(id, ownerHash);
    await this.recover(id);
    const token = chatbotId('KXL');
    const result = await this.locked(id, async (tx, row) => {
      if (row.ownerHash !== ownerHash)
        throw new NotFoundException('Không tìm thấy hội thoại.');
      const duplicate = await tx.tin_nhan_chatbot.findUnique({
        where: {
          conversationId_clientMessageId: {
            conversationId: id,
            clientMessageId: dto.clientMessageId,
          },
        },
      });
      if (duplicate) {
        if (duplicate.role !== 'KhachHang' || duplicate.text !== dto.text)
          throw new ConflictException('Mã tin nhắn đã dùng cho nội dung khác.');
        return { duplicate: true, status: row.status };
      }
      if (row.status === 'DaDong')
        throw new ConflictException(
          'Hội thoại đã kết thúc. Hãy mở hội thoại mới.',
        );
      if (this.busy(row))
        throw new ConflictException('Tin nhắn trước đang được xử lý.');
      if (
        (await tx.tin_nhan_chatbot.count({ where: { conversationId: id } })) >=
        450
      )
        throw new ConflictException(
          'Hội thoại đã đạt giới hạn. Vui lòng mở hội thoại mới.',
        );
      await this.saveMessage(tx, id, 'KhachHang', dto.text, {
        clientMessageId: dto.clientMessageId,
      });
      if (
        row.status === 'ChoXacNhan' &&
        /^(dong y|co|vang|ok|yes|ket noi|chuyen giup toi)[.!\s]*$/.test(
          normalize(dto.text.trim()),
        )
      ) {
        const confirmed = await tx.yeu_cau_chuyen_tiep_chatbot.updateMany({
          where: {
            mahoithoai: id,
            trangthai: 'ChoXacNhan',
            thoigianhethanxacnhan: { gt: new Date() },
          },
          data: {
            trangthai: 'ChoNhanVien',
            thoigianxacnhan: new Date(),
            kieukichhoat: 'KhachXacNhan',
          },
        });
        if (confirmed.count) {
          const updated = await tx.hoi_thoai_chatbot.update({
            where: { id },
            data: {
              status: 'ChoNhanVien',
              confirmationExpiresAt: null,
              revision: { increment: 1 },
            },
          });
          await this.saveMessage(
            tx,
            id,
            'HeThong',
            row.language === 'en'
              ? 'Your request is in the support queue. No agent has joined yet.'
              : 'Yêu cầu đã vào hàng chờ hỗ trợ. Hiện chưa có nhân viên tiếp nhận.',
          );
          await this.event(tx, id, 'state', publicConversation(updated));
          return { duplicate: false, status: updated.status, staffOnly: true };
        }
      }
      if (row.status === 'ChoNhanVien' || row.status === 'NhanVienHoTro') {
        const assessment = assessConversation(
          await tx.tin_nhan_chatbot
            .findMany({
              where: { conversationId: id, role: 'KhachHang' },
              orderBy: { sequence: 'desc' },
              take: 24,
            })
            .then((rows) => rows.reverse().map(publicMessage)),
        );
        if (assessment.priority.score > row.priority) {
          const previous =
            row.analysis &&
            typeof row.analysis === 'object' &&
            !Array.isArray(row.analysis)
              ? row.analysis
              : {};
          await tx.hoi_thoai_chatbot.update({
            where: { id },
            data: {
              priority: assessment.priority.score,
              analysis: json({ ...previous, priority: assessment.priority }),
            },
          });
          await tx.yeu_cau_chuyen_tiep_chatbot.updateMany({
            where: {
              mahoithoai: id,
              trangthai: { in: ['ChoNhanVien', 'DangXuLy'] },
            },
            data: { mucdouutien: assessment.priority.level },
          });
          await this.event(tx, id, 'priority', assessment.priority);
        }
        await tx.hoi_thoai_chatbot.update({
          where: { id },
          data: { revision: { increment: 1 } },
        });
        return { duplicate: false, status: row.status, staffOnly: true };
      }
      if (row.status === 'ChoXacNhan') {
        await this.cancelPending(tx, id);
      }
      await tx.hoi_thoai_chatbot.update({
        where: { id },
        data: {
          status: 'TroLyAI',
          assignedAgentId: null,
          confirmationExpiresAt: null,
          processingToken: token,
          processingUntil: new Date(Date.now() + 240000),
          revision: { increment: 1 },
        },
      });
      await this.event(tx, id, 'processing', { active: true });
      return { duplicate: false, status: 'TroLyAI' };
    });
    if (result.duplicate) return { accepted: true, duplicate: true };
    if (result.staffOnly) return { accepted: true, duplicate: false };
    // Request remains alive until persisted completion; reconnecting SSE never starts another generation.
    await this.process(id, token, result.status, authorization);
    return { accepted: true, duplicate: false };
  }
  private async process(
    id: string,
    token: string,
    initialStatus: string,
    authorization?: string,
  ) {
    let assessment: SupportAssessment | undefined;
    const replyId = chatbotId('TN');
    try {
      const history = await this.transcript(id);
      // Safety and explicit human requests are checked before any provider call.
      const rules = assessConversation(history);
      if (rules.handoffMode === 'IMMEDIATE') {
        await this.finish(id, token, rules, undefined, replyId, true);
        return;
      }
      const row = await this.prisma.hoi_thoai_chatbot.findUniqueOrThrow({
        where: { id },
      });
      const previousAnalysis = row.analysis as {
        frustration?: { score?: number };
        memory?: ChatbotMemory;
        summaryVi?: string;
      } | null;
      const storedMemory = await this.prisma.bo_nho_chatbot.findUnique({
        where: { mahoithoai: id },
      });
      const memory: ChatbotMemory = {
        ...((storedMemory?.ngucanh as ChatbotMemory | null) ??
          previousAnalysis?.memory),
        summary: storedMemory?.tomtat ?? previousAnalysis?.summaryVi,
      };
      let semantic: ModelAssessment | undefined;
      try {
        semantic = await this.model.assess(history, memory);
      } catch {
        this.logger.warn(
          `Semantic analysis unavailable for ${id}; applying conservative rules.`,
        );
      }
      const previous = previousAnalysis?.frustration?.score ?? 0;
      assessment = assessConversation(history, semantic, previous);
      memory.summary = assessment.summaryVi;
      assessment.memory = memory;
      // Loss of semantic analysis must not silently fall back to an FAQ pretending to understand.
      if (!semantic) {
        assessment.needsHuman = true;
        assessment.handoffMode = 'ASK_CONFIRMATION';
        assessment.reasons.push('semantic_model_unavailable');
      }
      if (initialStatus !== 'TroLyAI' || assessment.needsHuman) {
        await this.finish(
          id,
          token,
          assessment,
          undefined,
          replyId,
          initialStatus !== 'TroLyAI' || assessment.needsHuman,
        );
        return;
      }
      const agent = this.model.provider === 'openai';
      const facts = agent
        ? this.knowledge.context(memory)
        : await this.knowledge.retrieve(
            history.filter((m) => m.role === 'CUSTOMER').at(-1)?.text ?? '',
          );
      let toolkit: ChatbotToolkit | undefined;
      let missingKnowledge = false;
      if (agent) {
        const currentAssessment = assessment;
        const base = this.knowledge.toolkit(memory, authorization);
        const trace: NonNullable<SupportAssessment['toolTrace']> =
          (assessment.toolTrace = []);
        toolkit = {
          definitions: base.definitions,
          execute: async (name, args) => {
            const result = await base.execute(name, args);
            const metadata = result as Record<string, unknown>;
            if (name === 'search_knowledge' || name === 'search_policies') {
              missingKnowledge = !(
                Array.isArray(metadata.sources) && metadata.sources.length
              );
            }
            trace.push({
              name,
              args,
              source: metadata?.source,
              total: metadata?.total,
            });
            currentAssessment.sources = [
              ...new Map(
                [
                  ...(currentAssessment.sources ?? []),
                  ...publicKnowledgeSources(metadata?.sources),
                ].map((source) => [source.url, source]),
              ).values(),
            ].slice(-3);
            return result;
          },
        };
      }
      let pending = '',
        lastFlush = Date.now();
      const flush = async () => {
        if (!pending) return;
        const delta = pending;
        pending = '';
        await this.locked(id, async (tx, current) => {
          if (current.processingToken !== token)
            throw new ConflictException('Lượt xử lý đã kết thúc.');
          await this.event(tx, id, 'delta', {
            messageId: replyId,
            text: delta,
          });
        });
        // Database latency must not make every following token trigger a write.
        lastFlush = Date.now();
      };
      const reply = await this.model.reply(
        history,
        facts,
        async (delta) => {
          pending += delta;
          if (pending.length >= 120 || Date.now() - lastFlush > 150)
            await flush();
        },
        toolkit,
      );
      await flush();
      if (missingKnowledge) {
        assessment.needsHuman = true;
        assessment.handoffMode = 'ASK_CONFIRMATION';
        assessment.reasons.push('knowledge_not_found');
        await this.finish(id, token, assessment, undefined, replyId, true);
        return;
      }
      await this.finish(id, token, assessment, reply, replyId, false);
    } catch {
      this.logger.warn(
        `Support processing interrupted for ${id}; queuing staff review.`,
      );
      const fallback =
        assessment ?? assessConversation(await this.transcript(id));
      fallback.needsHuman = true;
      if (fallback.handoffMode !== 'IMMEDIATE')
        fallback.handoffMode = 'ASK_CONFIRMATION';
      fallback.reasons.push('processing_failed');
      await this.finish(id, token, fallback, undefined, replyId, true);
    }
  }
  async resume(id: string, ownerHash: string) {
    await this.owned(id, ownerHash);
    await this.recover(id);
    return this.locked(id, async (tx, row) => {
      if (row.ownerHash !== ownerHash)
        throw new NotFoundException('Không tìm thấy hội thoại.');
      if (
        !['ChoNhanVien', 'ChoXacNhan', 'DaGiaiQuyet'].includes(row.status) ||
        row.assignedAgentId ||
        this.busy(row)
      )
        throw new ConflictException(
          'Chỉ có thể quay lại trợ lý khi đang chờ và chưa có nhân viên tiếp nhận.',
        );
      const updated = await tx.hoi_thoai_chatbot.update({
        where: { id },
        data: {
          status: 'TroLyAI',
          handoff: Prisma.DbNull,
          confirmationExpiresAt: null,
          revision: { increment: 1 },
        },
      });
      await tx.yeu_cau_chuyen_tiep_chatbot.updateMany({
        where: {
          mahoithoai: id,
          trangthai: { in: ['ChoXacNhan', 'ChoNhanVien'] },
        },
        data: { trangthai: 'DaHuy' },
      });
      await this.saveMessage(
        tx,
        id,
        'HeThong',
        row.language === 'en'
          ? 'You are back with the assistant. Previous conversation context is preserved; you can continue your question.'
          : 'Bạn đã quay lại trợ lý. Nội dung trao đổi trước được giữ lại; bạn có thể tiếp tục đặt câu hỏi.',
      );
      await this.event(tx, id, 'state', publicConversation(updated));
      return { status: conversationStatus[updated.status] };
    });
  }
  private async finish(
    id: string,
    token: string,
    assessment: SupportAssessment,
    reply: string | undefined,
    replyId: string,
    handoff: boolean,
  ) {
    await this.locked(id, async (tx, row) => {
      if (row.processingToken !== token) return;
      const language =
        assessment.language === 'other' ? row.language : assessment.language;
      const proposed = handoff && assessment.handoffMode !== 'IMMEDIATE';
      const justQueued = handoff && !proposed && row.status === 'TroLyAI';
      const data: Prisma.hoi_thoai_chatbotUpdateInput = {
        analysis: json(assessment),
        language,
        priority: Math.max(row.priority, assessment.priority.score),
        processingToken: null,
        processingUntil: null,
        revision: { increment: 1 },
      };
      await tx.bo_nho_chatbot.upsert({
        where: { mahoithoai: id },
        create: {
          mabonho: chatbotId('BN'),
          mahoithoai: id,
          tomtat: assessment.summaryVi,
          ngucanh: json(assessment.memory ?? {}),
        },
        update: {
          tomtat: assessment.summaryVi,
          ngucanh: json(assessment.memory ?? {}),
        },
      });
      if (handoff)
        data.handoff = json({
          ...assessment,
          updatedAt: new Date().toISOString(),
          source: 'customer_transcript_unverified',
          latestMessageIds: (
            await tx.tin_nhan_chatbot.findMany({
              where: { conversationId: id, role: 'KhachHang' },
              orderBy: { sequence: 'desc' },
              take: 8,
              select: { id: true },
            })
          ).map((m) => m.id),
        });
      if (justQueued) data.status = 'ChoNhanVien';
      if (proposed) {
        data.status = 'ChoXacNhan';
        data.confirmationExpiresAt = new Date(Date.now() + 10 * 60000);
      }
      if (handoff) await this.recordHandoff(tx, id, assessment, proposed);
      const updated = await tx.hoi_thoai_chatbot.update({
        where: { id },
        data,
      });
      if (reply && row.status === 'TroLyAI' && !handoff) {
        await this.saveMessage(tx, id, 'TroLyAI', reply, { id: replyId });
        const sources = publicKnowledgeSources(assessment.sources);
        if (sources.length)
          await this.event(tx, id, 'sources', {
            messageId: replyId,
            items: sources,
          });
      } else if (proposed) {
        await this.saveMessage(
          tx,
          id,
          'HeThong',
          language === 'en'
            ? 'I cannot verify this reliably yet. Would you like to connect with VIAGO support, or continue with the assistant?'
            : 'Mình chưa có đủ thông tin để hỗ trợ chính xác. Bạn muốn kết nối với nhân viên VIAGO hay tiếp tục trao đổi với trợ lý?',
        );
      } else if (justQueued)
        await this.saveMessage(
          tx,
          id,
          'HeThong',
          language === 'en'
            ? 'Your conversation is in the customer support queue. No agent has joined yet. You can add details here while waiting.'
            : 'Hội thoại của bạn đã vào hàng chờ CSKH. Hiện chưa có nhân viên tiếp nhận. Bạn có thể bổ sung thông tin tại đây trong lúc chờ.',
        );
      if (!reply)
        await this.event(tx, id, 'discard_delta', { messageId: replyId });
      await this.event(tx, id, 'state', publicConversation(updated));
      await this.event(tx, id, 'processing', { active: false });
    });
  }
  async handoff(id: string, ownerHash: string, confirmOnly = false) {
    await this.owned(id, ownerHash);
    await this.recover(id);
    const status = await this.locked(id, async (tx, row) => {
      if (row.ownerHash !== ownerHash)
        throw new NotFoundException('Không tìm thấy hội thoại.');
      if (row.status === 'DaDong')
        throw new ConflictException('Hội thoại đã kết thúc.');
      if (this.busy(row))
        throw new ConflictException('Vui lòng chờ xử lý tin nhắn hiện tại.');
      if (
        confirmOnly &&
        (row.status !== 'ChoXacNhan' ||
          !row.confirmationExpiresAt ||
          row.confirmationExpiresAt <= new Date())
      )
        throw new ConflictException('Đề xuất chuyển tiếp không còn hiệu lực.');
      if (!['TroLyAI', 'ChoXacNhan', 'DaGiaiQuyet'].includes(row.status))
        return conversationStatus[row.status];
      const history = await tx.tin_nhan_chatbot.findMany({
        where: { conversationId: id },
        orderBy: { sequence: 'desc' },
        take: 24,
      });
      const assessment = assessConversation(
        history.reverse().map(publicMessage),
      );
      assessment.needsHuman = true;
      assessment.handoffMode = 'IMMEDIATE';
      assessment.reasons.push('customer_requested_human');
      const confirmed = await tx.yeu_cau_chuyen_tiep_chatbot.updateMany({
        where: {
          mahoithoai: id,
          trangthai: 'ChoXacNhan',
          thoigianhethanxacnhan: { gt: new Date() },
        },
        data: {
          trangthai: 'ChoNhanVien',
          thoigianxacnhan: new Date(),
          kieukichhoat: 'KhachXacNhan',
        },
      });
      if (!confirmed.count) await this.recordHandoff(tx, id, assessment, false);
      const updated = await tx.hoi_thoai_chatbot.update({
        where: { id },
        data: {
          status: 'ChoNhanVien',
          handoff: json(assessment),
          priority: Math.max(row.priority, assessment.priority.score),
          confirmationExpiresAt: null,
          assignedAgentId: null,
          revision: { increment: 1 },
        },
      });
      await this.saveMessage(
        tx,
        id,
        'HeThong',
        row.language === 'en'
          ? 'Your conversation is in the customer support queue. No agent has joined yet.'
          : 'Hội thoại đã vào hàng chờ CSKH. Hiện chưa có nhân viên tiếp nhận.',
      );
      await this.event(tx, id, 'state', publicConversation(updated));
      return conversationStatus[updated.status];
    });
    return { status };
  }
  async recover(id: string) {
    const expired = await this.prisma.hoi_thoai_chatbot.findUnique({
      where: { id },
    });
    if (!expired) return;
    if (
      expired.status === 'ChoXacNhan' &&
      expired.confirmationExpiresAt &&
      expired.confirmationExpiresAt <= new Date()
    )
      await this.locked(id, async (tx, row) => {
        if (
          row.status === 'ChoXacNhan' &&
          row.confirmationExpiresAt &&
          row.confirmationExpiresAt <= new Date()
        ) {
          await this.cancelPending(tx, id);
          const updated = await tx.hoi_thoai_chatbot.update({
            where: { id },
            data: {
              status: 'TroLyAI',
              confirmationExpiresAt: null,
              handoff: Prisma.DbNull,
            },
          });
          await this.event(tx, id, 'state', publicConversation(updated));
        }
      });
    if (
      !expired.processingToken ||
      !expired.processingUntil ||
      expired.processingUntil >= new Date()
    )
      return;
    const fallback = assessConversation(await this.transcript(id));
    fallback.needsHuman = true;
    if (fallback.handoffMode !== 'IMMEDIATE')
      fallback.handoffMode = 'ASK_CONFIRMATION';
    fallback.reasons.push('processing_lease_expired');
    await this.finish(
      id,
      expired.processingToken!,
      fallback,
      undefined,
      chatbotId('TN'),
      true,
    );
  }
  private staffView(row: hoi_thoai_chatbot) {
    return {
      ...publicConversation(row),
      assignedAgentId: row.assignedAgentId,
      priority: row.priority,
      analysis: row.analysis,
      handoff: row.handoff,
    };
  }
  async claim(id: string, agent: StaffIdentity) {
    await this.recover(id);
    return this.locked(id, async (tx, row) => {
      if (row.status === 'NhanVienHoTro' && row.assignedAgentId === agent.id)
        return this.staffView(row);
      if (row.status !== 'ChoNhanVien' || this.busy(row))
        throw new ConflictException(
          'Hội thoại chưa sẵn sàng hoặc đã có nhân viên tiếp nhận.',
        );
      const updated = await tx.hoi_thoai_chatbot.update({
        where: { id },
        data: {
          status: 'NhanVienHoTro',
          assignedAgentId: agent.id,
          revision: { increment: 1 },
        },
      });
      const request = await tx.yeu_cau_chuyen_tiep_chatbot.findFirstOrThrow({
        where: { mahoithoai: id, trangthai: 'ChoNhanVien' },
      });
      await tx.yeu_cau_chuyen_tiep_chatbot.update({
        where: { mayeucau: request.mayeucau },
        data: { trangthai: 'DangXuLy', manhanvien: agent.id },
      });
      await tx.phan_cong_chatbot.create({
        data: {
          maphancong: chatbotId('PCCT'),
          mayeucau: request.mayeucau,
          manhanvien: agent.id,
          trangthai: 'DaTiepNhan',
          thoigiantiepnhan: new Date(),
        },
      });
      await this.saveMessage(
        tx,
        id,
        'HeThong',
        row.language === 'en'
          ? `${agent.name} from VIAGO customer support has joined.`
          : `Nhân viên CSKH ${agent.name} đã tiếp nhận hội thoại.`,
      );
      await this.event(tx, id, 'state', publicConversation(updated));
      return this.staffView(updated);
    });
  }
  private assigned(row: hoi_thoai_chatbot, agent: StaffIdentity) {
    if (row.status !== 'NhanVienHoTro' || row.assignedAgentId !== agent.id)
      throw new ForbiddenException(
        'Chỉ nhân viên đang tiếp nhận được phản hồi hội thoại.',
      );
  }
  async staffSend(id: string, agent: StaffIdentity, dto: StaffMessageDto) {
    const row = await this.prisma.hoi_thoai_chatbot.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Không tìm thấy hội thoại.');
    this.assigned(row, agent);
    let text = dto.text;
    if (dto.translate === 'customer') {
      try {
        text = await this.model.translate(dto.text, row.language);
      } catch {
        throw new ServiceUnavailableException(
          'Chưa chuyển ngữ được. Hãy gửi nguyên văn hoặc thử lại.',
        );
      }
    }
    return this.locked(id, async (tx, current) => {
      this.assigned(current, agent);
      if (current.language !== row.language && dto.translate === 'customer')
        throw new ConflictException(
          'Ngôn ngữ khách vừa thay đổi. Vui lòng thử lại.',
        );
      const duplicate = await tx.tin_nhan_chatbot.findUnique({
        where: {
          conversationId_clientMessageId: {
            conversationId: id,
            clientMessageId: dto.clientMessageId,
          },
        },
      });
      if (duplicate) {
        if (
          duplicate.agentId !== agent.id ||
          (duplicate.originalText ?? duplicate.text) !== dto.text
        )
          throw new ConflictException('Mã tin nhắn đã được sử dụng.');
        return publicMessage(duplicate);
      }
      const message = await this.saveMessage(tx, id, 'NhanVien', text, {
        agentId: agent.id,
        clientMessageId: dto.clientMessageId,
        ...(dto.translate === 'customer' ? { originalText: dto.text } : {}),
      });
      await tx.hoi_thoai_chatbot.update({
        where: { id },
        data: { revision: { increment: 1 } },
      });
      return publicMessage(message);
    });
  }
  async draft(id: string, agent: StaffIdentity, instruction: string) {
    const row = await this.prisma.hoi_thoai_chatbot.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Không tìm thấy hội thoại.');
    this.assigned(row, agent);
    const history = await this.transcript(id);
    try {
      const text = await this.model.draft(
        history,
        await this.knowledge.retrieve(
          history.filter((m) => m.role === 'CUSTOMER').at(-1)?.text ?? '',
        ),
        instruction,
      );
      return { text, requiresReview: true, sent: false };
    } catch {
      throw new ServiceUnavailableException(
        'Chưa tạo được bản nháp. Nhân viên vẫn có thể trả lời trực tiếp.',
      );
    }
  }
  async translateMessage(id: string, messageId: string, language: string) {
    const message = await this.prisma.tin_nhan_chatbot.findFirst({
      where: { id: messageId, conversationId: id },
    });
    if (!message)
      throw new NotFoundException('Không tìm thấy tin nhắn trong hội thoại.');
    try {
      return {
        messageId,
        originalText: message.text,
        translatedText: await this.model.translate(message.text, language),
        language,
        machineTranslated: true,
      };
    } catch {
      throw new ServiceUnavailableException(
        'Chưa chuyển ngữ được. Vui lòng đọc nguyên văn hoặc thử lại.',
      );
    }
  }
  async resolve(
    id: string,
    agent: StaffIdentity,
    resolution: string,
    close = false,
  ) {
    await this.recover(id);
    return this.locked(id, async (tx, row) => {
      this.assigned(row, agent);
      if (this.busy(row))
        throw new ConflictException('Tin nhắn khách đang được phân tích.');
      const updated = await tx.hoi_thoai_chatbot.update({
        where: { id },
        data: {
          status: close ? 'DaDong' : 'DaGiaiQuyet',
          closedAt: close ? new Date() : null,
          assignedAgentId: null,
          handoff: json({
            previous: row.handoff,
            resolution,
            resolvedBy: agent.id,
            resolvedAt: new Date().toISOString(),
          }),
          revision: { increment: 1 },
        },
      });
      const requests = await tx.yeu_cau_chuyen_tiep_chatbot.findMany({
        where: { mahoithoai: id, trangthai: 'DangXuLy' },
        select: { mayeucau: true },
      });
      const requestIds = requests.map((request) => request.mayeucau);
      await tx.phan_cong_chatbot.updateMany({
        where: {
          mayeucau: { in: requestIds },
          trangthai: { in: ['DaPhanCong', 'DaTiepNhan'] },
        },
        data: { trangthai: 'DaHoanThanh', thoigianketthuc: new Date() },
      });
      await tx.yeu_cau_chuyen_tiep_chatbot.updateMany({
        where: { mayeucau: { in: requestIds } },
        data: {
          trangthai: 'DaGiaiQuyet',
          thoigiangiaiquyet: new Date(),
          ketquaxuly: resolution,
        },
      });
      await this.saveMessage(
        tx,
        id,
        'HeThong',
        close
          ? row.language === 'en'
            ? 'The agent has closed this conversation.'
            : 'Nhân viên đã đóng hội thoại.'
          : row.language === 'en'
            ? 'Your request has been resolved. You can continue asking the assistant here.'
            : 'Yêu cầu đã được giải quyết. Bạn có thể tiếp tục hỏi trợ lý trong hội thoại này.',
      );
      await this.event(tx, id, 'state', publicConversation(updated));
      return this.staffView(updated);
    });
  }

  private async cancelPending(tx: Tx, id: string) {
    await tx.yeu_cau_chuyen_tiep_chatbot.updateMany({
      where: { mahoithoai: id, trangthai: 'ChoXacNhan' },
      data: { trangthai: 'DaHuy' },
    });
  }

  private async recordHandoff(
    tx: Tx,
    id: string,
    assessment: SupportAssessment,
    proposed: boolean,
  ) {
    const expires = proposed ? new Date(Date.now() + 10 * 60000) : null;
    const category = {
      payment: 'ThanhToan',
      booking: 'DatVe',
      refund: 'HoanTien',
      complaint: 'KhieuNai',
      safety: 'AnToan',
    } as const;
    await tx.yeu_cau_chuyen_tiep_chatbot.create({
      data: {
        mayeucau: chatbotId('YCCT'),
        mahoithoai: id,
        lydo: assessment.modelReason || assessment.reasons.join(', '),
        loaivande:
          category[assessment.intent as keyof typeof category] ?? 'Khac',
        mucdouutien: supportPriority(assessment).level,
        kieukichhoat: assessment.reasons.includes('customer_requested_human')
          ? 'KhachYeuCau'
          : assessment.handoffMode === 'IMMEDIATE'
            ? 'TinhHuongNghiemTrong'
            : assessment.frustration.score >= 35
              ? 'KhachChuaHaiLong'
              : 'AIKhongXuLyDuoc',
        trangthai: proposed ? 'ChoXacNhan' : 'ChoNhanVien',
        thoigianhethanxacnhan: expires,
      },
    });
  }

  async list(ownerHash: string) {
    const rows = await this.prisma.hoi_thoai_chatbot.findMany({
      where: { ownerHash },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    return { data: rows.map(publicConversation) };
  }

  async close(id: string, ownerHash: string) {
    await this.owned(id, ownerHash);
    return this.locked(id, async (tx, row) => {
      if (row.ownerHash !== ownerHash)
        throw new NotFoundException('Không tìm thấy hội thoại.');
      if (row.status === 'DaDong') return publicConversation(row);
      if (
        !['TroLyAI', 'DaGiaiQuyet', 'ChoXacNhan'].includes(row.status) ||
        this.busy(row)
      )
        throw new ConflictException(
          'Hãy kết thúc yêu cầu hỗ trợ trước khi đóng hội thoại.',
        );
      await this.cancelPending(tx, id);
      const updated = await tx.hoi_thoai_chatbot.update({
        where: { id },
        data: {
          status: 'DaDong',
          closedAt: new Date(),
          confirmationExpiresAt: null,
        },
      });
      await this.event(tx, id, 'state', publicConversation(updated));
      return publicConversation(updated);
    });
  }

  async release(id: string, agent: StaffIdentity) {
    return this.locked(id, async (tx, row) => {
      this.assigned(row, agent);
      if (this.busy(row))
        throw new ConflictException('Hội thoại đang được xử lý.');
      const request = await tx.yeu_cau_chuyen_tiep_chatbot.findFirstOrThrow({
        where: { mahoithoai: id, trangthai: 'DangXuLy' },
      });
      await tx.phan_cong_chatbot.updateMany({
        where: {
          mayeucau: request.mayeucau,
          trangthai: { in: ['DaPhanCong', 'DaTiepNhan'] },
        },
        data: { trangthai: 'DaChuyen', thoigianketthuc: new Date() },
      });
      await tx.yeu_cau_chuyen_tiep_chatbot.update({
        where: { mayeucau: request.mayeucau },
        data: { trangthai: 'ChoNhanVien', manhanvien: null },
      });
      const updated = await tx.hoi_thoai_chatbot.update({
        where: { id },
        data: {
          status: 'ChoNhanVien',
          assignedAgentId: null,
          revision: { increment: 1 },
        },
      });
      await this.saveMessage(
        tx,
        id,
        'HeThong',
        row.language === 'en'
          ? 'Your conversation is waiting for another support agent.'
          : 'Hội thoại được chuyển về hàng chờ để nhân viên khác tiếp nhận.',
      );
      await this.event(tx, id, 'state', publicConversation(updated));
      return this.staffView(updated);
    });
  }

  async reassign(id: string, agent: StaffIdentity, staffId: string) {
    return this.locked(id, async (tx, row) => {
      this.assigned(row, agent);
      if (this.busy(row))
        throw new ConflictException('Hội thoại đang được xử lý.');
      if (staffId === agent.id) return this.staffView(row);
      const employee = await tx.nhan_vien.findFirst({
        where: {
          manhanvien: staffId,
          trangthai: 'HoatDong',
          tai_khoan: { trangthai: 'HoatDong', vaitrotaikhoan: 'NhanVien' },
        },
        select: { hoten: true },
      });
      if (!employee)
        throw new ForbiddenException(
          'Nhân viên nhận chuyển tiếp không còn hoạt động.',
        );
      const request = await tx.yeu_cau_chuyen_tiep_chatbot.findFirstOrThrow({
        where: { mahoithoai: id, trangthai: 'DangXuLy' },
      });
      await tx.phan_cong_chatbot.updateMany({
        where: {
          mayeucau: request.mayeucau,
          trangthai: { in: ['DaPhanCong', 'DaTiepNhan'] },
        },
        data: { trangthai: 'DaChuyen', thoigianketthuc: new Date() },
      });
      await tx.phan_cong_chatbot.create({
        data: {
          maphancong: chatbotId('PCCT'),
          mayeucau: request.mayeucau,
          manhanvien: staffId,
          trangthai: 'DaTiepNhan',
          thoigiantiepnhan: new Date(),
        },
      });
      await tx.yeu_cau_chuyen_tiep_chatbot.update({
        where: { mayeucau: request.mayeucau },
        data: { manhanvien: staffId },
      });
      const updated = await tx.hoi_thoai_chatbot.update({
        where: { id },
        data: { assignedAgentId: staffId, revision: { increment: 1 } },
      });
      await this.saveMessage(
        tx,
        id,
        'HeThong',
        `Nhân viên ${employee.hoten} tiếp tục hỗ trợ hội thoại.`,
      );
      await this.event(tx, id, 'state', publicConversation(updated));
      return this.staffView(updated);
    });
  }
}
