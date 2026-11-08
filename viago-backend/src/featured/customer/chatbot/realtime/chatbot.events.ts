import {
  Injectable,
  type MessageEvent,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../../../prisma/prisma.service';
import { SupportAuthService } from '../auth/chatbot.auth';
import { CustomerChatbotService } from '../conversation/chatbot.service';

@Injectable()
export class SupportEventsService {
  private readonly connections = new Map<string, number>();
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: SupportAuthService,
    private readonly chatbot: CustomerChatbotService,
  ) {}
  async customer(id: string, ownerHash: string, after: number) {
    await this.chatbot.owned(id, ownerHash);
    return this.stream(id, 'customer:' + ownerHash, after, async () => {
      await this.chatbot.owned(id, ownerHash);
    });
  }
  async staff(id: string, authorization: string | undefined, after: number) {
    const agent = await this.auth.staff(authorization);
    if (!(await this.prisma.hoi_thoai_chatbot.count({ where: { id } })))
      throw new NotFoundException('Không tìm thấy hội thoại.');
    return this.stream(id, 'staff:' + agent.id, after, async () => {
      await this.auth.staff(authorization);
    });
  }
  private stream(
    id: string,
    key: string,
    after: number,
    authorize: () => Promise<void>,
  ) {
    if ((this.connections.get(key) ?? 0) >= 4)
      throw new HttpException('Quá nhiều kết nối hội thoại.', 429);
    // Reserve before subscription so HTTP errors are sent before the SSE headers.
    this.connections.set(key, (this.connections.get(key) ?? 0) + 1);
    return new Observable<MessageEvent>((subscriber) => {
      let closed = false,
        timer: ReturnType<typeof setTimeout> | undefined,
        cursor = after,
        lastAuth = 0;
      const started = Date.now();
      const poll = async () => {
        try {
          if (closed) return;
          if (Date.now() - lastAuth > 10000) {
            await authorize();
            lastAuth = Date.now();
          }
          await this.chatbot.recover(id);
          const events = await this.prisma.su_kien_chatbot.findMany({
            where: { conversationId: id, id: { gt: cursor } },
            orderBy: { id: 'asc' },
            take: 100,
          });
          for (const event of events) {
            if (closed) return;
            cursor = event.id;
            subscriber.next({
              id: String(event.id),
              type: event.type,
              data: event.data as object,
            });
          }
          if (!events.length)
            subscriber.next({
              type: 'heartbeat',
              data: { time: new Date().toISOString() },
            });
          // Reconnect periodically to refresh credentials and release long-lived resources.
          if (Date.now() - started > 15 * 60000) {
            subscriber.complete();
            return;
          }
          if (!closed)
            timer = setTimeout(
              () => {
                void poll();
              },
              events.length === 100 ? 0 : 500,
            );
        } catch {
          if (!closed) {
            subscriber.next({
              type: 'stream_error',
              data: { message: 'Kết nối gián đoạn. Hãy tải lại hội thoại.' },
            });
            subscriber.complete();
          }
        }
      };
      void poll();
      return () => {
        closed = true;
        if (timer) clearTimeout(timer);
        const count = (this.connections.get(key) ?? 1) - 1;
        if (count > 0) this.connections.set(key, count);
        else this.connections.delete(key);
      };
    });
  }
}
