import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Contact } from './contact';

describe('Customer contact submissions', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [Contact], providers: [provideRouter([])] }),
  );
  afterEach(() => vi.unstubAllGlobals());
  it('sends a real API request and confirms receipt only after the server accepts it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ received: true, message: 'Đã tiếp nhận' }), {
          headers: { 'content-type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const fixture = TestBed.createComponent(Contact),
      page = fixture.componentInstance;
    page.request = {
      fullName: ' Test User ',
      phone: '0900000000',
      email: '',
      subject: 'HoanHuyVe',
      message: ' Test contact ',
    };
    await page.submit();
    expect(fetchMock).toHaveBeenCalledWith(
      '/customer/about/contact',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Test User',
          phone: '0900000000',
          subject: 'HoanHuyVe',
          message: 'Test contact',
        }),
      }),
    );
    expect(page.success).toBe('Đã tiếp nhận');
    expect(page.request.message).toBe('');
    expect(page.sending).toBe(false);
  });
  it('keeps the customer message and shows an error if submission fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ message: 'Chưa lưu được' }), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          }),
        ),
    );
    const fixture = TestBed.createComponent(Contact),
      page = fixture.componentInstance;
    page.request.message = 'Keep this draft';
    await page.submit();
    expect(page.success).toBe('');
    expect(page.error).toBe('Chưa lưu được');
    expect(page.request.message).toBe('Keep this draft');
  });
});
