import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { VoucherService } from './voucher.service';
import { AuthService } from './auth.service';
import { AccountsApiService } from './accounts-api.service';
describe('Server voucher wallet ownership', () => {
  it('never exposes the previous customer wallet during an account switch', async () => {
    const user = signal({ id: 'KH_A' });
    const all = vi
      .fn()
      .mockResolvedValue([
        {
          id: 'A',
          code: 'VOUCHER_A',
          title: 'A',
          type: 'PhanTram',
          status: 'SanSang',
          startsAt: '2000-01-01',
          expiresAt: '2100-01-01',
        },
      ]);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: user } },
        { provide: AccountsApiService, useValue: { all } },
      ],
    });
    const service = TestBed.inject(VoucherService);
    await service.refreshWallet();
    expect(service.getWalletVouchers('KH_A')[0].code).toBe('VOUCHER_A');
    user.set({ id: 'KH_B' });
    expect(service.getWalletVouchers('KH_B')).toEqual([]);
    expect(service.getWalletVouchers('KH_A')).toEqual([]);
    all.mockResolvedValueOnce([
      {
        id: 'B',
        code: 'VOUCHER_B',
        title: 'B',
        type: 'PhanTram',
        status: 'SanSang',
        startsAt: '2100-01-01',
        expiresAt: '2101-01-01',
      },
    ]);
    await service.refreshWallet();
    expect(service.getWalletVouchers('KH_B')[0].code).toBe('VOUCHER_B');
    expect(service.getWalletVouchers('KH_B')[0].count).toBe(0);
  });
});
