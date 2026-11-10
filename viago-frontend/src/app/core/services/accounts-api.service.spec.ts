import { TestBed } from '@angular/core/testing';
import { AccountsApiService } from './accounts-api.service';
describe('Multipart account requests', () => {
  it('reports an unavailable backend instead of an empty result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(TestBed.inject(AccountsApiService).request('admin/activity-logs', 'GET', undefined, 'admin'))
      .rejects.toMatchObject({ status: 0, message: expect.stringContaining('backend') });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });
  it('sends FormData unchanged and lets the browser set the multipart boundary', async () => {
    const send = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', send);
    sessionStorage.setItem('viago_customer_access_token', 'fixture-token');
    const form = new FormData();
    form.append('scores', '[5,5,5,5,5,5]');
    await TestBed.inject(AccountsApiService).request(
      'customer/profile/tickets/VE1/review',
      'POST',
      form,
    );
    const options = send.mock.calls[0][1];
    expect(options.body).toBe(form);
    expect(options.headers['Content-Type']).toBeUndefined();
    expect(options.headers.Authorization).toBe('Bearer fixture-token');
  });
});
