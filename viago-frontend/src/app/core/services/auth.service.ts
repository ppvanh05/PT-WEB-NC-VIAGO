import { Injectable, signal, inject } from '@angular/core';
import { AccountsApiService, genderLabel, genderValue } from './accounts-api.service';
export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  role: 'customer' | 'admin';
  status: string; // 'Đang hoạt động', 'Đã khóa', 'active', etc.
  avatar: string;
  failedLoginAttempts: number;
  lockoutUntil: string | null;
  email?: string;
  gender?: string;
  birthday?: string;
  dob?: string;
  occupation?: string;
  job?: string;
  phone?: string;
  regDate?: string;
  type?: string;
  rank?: string;
  spent?: number;
  points?: number;
  membershipTiers?: {
    id: string;
    name: string;
    minTickets: number;
    minSpent: number;
    benefits: { title: string; desc: string }[];
  }[];
  tickets?: number;
  twoFA?: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  phoneNumber: string;
  action:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOCKOUT'
    | 'PASSWORD_RESET'
    | 'REGISTER'
    | 'LOGOUT'
    | 'OTP_SENT'
    | 'OTP_VERIFIED'
    | 'OTP_FAILED'
    | 'UPDATE_PROFILE';
  details: string;
}

export interface AuthConfig {
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  sessionTimeoutMinutes: number;
}

