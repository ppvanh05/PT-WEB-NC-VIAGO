import { TestBed } from '@angular/core/testing';
import { AdminAccountsService } from './admin-accounts.service';
import { AccountsApiService } from './accounts-api.service';
describe('Customer field persistence', () => {
  let service: AdminAccountsService, request: ReturnType<typeof vi.fn>;
  const raw = {
    code: 'KH1',
    name: 'Nguyễn An',
    phone: '0900000000',
    gender: 'Nam',
    status: 'HoatDong',
    memberTier: 'Hạng cũ',
  };
  beforeEach(() => {
    request = vi.fn().mockResolvedValue(raw);
    TestBed.configureTestingModule({
      providers: [{ provide: AccountsApiService, useValue: { request } }],
    });
    service = TestBed.inject(AdminAccountsService);
  });
  it('does not erase an unchanged tier absent from the active catalog', async () => {
    const draft = service.customer(raw);
    draft.occupation = 'Kỹ sư';
    await service.saveCustomer(draft, false);
    const body = request.mock.calls[0][2];
    expect(body.occupation).toBe('Kỹ sư');
    expect(body).not.toHaveProperty('memberTierId');
  });
  it('only clears a tier when the user explicitly selects no tier', async () => {
    const draft = service.customer(raw);
    draft.memberTier = 'Không có';
    await service.saveCustomer(draft, false);
    expect(request.mock.calls[0][2].memberTierId).toBe('');
  });
  it('rejects an unknown newly selected tier instead of converting it to no tier', async () => {
    const draft = service.customer(raw);
    draft.memberTier = 'Hạng không tồn tại';
    await expect(service.saveCustomer(draft, false)).rejects.toThrow('không còn khả dụng');
    expect(request).not.toHaveBeenCalled();
  });
  it('shows the actual lock date returned by the database', () => {
    const result = service.customer({
      ...raw,
      status: 'DaKhoa',
      lockedAt: '2026-11-01T02:03:00Z',
      lockReason: 'Lý do thật',
    });
    expect(result.lockInfo.reason).toBe('Lý do thật');
    expect(result.lockInfo.date).toBe(new Date('2026-11-01T02:03:00Z').toLocaleString('vi-VN'));
  });
  it('sends an explicit fixed-role choice and never sends client-picked permission IDs', async () => {
    service.roles = [{ mavaitro: 'VT002', tenvaitro: 'NhanVienBanVe' }];
    const draft = { code: 'NV1', name: 'Test', defaultRole: 'Nhân viên bán vé', permissions: ['Q026'], gender: 'Nam' };
    await service.saveEmployee(draft, '', false, true);
    expect(request.mock.calls[0][2]).toMatchObject({ roleId: 'VT002', applyRolePermissions: true });
    expect(request.mock.calls[0][2]).not.toHaveProperty('permissions');
    await service.saveEmployee(draft, '', false);
    expect(request.mock.calls[1][2].applyRolePermissions).toBe(false);
    await service.saveEmployee(draft, 'QaOnlyPassword!', true);
    expect(request.mock.calls[2][2]).not.toHaveProperty('permissions');
  });
});
