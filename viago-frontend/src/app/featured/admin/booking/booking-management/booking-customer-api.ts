import { Injectable, inject } from '@angular/core';
import { AdminSessionService } from '../../../../core/services/admin-session.service';

export interface CustomerBookingInfo {
  makhachhang: string;
  hotenkhachhang: string;
  sodienthoai: string;
  email: string | null;
  diemtichluy: number;
  diemdon: string | null;
  diemtra: string | null;
}

export interface RawTicketRow {
  maVe: string;
  maDonHang: string;
  maLichTrinh: string;
  hoTenNguoiDi: string;
  sdtNguoiDi: string;
  tenTuyenXe: string;
  ngayKhoiHanh: string;
  gioKhoiHanh: string;
  soGhe: string;
  giaVe: number;
  nguonDat: string;
  trangThaiVe: 'GiuCho' | 'ChoKhoiHanh' | 'DaHoanThanh' | 'DaHuy';
  trangThaiDonHang: string;
  thoiGianDat: string;
}

@Injectable({ providedIn: 'root' })
export class BookingCustomerApi {
  private readonly session = inject(AdminSessionService);
  async getCustomerInfoByPhone(phone: string): Promise<CustomerBookingInfo | null> {
    const clean = phone.trim();
    if (!clean) return null;
    const query = new URLSearchParams({ phone: clean });
    try {
      const response = await fetch(
        `/api/admin/booking-management/getCustomerInfoByPhone?${query}`,
        {
          headers: { Accept: 'application/json', ...this.session.headers() },
          cache: 'no-store',
          signal: AbortSignal.timeout(6000),
        },
      );
      if (!response.ok) return null;
      const data = await response.json();
      return (data as CustomerBookingInfo) ?? null;
    } catch {
      return null;
    }
  }

  async getAllRoutesName(): Promise<string[]> {
    try {
      const response = await fetch(
        '/api/admin/booking-management/getAllRoutesName',
        {
          headers: { Accept: 'application/json', ...this.session.headers() },
          cache: 'no-store',
          signal: AbortSignal.timeout(6000),
        },
      );
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('[BookingCustomerApi] Lỗi gọi getAllRoutesName:', err);
      return [];
    }
  }

  async getAllTickets(): Promise<RawTicketRow[]> {
    try {
      const response = await fetch(
        '/api/admin/booking-management/getAllTickets',
        {
          headers: { Accept: 'application/json', ...this.session.headers() },
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('[BookingCustomerApi] Lỗi gọi getAllTickets:', err);
      return [];
    }
  }
}
