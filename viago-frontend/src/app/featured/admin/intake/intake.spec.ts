import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AdminSessionService } from '../../../core/services/admin-session.service';
import { AdminIntake } from './intake';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const record = (id: string, status = 'Moi') => ({
  id,
  name: id,
  status,
  phone: '0900000000',
  email: null,
  createdAt: '2026-11-08T00:00:00Z',
  message: id,
  history: [],
});
describe('Admin intake workspace', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [AdminIntake],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { kind: 'contacts' } } } },
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
  it('renders contacts as table rows with real IDs, emails, priorities and assignees', async () => {
    const row = {
      ...record('LH004'),
      email: 'customer@example.invalid',
      priority: 'Cao',
      assignedTo: 'Staff name',
      updatedAt: '2026-11-08T02:00:00Z',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        json(
          url.endsWith('/options')
            ? { subjects: [] }
            : url.endsWith('/LH004')
              ? row
              : { data: [row], statistics: { Moi: 1 }, pagination: { total: 1, totalPages: 1 } },
        ),
      ),
    );
    const fixture = TestBed.createComponent(AdminIntake);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.loading()).toBe(false));
    fixture.detectChanges();
    const table = fixture.nativeElement.querySelector('table');
    expect(table.querySelectorAll('tbody tr').length).toBe(1);
    expect(table.textContent).toContain('LH004');
    expect(table.textContent).toContain(row.email);
    expect(table.textContent).toContain('Cao');
    expect(table.textContent).toContain('Staff name');
    expect(fixture.nativeElement.querySelector('.record-list')).toBeNull();
    expect(fixture.nativeElement.querySelector('.header-card button')).toBeNull();
    expect(fixture.nativeElement.querySelector('.filters').textContent).toContain('Làm mới');
    const actions = table.querySelector('tbody .row-actions');
    expect(actions.querySelectorAll('button').length).toBe(1);
    expect(actions.querySelector('button svg')).toBeTruthy();
    actions.querySelector('button').click();
    await vi.waitFor(() => expect(fixture.componentInstance.detailLoading()).toBe(false));
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog.querySelectorAll('.modal-close').length).toBe(1);
    expect(dialog.querySelector('[aria-label="Đóng chi tiết"]')).toBeNull();
    expect(dialog.querySelector('.detail-card')).toBeNull();
    expect(dialog.querySelector('.process-form')).toBeTruthy();
    expect(dialog.querySelector('.info-table')).toBeTruthy();
    expect(dialog.querySelectorAll('.section-panel .viago-card--bordered').length).toBeGreaterThan(
      0,
    );
    dialog.querySelector('.modal-close').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });
  it('opens application viewing, CV and processing through one pencil action and one close control', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { data: { kind: 'applications' } } },
    });
    const row = { ...record('UV001'), hasCv: true, jobTitle: 'Driver', experience: 'Three years' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        json(
          url.endsWith('/options')
            ? { jobs: [] }
            : url.endsWith('/UV001')
              ? row
              : { data: [row], statistics: { Moi: 1 }, pagination: { total: 1, totalPages: 1 } },
        ),
      ),
    );
    const fixture = TestBed.createComponent(AdminIntake);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.loading()).toBe(false));
    fixture.detectChanges();
    const actions = fixture.nativeElement.querySelector('tbody .row-actions');
    expect(actions.querySelectorAll('button').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.header-card button, .header-card a')).toBeNull();
    actions.querySelector('button').click();
    await vi.waitFor(() => expect(fixture.componentInstance.detailLoading()).toBe(false));
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog.querySelectorAll('.modal-close').length).toBe(1);
    expect(dialog.querySelectorAll('.detail-heading button').length).toBe(0);
    expect(dialog.querySelector('.cv').textContent).toContain('Xem CV');
    expect(dialog.querySelector('.process-form')).toBeTruthy();
  });
  it('keeps reply drafts separate from internal notes and sends the exact record version', async () => {
    const row = {
      ...record('LH004'),
      email: 'customer@example.invalid',
      version: 7,
      priority: 'Cao',
      replyDraft: 'Saved draft',
      assignedStaffId: 'NV001',
    };
    const fetchMock = vi.fn(async (url: string, options: RequestInit) =>
      json(
        options.method === 'PATCH'
          ? { ...row, version: 8 }
          : url.includes('?')
            ? { data: [row], statistics: {}, pagination: { total: 1, totalPages: 1 } }
            : row,
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const page = TestBed.createComponent(AdminIntake).componentInstance;
    await page.open(row);
    expect(page.replyDraft).toBe('Saved draft');
    expect(page.priority).toBe('Cao');
    page.note = 'Private note';
    page.replyDraft = 'Hello customer';
    expect(decodeURIComponent(page.replyLink!)).toContain('body=Hello customer');
    expect(page.replyLink).not.toContain('Private');
    await page.save();
    const payload = JSON.parse(
      fetchMock.mock.calls.find((c) => c[1].method === 'PATCH')![1].body as string,
    );
    expect(payload).toMatchObject({
      expectedVersion: 7,
      assignedStaffId: 'NV001',
      priority: 'Cao',
      replyDraft: 'Hello customer',
      note: 'Private note',
    });
    expect(payload.sent).toBeUndefined();
  });
  it('submits recruiter review and interview time in the explicit Vietnam timezone', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { data: { kind: 'applications' } } },
    });
    const row = {
      ...record('UV001'),
      version: 3,
      assignedStaffId: 'NV002',
      interviewAt: '2026-12-20T02:30:00Z',
      evaluation: 'Review',
    };
    const fetchMock = vi.fn(async (url: string, options: RequestInit) =>
      json(
        options.method === 'PATCH'
          ? { ...row, status: 'MoiPhongVan', version: 4 }
          : url.includes('?')
            ? { data: [row], statistics: {}, pagination: { total: 1, totalPages: 1 } }
            : row,
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const page = TestBed.createComponent(AdminIntake).componentInstance;
    await page.open(row);
    expect(page.interviewTime).toBe('09:30');
    expect(page.interviewDate).toBe('2026-12-20');
    page.nextStatus = 'MoiPhongVan';
    page.evaluation = 'Relevant experience';
    await page.save();
    const payload = JSON.parse(
      fetchMock.mock.calls.find((c) => c[1].method === 'PATCH')![1].body as string,
    );
    expect(payload).toMatchObject({
      status: 'MoiPhongVan',
      expectedVersion: 3,
      assignedStaffId: 'NV002',
      evaluation: 'Relevant experience',
      interviewAt: '2026-12-20T09:30:00+07:00',
    });
    expect(payload.replyDraft).toBeUndefined();
  });
  it('keeps summary cards static while filtering through the separate status selector', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async (url: string) =>
        json(
          url.endsWith('/options')
            ? { subjects: [] }
            : { data: [], statistics: { Moi: 2 }, pagination: { total: 2, totalPages: 1 } },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const fixture = TestBed.createComponent(AdminIntake),
      page = fixture.componentInstance;
    fixture.detectChanges();
    await vi.waitFor(() => expect(page.loading()).toBe(false));
    fixture.detectChanges();
    const stats = fixture.nativeElement.querySelector('.stats') as HTMLElement;
    expect(stats.querySelector('button, [role="button"], [tabindex="0"]')).toBeNull();
    const calls = fetchMock.mock.calls.length;
    stats.querySelector('app-card')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(page.status).toBe('');
    expect(fetchMock).toHaveBeenCalledTimes(calls);
    const select = fixture.nativeElement.querySelector('select#intake-status') as HTMLSelectElement;
    select.value = 'Moi';
    select.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(page.loading()).toBe(false));
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('status=Moi'),
      expect.anything(),
    );
  });
  it('ignores a delayed detail response after the employee switches records', async () => {
    let resolveFirst!: (r: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.endsWith('/A')
          ? new Promise<Response>((resolve) => (resolveFirst = resolve))
          : Promise.resolve(json(record('B', 'DangXuLy'))),
      ),
    );
    const page = TestBed.createComponent(AdminIntake).componentInstance;
    const first = page.open(record('A'));
    await page.open(record('B'));
    resolveFirst(json(record('A')));
    await first;
    expect(page.selected()?.id).toBe('B');
    expect(page.nextStatus).toBe('DangXuLy');
  });
  it('sends server status as the optimistic concurrency check and reloads records after saving', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string, options: RequestInit) =>
      json(
        options.method === 'PATCH'
          ? { ...record('A', 'DaXuLy'), history: [{ id: 'H1' }] }
          : url.includes('?')
            ? {
                data: [record('A', 'DaXuLy')],
                statistics: { DaXuLy: 1 },
                pagination: { total: 1, totalPages: 1 },
              }
            : record('A'),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const page = TestBed.createComponent(AdminIntake).componentInstance;
    await page.open(record('A'));
    page.nextStatus = 'DaXuLy';
    page.note = 'Resolved';
    await page.save();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/contacts/A/status',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ Authorization: 'Bearer test-session' }),
        body: JSON.stringify({
          status: 'DaXuLy',
          expectedStatus: 'Moi',
          expectedVersion: 0,
          assignedStaffId: '',
          priority: 'BinhThuong',
          replyDraft: '',
          note: 'Resolved',
        }),
      }),
    );
    expect(page.selected()?.status).toBe('DaXuLy');
    expect(page.rows()[0].status).toBe('DaXuLy');
    expect(page.note).toBe('');
  });
  it('keeps the note and requires refresh when another employee has updated the record', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(async (_url: string, options: RequestInit) =>
          options.method === 'PATCH'
            ? json({ message: 'Conflict: reload' }, 409)
            : json(record('A')),
        ),
    );
    const page = TestBed.createComponent(AdminIntake).componentInstance;
    await page.open(record('A'));
    page.nextStatus = 'DaXuLy';
    page.note = 'Keep note';
    await page.save();
    expect(page.detailError()).toBe('Conflict: reload');
    expect(page.note).toBe('Keep note');
    expect(page.selected()?.status).toBe('Moi');
  });
});
