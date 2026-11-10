import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { Profile } from './profile';
import { AuthService, User } from '../../../core/services/auth.service';
import { VoucherService } from '../../../core/services/voucher.service';
describe('Profile restoration', () => {
  it('does not expose editable controls before the server profile has restored', async () => {
    let finish!: () => void;
    const currentUser = signal<User | null>(null);
    const auth = {
      currentUser,
      ready: new Promise<void>((resolve) => {
        finish = resolve;
      }),
      tickets: async () => [],
      sessions: async () => [],
    };
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: VoucherService,
          useValue: { refreshWallet: async () => {}, getWalletVouchers: () => [] },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.profile-page')).toBeNull();
    expect(fixture.componentInstance.loading).toBe(true);
    currentUser.set({
      id: 'KH_TEST',
      phoneNumber: '0900000000',
      name: 'Nguyễn Văn An',
      role: 'customer',
      status: 'Đang hoạt động',
      avatar: '',
      gender: 'Nam',
      occupation: 'Kỹ sư dữ liệu',
      points: 7,
      spent: 99999999,
      failedLoginAttempts: 0,
      lockoutUntil: null,
    });
    currentUser.update((user) => ({
      ...user!,
      rank: 'Hạng từ DB',
      membershipTiers: [
        {
          id: 'H_DB',
          name: 'Hạng từ DB',
          minTickets: 23,
          minSpent: 1234567,
          benefits: [{ title: 'Quyền lợi thật', desc: 'Nội dung trong Supabase' }],
        },
      ],
    }));
    finish();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.loading).toBe(false);
    expect(fixture.componentInstance.profileForm.value.occupation).toBe('Kỹ sư dữ liệu');
    expect(fixture.componentInstance.customOccupation).toBe('Kỹ sư dữ liệu');
    expect(fixture.componentInstance.loyaltyPoints).toBe(7);
    expect(fixture.componentInstance.tiers[0].minTickets).toBe(23);
    expect(fixture.componentInstance.tiers[0].minSpent).toBe(1234567);
    expect(fixture.componentInstance.tierBenefits[0].desc).toBe('Nội dung trong Supabase');
    expect(fixture.nativeElement.querySelector('.profile-page')).not.toBeNull();
    fixture.destroy();
  });
});
