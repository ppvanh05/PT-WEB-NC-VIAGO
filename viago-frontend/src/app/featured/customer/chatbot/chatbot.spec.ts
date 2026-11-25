import { TestBed } from '@angular/core/testing';
import { Chatbot } from './chatbot';

interface Call { path: string; body: unknown }

/** EventSource giả: ghi lại các trình nghe để test tự phát sự kiện của máy chủ. */
class FakeEventSource {
  static last: FakeEventSource | null = null;
  static opened = 0;
  readonly listeners = new Map<string, ((event: MessageEvent<string>) => void)[]>();
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    FakeEventSource.last = this;
    FakeEventSource.opened++;
  }

  addEventListener(name: string, handler: (event: MessageEvent<string>) => void) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), handler]);
  }

  close() { this.closed = true; }

  /** Giả lập máy chủ đẩy một sự kiện xuống trình duyệt. */
  emit(name: string, data: unknown) {
    for (const handler of this.listeners.get(name) ?? []) {
      handler({ data: JSON.stringify(data) } as MessageEvent<string>);
    }
  }
}

const message = (over: Record<string, unknown> = {}) => ({
  id: 'TN001',
  text: 'Chào bạn, VIAGO có thể giúp gì?',
  role: 'ASSISTANT',
  createdAt: '2026-06-18T03:00:00.000Z',
  ...over,
});

/**
 * Dựng hộp chat với fetch và EventSource giả.
 * `snapshot` là hội thoại máy chủ trả về; `fail` là phần đường dẫn sẽ trả lỗi.
 */
function build(snapshot: Record<string, unknown> = {}, fail = '', failMessage = 'Dịch vụ hỗ trợ đang bảo trì.') {
  const calls: Call[] = [];
  const conversation = {
    id: 'HT001',
    status: 'BOT',
    processing: false,
    messages: [message()],
    cursor: 7,
    ...snapshot,
  };
  FakeEventSource.last = null;
  FakeEventSource.opened = 0;
  sessionStorage.clear();
  (globalThis as unknown as { EventSource: unknown }).EventSource = FakeEventSource;
  (globalThis as unknown as { fetch: unknown }).fetch = async (url: string, init?: { body?: string }) => {
    const path = url.replace('/api/customer/chatbot', '');
    calls.push({ path, body: init?.body ? JSON.parse(init.body) : undefined });
    if (fail && path.includes(fail)) {
      return { ok: false, json: async () => ({ message: failMessage }) };
    }
    if (path === '/conversations') return { ok: true, json: async () => ({ id: 'HT001' }) };
    if (path.includes('/resume')) return { ok: true, json: async () => ({ status: 'BOT' }) };
    if (path.includes('/handoff/confirm')) return { ok: true, json: async () => ({ status: 'QUEUED' }) };
    if (path.includes('/messages')) return { ok: true, json: async () => ({ ok: true }) };
    return { ok: true, json: async () => conversation };
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [Chatbot] });
  const fixture = TestBed.createComponent(Chatbot);
  fixture.detectChanges();
  return { page: fixture.componentInstance, fixture, calls };
}

const stream = () => FakeEventSource.last!;

