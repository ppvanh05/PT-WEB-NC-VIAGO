import { Injectable, signal } from '@angular/core';
import { AuthService, User } from './auth.service';

export interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  value: number;
  type: 'percentage' | 'fixed';
  expiryDate: string;
  count?: number;
  badgeTarget?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class VoucherService {
  // Public vouchers list shown on home page
  publicVouchers: Voucher[] = [
    { id: 'v1', code: 'WELCOME50', title: 'GIẢM 50K', description: 'Giảm ngay 50.000đ cho hành trình đầu tiên', value: 50000, type: 'fixed', expiryDate: '31/12/2026' },
    { id: 'v2', code: 'SUMMER10', title: 'GIẢM 10%', description: 'Giảm 10% tối đa 30.000đ cho chuyến đi mùa hè', value: 10, type: 'percentage', expiryDate: '31/08/2026' },
    { id: 'v3', code: 'MIDWEEK10', title: 'GIẢM 10K', description: 'Giảm ngay 10.000đ cho chuyến đi giữa tuần', value: 10000, type: 'fixed', expiryDate: '31/12/2026' },
    { id: 'v4', code: 'VIAGO30', title: 'GIẢM 30K', description: 'Giảm 30.000đ khi đặt vé qua ví điện tử', value: 30000, type: 'fixed', expiryDate: '31/12/2026' }
  ];

  // Membership vouchers templates
  private memberVoucherTemplates: { [rank: string]: Voucher[] } = {
    'Bạc': [
      { id: 'vsilver', code: 'SILVER10', title: 'GIẢM 10%', description: 'Mã giảm giá 10% độc quyền cho thành viên Bạc', value: 10, type: 'percentage', expiryDate: '31/12/2026', count: 1 }
    ],
    'Vàng': [
      { id: 'vgold', code: 'GOLDVIP20', title: 'GIẢM 20%', description: 'Mã giảm giá 20% độc quyền cho thành viên Vàng', value: 20, type: 'percentage', expiryDate: '31/12/2026', count: 2 }
    ],
    'Kim cương': [
      { id: 'vdiamond', code: 'DIAMOND30', title: 'GIẢM 30%', description: 'Mã giảm giá 30% độc quyền cho thành viên Kim cương', value: 30, type: 'percentage', expiryDate: '31/12/2026', count: 3 }
    ]
  };

  // Signal to trigger updates across components when wallets update
  walletUpdated$ = signal<number>(0);

  constructor(private authService: AuthService) {}

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  // Get key for member wallet storage
  private getWalletStorageKey(userId: string): string {
    return `viago_voucher_wallet_${userId}`;
  }

  // Get all vouchers in the user's wallet
  getWalletVouchers(userId: string): Voucher[] {
    if (!this.isBrowser()) return [];
    
    const key = this.getWalletStorageKey(userId);
    const stored = localStorage.getItem(key);
    
    let wallet: Voucher[] = [];
    if (stored) {
      wallet = JSON.parse(stored);
    } else {
      // Auto initialize wallet with member rank vouchers if new wallet
      const user = this.authService.currentUser();
      if (user && user.id === userId && user.type === 'Hội viên' && user.rank) {
        const templates = this.memberVoucherTemplates[user.rank] || [];
        wallet = [...templates];
        this.saveWallet(userId, wallet);
      }
    }

    // Ensure member rank vouchers are automatically injected if missing
    const user = this.authService.currentUser();
    if (user && user.id === userId && user.type === 'Hội viên' && user.rank) {
      const templates = this.memberVoucherTemplates[user.rank] || [];
      let updated = false;
      templates.forEach((t: Voucher) => {
        if (!wallet.some(w => w.code === t.code)) {
          wallet.push({ ...t });
          updated = true;
        }
      });
      if (updated) {
        this.saveWallet(userId, wallet);
      }
    }

    return wallet;
  }

  // Save wallet to localStorage
  saveWallet(userId: string, wallet: Voucher[]): void {
    if (!this.isBrowser()) return;
    const key = this.getWalletStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(wallet));
    this.walletUpdated$.update(v => v + 1);
  }

  // Claim a voucher from homepage to member wallet
  claimVoucher(userId: string, voucher: Voucher): boolean {
    const wallet = this.getWalletVouchers(userId);
    const existing = wallet.find(w => w.code === voucher.code);

    if (existing) {
      return false; // Already claimed
    }

    // Double check first-time customer criteria for WELCOME50
    if (voucher.code === 'WELCOME50') {
      const user = this.authService.currentUser();
      if (user && user.id === userId) {
        const isFirstTime = user.rank === 'Không có' && (user.tickets || 0) === 0 && (user.spent || 0) === 0;
        if (!isFirstTime) {
          return false;
        }
      }
    }

    // Add with count = 1
    wallet.push({
      ...voucher,
      count: 1
    });

    this.saveWallet(userId, wallet);
    return true;
  }

  // Check if voucher is already in the wallet
  isVoucherClaimed(userId: string, code: string): boolean {
    const wallet = this.getWalletVouchers(userId);
    return wallet.some(w => w.code === code);
  }
}
