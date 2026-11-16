import { Injectable, signal } from '@angular/core';
export interface AdminAccount {
  id: string;
  staffId: string;
  name: string;
  phoneNumber: string;
  email: string;
  avatar: string;
  role: 'admin';
  roleName?: string;
  permissions?: string[];
  supportChat?: boolean;
}
@Injectable({ providedIn: 'root' })
export class AdminSessionService {
  readonly account = signal<AdminAccount | null>(null);
  private readonly tokenKey = 'viago_admin_access_token';
  private validatedToken = '';
  private validatedUntil = 0;
  private restoring?: { token: string; result: Promise<boolean> };
  headers(): Record<string, string> {
    try {
      const token = sessionStorage.getItem(this.tokenKey);
      return token ? { Authorization: 'Bearer ' + token } : {};
    } catch {
      return {};
    }
  }
  private async request<T>(path: string, body?: object): Promise<T> {
    let response: Response;
    try {
      response = await fetch('/api/admin/auth' + path, {
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
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'TimeoutError')
        throw new Error('Yêu cầu đăng nhập đã hết thời gian chờ. Vui lòng thử lại.');
      throw new Error('Không kết nối được dịch vụ đăng nhập. Kiểm tra backend và thử lại.');
    }
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
    if (!data.token || !data.account)
      throw new Error('Không nhận được phiên đăng nhập hợp lệ.');
    sessionStorage.setItem(this.tokenKey, data.token);
    this.setAccount(data.account);
    this.rememberValidation(data.token);
  }
  restore(): Promise<boolean> {
    const token = this.headers()['Authorization'] || '';
    if (!token) {
      this.clear();
      return Promise.resolve(false);
    }
    const account = this.account();
    if (account?.roleName && Array.isArray(account.permissions) &&
        this.validatedToken === token && Date.now() < this.validatedUntil)
      return Promise.resolve(true);
    if (this.restoring?.token === token) return this.restoring.result;
    const result = this.restoreToken(token);
    this.restoring = { token, result };
    void result.finally(() => {
      if (this.restoring?.result === result) this.restoring = undefined;
    });
    return result;
  }
  private rememberValidation(token: string): void {
    this.validatedToken = token.startsWith('Bearer ') ? token : 'Bearer ' + token;
    this.validatedUntil = Date.now() + 30000;
  }
  private async restoreToken(token: string): Promise<boolean> {
    try {
      const data = await this.request<{ account: AdminAccount }>('/me');
      if (this.headers()['Authorization'] !== token) return false;
      this.setAccount(data.account);
      this.rememberValidation(token);
      return true;
    } catch {
      if (this.headers()['Authorization'] === token) this.clear();
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
    this.validatedToken = '';
    this.validatedUntil = 0;
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
