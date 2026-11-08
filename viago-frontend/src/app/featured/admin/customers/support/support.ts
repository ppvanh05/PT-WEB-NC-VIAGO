import { AdminTabs } from '../../../../shared/components/admin-tabs/admin-tabs';
import { AdminPageHeader } from '../../../../shared/components/admin-page-header/admin-page-header';
import {
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SidebarStateService } from '../../../../core/services/sidebar-state.service';
import { SupportIcon } from './components/support-icon';
import { Button } from '../../../../shared/components/button/button';
import { Card } from '../../../../shared/components/card/card';
import { Badge } from '../../../../shared/components/badge/badge';
import { Input } from '../../../../shared/components/input/input';
import { Select } from '../../../../shared/components/input/select/select';
import { Textarea } from '../../../../shared/components/input/textarea/textarea';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { Toast } from '../../../../shared/components/toast/toast';
import { SupportApiService } from './services/support-api.service';
import { SupportWorkspaceService } from './services/support-workspace.service';
import { AdminSessionService } from '../../../../core/services/admin-session.service';
import {
  categories,
  priorities,
  statuses,
  type ConversationDetail,
  type InboxConversation,
  type InboxLane,
  type InboxResponse,
  type SupportAgent,
  type WorkspaceTab,
} from './models/support.models';

