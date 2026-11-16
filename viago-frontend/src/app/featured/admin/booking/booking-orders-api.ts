import { Injectable, inject } from '@angular/core';
import { AdminContentApi } from '../../../core/services/content-api.service';

export interface BookingCustomer {
  name: string;
  phone: string;
  email?: string;
}
export interface BookingQuoteInput {
  holdId: string;
  seatIds?: string[];
  customer: BookingCustomer;
  pickupId: string;
  dropoffId: string;
  voucherCode?: string;
  doubleSeatIds: string[];
}
export interface BookingQuote {
  subtotal: number;
  discount: number;
  insurance: number;
  total: number;
  currency: string;
}
export interface BookingCreateInput extends BookingQuoteInput {
  idempotencyKey: string;
  expectedTotal: number;
  source: 'TaiQuay' | 'Hotline';
  note?: string;
  payment: { method: 'TIEN_MAT' | 'VIETQR'; confirmReceived: boolean };
}
export interface BookingTripSeats {
  id: string;
  status?: string;
  departureAt: string;
  availableSeats: number;
  seatDetails: {
    id: string;
    label: string;
    price: number;
    status: string;
    type: string;
    floor: number;
    row: number;
    column: number;
    allowDouble: boolean;
  }[];
}
export interface AdminBookingOrder {
  id: string;
  status: string;
  orderStatus: string;
  source: string;
  note: string;
  createdAt: string;
  expiresAt: string;
  serverTime: string;
  subtotal: number;
  discount: number;
  total: number;
  method: string;
  paymentStatus?: string;
  paymentCode?: string;
  requiresReview: boolean;
  passenger: BookingCustomer;
  legs: {
    tripId: string;
    seats: string[];
    doubleSeats: string[];
    pickupId?: string;
    dropoffId?: string;
    trip:
      | (BookingTripSeats & {
          from: string;
          to: string;
          pickup: { id: string; name: string }[];
          dropoff: { id: string; name: string }[];
        })
      | null;
  }[];
  tickets: { id: string; seatId: string; seat: string; qrValue: string; paidAmount: number }[];
  transfer: {
    qrUrl: string;
    bankId: string;
    accountNumber: string;
    accountType?: 'bank' | 'virtual';
    accountName: string;
    amount: number;
    content: string;
    environment?: 'test' | 'live';
  } | null;
}
export interface AdminBookingOrderRow {
  id: string;
  name: string;
  phone: string;
  route: string;
  departureAt: string;
  createdAt: string;
  status: string;
  total: number;
  source: string;
}
@Injectable({ providedIn: 'root' })
export class BookingOrdersApi {
  private readonly api = inject(AdminContentApi);
  private request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal) {
    return this.api.request<T>('booking-management/' + path, method, body, signal);
  }
  options() {
    return this.request<{ paymentMethods: { id: string; configured: boolean }[] }>('options');
  }
  seats(id: string, signal?: AbortSignal) {
    return this.request<BookingTripSeats>('trips/' + encodeURIComponent(id) + '/seats', 'GET', undefined, signal);
  }
  hold(holdId: string, tripId: string, seatIds: string[]) {
    return this.request<{ holdId: string; expiresAt: string; serverTime: string; seatIds: string[]; releasedSeatIds: string[] }>(
      'holds',
      'POST',
      { holdId, tripId, seatIds },
    );
  }
  release(id: string) {
    return this.request<{ released: boolean }>('holds/' + encodeURIComponent(id), 'DELETE');
  }
  quote(body: BookingQuoteInput) {
    return this.request<BookingQuote>('quote', 'POST', body);
  }
  create(body: BookingCreateInput) {
    return this.request<AdminBookingOrder>('orders', 'POST', body);
  }
  get(id: string, signal?: AbortSignal) {
    return this.request<AdminBookingOrder>('orders/' + encodeURIComponent(id), 'GET', undefined, signal);
  }
  list(page = 1) {
    return this.request<{ data: AdminBookingOrderRow[]; pagination: { totalPages: number } }>(
      'orders?pageSize=10&page=' + page,
    );
  }
  confirm(id: string, amount: number, key: string) {
    return this.request<AdminBookingOrder>(
      'orders/' + encodeURIComponent(id) + '/confirm-payment',
      'POST',
      { receivedAmount: amount, idempotencyKey: key },
    );
  }
  cancel(id: string, reason: string) {
    return this.request<AdminBookingOrder>('orders/' + encodeURIComponent(id) + '/cancel', 'POST', {
      reason,
    });
  }
}
