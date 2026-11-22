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
  loaiGhe?: string;
  maXe?: string;
  bienSoXe?: string;
  tenXe?: string | null;
  loaiXe?: string;
  maQRVe?: string;
  maGheChuyen?: string;
  maDiemDon?: string | null;
  maDiemTra?: string | null;
  nguonDat: string;
  trangThaiVe: 'GiuCho' | 'ChoKhoiHanh' | 'DaHoanThanh' | 'DaHuy';
  trangThaiDonHang: string;
  thoiGianDat: string;
  paidAmount?: number;
  daThanhToan?: boolean;
  refundId?: string | null;
  refundAmount?: number;
  refundFee?: number;
  refundReason?: string;
  refundStatus?: 'processing' | 'completed' | 'failed';
  refundedAmount?: number;
  refundedAt?: string;
  cancelledAt?: string;
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

  /** Hủy vé đã thanh toán; trả lỗi rõ ràng để màn hình hiển thị. */
  cancelTicket(ticketId: string, reason: string, carrierFault: boolean) {
    return this.post(`tickets/${encodeURIComponent(ticketId)}/cancel`, { reason, carrierFault });
  }

  /** Ghi nhận kết quả hoàn tiền thủ công. */
  completeRefund(refundId: string, success: boolean) {
    return this.post(`refunds/${encodeURIComponent(refundId)}/complete`, { success });
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const response = await fetch(`/api/admin/booking-management/${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...this.session.headers() },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = (data as { message?: string | string[] } | null)?.message;
      throw new Error(Array.isArray(message) ? message.join(' ') : message || 'Không thực hiện được thao tác.');
    }
    return data;
  }
}
