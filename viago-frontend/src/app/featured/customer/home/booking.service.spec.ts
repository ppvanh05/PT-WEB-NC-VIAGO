import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingService, DRAFT_KEY } from './booking.service';
import { HomeApiService, type HomeTrip } from './home-api.service';
import type { BookingDraft } from './booking.models';

describe('Booking API connection', () => {
  let service: BookingService;
  let trip: HomeTrip;
  let handler: (url: string, init?: RequestInit) => unknown;
  let fetcher: ReturnType<typeof vi.fn>;
  const now = Date.now();
  const date = new Date(now + 86400000).toISOString().slice(0, 10);
  const query = { from: 'TP.HCM', to: 'Đà Lạt', date, returnDate: '', roundTrip: false, count: 1 };
  const draft = (): BookingDraft => ({
    owner: 'browser-draft',
    key: crypto.randomUUID(),
    terms: true,
    voucher: '',
    legs: [
      { tripId: 'LT_SERVER', seats: ['1A'], doubleSeats: [], pickupId: 'DON', dropoffId: 'TRA' },
    ],
    passenger: { name: 'Nguyễn Văn A', phone: '0901234567', email: '' },
  });
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    trip = {
      id: 'LT_SERVER',
      routeId: 'ROUTE',
      from: 'TP.HCM',
      to: 'Đà Lạt',
      date,
      departureAt: new Date(now + 86400000).toISOString(),
      arrivalAt: new Date(now + 90000000).toISOString(),
      saleClosesAt: new Date(now + 80000000).toISOString(),
      status: 'open',
      type: 'Cabin 22 chỗ',
      price: 180000,
      distance: 300,
      seatDetails: [
        {
          id: 'GC_DATABASE',
          label: 'A01',
          floor: 1,
          row: 1,
          column: 'A',
          price: 220000,
          status: 'available',
          allowDouble: true,
        },
      ],
      pickup: [
        {
          id: 'DON',
          name: 'Điểm đón',
          address: '',
          at: new Date(now + 86400000).toISOString(),
          kind: 'station',
        },
      ],
      dropoff: [
        {
          id: 'TRA',
          name: 'Điểm trả',
          address: '',
          at: new Date(now + 90000000).toISOString(),
          kind: 'station',
        },
      ],
      amenities: [],
    };
    handler = (url, init) => {
      if (url.includes('/trips?'))
        return { outbound: { data: [trip], pagination: { totalPages: 1 } } };
      if (url.includes('/trips/')) return trip;
      if (url.endsWith('/holds') && init?.method === 'POST')
        return {
          expiresAt: new Date(now + 600000).toISOString(),
          serverTime: new Date(now).toISOString(),
        };
      if (url.endsWith('/holds')) return { data: [], serverTime: new Date(now).toISOString() };
      if (url.endsWith('/orders/pending')) return { order: null };
      return {};
    };
    fetcher = vi.fn(async (url, init) => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => handler(String(url), init),
    }));
    vi.stubGlobal('fetch', fetcher);
    TestBed.configureTestingModule({});
    service = TestBed.inject(BookingService);
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });
  it('does not generate trips or orders from local sample storage', () => {
    localStorage.setItem('viago_customer_trip_catalog_v1', JSON.stringify([{ id: 'FAKE' }]));
    expect(service.catalog()).toEqual([]);
    expect(service.state().orders).toEqual([]);
  });
  it('maps actual seat IDs and prices when holding a displayed seat', async () => {
    await service.fetchSearch(query);
    await service.hold('browser-draft', draft().legs);
    const call = fetcher.mock.calls.find(
      ([url, init]) => String(url).endsWith('/holds') && init.method === 'POST',
    )!;
    expect(JSON.parse(call[1].body)).toEqual({
      legs: [
        {
          tripId: 'LT_SERVER',
          seats: ['GC_DATABASE'],
          doubleSeats: [],
          pickupId: 'DON',
          dropoffId: 'TRA',
        },
      ],
    });
    expect(service.subtotal(draft().legs)).toBe(220000);
    expect(service.state().holds[0].seat).toBe('1A');
  });
  it('removes stale results when the backend returns no matching trips', async () => {
    await service.fetchSearch(query);
    expect(service.search(query.from, query.to, date)).toHaveLength(1);
    handler = () => ({ outbound: { data: [], pagination: { totalPages: 0 } } });
    await service.fetchSearch(query);
    expect(service.search(query.from, query.to, date)).toEqual([]);
  });
  it('uses the server discount and never sends a client-calculated price', async () => {
    await service.fetchSearch(query);
    service.saveDraft(draft());
    handler = () => ({ subtotal: 220000, discount: 17000, total: 203000 });
    expect(await service.voucher('ANYCODE', draft().legs, '0901234567')).toBe(17000);
    const call = fetcher.mock.calls.find(([url]) => String(url).endsWith('/quote'))!;
    const body = JSON.parse(call[1].body);
    expect(body.voucher).toBe('ANYCODE');
    expect(body.subtotal).toBeUndefined();
    expect(body.discount).toBeUndefined();
    expect(body.legs[0].seats).toEqual(['GC_DATABASE']);
  });
  it('requires passenger details before claiming that a voucher applies', async () => {
    await service.fetchSearch(query);
    service.saveDraft({ ...draft(), passenger: { name: '', phone: '', email: '' } });
    await expect(service.voucher('CODE', draft().legs, '')).rejects.toThrow('thông tin hành khách');
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith('/quote'))).toBe(false);
  });
  it('does not confirm a payment while the server still reports pending', async () => {
    await service.fetchSearch(query);
    const d = draft();
    handler = () => ({
      ...d,
      id: 'DH_SERVER',
      status: 'pending',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 600000).toISOString(),
      serverTime: new Date(now).toISOString(),
      subtotal: 220000,
      discount: 0,
      total: 220000,
      method: 'counter',
      legs: [{ ...d.legs[0], seats: ['GC_DATABASE'], trip }],
      tickets: [],
    });
    const order = await service.create(d, 'counter');
    await expect(service.pay(order)).rejects.toThrow('chờ thanh toán tại quầy');
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith('/payment'))).toBe(false);
    expect(order.status).toBe('pending');
    expect(order.ticketToken).toBeUndefined();
  });
  it('reports a misrouted HTML page as a connection configuration error', async () => {
    fetcher.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' }),
      json: async () => {
        throw new SyntaxError('HTML is not JSON');
      },
    });
    await expect(TestBed.inject(HomeApiService).overview()).rejects.toThrow(
      'Kết nối dữ liệu chưa đúng cấu hình',
    );
    expect(fetcher.mock.calls[0][1].headers.Accept).toBe('application/json');
  });
  it('loads the server QR for VietQR orders and waits for bank confirmation', async () => {
    await service.fetchSearch(query);
    const d = draft();
    handler = (url) =>
      url.endsWith('/payment')
        ? {
            qrUrl: 'https://img.vietqr.io/image/test.png',
            content: 'VGTEST',
            accountName: 'Test',
            accountNumber: 'TEST0001',
            bankId: 'TESTBANK',
            amount: 220000,
          }
        : {
            ...d,
            id: 'DH_ONLINE',
            status: 'pending',
            createdAt: new Date(now).toISOString(),
            expiresAt: new Date(now + 600000).toISOString(),
            serverTime: new Date(now).toISOString(),
            subtotal: 220000,
            discount: 0,
            total: 220000,
            method: 'vietqr',
            legs: [{ ...d.legs[0], seats: ['GC_DATABASE'], trip }],
            tickets: [],
          };
    const order = await service.create(d, 'vietqr');
    expect(order.paymentDetails?.content).toBe('VGTEST');
    const create = fetcher.mock.calls.find(
      ([url, init]) => String(url).endsWith('/orders') && init.method === 'POST',
    )!;
    expect(JSON.parse(create[1].body).method).toBe('vietqr');
    await expect(service.pay(order)).rejects.toThrow('ngân hàng xác nhận');
    expect(order.status).toBe('pending');
    expect(order.ticketToken).toBeUndefined();
    await expect(service.setMethod(order.id, 'counter')).rejects.toThrow('đổi phương thức');
  });
  it('preserves the server business error for JSON error responses', async () => {
    fetcher.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: async () => ({ message: 'Mã đã hết lượt sử dụng.' }),
    });
    await expect(TestBed.inject(HomeApiService).overview()).rejects.toThrow(
      'Mã đã hết lượt sử dụng.',
    );
  });
  it('never treats a local customer ID as an authenticated backend token', async () => {
    localStorage.setItem('viago_current_user', JSON.stringify({ id: 'KH_OTHER', role: 'admin' }));
    const api = TestBed.inject(HomeApiService);
    await api.wallet();
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBeUndefined();
    sessionStorage.setItem('viago_backend_access_token', 'a'.repeat(64));
    await api.wallet();
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe('Bearer ' + 'a'.repeat(64));
    expect(fetcher.mock.calls[1][1].credentials).toBe('include');
  });
  it('stores only a browser draft in session storage', () => {
    service.saveDraft(draft());
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeTruthy();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});
