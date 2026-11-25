import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { AdminSessionService } from '../../../../core/services/admin-session.service';
import { SupportApiService } from './services/support-api.service';
import { SupportWorkspaceService } from './services/support-workspace.service';
import { CustomerSupport } from './support';

type QueueCall = { lane: string; page: number; search: string; category: string; priority: string };

function build() {
  // Màn hỗ trợ hỏi matchMedia để biết đang ở khổ hẹp hay rộng; môi trường test
  // không có sẵn hàm này nên phải cung cấp bản giả trả về khổ rộng.
  (window as unknown as { matchMedia: unknown }).matchMedia = () => ({
    matches: false,
    media: '',
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  });
  const calls: QueueCall[] = [];
  let resolveNext: ((value: unknown) => void) | null = null;
  const result = (page = 1) => ({
    items: [],
    pagination: { page, pageSize: 20, total: 0, totalPages: 1 },
    statistics: {},
    counts: { ALL: 0, QUEUED: 0, MINE: 0, ASSIGNED: 0, RESOLVED: 0, CLOSED: 0 },
  });
  const api = {
    queue: (lane: string, page: number, search: string, category: string, priority: string) => {
      calls.push({ lane, page, search, category, priority });
      if (resolveNext) {
        const hold = new Promise((resolve) => (resolveNext = resolve));
        return hold;
      }
      return Promise.resolve(result(page));
    },
    agent: async () => null,
    detail: async () => null,
  };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [CustomerSupport],
    providers: [
      { provide: SupportApiService, useValue: api },
      { provide: AdminSessionService, useValue: { account: () => ({ id: 'NV001', name: 'Nguyễn Minh Quân' }) } },
      { provide: Router, useValue: { navigate: () => Promise.resolve(true), navigateByUrl: () => Promise.resolve(true) } },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { queryParamMap: { get: () => null }, paramMap: { get: () => null } },
          queryParamMap: of({ get: () => null }),
          paramMap: of({ get: () => null }),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(CustomerSupport);
  const page = fixture.componentInstance;
  const workspace = TestBed.inject(SupportWorkspaceService);
  calls.length = 0; // bỏ qua lần tải khi khởi tạo
  return { page, calls, workspace, result };
}

describe('Admin support inbox', () => {
  it('marks urgent and high priority differently from the rest', () => {
    const { page } = build();
    expect(page.priorityVariant('KhanCap')).toBe('danger');
    expect(page.priorityVariant('Cao')).toBe('warning');
    expect(page.priorityVariant('ThapNhat')).toBe('neutral');
    expect(page.priorityVariant(undefined)).toBe('neutral');
  });

  it('sends an empty filter to the API instead of the word "all"', async () => {
    const { page, calls } = build();
    page.category = 'all';
    page.priority = 'all';
    await page.loadQueue();
    expect(calls.at(-1)?.category).toBe('');
    expect(calls.at(-1)?.priority).toBe('');
    page.category = 'ThanhToan';
    page.priority = 'KhanCap';
    await page.loadQueue();
    expect(calls.at(-1)?.category).toBe('ThanhToan');
    expect(calls.at(-1)?.priority).toBe('KhanCap');
  });

  it('goes back to the first page when the lane changes', async () => {
    const { page, calls } = build();
    page.page = 4;
    page.changeLane('RESOLVED');
    await Promise.resolve();
    expect(page.lane()).toBe('RESOLVED');
    expect(calls.at(-1)?.lane).toBe('RESOLVED');
    expect(calls.at(-1)?.page).toBe(1);
  });

  it('clears the search and both filters, then reloads the queue', async () => {
    const { page, calls } = build();
    page.search = 'hoàn tiền';
    page.category = 'ThanhToan';
    page.priority = 'Cao';
    page.clearFilters();
    await Promise.resolve();
    expect(page.search).toBe('');
    expect(page.category).toBe('all');
    expect(page.priority).toBe('all');
    expect(calls.at(-1)?.search).toBe('');
  });

  it('asks the API for the page the user clicked', async () => {
    const { page, calls } = build();
    page.goToPage(3);
    await Promise.resolve();
    expect(calls.at(-1)?.page).toBe(3);
  });

  it('labels a tab by what the agent has to do next', () => {
    const { page } = build();
    page.agent.set({ id: 'NV001', name: 'Nguyễn Minh Quân' } as never);
    const tab = (over: Record<string, unknown>) =>
      ({ id: 'HT001', status: 'ASSIGNED', assignedAgentId: 'NV001', lastRole: 'CUSTOMER', ...over }) as never;
    expect(page.tabLabel(tab({}))).toBe('Cần trả lời');
    expect(page.tabLabel(tab({ lastRole: 'AGENT' }))).toBe('Chờ khách');
    // Hội thoại của người khác thì chỉ hiện nhãn trạng thái chung.
    expect(page.tabLabel(tab({ assignedAgentId: 'NV999' }))).not.toBe('Cần trả lời');
  });

  it('shows the new-message label ahead of every other tab label', () => {
    const { page, workspace } = build();
    page.agent.set({ id: 'NV001', name: 'Nguyễn Minh Quân' } as never);
    const tab = { id: 'HT001', status: 'ASSIGNED', assignedAgentId: 'NV001', lastRole: 'CUSTOMER' } as never;
    const original = workspace.unread.bind(workspace);
    workspace.unread = () => true;
    expect(page.tabLabel(tab)).toBe('Tin mới');
    workspace.unread = original;
  });
});
