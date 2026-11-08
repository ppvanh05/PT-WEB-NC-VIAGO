import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Faq } from './faq';

describe('Database-backed FAQ', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [Faq], providers: [provideRouter([])] }),
  );
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState({}, '', '/');
  });
  const response = {
    data: [
      {
        id: 'FAQ006',
        categoryId: 'member',
        question: 'Quên mật khẩu?',
        answer: 'Nội dung từ database.',
      },
    ],
    pagination: { totalPages: 1 },
  };
  it('loads the same published FAQ source used by the chatbot', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => response });
    vi.stubGlobal('fetch', fetchMock);
    const fixture = TestBed.createComponent(Faq);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.loading).toBe(false));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/customer/about/faq'),
      expect.any(Object),
    );
    expect(fixture.nativeElement.textContent).toContain('Nội dung từ database.');
    expect(fixture.nativeElement.textContent).not.toContain('Payoo');
  });
  it('opens the exact FAQ referenced by a chatbot source link', async () => {
    window.history.replaceState({}, '', '/customer/faq#faq-FAQ006');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => response }));
    HTMLElement.prototype.scrollIntoView = vi.fn();
    const fixture = TestBed.createComponent(Faq);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.loading).toBe(false));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#faq-FAQ006').classList.contains('open')).toBe(
      true,
    );
  });
  it('shows a retry state when the database API fails without substituting invented FAQ content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const fixture = TestBed.createComponent(Faq);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance.loading).toBe(false));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Chưa tải được',
    );
    expect(fixture.componentInstance.faqs).toEqual([]);
  });
});
