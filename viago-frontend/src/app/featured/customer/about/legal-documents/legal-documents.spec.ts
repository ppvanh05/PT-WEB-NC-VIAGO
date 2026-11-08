import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LegalDocuments } from './legal-documents';
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
describe('Published legal content', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [LegalDocuments] }));
  afterEach(() => vi.unstubAllGlobals());
  for (const kind of ['policies', 'terms'] as const) {
    it('renders ' + kind + ' documents returned by the database API', async () => {
      const fetchMock = vi.fn(async () =>
        json({
          data: [
            {
              id: 'CS123',
              title: 'Published document',
              type: 'BaoMat',
              typeLabel: 'Bảo mật',
              content: '<p>Current database content</p>',
              effectiveDate: '2026-11-08',
              updatedAt: '2026-11-08T00:00:00Z',
              cancellationRules: [],
            },
          ],
          pagination: { totalPages: 1 },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);
      const fixture = TestBed.createComponent(LegalDocuments),
        page = fixture.componentInstance;
      page.kind = kind;
      fixture.detectChanges();
      await vi.waitFor(() => expect(page.loading).toBe(false));
      fixture.detectChanges();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/customer/about/' + kind + '?'),
        expect.anything(),
      );
      expect(fixture.nativeElement.querySelector('.document-body').textContent).toBe(
        'Current database content',
      );
    });
  }
  it('shows the error instead of a hardcoded policy when the API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ message: 'Offline' }, 503)),
    );
    const fixture = TestBed.createComponent(LegalDocuments),
      page = fixture.componentInstance;
    fixture.detectChanges();
    await vi.waitFor(() => expect(page.loading).toBe(false));
    fixture.detectChanges();
    expect(page.documents).toEqual([]);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Offline');
    expect(fixture.nativeElement.querySelector('.document-body')).toBeNull();
  });
});
