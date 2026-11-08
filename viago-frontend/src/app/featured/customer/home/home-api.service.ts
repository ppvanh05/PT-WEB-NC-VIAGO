import { Injectable } from '@angular/core';
import type { TripPoint, VehicleType } from './booking.models';

export interface HomePromotion {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: 'PhanTram' | 'TruTienThang' | 'QuaTang';
  percent: number;
  amount: number;
  maximum: number | null;
  minimum: number;
  startsAt: string;
  endsAt: string;
  routeIds: string[];
  requiresLogin: boolean;
  remainingUses: number | null;
  walletId?: string;
  expiresAt?: string;
}
export interface HomeSeat {
  id: string;
  label: string;
  floor: number;
  row: number;
  column: string;
  price: number;
  allowDouble: boolean;
  status: 'available' | 'selected' | 'held' | 'sold' | 'locked';
}
export interface HomeTrip {
  id: string;
  routeId: string;
  from: string;
  to: string;
  date: string;
  departureAt: string;
  arrivalAt: string;
  saleClosesAt: string;
  status: string;
  type: VehicleType;
  price: number;
  distance: number;
  seatDetails: HomeSeat[];
  pickup: TripPoint[];
  dropoff: TripPoint[];
  amenities: string[];
}
export interface HomeRoute {
  id: string;
  from: string;
  to: string;
  distance: number;
  durationMinutes: number;
  price: number;
  image: string | null;
}
export interface HomeNews {
  id: string;
  title: string;
  summary: string;
  image: string;
  date: string;
  slug: string;
}
export interface HomeReview {
  id: string;
  rating: number;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  route: { from: string; to: string };
}
export interface HomeOverview {
  cities: string[];
  featuredRoutes: HomeRoute[];
  promotions: HomePromotion[];
  latestNews: HomeNews[];
  reviews: HomeReview[];
  reviewStatistics: { total: number; averageRating: number | null };
  booking: { paymentMethods: { id: string; name: string; configured: boolean }[] };
}
export interface HomeOrder {
  id: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'partially_cancelled';
  createdAt: string;
  expiresAt: string;
  serverTime: string;
  passenger: { name: string; phone: string; email?: string };
  subtotal: number;
  discount: number;
  total: number;
  method: string;
  legs: {
    tripId: string;
    seats: string[];
    doubleSeats: string[];
    pickupId: string;
    dropoffId: string;
    trip: HomeTrip | null;
  }[];
  tickets: {
    id: string;
    orderId: string;
    seatId: string;
    seat: string;
    token: string;
    qrValue: string;
  }[];
}
export class HomeApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class HomeApiService {
  // Only a server-issued backend session belongs here. Firebase/local user IDs
  // are never substituted for a backend credential.
  get accessToken(): string {
    try {
      return sessionStorage.getItem('viago_backend_access_token') || '';
    } catch {
      return '';
    }
  }
  get authenticated(): boolean {
    return /^[A-Za-z0-9._~-]{32,512}$/.test(this.accessToken);
  }
  async request<T>(
    path: string,
    body?: unknown,
    method = body === undefined ? 'GET' : 'POST',
  ): Promise<T> {
    const response = await fetch('/customer/home' + path, {
      method,
      credentials: 'include',
      signal: AbortSignal.timeout(20000),
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(this.authenticated ? { Authorization: 'Bearer ' + this.accessToken } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const contentType = response.headers.get('content-type') || '';
    if (contentType && !/\bjson\b/i.test(contentType))
      throw new HomeApiError(
        502,
        'Kết nối dữ liệu chưa đúng cấu hình. Vui lòng tải lại trang hoặc liên hệ hỗ trợ.',
      );
    const data = (await response.json().catch(() => null)) as {
      message?: string | string[];
    } | null;
    if (!response.ok)
      throw new HomeApiError(
        response.status,
        typeof data?.message === 'string'
          ? data.message
          : Array.isArray(data?.message)
            ? data.message.join(' ')
            : 'Chưa kết nối được dịch vụ VIAGO. Vui lòng thử lại.',
      );
    if (data === null)
      throw new HomeApiError(502, 'Dịch vụ trả về dữ liệu không hợp lệ. Vui lòng thử lại.');
    return data as T;
  }
  overview() {
    return this.request<HomeOverview>('');
  }
  promotions(page = 1) {
    return this.request<{
      data: HomePromotion[];
      pagination: { total: number; totalPages: number };
    }>('/promotions?page=' + page + '&pageSize=3');
  }
  wallet() {
    return this.request<{ data: HomePromotion[] }>('/vouchers');
  }
  claim(code: string) {
    return this.request<{ saved: boolean; alreadySaved?: boolean }>(
      '/promotions/' + encodeURIComponent(code) + '/claim',
      {},
    );
  }
}
