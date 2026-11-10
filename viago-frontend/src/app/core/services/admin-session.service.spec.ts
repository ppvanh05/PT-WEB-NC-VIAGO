import { TestBed } from '@angular/core/testing';
import { AdminSessionService } from './admin-session.service';

describe('Admin session requests', () => {
  const account = { id: 'TK_TEST', staffId: 'NV_TEST', name: 'Test', phoneNumber: '', email: '', avatar: '', role: 'admin' };
  let fetcher: ReturnType<typeof vi.fn>;
  let service: AdminSessionService;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminSessionService);
    fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
  });
  afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  it('does not recheck the session immediately after successful login', async () => {
    fetcher.mockResolvedValue(json({ token: 'test-token', account }));
    await service.login('test@example.com', 'test-password');
    expect(await service.restore()).toBe(true);
    expect(await service.restore()).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('shares a pending restore between route guards and clears an expired session', async () => {
    sessionStorage.setItem('viago_admin_access_token', 'test-token');
    let resolve!: (response: Response) => void;
    fetcher.mockReturnValue(new Promise<Response>(r => { resolve = r; }));
    const first = service.restore();
    const second = service.restore();
    expect(fetcher).toHaveBeenCalledTimes(1);
    resolve(json({ message: 'Expired' }, 401));
    expect(await first).toBe(false);
    expect(await second).toBe(false);
    expect(sessionStorage.getItem('viago_admin_access_token')).toBeNull();
  });
  it('does not restore an account after logout while its request was pending', async () => {
    sessionStorage.setItem('viago_admin_access_token', 'test-token');
    let resolve!: (response: Response) => void;
    fetcher.mockReturnValue(new Promise<Response>(r => { resolve = r; }));
    const pending = service.restore();
    service.invalidate();
    resolve(json({ account }));
    expect(await pending).toBe(false);
    expect(service.account()).toBeNull();
  });
});
