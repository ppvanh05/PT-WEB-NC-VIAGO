import { Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { AccountsApiService } from './accounts-api.service';
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
  usedAt?: string;
  state?: 'available' | 'upcoming' | 'held' | 'used' | 'expired' | 'revoked';
}
@Injectable({ providedIn: 'root' })
export class VoucherService {
  private readonly api = inject(AccountsApiService);
  private readonly auth = inject(AuthService);
  private readonly wallet = signal<Voucher[]>([]);
  private readonly walletOwner = signal<string | null>(null);
  readonly walletUpdated$ = signal(0);
  publicVouchers: Voucher[] = [];
  async refreshWallet() {
    const id = this.auth.currentUser()?.id;
    if (!id) {
      this.wallet.set([]);
      this.walletOwner.set(null);
      return;
    }
    if (this.walletOwner() !== id) this.wallet.set([]);
    const rows = await this.api.all<any>('customer/profile/vouchers');
    if (this.auth.currentUser()?.id !== id) return;
    this.walletOwner.set(id);
    this.wallet.set(
      rows.map((v) => ({
        id: v.id,
        code: v.code,
        title: v.title,
        description: v.description || '',
        value: v.value,
        type: v.type === 'PhanTram' ? 'percentage' : 'fixed',
        expiryDate: new Date(v.expiresAt).toLocaleDateString('vi-VN'),
        count:
          v.status === 'SanSang' &&
          new Date(v.startsAt) <= new Date() &&
          new Date(v.expiresAt) > new Date()
            ? 1
            : 0,
        state:
          v.status === 'DaDung'
            ? 'used'
            : v.status === 'ThuHoi'
              ? 'revoked'
              : new Date(v.expiresAt) <= new Date()
                ? 'expired'
                : v.status === 'DangGiu'
                  ? 'held'
                  : new Date(v.startsAt) > new Date()
                    ? 'upcoming'
                    : 'available',
      })),
    );
    this.walletUpdated$.update((v) => v + 1);
  }
  getWalletVouchers(userId: string): Voucher[] {
    return this.auth.currentUser()?.id === userId && this.walletOwner() === userId
      ? this.wallet()
      : [];
  }
  isVoucherClaimed(userId: string, code: string) {
    return this.getWalletVouchers(userId).some((v) => v.code === code);
  }
}
