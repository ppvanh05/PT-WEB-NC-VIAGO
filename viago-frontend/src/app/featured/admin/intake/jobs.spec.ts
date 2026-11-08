import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AdminContentApi } from '../../../core/services/content-api.service';
import { AdminJobs } from './jobs';
const job = {
  id: 'TD005',
  title: 'Driver',
  department: 'Operations',
  location: 'City',
  workType: 'ToanThoiGian',
  deadline: '2099-12-31',
  description: 'Transport passengers',
  requirements: 'Valid licence',
  status: 'DangTuyen',
  updatedAt: '2026-11-08T01:00:00Z',
  acceptingApplications: true,
  applications: 2,
};
describe('Admin job publication', () => {
  let request: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    request = vi.fn();
    TestBed.configureTestingModule({
      imports: [AdminJobs],
      providers: [provideRouter([]), { provide: AdminContentApi, useValue: { request } }],
    });
  });
  it('renders compact rows with the actual application count and a right-aligned shared pager', async () => {
    request.mockResolvedValue({ data: [job], pagination: { total: 1, totalPages: 1 } });
    const fixture = TestBed.createComponent(AdminJobs);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.loading()).toBe(false));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('TD005');
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('2');
    expect(fixture.nativeElement.querySelector('.pagination-footer app-pagination')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('tbody button').length).toBe(1);
    expect(fixture.nativeElement.querySelector('tbody .admin-action-btn svg')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.filters').textContent).toContain('Làm mới');
    expect(fixture.nativeElement.querySelector('.header-card').textContent).not.toContain(
      'Hồ sơ ứng tuyển',
    );
    fixture.nativeElement.querySelector('.header-action-banner').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.editorOpen()).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('[role="dialog"] .modal-close').length).toBe(1);
    const editor = fixture.nativeElement.querySelector('.job-editor') as HTMLElement;
    expect(editor.querySelectorAll('.section-panel .viago-card--bordered').length).toBeGreaterThan(
      0,
    );
    expect(editor.querySelectorAll('.viago-field__required').length).toBe(7);
    expect(editor.querySelectorAll('.date-picker-required').length).toBe(1);
    for (const label of editor.querySelectorAll('label')) {
      expect((label.textContent || '').match(/\*/g)?.length || 0).toBeLessThanOrEqual(1);
    }
  });
  it('posts a position without client generated IDs or an employee actor', async () => {
    request.mockImplementation(async (_path: string, method: string) =>
      method === 'POST' ? job : { data: [job], pagination: { total: 1, totalPages: 1 } },
    );
    const page = TestBed.createComponent(AdminJobs).componentInstance;
    await page.open();
    Object.assign(page.form, { ...job, id: '', updatedAt: '' });
    await page.save();
    const body = request.mock.calls.find((c) => c[1] === 'POST')?.[2];
    expect(body.title).toBe('Driver');
    expect(body.status).toBe('DangTuyen');
    expect(body.id).toBeUndefined();
    expect(body.maNhanVien).toBeUndefined();
    expect(body.updatedAt).toBeUndefined();
    expect(page.notice()).toContain('TD005');
    expect(page.editorOpen()).toBe(false);
  });
  it('includes the server version on edits and preserves unsaved content on a conflict', async () => {
    request.mockResolvedValueOnce(job).mockRejectedValueOnce(new Error('Conflict: reload'));
    const page = TestBed.createComponent(AdminJobs).componentInstance;
    await page.open(job as never);
    page.form.title = 'Updated title';
    await page.save();
    expect(request).toHaveBeenLastCalledWith(
      'jobs/TD005',
      'PATCH',
      expect.objectContaining({ title: 'Updated title', expectedUpdatedAt: job.updatedAt }),
      expect.any(AbortSignal),
    );
    expect(page.editorError()).toBe('Conflict: reload');
    expect(page.form.title).toBe('Updated title');
    expect(page.editorOpen()).toBe(true);
  });
  it('cannot create a blank replacement when an existing job fails to load', async () => {
    request.mockRejectedValue(new Error('Unavailable'));
    const page = TestBed.createComponent(AdminJobs).componentInstance;
    await page.open(job as never);
    Object.assign(page.form, { ...job, id: '' });
    await page.save();
    expect(request).toHaveBeenCalledTimes(1);
    expect(page.editorReady()).toBe(false);
  });
  it('does not apply a late job response to a newly opened editor', async () => {
    let finish!: (value: unknown) => void;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const page = TestBed.createComponent(AdminJobs).componentInstance;
    const pending = page.open(job as never);
    await page.open();
    finish(job);
    await pending;
    expect(page.form.id).toBe('');
    expect(page.form.title).toBe('');
    expect(page.editorReady()).toBe(true);
  });
});
