import { TestBed } from '@angular/core/testing';
import { AccountsApiService } from './accounts-api.service';
describe('Multipart account requests', () => {
  it('expires cached reads and never caches a failed response', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const send = vi.fn().mockImplementation(async () => new Response('{}', { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', send);
    sessionStorage.setItem('viago_admin_access_token', 'fixture');
    const api = TestBed.inject(AccountsApiService);
    await api.request('admin/employees', 'GET', undefined, 'admin');
    now.mockReturnValue(11001);
    await api.request('admin/employees', 'GET', undefined, 'admin');
    expect(send).toHaveBeenCalledTimes(2);
    api.invalidateAdminReads();
    send.mockRejectedValueOnce(new TypeError('offline'));
    await expect(api.request('admin/employees', 'GET', undefined, 'admin')).rejects.toMatchObject({ status: 0 });
    await api.request('admin/employees', 'GET', undefined, 'admin');
    expect(send).toHaveBeenCalledTimes(4);
    now.mockRestore();
  });
  it('does not restore an old in-flight read into cache after a mutation', async () => {
    let finish!: (value: Response) => void;
    const send = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => finish = resolve))
      .mockImplementation(async () => new Response('{"version":2}', { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', send);
    sessionStorage.setItem('viago_admin_access_token', 'fixture');
    const api = TestBed.inject(AccountsApiService);
    const old = api.request('admin/employees', 'GET', undefined, 'admin');
    await api.request('admin/employees/QA', 'PATCH', {}, 'admin');
    finish(new Response('{"version":1}', { headers: { 'Content-Type': 'application/json' } }));
    await old;
    expect(await api.request('admin/employees', 'GET', undefined, 'admin')).toEqual({ version: 2 });
    expect(send).toHaveBeenCalledTimes(3);
  });
  it('shares duplicate admin reads and returns independent copies from short memory cache', async () => {
    const send = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [{ name: 'Original' }], total: 1 }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', send);
    sessionStorage.setItem('viago_admin_access_token', 'first-account');
    const api = TestBed.inject(AccountsApiService);
    const [first, second] = await Promise.all([
      api.request<any>('admin/customers?page=1', 'GET', undefined, 'admin'),
      api.request<any>('admin/customers?page=1', 'GET', undefined, 'admin'),
    ]);
    first.items[0].name = 'Edited';
    expect(second.items[0].name).toBe('Original');
    expect((await api.request<any>('admin/customers?page=1', 'GET', undefined, 'admin')).items[0].name).toBe('Original');
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('isolates cached data by token and invalidates all admin data after a save', async () => {
    let version = 0;
    const send = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ version: ++version }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', send);
    const api = TestBed.inject(AccountsApiService);
    sessionStorage.setItem('viago_admin_access_token', 'first-account');
    expect((await api.request<any>('admin/employees', 'GET', undefined, 'admin')).version).toBe(1);
    sessionStorage.setItem('viago_admin_access_token', 'second-account');
    expect((await api.request<any>('admin/employees', 'GET', undefined, 'admin')).version).toBe(2);
    await api.request('customer/profile', 'PATCH', { name: 'Updated' });
    expect((await api.request<any>('admin/employees', 'GET', undefined, 'admin')).version).toBe(4);
  });
  it('lets forced refresh bypass the admin list cache', async () => {
    const send = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ items: [{ id: 'ROW' }], total: 1 }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', send);
    sessionStorage.setItem('viago_admin_access_token', 'first-account');
    const api = TestBed.inject(AccountsApiService);
    await api.all('admin/activity-logs', 'admin');
    await api.all('admin/activity-logs', 'admin');
    expect(send).toHaveBeenCalledTimes(1);
    await api.all('admin/activity-logs', 'admin', true);
    expect(send).toHaveBeenCalledTimes(2);
  });
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
