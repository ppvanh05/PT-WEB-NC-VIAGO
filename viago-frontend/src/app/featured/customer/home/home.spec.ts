import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Home } from './home';
import { HomeApiService } from './home-api.service';
import { BookingService } from './booking.service';

describe('Home connected data', () => {
  let fixture: ComponentFixture<Home>, page: Home;
  const promotion = {
    id: 'KM_DB',
    code: 'DATABASE25',
    title: 'Ưu đãi từ CSDL',
    description: 'Điều kiện thật',
    type: 'PhanTram',
    percent: 25,
    amount: 0,
    maximum: 30000,
    minimum: 200000,
    startsAt: '2026-01-01T00:00:00Z',
    endsAt: '2027-01-01T00:00:00Z',
    remainingUses: 5,
    requiresLogin: false,
  };
  const api = {
    authenticated: false,
    overview: vi.fn(),
    promotions: vi.fn(),
    request: vi.fn(),
    wallet: vi.fn(),
  };
  const booking = {
    now: () => Date.now(),
    sweep: vi.fn(),
    state: vi.fn().mockReturnValue({ holds: [], orders: [], audit: [] }),
    loadDraft: vi.fn().mockReturnValue(null),
    clearDraft: vi.fn(),
    pending: () => undefined,
    saveDraft: vi.fn(),
    voucher: vi.fn(),
    quote: vi.fn(),
    create: vi.fn(),
    trip: vi.fn(),
    catalog: () => [],
    subtotal: () => 200000,
  };
  beforeEach(async () => {
    booking.state.mockReturnValue({ holds: [], orders: [], audit: [] });
    booking.loadDraft.mockReturnValue(null);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    api.overview.mockResolvedValue({
      cities: ['TP.HCM', 'Đà Lạt'],
      featuredRoutes: [],
      promotions: [promotion],
      latestNews: [
        {
          id: 'TT_DB',
          title: 'Tin từ CSDL',
          image: '/assets/customer/logo.png',
          summary: 'Nội dung tin',
          date: '08/11/2026',
        },
      ],
      reviews: [],
      reviewStatistics: { total: 0, averageRating: null },
      booking: {
        paymentMethods: [
          { id: 'vietqr', name: 'VietQR / Chuyển khoản', configured: false },
          { id: 'counter', name: 'Thanh toán tại quầy', configured: true },
        ],
      },
    });
    api.promotions.mockResolvedValue({ data: [promotion], pagination: { totalPages: 1 } });
    api.request.mockResolvedValue({ data: [promotion] });
    booking.sweep.mockResolvedValue(undefined);
    booking.voucher.mockResolvedValue(17000);
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: HomeApiService, useValue: api },
        { provide: BookingService, useValue: booking },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Home);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await page.load();
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });
  it('renders database promotions and news rather than the sample welcome voucher', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('DATABASE25');
    expect(text).toContain('Tin từ CSDL');
    expect(text).not.toContain('WELCOME50');
    expect(page.methods.map((m) => m.id)).toEqual(['vietqr', 'counter']);
    expect(page.method).toBe('counter');
  });
  it('renders an explicit empty state when no active promotions are returned', async () => {
    api.promotions.mockResolvedValueOnce({ data: [], pagination: { totalPages: 0 } });
    await page.loadPromotions();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('chưa có khuyến mãi');
    expect(page.homePromos).toEqual([]);
  });
  it('shows a fetch error without replacing it with sample offers', async () => {
    api.overview.mockRejectedValueOnce(new Error('Dịch vụ chưa kết nối'));
    await page.loadMarketing();
    fixture.detectChanges();
    expect(page.marketingError).toBe('Dịch vụ chưa kết nối');
  });
  it('waits for the backend discount before celebrating a voucher', async () => {
    let resolve!: (amount: number) => void;
    booking.voucher.mockReturnValueOnce(new Promise<number>((done) => (resolve = done)));
    const pending = page.applyVoucher('DATABASE25');
    expect(page.voucherBusy).toBe(true);
    expect(page.discount).toBe(0);
    resolve(17000);
    await pending;
    expect(page.discount).toBe(17000);
    expect(page.voucherCelebrating).toBe(true);
  });
  it('discards an outdated quote when the customer changes the voucher', async () => {
    let resolve!: (amount: number) => void;
    booking.voucher.mockReturnValueOnce(new Promise<number>((done) => (resolve = done)));
    const pending = page.applyVoucher('DATABASE25');
    page.updateVoucher('NEWCODE');
    resolve(17000);
    await pending;
    expect(page.discount).toBe(0);
    expect(page.draft.voucher).toBe('');
    expect(page.voucherCelebrating).toBe(false);
  });
  function completeDraft() {
    const future = new Date(Date.now() + 86400000).toISOString();
    booking.trip.mockReturnValue({
      pickup: [{ id: 'DON', at: future }],
      dropoff: [{ id: 'TRA', at: future }],
    });
    page.draft.passenger = { name: 'Nguyễn Văn An', phone: '0901234567', email: '' };
    page.draft.legs = [
      { tripId: 'LT001', seats: ['1A'], doubleSeats: [], pickupId: 'DON', dropoffId: 'TRA' },
    ];
    page.draft.terms = true;
    page.expiresAt = Date.now() + 600000;
    page.clock = Date.now();
  }
  it('does not lock checkout after an empty or invalid optional voucher', async () => {
    completeDraft();
    await page.applyVoucher('');
    expect(page.voucherError).toBeTruthy();
    expect(page.canReview).toBe(true);
    booking.voucher.mockRejectedValueOnce(new Error('Code invalid'));
    await page.applyVoucher('WRONG');
    expect(page.draft.voucher).toBe('');
    expect(page.canReview).toBe(true);
    booking.quote.mockResolvedValueOnce({ discount: 0 });
    await page.review();
    expect(page.step).toBe('review');
    expect(page.error).toBe('');
  });
  it('creates a counter reservation and keeps it pending instead of showing a paid ticket', async () => {
    completeDraft();
    booking.create.mockResolvedValueOnce({
      id: 'DH016',
      status: 'pending',
      expiresAt: Date.now() + 600000,
      discount: 0,
    });
    await page.createOrder();
    expect(booking.create).toHaveBeenCalledWith(page.draft, 'counter');
    expect(page.order?.id).toBe('DH016');
    expect(page.step).toBe('payment');
  });
  it('keeps VietQR visible and explains missing configuration without creating an online order', async () => {
    completeDraft();
    page.method = 'vietqr';
    expect(page.paymentMethodOptions.some((m) => m.value === 'vietqr')).toBe(true);
    expect(page.paymentReady).toBe(false);
    await page.createOrder();
    expect(page.error).toContain('chuyển khoản chưa sẵn sàng');
    expect(booking.create).not.toHaveBeenCalled();
  });
  it('explains that guests can enter passenger details without requiring sign in', async () => {
    page.draft.passenger.phone = '0901234567';
    await page.lookupCustomer();
    expect(page.lookupNote).toContain('không bắt buộc đăng nhập');
  });
  it('restores the paid confirmation when staff received payment before a pending page was reloaded', async () => {
    completeDraft();
    const saved = structuredClone(page.draft);
    const paid = {
      ...saved,
      id: 'DH016',
      status: 'paid',
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 600000,
      subtotal: 180000,
      discount: 0,
      total: 180000,
      method: 'counter',
      tickets: [],
    };
    booking.loadDraft.mockReturnValue(saved);
    booking.state.mockReturnValue({ holds: [], orders: [paid], audit: [] });
    await page.load();
    expect(page.order?.id).toBe('DH016');
    expect(page.step).toBe('success');
    expect(page.expiresAt).toBe(0);
    expect(booking.clearDraft).toHaveBeenCalled();
  });
});