describe('Customer support chatbot', () => {
  it('tells the customer who is on the other side for every state of the chat', () => {
    const { page } = build();
    expect(page.statusLabel).toBe('Đang kết nối…');
    page.connected = true;
    const label = (status: string) => { page.status = status; return page.statusLabel; };
    expect(label('BOT')).toBe('Trợ lý VIAGO');
    expect(label('QUEUED')).toBe('Đang chờ CSKH tiếp nhận');
    expect(label('ASSIGNED')).toBe('CSKH đang hỗ trợ');
    expect(label('AWAITING_CONFIRMATION')).toBe('Bạn muốn gặp nhân viên hỗ trợ?');
    expect(label('RESOLVED')).toContain('Đã giải quyết');
    expect(label('CLOSED')).toBe('Hội thoại đã đóng');
  });

  it('opens a conversation the first time the box is opened and remembers it for the visit', async () => {
    const { page, calls } = build();
    expect(page.isOpen).toBe(false);
    page.toggleChat();
    await page.connect();
    expect(page.isOpen).toBe(true);
    expect(calls[0]).toEqual({ path: '/conversations', body: { language: 'vi' } });
    expect(sessionStorage.getItem('viago-support-conversation')).toBe('HT001');
    expect(page.messages).toHaveLength(1);
    expect(stream().url).toContain('after=7');
    page.toggleChat();
    expect(page.isOpen).toBe(false);
  });

  it('picks up the conversation of the visit instead of starting a new one', async () => {
    const { page, calls } = build();
    sessionStorage.setItem('viago-support-conversation', 'HT009');
    await page.connect();
    expect(calls.some(c => c.path === '/conversations')).toBe(false);
    expect(calls[0].path).toBe('/conversations/HT009');
    expect(page.messages).toHaveLength(1);
  });

  it('opens only one live connection however often connect is called', async () => {
    const { page } = build();
    await page.connect();
    stream().onopen!();
    await page.connect();
    await page.connect();
    expect(FakeEventSource.opened).toBe(1);
  });

  it('says so when the support service cannot be reached at all', async () => {
    const { page } = build({}, '/conversations');
    await page.connect();
    expect(page.error).toContain('Chưa kết nối được bộ phận hỗ trợ');
    expect(page.connected).toBe(false);
  });

  it('reports a saved conversation that the server will no longer open', async () => {
    const { page } = build({}, '/conversations/HT001', 'Hội thoại không còn tồn tại.');
    sessionStorage.setItem('viago-support-conversation', 'HT001');
    await page.connect();
    expect(page.error).toBe('Chưa kết nối được bộ phận hỗ trợ. Vui lòng thử lại.');
  });

  it('shows the connection as live, then as broken when it drops', async () => {
    const { page } = build();
    await page.connect();
    stream().onopen!();
    expect(page.connected).toBe(true);
    expect(page.error).toBe('');
    stream().onerror!();
    expect(page.connected).toBe(false);
    expect(page.error).toContain('gián đoạn');
  });

  it('adds a message the server sends and never shows it twice', async () => {
    const { page } = build();
    await page.connect();
    stream().emit('message', message({ id: 'TN002', text: 'Bạn cần tra cứu vé nào?' }));
    expect(page.messages.map(m => m.id)).toEqual(['TN001', 'TN002']);
    stream().emit('message', message({ id: 'TN002', text: 'Bạn cần tra cứu vé nào?' }));
    expect(page.messages.map(m => m.id)).toEqual(['TN001', 'TN002']);
  });

  it('replaces the copy shown while sending with the one the server stored', async () => {
    const { page, calls } = build();
    page.userInput = 'Tôi muốn đổi vé';
    await page.sendMessage();
    const sent = calls.find(c => c.path.includes('/messages'))!.body as { clientMessageId: string };
    expect(page.messages.filter(m => m.role === 'CUSTOMER')).toHaveLength(1);
    stream().emit('message', message({
      id: 'TN100', role: 'CUSTOMER', text: 'Tôi muốn đổi vé', clientMessageId: sent.clientMessageId,
    }));
    const mine = page.messages.filter(m => m.role === 'CUSTOMER');
    expect(mine).toHaveLength(1);
    expect(mine[0].id).toBe('TN100');
  });

  it('builds the reply piece by piece as the assistant types it', async () => {
    const { page } = build();
    await page.connect();
    stream().emit('delta', { messageId: 'TN050', text: 'Vé của bạn ' });
    stream().emit('delta', { messageId: 'TN050', text: 'khởi hành 07:30.' });
    const streaming = page.messages.find(m => m.id === 'TN050')!;
    expect(streaming.role).toBe('STREAM');
    expect(streaming.text).toBe('Vé của bạn khởi hành 07:30.');
  });

  it('drops a half-typed reply the server withdraws', async () => {
    const { page } = build();
    await page.connect();
    stream().emit('delta', { messageId: 'TN050', text: 'Để tôi kiểm tra' });
    stream().emit('discard_delta', { messageId: 'TN050' });
    expect(page.messages.some(m => m.id === 'TN050')).toBe(false);
  });

  it('attaches the pages the answer was taken from', async () => {
    const { page } = build();
    await page.connect();
    const items = [{ id: 'KB001', title: 'Chính sách hoàn vé', url: '/ho-tro/hoan-ve' }];
    stream().emit('sources', { messageId: 'TN001', items });
    expect(page.messages[0].sources).toEqual(items);
    // Nguồn của tin nhắn không có thì bỏ qua, không được lỗi.
    expect(() => stream().emit('sources', { messageId: 'KHONG-CO', items })).not.toThrow();
  });

  it('follows the state the server reports and clears the half-typed reply when it stops', async () => {
    const { page } = build();
    await page.connect();
    stream().emit('state', { status: 'QUEUED' });
    expect(page.status).toBe('QUEUED');
    stream().emit('processing', { active: true });
    expect(page.isTyping).toBe(true);
    stream().emit('delta', { messageId: 'TN050', text: 'Đang xem…' });
    stream().emit('processing', { active: false });
    expect(page.isTyping).toBe(false);
    expect(page.messages.some(m => m.role === 'STREAM')).toBe(false);
  });

  it('asks the customer to reconnect when the stream breaks for good', async () => {
    const { page } = build();
    await page.connect();
    const source = stream();
    source.emit('stream_error', {});
    expect(source.closed).toBe(true);
    expect(page.connected).toBe(false);
    expect(page.error).toContain('Kết nối hỗ trợ tạm gián đoạn');
  });

  it('shows the customer their own message at once and empties the box', async () => {
    const { page, calls } = build();
    page.userInput = '  Tôi muốn đổi vé  ';
    await page.sendMessage();
    const mine = page.messages.find(m => m.role === 'CUSTOMER')!;
    expect(mine.text).toBe('Tôi muốn đổi vé');
    expect(page.userInput).toBe('');
    const sent = calls.find(c => c.path.includes('/messages'))!.body as { text: string; clientMessageId: string };
    expect(sent.text).toBe('Tôi muốn đổi vé');
    expect(sent.clientMessageId).toBeTruthy();
    expect(page.sending).toBe(false);
  });

  it('sends nothing on an empty box or a closed conversation', async () => {
    const { page, calls } = build();
    page.userInput = '   ';
    await page.sendMessage();
    page.userInput = 'Còn ai không?';
    page.status = 'CLOSED';
    await page.sendMessage();
    expect(calls.some(c => c.path.includes('/messages'))).toBe(false);
    // Tin nhắn vẫn còn trong ô để khách không mất chữ đã nhập.
    expect(page.userInput).toBe('Còn ai không?');
  });

  it('gives back what was typed when the message does not go through', async () => {
    const { page } = build({}, '/messages', 'Máy chủ đang quá tải.');
    page.userInput = 'Tôi cần hỗ trợ';
    await page.sendMessage();
    expect(page.error).toBe('Máy chủ đang quá tải.');
    expect(page.userInput).toBe('Tôi cần hỗ trợ');
    expect(page.isTyping).toBe(false);
  });

  it('sends the same message once only, even after a failed attempt', async () => {
    const first = build({}, '/messages');
    first.page.userInput = 'Tôi cần hỗ trợ';
    await first.page.sendMessage();
    const failed = first.calls.find(c => c.path.includes('/messages'))!.body as { clientMessageId: string };
    await first.page.sendMessage();
    const again = first.calls.filter(c => c.path.includes('/messages')).at(-1)!.body as { clientMessageId: string };
    expect(again.clientMessageId).toBe(failed.clientMessageId);
    expect(first.page.messages.filter(m => m.role === 'CUSTOMER')).toHaveLength(1);
  });

  it('sends the message into the conversation that is open', async () => {
    const { page, calls } = build();
    sessionStorage.setItem('viago-support-conversation', 'HT009');
    await page.connect();
    page.userInput = 'Tôi cần hỗ trợ';
    await page.sendMessage();
    expect(calls.at(-1)!.path).toBe('/conversations/HT009/messages');
  });

  it('sends a suggested question just as a typed one', async () => {
    const { page, calls } = build();
    page.sendSuggestion('Chính sách hoàn/huỷ');
    // sendSuggestion gửi xong không trả về promise nên phải nhường lượt cho nó chạy.
    await new Promise(resolve => setTimeout(resolve));
    const sent = calls.find(c => c.path.includes('/messages'))!.body as { text: string };
    expect(sent.text).toBe('Chính sách hoàn/huỷ');
  });

  it('starts a conversation from scratch and forgets the old one', async () => {
    const { page } = build();
    await page.connect();
    const old = stream();
    page.newConversation();
    expect(old.closed).toBe(true);
    expect(page.status).toBe('BOT');
    expect(page.connected).toBe(false);
    // Hội thoại cũ bị quên hẳn rồi mở hội thoại mới trên kết nối mới.
    await new Promise(resolve => setTimeout(resolve));
    expect(sessionStorage.getItem('viago-support-conversation')).toBe('HT001');
    expect(FakeEventSource.opened).toBe(2);
    expect(page.messages).toHaveLength(1);
  });

  it('goes back to the assistant only from a state where that makes sense', async () => {
    const { page, calls } = build();
    await page.connect();
    page.status = 'ASSIGNED';
    await page.resumeChat();
    expect(calls.some(c => c.path.includes('/resume'))).toBe(false);
    page.status = 'RESOLVED';
    await page.resumeChat();
    expect(calls.some(c => c.path.includes('/resume'))).toBe(true);
    expect(page.status).toBe('BOT');
    expect(page.sending).toBe(false);
  });

  it('hands over to a member of staff only once the customer has confirmed it', async () => {
    const { page, calls } = build();
    await page.connect();
    page.status = 'BOT';
    await page.confirmHandoff();
    expect(calls.some(c => c.path.includes('/handoff/confirm'))).toBe(false);
    page.status = 'AWAITING_CONFIRMATION';
    await page.confirmHandoff();
    expect(page.status).toBe('QUEUED');
  });

  it('says so when the handover cannot be made', async () => {
    const { page } = build({}, '/handoff/confirm', 'Ngoài giờ làm việc.');
    await page.connect();
    page.status = 'AWAITING_CONFIRMATION';
    await page.confirmHandoff();
    expect(page.error).toBe('Ngoài giờ làm việc.');
    expect(page.status).toBe('AWAITING_CONFIRMATION');
  });

  it('stamps each message with the hour and minute it was sent', () => {
    const { page } = build();
    expect(page.time('2026-06-18T03:05:00.000Z')).toMatch(/^\d{2}:\d{2}$/);
  });

  it('closes the live connection when the customer leaves the page', async () => {
    const { page } = build();
    await page.connect();
    const source = stream();
    page.ngOnDestroy();
    expect(source.closed).toBe(true);
  });
});