const DEFAULT_CONFIG: AuthConfig = {
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 15,
  sessionTimeoutMinutes: 30,
};
export interface CustomerSession {
  id: string;
  name: string;
  userAgent: string;
  ip: string;
  lastActiveAt: string;
  isCurrent: boolean;
}
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AccountsApiService);
  readonly currentUser = signal<User | null>(null);
  readonly activityLogs = signal<ActivityLog[]>([]);
  readonly config = signal<AuthConfig>(DEFAULT_CONFIG);
  readonly sessionTimeoutTriggered = signal(false);
  readonly isFirebaseMode = false;
  readonly ready: Promise<void>;
  private challenges = new Map<string, string>();
  private proofs = new Map<string, string>();
  constructor() {
    this.ready = this.restore();
  }
  private async result<T>(
    action: () => Promise<T>,
  ): Promise<{ success: boolean; message: string; user?: User }> {
    try {
      await action();
      return { success: true, message: 'Thành công.', user: this.currentUser() || undefined };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Không kết nối được dịch vụ tài khoản.',
      };
    }
  }
  private profileBody(name: string, data: Partial<User>) {
    return {
      ...(name.trim() ? { name: name.trim() } : {}),
      ...(data.email !== undefined ? { email: data.email.trim() } : {}),
      ...(data.gender ? { gender: genderValue(data.gender) } : {}),
      ...(data.birthday !== undefined ? { birthday: data.birthday } : {}),
      ...(data.occupation !== undefined ? { occupation: data.occupation } : {}),
      ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
    };
  }
  async restore(): Promise<void> {
    if (
      typeof sessionStorage === 'undefined' ||
      !sessionStorage.getItem('viago_customer_access_token')
    )
      return;
    try {
      await this.refresh();
    } catch {
      this.clearSession();
    }
  }
  async refresh(): Promise<void> {
    const data = await this.api.request<Record<string, any>>('customer/profile');
    const user: User = {
      ...data,
      id: data['id'],
      phoneNumber: data['phoneNumber'],
      phone: data['phoneNumber'],
      name: data['name'],
      role: 'customer',
      status: 'Đang hoạt động',
      avatar: data['avatar'] || '/assets/customer/user.png',
      gender: genderLabel(data['gender']),
      failedLoginAttempts: 0,
      lockoutUntil: null,
      type: 'Hội viên',
      rank: data['rank'] || 'Không có',
      regDate: data['registeredAt']
        ? new Date(data['registeredAt']).toLocaleDateString('vi-VN')
        : '',
    };
    this.currentUser.set(user);
  }
  async login(
    phoneNumber: string,
    password: string,
    verificationToken?: string,
  ): Promise<{ success: boolean; message: string; requiresTwoFactor?: boolean }> {
    try {
      const data = await this.api.request<{ token?: string; requiresTwoFactor?: boolean }>(
        'customer/auth/login',
        'POST',
        {
          username: phoneNumber.trim(),
          password,
          ...(verificationToken ? { verificationToken } : {}),
        },
      );
      if (data.requiresTwoFactor)
        return {
          success: false,
          requiresTwoFactor: true,
          message: 'Vui lòng xác thực SMS hai lớp.',
        };
      if (!data.token) throw new Error('Không nhận được phiên đăng nhập hợp lệ.');
      sessionStorage.setItem('viago_customer_access_token', data.token);
      try {
        await this.refresh();
      } catch (error) {
        this.clearSession();
        throw error;
      }
      return { success: true, message: 'Đăng nhập thành công.' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Đăng nhập thất bại.',
      };
    }
  }
  async registerProfile(
    name: string,
    phoneNumber: string,
    password: string,
    data: Partial<User> = {},
  ) {
    return this.result(async () => {
      const proof = this.proofs.get(phoneNumber);
      await this.api.request('customer/auth/register', 'POST', {
        ...this.profileBody(name, data),
        phoneNumber,
        password,
        verificationToken: proof || '',
      });
      this.proofs.delete(phoneNumber);
      const result = await this.login(phoneNumber, password);
      if (!result.success)
        throw new Error('Đăng ký đã lưu thành công. Vui lòng đăng nhập lại: ' + result.message);
    });
  }
  async updateProfile(_phone: string, name: string, data: Partial<User>) {
    return this.result(async () => {
      await this.api.request('customer/profile', 'PATCH', this.profileBody(name, data));
      await this.refresh();
    });
  }
  async linkEmailAndPassword(_phone: string, _password: string) {
    return { success: false, message: 'Đăng ký được xử lý bởi backend.' };
  }
  async sendOTP(
    phoneNumber: string,
    _recaptcha: unknown,
    type: 'register' | 'forgot' | 'two-factor',
  ): Promise<{ success: boolean; message: string; otp?: string }> {
    return this.result(async () => {
      const data = await this.api.request<{ challengeId: string }>(
        'customer/auth/otp/request',
        'POST',
        {
          phoneNumber,
          purpose:
            type === 'register' ? 'DangKy' : type === 'forgot' ? 'QuenMatKhau' : 'XacThucHaiLop',
        },
      );
      this.challenges.set(phoneNumber, data.challengeId);
      this.proofs.delete(phoneNumber);
    });
  }
  async verifyOTP(phoneNumber: string, code: string) {
    return this.result(async () => {
      const data = await this.api.request<{ verificationToken: string }>(
        'customer/auth/otp/verify',
        'POST',
        { challengeId: this.challenges.get(phoneNumber) || '', code },
      );
      this.proofs.set(phoneNumber, data.verificationToken);
    });
  }
  proof(phone: string): string | undefined {
    return this.proofs.get(phone);
  }
  async resetPassword(phoneNumber: string, newPassword: string) {
    return this.result(async () => {
      await this.api.request('customer/auth/reset-password', 'POST', {
        phoneNumber,
        newPassword,
        verificationToken: this.proofs.get(phoneNumber) || '',
      });
      this.proofs.delete(phoneNumber);
      this.clearSession();
    });
  }
  async changePassword(currentPassword: string, newPassword: string) {
    return this.result(async () => {
      await this.api.request('customer/profile/change-password', 'POST', {
        currentPassword,
        newPassword,
      });
      this.clearSession();
    });
  }
  async softDeleteAccount(_phone: string, password: string) {
    return this.result(async () => {
      await this.api.request('customer/profile/lock', 'POST', { password });
      this.clearSession();
    });
  }
  async setTwoFactor(enabled: boolean, password: string) {
    return this.result(async () => {
      const phone = this.currentUser()?.phoneNumber || '';
      await this.api.request('customer/profile/two-factor', 'PATCH', {
        enabled,
        password,
        verificationToken: this.proofs.get(phone) || '',
      });
      this.proofs.delete(phone);
      await this.refresh();
    });
  }
  sessions() {
    return this.api.request<CustomerSession[]>('customer/profile/sessions');
  }
  revokeSession(id: string) {
    return this.api.request('customer/profile/sessions/' + encodeURIComponent(id), 'DELETE');
  }
  invalidate() {
    this.clearSession();
  }
  tickets<T>() {
    return this.api.all<T>('customer/profile/tickets');
  }
  async logout(_reason?: string): Promise<void> {
    try {
      if (this.currentUser()) await this.api.request('customer/auth/logout', 'POST', {});
    } finally {
      this.clearSession();
    }
  }
  private clearSession() {
    this.currentUser.set(null);
    if (typeof sessionStorage !== 'undefined')
      sessionStorage.removeItem('viago_customer_access_token');
  }
}
