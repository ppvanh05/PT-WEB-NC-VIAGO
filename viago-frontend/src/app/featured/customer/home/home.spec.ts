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
    state: () => ({ holds: [], orders: [], audit: [] }),
    loadDraft: () => null,
    clearDraft: vi.fn(),
    pending: () => undefined,
    saveDraft: vi.fn(),
    voucher: vi.fn(),
    catalog: () => [],
    subtotal: () => 200000,
  };
  beforeEach(async () => {
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
      booking: { paymentMethods: [{ id: 'vietqr', configured: false }] },
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
    expect(page.methods).toEqual([]);
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
});
