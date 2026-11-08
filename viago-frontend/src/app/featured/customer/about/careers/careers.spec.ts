import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Careers } from './careers';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const job = {
  id: 'REAL_JOB',
  title: 'Backend job',
  department: 'Operations',
  location: 'City',
  workType: 'Full time',
  salary: 'Negotiable',
  deadline: '2026-12-31',
  description: 'Server content',
  requirements: [],
  benefits: [],
  workHours: '',
  workEnvironment: '',
  howToApply: '',
};
describe('Database-backed careers', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Careers] });
    window.scrollTo = vi.fn();
  });
  afterEach(() => vi.unstubAllGlobals());
  it('loads job lists and details from the API using the actual job ID', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async (url: string) =>
        json(url.includes('REAL_JOB') ? job : { data: [job], pagination: { totalPages: 1 } }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const page = TestBed.createComponent(Careers).componentInstance;
    await page.loadJobs();
    expect(page.jobs[0].id).toBe('REAL_JOB');
    await page.openJobDetail(page.jobs[0]);
    expect(page.selectedJob?.description).toBe('Server content');
    page.openApplicationForm(page.selectedJob!);
    expect(page.applicationForm.position).toBe('REAL_JOB');
    expect(fetchMock).toHaveBeenCalledWith('/customer/about/careers/REAL_JOB', expect.anything());
  });
  it('uploads multipart CV data and removes UI-only position from submitted fields', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ received: true }));
    vi.stubGlobal('fetch', fetchMock);
    const page = TestBed.createComponent(Careers).componentInstance;
    Object.assign(page.applicationForm, {
      position: 'REAL_JOB',
      fullName: 'Test',
      phoneNumber: '0900000000',
      email: 'test@example.invalid',
      agreeTerms: true,
    });
    page.selectedCvFile = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' });
    await page.submitApplication();
    const [url, options] = fetchMock.mock.calls[0];
    const form = options.body as FormData;
    expect(url).toBe('/customer/about/careers/REAL_JOB/applications');
    expect(form.get('position')).toBeNull();
    expect(form.get('agreeTerms')).toBe('true');
    expect(form.get('cv')).toBeInstanceOf(File);
    expect(page.showStatusModal).toBe(true);
  });
  it('shows an error without fake jobs when the database API is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'Offline' }, 503)));
    const page = TestBed.createComponent(Careers).componentInstance;
    await page.loadJobs();
    expect(page.jobs).toEqual([]);
    expect(page.loadError).toBe('Offline');
    expect(page.showStatusModal).toBe(false);
  });
});
