import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AdminSessionService } from '../../../../core/services/admin-session.service';
import { ContentManager } from './content-manager';
import { ContentKind, ContentRow } from './content.models';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
describe('Supabase-backed admin content', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ContentManager],
      providers: [
        provideRouter([]),
        {
          provide: AdminSessionService,
          useValue: {
            headers: () => ({ Authorization: 'Bearer test-session' }),
            invalidate: vi.fn(),
          },
        },
      ],
    }),
  );
  afterEach(() => vi.unstubAllGlobals());
  for (const kind of ['news', 'policies', 'promotions'] as ContentKind[]) {
    it('loads ' + kind + ' from its protected API with static summary cards', async () => {
      const row: ContentRow = {
        id: 'DB001',
        maCS: 'DB001',
        tieuDe: 'Database title',
        tenChinhSach: 'Database title',
        name: 'Database title',
        trangThai: 'Đang hiển thị',
        status: 'running',
      };
      const fetchMock = vi.fn(async (url: string) =>
        json(
          url.endsWith('/statistics')
            ? { total: 31 }
            : url.endsWith('/options')
              ? { memberTiers: [], routes: [] }
              : { data: [row], pagination: { total: 31, totalPages: 2 } },
        ),
      );
      vi.stubGlobal('fetch', fetchMock);
      const fixture = TestBed.createComponent(ContentManager),
        page = fixture.componentInstance;
      page.kind = kind;
      fixture.detectChanges();
      await vi.waitFor(() => expect(page.loaded()).toBe(true));
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Database title');
      expect(page.total()).toBe(31);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/' + kind + '?'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-session' }),
        }),
      );
      const summary = fixture.nativeElement.querySelector('.stats') as HTMLElement;
      expect(summary.querySelector('button,[role="button"],[tabindex="0"]')).toBeNull();
      const before = fetchMock.mock.calls.length;
      summary.querySelector('app-card')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(fetchMock).toHaveBeenCalledTimes(before);
      page.setPage(2);
      await vi.waitFor(() => expect(page.loading()).toBe(false));
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.anything());
    });
    it('persists ' + kind + ' edits using the server identifier', async () => {
      const fetchMock = vi.fn(async (url: string, options: RequestInit) =>
        json(
          options.method === 'PATCH'
            ? {}
            : url.endsWith('/statistics')
              ? { total: 1 }
              : { data: [], pagination: { total: 0, totalPages: 0 } },
        ),
      );
      vi.stubGlobal('fetch', fetchMock);
      const page = TestBed.createComponent(ContentManager).componentInstance;
      page.kind = kind;
      page.editing = { id: 'DB001', maCS: 'DB001' };
      Object.assign(page.draft, {
        title: 'Updated',
        category: kind === 'news' ? 'TinTucNhaXe' : 'BaoMat',
        status: kind === 'news' ? 'BanNhap' : 'running',
        content: '<p>Updated content</p>',
        summary: 'Updated summary',
        image: '/assets/customer/logo.png',
        effectiveDate: '2026-11-08',
        code: 'UPDATED10',
        value: '10000',
        start: '2026-11-08',
        end: '2026-12-31',
      });
      await page.save();
      const call = fetchMock.mock.calls.find(([, options]) => options.method === 'PATCH')!;
      expect(call[0]).toBe('/api/admin/' + kind + '/DB001');
      const body = JSON.parse(call[1].body as string);
      expect(body.maNhanVien).toBeUndefined();
      expect(body[kind === 'news' ? 'tieuDe' : kind === 'policies' ? 'tenChinhSach' : 'name']).toBe(
        'Updated',
      );
      expect(page.editorError()).toBe('');
    });
  }
  it('shows an API failure without inserting fallback records', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ message: 'Database unavailable' }, 503)),
    );
    const fixture = TestBed.createComponent(ContentManager),
      page = fixture.componentInstance;
    fixture.detectChanges();
    await vi.waitFor(() => expect(page.loading()).toBe(false));
    fixture.detectChanges();
    expect(page.rows()).toEqual([]);
    expect(page.loaded()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Database unavailable',
    );
  });
  it('retains editor input when saving to the API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ message: 'Validation rejected' }, 400)),
    );
    const page = TestBed.createComponent(ContentManager).componentInstance;
    page.kind = 'news';
    page.draft.title = 'Keep this draft';
    await page.save();
    expect(page.draft.title).toBe('Keep this draft');
    expect(page.editorError()).toBe('Validation rejected');
  });
  it('blocks editing a record whose details could not be loaded', async () => {
    const fetchMock = vi.fn(async () => json({ message: 'Detail unavailable' }, 503));
    vi.stubGlobal('fetch', fetchMock);
    const page = TestBed.createComponent(ContentManager).componentInstance;
    await page.openEditor({ id: 'TT001' });
    page.draft.title = 'Attempted edit';
    await page.save();
    expect(page.editorReady()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(page.editorError()).toBe('Detail unavailable');
  });
});
