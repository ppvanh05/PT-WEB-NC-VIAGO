import { Injectable, signal } from '@angular/core';
export interface AdminAccount {
  id: string;
  staffId: string;
  name: string;
  phoneNumber: string;
  email: string;
  avatar: string;
  role: 'admin';
}
@Injectable({ providedIn: 'root' })
export class AdminSessionService {
  readonly account = signal<AdminAccount | null>(null);
  private readonly tokenKey = 'viago_admin_access_token';
  headers(): Record<string, string> {
    try {
      const token = sessionStorage.getItem(this.tokenKey);
      return token ? { Authorization: 'Bearer ' + token } : {};
    } catch {
      return {};
    }
  }
  private async request<T>(path: string, body?: object): Promise<T> {
    const response = await fetch('/admin/auth' + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'include',
      signal: AbortSignal.timeout(20000),
      headers: {
        Accept: 'application/json',
        ...this.headers(),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!/\bjson\b/i.test(response.headers.get('content-type') || ''))
      throw new Error('Chưa kết nối được dịch vụ đăng nhập quản trị.');
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        typeof data.message === 'string' ? data.message : 'Không thực hiện được yêu cầu đăng nhập.',
      );
    return data as T;
  }
  async login(username: string, password: string) {
    const data = await this.request<{ token: string; account: AdminAccount }>('/login', {
      username,
      password,
    });
    sessionStorage.setItem(this.tokenKey, data.token);
    this.setAccount(data.account);
  }
  async restore(): Promise<boolean> {
    if (!this.headers()['Authorization']) {
      this.clear();
      return false;
    }
    try {
      const data = await this.request<{ account: AdminAccount }>('/me');
      this.setAccount(data.account);
      return true;
    } catch {
      this.clear();
      return false;
    }
  }
  private setAccount(account: AdminAccount) {
    this.account.set(account);
    sessionStorage.setItem('viago_admin_account', JSON.stringify(account));
  }
  invalidate() {
    this.clear();
  }
  private clear() {
    let previousId = this.account()?.id;
    this.account.set(null);
    try {
      previousId ||= JSON.parse(sessionStorage.getItem('viago_admin_account') || 'null')?.id;
      if (previousId) sessionStorage.removeItem('viago_support_workspace_' + previousId);
      sessionStorage.removeItem(this.tokenKey);
      sessionStorage.removeItem('viago_admin_account');
    } catch {
      /* Storage may be unavailable. */
    }
  }
  async logout() {
    try {
      await this.request('/logout', {});
    } finally {
      this.clear();
    }
  }
}