@Component({
  selector: 'app-customer-support',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SupportIcon,
    Button,
    Card,
    Badge,
    Input,
    Select,
    Textarea,
    Pagination,
    ModalComponent,
    Toast,
    AdminPageHeader,
    AdminTabs,
  ],
  templateUrl: './support.html',
  styleUrl: './support.css',
})
export class CustomerSupport implements OnInit, OnDestroy {
  private readonly api = inject(SupportApiService);
  readonly workspace = inject(SupportWorkspaceService);
  private readonly session = inject(AdminSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sidebar = inject(SidebarStateService);
  readonly sidebarCollapsed = this.sidebar.isCollapsed;
  toggleNavigation() {
    this.sidebar.toggle();
  }
  closeNavigation() {
    this.sidebar.collapse();
  }
  private readonly compactViewport = matchMedia('(max-width: 900px)');
  private autoCollapsed = false;
  private readonly fitSidebar = () => {
    if (this.compactViewport.matches && !this.sidebar.isCollapsed()) {
      this.autoCollapsed = true;
      this.sidebar.collapse();
    } else if (!this.compactViewport.matches && this.autoCollapsed) {
      this.autoCollapsed = false;
      this.sidebar.expand();
    }
  };

  @ViewChild('messageList') private messageList?: ElementRef<HTMLElement>;
  readonly agent = signal<SupportAgent | null>(null);
  readonly agents = signal<SupportAgent[]>([]);
  readonly initializing = signal(true);

  readonly queueBusy = signal(false);
  readonly detailBusy = signal(false);
  readonly busyConversations = signal<string[]>([]);
  readonly actionBusy = computed(() => this.busyConversations().includes(this.selectedId()));
  readonly historyBusy = signal(false);
  private readonly aiConversations = signal<string[]>([]);
  readonly aiBusy = computed(() => this.aiConversations().includes(this.selectedId()));
  readonly error = signal('');
  readonly notice = signal('');

  readonly inbox = signal<InboxResponse | null>(null);
  readonly detail = signal<ConversationDetail | null>(null);
  readonly selectedId = signal('');
  readonly lane = signal<InboxLane>('QUEUED');
  readonly showInfo = signal(false);
  readonly suggestion = signal('');
  readonly finishMode = signal<'resolve' | 'close' | null>(null);
  readonly lastSync = signal<Date | null>(null);
  readonly canReply = computed(
    () =>
      this.detail()?.status === 'ASSIGNED' && this.detail()?.assignedAgentId === this.agent()?.id,
  );
  readonly transferOptions = computed(() =>
    this.agents()
      .filter((a) => a.id !== this.agent()?.id)
      .map((a) => ({ label: a.name, value: a.id })),
  );
  readonly categorySelect = [
    { value: 'all', label: 'Tất cả vấn đề' },
    ...Object.entries(categories).map(([value, label]) => ({ value, label })),
  ];
  readonly prioritySelect = [
    { value: 'all', label: 'Tất cả mức ưu tiên' },
    ...Object.entries(priorities).map(([value, label]) => ({ value, label })),
  ];
  readonly categories = categories;
  readonly priorities = priorities;
  readonly statuses = statuses;
  readonly categoryOptions = Object.entries(categories);
  readonly priorityOptions = Object.entries(priorities);
  readonly lanes: { id: InboxLane; label: string; icon: string }[] = [
    { id: 'QUEUED', label: 'Chờ tiếp nhận', icon: 'inbox' },
    { id: 'MINE', label: 'Của tôi', icon: 'user' },
    { id: 'ASSIGNED', label: 'Đang hỗ trợ', icon: 'chat' },
    { id: 'RESOLVED', label: 'Đã giải quyết', icon: 'check' },
    { id: 'CLOSED', label: 'Đã đóng', icon: 'close' },
    { id: 'ALL', label: 'Tất cả', icon: 'inbox' },
  ];
  readonly summaryCards = this.lanes.filter((tab) =>
    ['QUEUED', 'ASSIGNED', 'RESOLVED', 'CLOSED'].includes(tab.id),
  );
  readonly templates = [
    {
      label: 'Chào khách',
      text: 'Chào anh/chị, em là nhân viên CSKH VIAGO. Em đã xem nội dung trao đổi với trợ lý và sẽ tiếp tục hỗ trợ anh/chị ạ.',
    },
    {
      label: 'Kiểm tra vé',
      text: 'Anh/chị vui lòng cung cấp mã đặt chỗ hoặc mã vé cùng số điện thoại đặt vé để em kiểm tra chính xác ạ. Anh/chị không cần gửi mật khẩu hay mã OTP.',
    },
    {
      label: 'Sự cố thanh toán',
      text: 'Anh/chị vui lòng cung cấp mã đơn, thời điểm và số tiền đã thanh toán để em đối chiếu giao dịch. Anh/chị vui lòng che các thông tin ngân hàng không liên quan ạ.',
    },
    {
      label: 'Xác nhận hỗ trợ',
      text: 'Anh/chị còn cần VIAGO hỗ trợ thêm nội dung nào liên quan đến yêu cầu này không ạ?',
    },
  ];

  search = '';
  category = 'all';
  priority = 'all';
  page = 1;
  reply = '';
  translate = false;
  targetAgent = '';
  resolution = '';
  private timer?: ReturnType<typeof setInterval>;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private tick = 0;
  private destroyed = false;
  private queueVersion = 0;
  private detailVersion = 0;
  private operatorVersion = 0;
  private readonly cache = new Map<string, ConversationDetail>();
  private workspaceBusy = false;
  private scrollTimer?: ReturnType<typeof setTimeout>;

  async ngOnInit() {
    this.fitSidebar();
    this.compactViewport.addEventListener('change', this.fitSidebar);
    await this.loadInbox();
    this.timer = setInterval(() => {
      if (this.destroyed || document.hidden) return;
      if (!this.workspaceBusy) void this.refreshWorkspace();
      if (!this.actionBusy() && !this.detailBusy() && this.selectedId()) void this.loadDetail(true);
      if (++this.tick % 3 === 0 && !this.queueBusy()) void this.loadQueue(true);
    }, 5000);
  }
  ngOnDestroy() {
    this.stashCurrent();
    this.compactViewport.removeEventListener('change', this.fitSidebar);
    if (this.autoCollapsed) this.sidebar.expand();
    this.destroyed = true;
    this.queueVersion++;
    this.detailVersion++;
    this.operatorVersion++;
    clearInterval(this.timer);
    clearTimeout(this.searchTimer);
    clearTimeout(this.scrollTimer);
  }
  private handleError(error: unknown) {
    if (!this.destroyed)
      this.error.set(
        error instanceof Error
          ? error.message
          : 'Chưa kết nối được dịch vụ hỗ trợ. Vui lòng thử lại.',
      );
  }
  async loadInbox() {
    this.initializing.set(true);
    try {
      const context = await this.api.context();
      if (this.destroyed) return;
      this.agents.set(context.agents);
      this.agent.set(context.agent);
      this.workspace.activate(this.session.account()?.id || context.agent!.id);
      await Promise.all([this.loadQueue(), this.refreshWorkspace()]);
      const id =
        this.selectedId() ||
        this.route.snapshot.queryParamMap.get('conversation') ||
        this.workspace.activeId() ||
        this.workspace.tabs()[0]?.id;
      if (id && /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id)) await this.selectConversation(id);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.initializing.set(false);
    }
  }
  async refreshWorkspace() {
    if (!this.agent() || this.workspaceBusy) return;
    this.workspaceBusy = true;
    try {
      const result = await this.api.workspace(this.workspace.tabs().map((tab) => tab.id));
      if (this.destroyed) return;
      this.workspace.ingest(result.data, this.agent()!.id);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.workspaceBusy = false;
    }
  }
  tabLabel(tab: WorkspaceTab) {
    if (this.workspace.unread(tab)) return 'Tin mới';
    if (tab.status === 'ASSIGNED' && tab.assignedAgentId === this.agent()?.id)
      return tab.lastRole === 'CUSTOMER' ? 'Cần trả lời' : 'Chờ khách';
    return this.statuses[tab.status] || 'Đang tải…';
  }
  private stashCurrent() {
    if (!this.session.account()) return;
    const id = this.selectedId();
    if (!id) return;
    const viewport = this.detail()?.id === id ? this.messageList?.nativeElement : undefined;
    this.workspace.save(id, {
      text: this.reply,
      translate: this.translate,
      suggestion: this.suggestion(),
      ...(viewport ? { scrollTop: viewport.scrollTop } : {}),
    });
    if (this.detail()?.id === id) this.cache.set(id, this.detail()!);
  }
  private restoreDraft(id: string) {
    const draft = this.workspace.draft(id);
    this.reply = draft.text;
    this.translate = draft.translate;
    this.suggestion.set(draft.suggestion);
  }
  closeTab(id: string) {
    this.stashCurrent();
    const tabs = this.workspace.tabs(),
      index = tabs.findIndex((tab) => tab.id === id);
    this.workspace.close(id);
    if (id !== this.selectedId()) return;
    const next = this.workspace.tabs()[Math.min(index, this.workspace.tabs().length - 1)];
    this.selectedId.set('');
    this.detail.set(null);
    this.detailVersion++;
    if (next) void this.selectConversation(next.id);
    else this.backToList();
  }
  messagesScrolled() {
    clearTimeout(this.scrollTimer);
    this.markCurrentRead();
    this.scrollTimer = setTimeout(() => {
      this.stashCurrent();
    }, 150);
  }
  private markCurrentRead() {
    const detail = this.detail(),
      viewport = this.messageList?.nativeElement;
    if (
      !document.hidden &&
      detail &&
      detail.id === this.selectedId() &&
      viewport &&
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100
    )
      this.workspace.markRead(detail.id, detail.messages.at(-1)?.sequence || 0);
  }
  private setBusy(id: string, busy: boolean) {
    this.busyConversations.update((ids) =>
      busy ? [...new Set([...ids, id])] : ids.filter((value) => value !== id),
    );
  }
  private async refreshConversation(id: string) {
    if (this.selectedId() === id) await this.loadDetail(true);
    else {
      const result = await this.api.detail(id);
      if (this.destroyed) return;
      this.cache.set(id, result);
      this.workspace.ingest([result], this.agent()!.id);
    }
  }
  clearFilters() {
    this.search = '';
    this.category = 'all';
    this.priority = 'all';
    this.filterChanged();
  }
  goToPage(page: number) {
    this.page = page;
    void this.loadQueue();
  }
  priorityVariant(priority?: string) {
    return priority === 'KhanCap' ? 'danger' : priority === 'Cao' ? 'warning' : 'neutral';
  }
  async loadQueue(quiet = false) {
    const version = ++this.queueVersion;
    this.queueBusy.set(true);
    if (!quiet) this.error.set('');
    try {
      const result = await this.api.queue(
        this.lane(),
        this.page,
        this.search,
        this.category === 'all' ? '' : this.category,
        this.priority === 'all' ? '' : this.priority,
      );
      if (this.destroyed || version !== this.queueVersion) return;
      this.inbox.set(result);
      this.page = result.pagination.page;
      this.lastSync.set(new Date());
    } catch (error) {
      if (version === this.queueVersion) this.handleError(error);
    } finally {
      if (version === this.queueVersion) this.queueBusy.set(false);
    }
  }
  changeLane(lane: InboxLane) {
    this.lane.set(lane);
    this.page = 1;
    void this.loadQueue();
  }
  filterChanged() {
    this.page = 1;
    void this.loadQueue();
  }
  searchChanged() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.filterChanged(), 350);
  }
  changePage(delta: number) {
    this.page = Math.max(1, Math.min(this.inbox()?.pagination.totalPages || 1, this.page + delta));
    void this.loadQueue();
  }
  async selectConversation(id: string) {
    if (this.finishMode()) return;
    if (id === this.selectedId()) {
      await this.loadDetail(true);
      return;
    }
    this.stashCurrent();
    clearTimeout(this.scrollTimer);
    const row = this.inbox()?.data.find((row) => row.id === id) || this.cache.get(id);
    const tab = this.workspace.tabs().find((value) => value.id === id);
    if (tab && this.workspace.unread(tab)) this.workspace.save(id, { scrollTop: null });
    if (!this.workspace.open(id, row)) {
      this.error.set(
        'Bạn đang mở 100 cuộc trò chuyện. Hãy ẩn bớt một tab để mở thêm; bản nháp vẫn được giữ.',
      );
      return;
    }
    this.selectedId.set(id);
    this.detail.set(this.cache.get(id) || null);
    this.restoreDraft(id);
    this.targetAgent = '';
    this.detailVersion++;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { conversation: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    await this.loadDetail();
  }
  backToList() {
    this.stashCurrent();
    clearTimeout(this.scrollTimer);
    this.selectedId.set('');
    this.detail.set(null);
    this.detailVersion++;
    this.detailBusy.set(false);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { conversation: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  async loadDetail(quiet = false) {
    const id = this.selectedId();
    if (!id) return;
    const version = ++this.detailVersion;
    this.detailBusy.set(true);
    const viewport = this.messageList?.nativeElement;
    const nearBottom =
      !viewport || viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;
    try {
      const result = await this.api.detail(id);
      if (this.destroyed || !this.session.account()) return;
      this.cache.set(id, result);
      this.workspace.ingest([result], this.agent()!.id);
      if (this.destroyed || id !== this.selectedId() || version !== this.detailVersion) return;
      const old = this.detail();
      const older =
        old?.messages.filter((m) => m.sequence < (result.messages[0]?.sequence ?? Infinity)) || [];
      this.detail.set({
        ...result,
        messages: [...older, ...result.messages],
        hasOlder: older.length ? old!.hasOlder : result.hasOlder,
      });
      if (!quiet) this.error.set('');
      const savedScroll = this.workspace.draft(id).scrollTop;
      if (nearBottom || !quiet)
        setTimeout(() => {
          if (this.selectedId() !== id || version !== this.detailVersion) return;
          const el = this.messageList?.nativeElement;
          if (el) el.scrollTop = !quiet && savedScroll !== null ? savedScroll : el.scrollHeight;
          this.markCurrentRead();
        });
    } catch (error) {
      if (id === this.selectedId() && version === this.detailVersion) this.handleError(error);
    } finally {
      if (version === this.detailVersion) this.detailBusy.set(false);
    }
  }
  async loadOlder() {
    const current = this.detail();
    if (!current?.hasOlder || this.historyBusy()) return;
    this.historyBusy.set(true);
    const viewport = this.messageList?.nativeElement;
    const height = viewport?.scrollHeight || 0;
    try {
      const result = await this.api.detail(current.id, current.messages[0]?.sequence);
      if (this.selectedId() !== current.id || this.destroyed) return;
      this.detail.update(
        (value) =>
          value && {
            ...value,
            hasOlder: result.hasOlder,
            messages: [
              ...result.messages,
              ...value.messages.filter((m) => !result.messages.some((older) => older.id === m.id)),
            ],
          },
      );
      setTimeout(() => {
        if (viewport && this.selectedId() === current.id)
          viewport.scrollTop += viewport.scrollHeight - height;
      });
    } catch (error) {
      this.handleError(error);
    } finally {
      this.historyBusy.set(false);
    }
  }
  saveDraft() {
    if (this.selectedId())
      this.workspace.save(this.selectedId(), {
        text: this.reply,
        translate: this.translate,
        suggestion: this.suggestion(),
      });
  }
  useTemplate(text: string) {
    this.reply = this.reply.trim() ? this.reply + '\n\n' + text : text;
    this.saveDraft();
  }
  async action(action: 'claim' | 'release' | 'reassign' | 'resolve' | 'close', body: object = {}) {
    const id = this.selectedId();
    if (!id || this.actionBusy()) return;
    this.setBusy(id, true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.api.action(id, action, body);
      if (this.destroyed || !this.session.account()) return;
      this.finishMode.set(null);
      this.resolution = '';
      if (id === this.selectedId()) this.targetAgent = '';
      this.notice.set(
        action === 'claim'
          ? 'Bạn đã tiếp nhận hội thoại.'
          : action === 'release'
            ? 'Đã trả hội thoại về hàng chờ.'
            : action === 'reassign'
              ? 'Đã chuyển người phụ trách.'
              : action === 'close'
                ? 'Đã đóng hội thoại.'
                : 'Đã lưu kết quả giải quyết.',
      );
      await Promise.all([
        this.refreshConversation(id),
        this.loadQueue(true),
        this.refreshWorkspace(),
      ]);
    } catch (error) {
      this.handleError(error);
      try {
        await this.refreshConversation(id);
      } catch {
        /* The next workspace poll will retry. */
      }
    } finally {
      this.setBusy(id, false);
    }
  }
  async send() {
    const text = this.reply.trim(),
      id = this.selectedId();
    if (!text || text.length > 4000 || !this.canReply() || this.actionBusy()) return;
    this.stashCurrent();
    const translate = this.translate ? 'customer' : 'original';
    let pending = this.workspace.draft(id).pending;
    if (!pending || pending.text !== text || pending.translate !== translate)
      pending = { text, clientMessageId: crypto.randomUUID(), translate };
    this.workspace.save(id, { pending });
    this.setBusy(id, true);
    this.error.set('');
    try {
      await this.api.action(id, 'messages', pending);
      if (this.destroyed || !this.session.account()) return;
      const saved = this.workspace.draft(id);
      this.workspace.save(id, {
        pending: undefined,
        ...(saved.text.trim() === text ? { text: '', suggestion: '' } : {}),
      });
      if (this.selectedId() === id) this.restoreDraft(id);
      await Promise.all([
        this.refreshConversation(id),
        this.loadQueue(true),
        this.refreshWorkspace(),
      ]);
    } catch (error) {
      this.handleError(error);
      try {
        await this.refreshConversation(id);
      } catch {
        /* Keep the saved draft and retry identifier. */
      }
    } finally {
      this.setBusy(id, false);
    }
  }
  async generateDraft() {
    const id = this.selectedId(),
      operator = this.operatorVersion;
    if (!this.canReply() || this.aiBusy()) return;
    this.aiConversations.update((ids) => [...ids, id]);
    this.error.set('');
    try {
      const draft = await this.api.draft(id);
      if (!this.destroyed && this.session.account() && operator === this.operatorVersion) {
        this.workspace.save(id, { suggestion: draft.text });
        if (id === this.selectedId()) this.suggestion.set(draft.text);
      }
    } catch (error) {
      this.handleError(error);
    } finally {
      this.aiConversations.update((ids) => ids.filter((value) => value !== id));
    }
  }
  openFinish(mode: 'resolve' | 'close') {
    this.resolution = '';
    this.finishMode.set(mode);
  }
  closeFinish() {
    if (this.actionBusy()) return;
    this.finishMode.set(null);
  }
  finish() {
    const mode = this.finishMode();
    if (mode && this.resolution.trim().length >= 3)
      void this.action(mode, { resolution: this.resolution.trim() });
  }
  messageKey(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void this.send();
    }
  }
  code(id: string) {
    return id.length > 14 ? id.slice(0, 2) + '…' + id.slice(-8) : id;
  }
  customerLabel(row: InboxConversation) {
    return 'Khách ' + row.id.slice(-6);
  }
  waiting(row: InboxConversation) {
    return ['QUEUED', 'ASSIGNED'].includes(row.status) && row.lastMessage?.role === 'CUSTOMER';
  }
}
