import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { AccountsApiService } from './accounts-api.service';
describe('Customer auth with server persistence', () => {
  let auth: AuthService, request: ReturnType<typeof vi.fn>;
  const profile = {
    id: 'KH_API',
    phoneNumber: '0900000000',
    name: 'Server Name',
    gender: 'Nu',
    avatar: '',
    spent: 0,
    tickets: 0,
  };
  beforeEach(() => {
    sessionStorage.clear();
    request = vi
      .fn()
      .mockImplementation(async (path) =>
        path === 'customer/auth/login' ? { token: 'server-token' } : profile,
      );
    TestBed.configureTestingModule({
      providers: [{ provide: AccountsApiService, useValue: { request } }],
    });
    auth = TestBed.inject(AuthService);
  });
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });
  it('gets current profile from server after login, never saves a password', async () => {
    const result = await auth.login('0900000000', 'PrivatePassword!');
    expect(result.success).toBe(true);
    expect(auth.currentUser()?.name).toBe('Server Name');
    expect(auth.currentUser()?.gender).toBe('Nữ');
    expect(sessionStorage.getItem('viago_customer_access_token')).toBe('server-token');
    expect(JSON.stringify(auth.currentUser())).not.toContain('PrivatePassword!');
  });
  it('keeps existing profile when saving is rejected by server', async () => {
    await auth.login('0900000000', 'PrivatePassword!');
    request.mockRejectedValueOnce(new Error('Email đã tồn tại.'));
    const result = await auth.updateProfile('0900000000', 'Changed', { email: 'new@example.com' });
    expect(result.success).toBe(false);
    expect(result.message).toBe('Email đã tồn tại.');
    expect(auth.currentUser()?.name).toBe('Server Name');
  });
  it('sends explicit cleared fields instead of silently omitting them', async () => {
    await auth.updateProfile('0900000000', 'Server Name', { email: '', birthday: '' });
    expect(request).toHaveBeenCalledWith(
      'customer/profile',
      'PATCH',
      expect.objectContaining({ email: '', birthday: '' }),
    );
  });
  it('does not create a client session before second-factor verification', async () => {
    request.mockResolvedValueOnce({ requiresTwoFactor: true });
    const result = await auth.login('0900000000', 'PrivatePassword!');
    expect(result.requiresTwoFactor).toBe(true);
    expect(auth.currentUser()).toBeNull();
    expect(sessionStorage.getItem('viago_customer_access_token')).toBeNull();
  });
  it('does not fabricate OTP on SMS provider failure', async () => {
    request.mockRejectedValueOnce(new Error('Chưa cấu hình dịch vụ gửi SMS OTP.'));
    const result = await auth.sendOTP('0900000000', null, 'register');
    expect(result.success).toBe(false);
    expect(result.otp).toBeUndefined();
  });
});
