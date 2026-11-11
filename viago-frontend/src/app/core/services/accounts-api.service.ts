import { Injectable } from '@angular/core';
export type AccountScope = 'customer' | 'admin';
export interface ApiPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export class AccountApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
@Injectable({ providedIn: 'root' })
export class AccountsApiService {
  private readonly reads = new Map<string, { expires: number; data: unknown }>();
  private readonly pendingReads = new Map<string, Promise<unknown>>();
  private revision = 0;
  invalidateAdminReads(): void {
    this.revision++;
    this.reads.clear();
    this.pendingReads.clear();
  }
  async request<T>(path: string, method = 'GET', body?: unknown, scope: AccountScope = 'customer'): Promise<T> {
    method = method.toUpperCase();
    const token = sessionStorage.getItem(scope === 'admin' ? 'viago_admin_access_token' : 'viago_customer_access_token');
    if (method !== 'GET') this.invalidateAdminReads();
    const cacheable = method === 'GET' && scope === 'admin' && !!token &&
      /^\/?admin\/(employees|customers|activity-logs)(\/|\?|$)/.test(path);
    if (!cacheable) {
      const result = await this.fetchJson<T>(path, method, body, token);
      if (method !== 'GET') this.invalidateAdminReads();
      return result;
    }
    const key = `${this.revision}:${token}:${path}`;
    const cached = this.reads.get(key);
    if (cached && cached.expires > Date.now()) return structuredClone(cached.data) as T;
    let pending = this.pendingReads.get(key);
    if (!pending) {
      const revision = this.revision;
      pending = this.fetchJson<T>(path, method, body, token).then(data => {
        if (revision === this.revision) {
          for (const [oldKey, entry] of this.reads)
            if (entry.expires <= Date.now()) this.reads.delete(oldKey);
          if (this.reads.size >= 50) this.reads.clear();
          this.reads.set(key, { data: structuredClone(data), expires: Date.now() + 10000 });
        }
        return data;
      }).finally(() => {
        if (this.pendingReads.get(key) === pending) this.pendingReads.delete(key);
      });
      this.pendingReads.set(key, pending);
    }
    return structuredClone(await pending) as T;
  }
  private async fetchJson<T>(
    path: string,
    method = 'GET',
    body?: unknown,
    token: string | null = null,
  ): Promise<T> {
    const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
    const response = await fetch('/api/' + path.replace(/^\//, ''), {
      method,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined || multipart ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined
        ? {}
        : { body: multipart ? (body as FormData) : JSON.stringify(body) }),
      signal: AbortSignal.timeout(multipart ? 120000 : 30000),
    }).catch((error: unknown) => {
      const timedOut = error instanceof DOMException &&
        (error.name === 'TimeoutError' || error.name === 'AbortError');
      throw new AccountApiError(
        timedOut ? 408 : 0,
        timedOut
          ? 'Tải dữ liệu quá lâu. Vui lòng thử lại.'
          : 'Không kết nối được backend. Vui lòng kiểm tra backend đang chạy và thử lại.',
      );
    });
    if (!/\bjson\b/i.test(response.headers.get('content-type') || ''))
      throw new AccountApiError(502, 'Chưa kết nối được backend. Vui lòng thử lại.');
    const data = await response.json();
    if (!response.ok)
      throw new AccountApiError(
        response.status,
        Array.isArray(data.message)
          ? data.message.join(' ')
          : data.message || 'Không thực hiện được yêu cầu.',
      );
    return data as T;
  }
  async all<T>(path: string, scope: AccountScope = 'customer', refresh = false): Promise<T[]> {
    if (refresh) this.invalidateAdminReads();
    const rows: T[] = [];
    for (let page = 1; ; page++) {
      const result = await this.request<ApiPage<T>>(
        `${path}${path.includes('?') ? '&' : '?'}page=${page}&pageSize=100`,
        'GET',
        undefined,
        scope,
      );
      rows.push(...result.items);
      if (rows.length >= result.total || !result.items.length) return rows;
    }
  }
}
export const genderLabel = (value: string) =>
  ({ Nam: 'Nam', Nu: 'Nữ', Khac: 'Khác' })[value] || value;
export const genderValue = (value?: string) =>
  value ? { Nam: 'Nam', Nữ: 'Nu', Khác: 'Khac' }[value] || value : undefined;
export const roleLabel = (value: string) =>
  ({
    QuanTriVien: 'Quản trị viên',
    BanQuanLy: 'Ban quản lý',
    NhanVienDieuPhoi: 'Nhân viên điều phối',
    NhanVienBanVe: 'Nhân viên bán vé',
    NhanVienCSKH: 'Nhân viên CSKH',
    KhachHang: 'Khách hàng',
  })[value] || value;
export const statusLabel = (value: string) => (value === 'HoatDong' ? 'Đang hoạt động' : 'Đã khóa');
