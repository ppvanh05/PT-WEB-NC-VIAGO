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
  async request<T>(
    path: string,
    method = 'GET',
    body?: unknown,
    scope: AccountScope = 'customer',
  ): Promise<T> {
    const token = sessionStorage.getItem(
      scope === 'admin' ? 'viago_admin_access_token' : 'viago_customer_access_token',
    );
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
  async all<T>(path: string, scope: AccountScope = 'customer'): Promise<T[]> {
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
