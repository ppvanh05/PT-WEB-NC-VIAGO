import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ChatMessage {
  id: string;
  text: string;
  role: string;
  createdAt: string;
  clientMessageId?: string;
  sequence?: number;
  sources?: { id: string; title: string; url: string; updatedAt?: string }[];
}
interface Conversation {
  id: string;
  status: string;
  processing: boolean;
  messages: ChatMessage[];
  cursor: number;
}
@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './chatbot.css',
  templateUrl: './chatbot.html',
})
export class Chatbot implements AfterViewChecked, OnDestroy {
  @ViewChild('chatScroll') private chatScrollContainer?: ElementRef<HTMLElement>;
  constructor(private readonly cdr: ChangeDetectorRef) {}
  isOpen = false;
  isTyping = false;
  sending = false;
  connected = false;
  userInput = '';
  error = '';
  status = 'BOT';
  messages: ChatMessage[] = [];
  suggestions = [
    'Tra cứu chuyến đi',
    'Chính sách hoàn/huỷ',
    'Mua vé khứ hồi',
    'Gặp nhân viên hỗ trợ',
  ];
  private conversationId = '';
  private source?: EventSource;
  private initializing?: Promise<void>;
  private destroyed = false;
  private pending?: { text: string; clientMessageId: string };
  private readonly storageKey = 'viago-support-conversation';
  get statusLabel() {
    if (!this.connected) return 'Đang kết nối…';
    return this.status === 'QUEUED'
      ? 'Đang chờ CSKH tiếp nhận'
      : this.status === 'ASSIGNED'
        ? 'CSKH đang hỗ trợ'
        : this.status === 'AWAITING_CONFIRMATION'
          ? 'Bạn muốn gặp nhân viên hỗ trợ?'
          : this.status === 'RESOLVED'
            ? 'Đã giải quyết · Có thể tiếp tục hỏi trợ lý'
            : this.status === 'CLOSED'
              ? 'Hội thoại đã đóng'
              : 'Trợ lý VIAGO';
  }
  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) void this.connect();
  }
  async connect() {
    try {
      await this.initialize();
    } catch {
      this.error = 'Chưa kết nối được bộ phận hỗ trợ. Vui lòng thử lại.';
      this.refresh();
    }
  }
  private initialize(): Promise<void> {
    if (this.initializing) return this.initializing;
    this.initializing = this.load().finally(() => {
      this.initializing = undefined;
    });
    return this.initializing;
  }
  private async request<T>(path: string, body?: object): Promise<T> {
    const response = await fetch('/customer/chatbot' + path, {
      credentials: 'include',
      method: body ? 'POST' : 'GET',
      ...(body
        ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : {}),
    });
    if (!response.ok) {
      const detail = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(
        typeof detail.message === 'string' ? detail.message : 'Không kết nối được dịch vụ hỗ trợ.',
      );
    }
    return response.json() as Promise<T>;
  }
  private async load() {
    if (this.source && this.connected && this.conversationId) return;
    this.error = '';
    let id = this.conversationId || sessionStorage.getItem(this.storageKey);
    if (!id) {
      const created = await this.request<{ id: string }>('/conversations', { language: 'vi' });
      id = created.id;
      sessionStorage.setItem(this.storageKey, id);
    }
    let snapshot: Conversation;
    try {
      snapshot = await this.request<Conversation>('/conversations/' + encodeURIComponent(id));
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Không tải được hội thoại.';
      throw error;
    }
    if (this.destroyed) return;
    this.conversationId = id;
    this.messages = snapshot.messages;
    this.status = snapshot.status;
    this.isTyping = snapshot.processing;
    this.source?.close();
    const source = new EventSource(
      `/customer/chatbot/conversations/${encodeURIComponent(id)}/events?after=${snapshot.cursor}`,
      { withCredentials: true },
    );
    this.source = source;
    source.onopen = () => {
      this.connected = true;
      this.error = '';
      this.refresh();
    };
    source.onerror = () => {
      this.connected = false;
      this.error = 'Kết nối gián đoạn, đang kết nối lại…';
      this.refresh();
    };
    source.addEventListener('message', (event: MessageEvent<string>) => {
      const message = JSON.parse(event.data) as ChatMessage;
      this.messages = this.messages.filter(
        (m) =>
          m.id !== message.id &&
          (!message.clientMessageId || m.clientMessageId !== message.clientMessageId),
      );
      this.messages.push(message);
      this.refresh();
    });
    source.addEventListener('delta', (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as { messageId: string; text: string };
      let message = this.messages.find((m) => m.id === data.messageId);
      if (!message) {
        message = {
          id: data.messageId,
          role: 'STREAM',
          text: '',
          createdAt: new Date().toISOString(),
        };
        this.messages.push(message);
      }
      message.text += data.text;
      this.refresh();
    });
    source.addEventListener('discard_delta', (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as { messageId: string };
      this.messages = this.messages.filter((m) => m.id !== data.messageId);
      this.refresh();
    });
    source.addEventListener('sources', (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as {
        messageId: string;
        items: NonNullable<ChatMessage['sources']>;
      };
      const message = this.messages.find((item) => item.id === data.messageId);
      if (message) message.sources = data.items;
      this.refresh();
    });
    source.addEventListener('state', (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as Conversation;
      this.status = data.status;
      this.refresh();
    });
    source.addEventListener('processing', (event: MessageEvent<string>) => {
      this.isTyping = (JSON.parse(event.data) as { active: boolean }).active;
      if (!this.isTyping) this.messages = this.messages.filter((m) => m.role !== 'STREAM');
      this.refresh();
    });
    source.addEventListener('stream_error', () => {
      source.close();
      this.source = undefined;
      this.connected = false;
      this.error = 'Kết nối hỗ trợ tạm gián đoạn. Nhấn Kết nối lại để tiếp tục.';
      this.refresh();
    });
    this.refresh();
  }
  sendSuggestion(text: string) {
    this.userInput = text;
    void this.sendMessage();
  }
  async sendMessage() {
    const text = this.userInput.trim();
    if (!text || this.sending || this.isTyping || this.status === 'CLOSED') return;
    this.sending = true;
    this.error = '';
    try {
      await this.initialize();
      if (this.status === 'CLOSED' || this.isTyping) return;
      if (!this.pending || this.pending.text !== text)
        this.pending = { text, clientMessageId: crypto.randomUUID() };
      const request = this.pending;
      this.userInput = '';
      if (!this.messages.some((m) => m.clientMessageId === request.clientMessageId))
        this.messages.push({
          id: request.clientMessageId,
          clientMessageId: request.clientMessageId,
          role: 'CUSTOMER',
          text,
          createdAt: new Date().toISOString(),
        });
      this.isTyping = this.status !== 'QUEUED' && this.status !== 'ASSIGNED';
      this.refresh();
      await this.request(`/conversations/${this.conversationId}/messages`, request);
      this.pending = undefined;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Chưa gửi được tin nhắn. Hãy thử lại.';
      this.userInput = text;
    } finally {
      this.sending = false;
      this.isTyping = false;
      this.refresh();
    }
  }
  newConversation() {
    if (this.sending) return;
    this.source?.close();
    this.source = undefined;
    sessionStorage.removeItem(this.storageKey);
    this.conversationId = '';
    this.messages = [];
    this.pending = undefined;
    this.connected = false;
    this.status = 'BOT';
    void this.connect();
  }
  async resumeChat() {
    if (
      this.sending ||
      this.isTyping ||
      !['QUEUED', 'AWAITING_CONFIRMATION', 'RESOLVED'].includes(this.status)
    )
      return;
    this.sending = true;
    this.error = '';
    try {
      const result = await this.request<{ status: string }>(
        `/conversations/${this.conversationId}/resume`,
        {},
      );
      this.status = result.status;
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : 'Chưa quay lại được trợ lý. Vui lòng thử lại.';
    } finally {
      this.sending = false;
      this.refresh();
    }
  }
  async confirmHandoff() {
    if (this.sending || this.isTyping || this.status !== 'AWAITING_CONFIRMATION') return;
    this.sending = true;
    this.error = '';
    try {
      const result = await this.request<{ status: string }>(
        `/conversations/${this.conversationId}/handoff/confirm`,
        {},
      );
      this.status = result.status;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Chưa chuyển được yêu cầu hỗ trợ.';
    } finally {
      this.sending = false;
      this.refresh();
    }
  }
  time(value: string) {
    return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  ngAfterViewChecked() {
    const el = this.chatScrollContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.source?.close();
  }
  private refresh() {
    if (!this.destroyed) this.cdr.detectChanges();
  }
}
