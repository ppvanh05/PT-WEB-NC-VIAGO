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
});
