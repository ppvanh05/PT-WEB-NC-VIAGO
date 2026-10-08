import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Home } from './home';
import { BookingService, PAYMENT_GATEWAY, CATALOG_KEY, BOOKING_KEY, DRAFT_KEY } from './booking.service';
import { initialCatalog } from './booking.data';
import { SearchableDropdown } from '../../../shared/components/searchable-dropdown/searchable-dropdown';
import { By } from '@angular/platform-browser';
import { DestinationService } from './destination-service';

describe('Customer booking interface', () => {
  let fixture: ComponentFixture<Home>, page: Home;
  const now = Date.parse('2026-10-07T10:00:00+07:00');
  beforeEach(async () => {
    [CATALOG_KEY, BOOKING_KEY, DRAFT_KEY].forEach(k => localStorage.removeItem(k));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    await TestBed.configureTestingModule({ imports: [Home], providers: [provideRouter([]), { provide: DestinationService, useValue: { weather: async () => { throw new Error('Chưa có dự báo.'); } } }, { provide: PAYMENT_GATEWAY, useValue: { verify: async (o: { id: string; total: number }) => ({ reference: `TX-${o.id}`, amount: o.total, receivedAt: new Date(now).toISOString() }) } }] }).compileComponents();
    const service = TestBed.inject(BookingService); vi.spyOn(service, 'now').mockReturnValue(now); localStorage.setItem(CATALOG_KEY, JSON.stringify(initialCatalog(now)));
    fixture = TestBed.createComponent(Home); page = fixture.componentInstance; page.clock = now; page.searchForm.date = '2026-10-08'; fixture.detectChanges(); await page.load(); fixture.detectChanges();
  });
  afterEach(() => { fixture?.destroy(); TestBed.resetTestingModule(); vi.restoreAllMocks(); [CATALOG_KEY, BOOKING_KEY, DRAFT_KEY].forEach(k => localStorage.removeItem(k)); });
  const choose = async () => { await page.search(); page.selectTrip(page.trips[0]); fixture.detectChanges(); await page.toggleSeat('3A'); };
  it('clears search loading on home navigation and ignores a late previous search', async () => {
    let finish!: () => void;
    const sweep = vi.spyOn(page.booking, 'sweep').mockImplementationOnce(() => new Promise<void>(resolve => finish = resolve));
    const oldSearch = page.search();
    expect(page.searching).toBe(true);
    page.returnHome();
    expect(page.searching).toBe(false);
    await page.search();
    expect(page.step).toBe('results');
    page.returnHome();
    finish(); await oldSearch;
    expect(page.step).toBe('home');
    expect(page.searching).toBe(false);
    sweep.mockRestore();
  });
  it('does not block booking when optional search history is malformed', async () => {
    localStorage.setItem('viago_customer_recent_searches_v1', '{');
    await page.load(); expect(page.searchError).toBe('');
    await page.search(); expect(page.step).toBe('results');
    localStorage.removeItem('viago_customer_recent_searches_v1');
  });
  it('uses shared controls and restores uncommitted route text', () => {
    const dropdown = fixture.debugElement.query(By.directive(SearchableDropdown)).componentInstance as SearchableDropdown;
    dropdown.onFocus(); dropdown.searchText = 'C'; dropdown.onInput(); dropdown.closeDropdown();
    expect(dropdown.searchText).toBe('TP.HCM'); expect(page.searchForm.from).toBe('TP.HCM');
    expect(fixture.nativeElement.querySelectorAll('app-date-picker').length).toBe(1);
  });
  it('preserves the original homepage section order and three-column cards', () => {
    const root = fixture.nativeElement as HTMLElement;
    expect([...root.querySelectorAll('.marketing > section')].map(section => section.className)).toEqual(['container utility-section', 'promotion-section', 'container popular-section', 'testimonial-section', 'container news-section']);
    expect(root.querySelectorAll('.amenity-grid img')).toHaveLength(3);
    expect(root.querySelectorAll('app-voucher-card')).toHaveLength(3);
    expect(root.querySelectorAll('.route-card')).toHaveLength(3);
    expect(root.querySelectorAll('.news-card')).toHaveLength(3);
  });
  it('opens trip information inline and selects an upper-floor seat without resetting the flow', async () => {
    await page.search(); const trip = page.trips.find(trip => trip.type === 'Cabin 22 chỗ')!;
    page.toggleTripTab(trip, 'points'); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.trip-expanded').textContent).toContain('Điểm đón'); expect(page.details).toBeNull();
    page.toggleTripTab(trip, 'points'); expect(page.expandedTrip).toBeNull();
    await page.choosePreviewSeat(trip, '3B'); fixture.detectChanges();
    expect(page.step).toBe('results'); expect(page.draft.legs[0].seats).toEqual(['3B']);
    await page.selectTrip(trip); fixture.detectChanges();
    expect(page.step).toBe('booking'); expect(page.draft.legs[0].seats).toEqual(['3B']);
    expect(fixture.nativeElement.querySelectorAll('.original-seat-map .seat-floor')).toHaveLength(2);
  });
  it('renders route-specific results and blocks past search dates', async () => {
    page.searchForm.date = '2026-10-06'; await page.search(); expect(page.step).toBe('home'); expect(page.searchErrors['date']).toBeTruthy();
    page.searchForm.date = '2026-10-08'; await page.search(); fixture.detectChanges();
    expect(page.step).toBe('results'); expect(fixture.nativeElement.querySelectorAll('.trip-card').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).toContain('TP.HCM → Đà Lạt');
  });
  it('retains a fixed countdown when changing seats and warns before leaving', async () => {
    await choose(); const deadline = page.expiresAt; await page.toggleSeat('4A'); expect(page.expiresAt).toBe(deadline); expect(page.seatCount).toBe(2);
    const leaving = page.requestLeave(); expect(page.leaveOpen).toBe(true); await page.resolveLeave('stay'); expect(await leaving).toBe(false);
    const discard = page.requestLeave(); await page.resolveLeave('discard'); expect(await discard).toBe(true); expect(page.booking.state().holds).toHaveLength(0);
  });
  it('allows five seats after searching for one ticket and checks out the actual selection', async () => {
    await choose(); const trip = page.currentTrip!; const deadline = page.expiresAt;
    for (const seat of ['4A', '5A', '6A', '7A']) await page.toggleSeat(seat);
    expect(page.appliedSearch?.count).toBe(1); expect(page.seatCount).toBe(5);
    expect(page.subtotal).toBe(trip.price * 5); expect(page.expiresAt).toBe(deadline);
    expect(page.disabledSeatIds(trip)).not.toContain('8A'); expect(page.disabledSeatIds(trip)).not.toContain('3A');
    await page.toggleSeat('8A'); expect(page.seatCount).toBe(5); expect(page.seatLimitNotice).toBeGreaterThan(0);
    await page.toggleSeat('7A'); expect(page.disabledSeatIds(trip)).not.toContain('8A');
    await page.toggleSeat('8A'); expect(page.seatCount).toBe(5);
    page.updatePassenger('name', '\u004e\u0067\u0075\u0079\u1ec5\u006e An'); page.updatePassenger('phone', '0901234567');
    page.selectPoint(0, 'pickup', trip.pickup[0].id); page.selectPoint(0, 'dropoff', trip.dropoff[0].id); page.draft.terms = true;
    expect(page.canReview).toBe(true); await page.createOrder(); expect(page.order?.legs[0].seats).toHaveLength(5); expect(page.order?.total).toBe(trip.price * 5);
  });
  it('applies vouchers without passenger details and celebrates only explicit successful actions', async () => {
    await choose(); page.applyVoucher('VIAGO2026'); fixture.detectChanges();
    expect(page.draft.passenger.phone).toBe(''); expect(page.discount).toBe(25000); expect(page.voucherError).toBe('');
    expect(fixture.nativeElement.querySelectorAll('.voucher-confetti i')).toHaveLength(32);
    page.voucherCelebrating = false; page.recalculateVoucher(); expect(page.voucherCelebrating).toBe(false);
    page.applyVoucher('NOPE'); expect(page.voucherCelebrating).toBe(false); expect(page.discount).toBe(0);
  });
  it('fills saved passenger fields directly and replaces the lookup hint for misses', async () => {
    await choose(); const leg = page.draft.legs[0], trip = page.currentTrip!;
    page.selectPoint(0, 'pickup', trip.pickup[0].id);
    page.updatePassenger('phone', '0987654321'); page.lookupCustomer(); fixture.detectChanges();
    expect(page.draft.passenger.name).toBe('\u004e\u0067\u0075\u0079\u1ec5\u006e V\u0103n Minh'); expect(page.draft.passenger.email).toBe('minh.nguyen@example.com');
    expect(page.draft.legs[0].pickupId).toBe(leg.pickupId); expect(page.draft.legs[0].seats).toEqual(['3A']);
    expect(fixture.nativeElement.querySelector('.phone-lookup-feedback')).toBeNull();
    page.updatePassenger('phone', '0978484758'); expect(page.lookupNote).toBe(''); page.lookupCustomer();
    expect(page.foundCustomer).toBeNull(); expect(page.lookupNote).toContain('S\u0110T');
    expect(page.draft.passenger.email).toBe('minh.nguyen@example.com');
  });
  it('configures each 22-seat cabin independently, updates prices and persists room choices', async () => {
    await page.search(); const trip = page.trips.find(trip => trip.type === 'Cabin 22 ch\u1ed7')!; await page.selectTrip(trip);
    await page.toggleSeat('3A'); const deadline = page.expiresAt; page.configureLegSeat(0, '3A', 'double');
    expect(page.subtotal).toBe(trip.price * 2); expect(page.draft.legs[0].doubleSeats).toEqual(['3A']);
    await page.toggleSeat('3B'); expect(page.subtotal).toBe(trip.price * 3); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.room-config-card')).toHaveLength(2);
    expect(page.booking.loadDraft()?.legs[0].doubleSeats).toEqual(['3A']);
    page.configureLegSeat(0, '3B', 'double'); expect(page.subtotal).toBe(trip.price * 4); expect(page.expiresAt).toBe(deadline);
    await page.toggleSeat('3A'); expect(page.draft.legs[0].doubleSeats).toEqual(['3B']); expect(page.subtotal).toBe(trip.price * 2);
    page.configureLegSeat(0, '3B', 'single'); expect(page.subtotal).toBe(trip.price); expect(page.draft.legs[0].doubleSeats).toEqual([]);
    page.configureLegSeat(0, '4A', 'double'); expect(page.draft.legs[0].doubleSeats).toEqual([]);
  });
  it('shows inline email/name/phone errors and sanitizes phone input', async () => {
    await choose(); page.updatePassenger('name', '1'); page.updatePassenger('phone', '09abc012345678'); page.updatePassenger('email', 'bad'); fixture.detectChanges();
    expect(page.draft.passenger.phone).toBe('0901234567'); expect(fixture.nativeElement.querySelectorAll('.viago-field__error').length).toBe(2); expect(page.canReview).toBe(false);
  });
  it('completes the whole review/payment/ticket flow through shared buttons', async () => {
    await choose(); page.updatePassenger('name', 'Nguyễn An'); page.updatePassenger('phone', '0901234567');
    const leg = page.draft.legs[0], trip = page.tripFor(leg); page.selectPoint(0, 'pickup', trip.pickup[0].id); page.selectPoint(0, 'dropoff', trip.dropoff[0].id); page.draft.terms = true;
    expect(page.canReview).toBe(true); page.review(); expect(page.step).toBe('review'); await page.createOrder(); expect(page.step).toBe('payment');
    await page.pay(); fixture.detectChanges(); expect(page.step).toBe('success'); expect(fixture.nativeElement.textContent).toContain('Đặt vé thành công');
    page.showTicket(); fixture.detectChanges(); expect(fixture.nativeElement.querySelectorAll('.ticket').length).toBe(1);
  });
  it('starts the countdown only with the first seat and uses the current time immediately', async () => {
    await page.search(); expect(page.expiresAt).toBe(0); page.selectTrip(page.trips[0]); expect(page.expiresAt).toBe(0);
    const started = now + 120000; vi.mocked(page.booking.now).mockReturnValue(started);
    await page.toggleSeat('3A'); expect(page.expiresAt).toBe(started + 600000); expect(page.countdown).toBe('10:00');
    vi.mocked(page.booking.now).mockReturnValue(started + 1000); await page.tick(); expect(page.countdown).toBe('09:59');
  });
  it('keeps updating the clock without queuing overlapping sweeps', async () => {
    await choose(); let finish!: () => void;
    const sweep = vi.spyOn(page.booking, 'sweep').mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    let checking: Promise<void> | undefined;
    for (let i = 0; i < 5; i++) { checking = page.tick(); await Promise.resolve(); if (sweep.mock.calls.length) break; await checking; }
    expect(sweep).toHaveBeenCalledTimes(1);
    vi.mocked(page.booking.now).mockReturnValue(now + 2000); await page.tick(); expect(page.clock).toBe(now + 2000); expect(page.countdown).toBe('09:58');
    expect(sweep).toHaveBeenCalledTimes(1); finish(); await checking;
  });
  it('clears the complete booking at the ten-minute deadline', async () => {
    await choose(); page.updatePassenger('name', 'Nguyễn An'); vi.mocked(page.booking.now).mockReturnValue(page.expiresAt); await page.tick(); fixture.detectChanges();
    expect(page.seatCount).toBe(0); expect(page.draft.passenger.name).toBe(''); expect(page.error).toBe(''); expect(page.canReview).toBe(false); expect(page.step).toBe('results'); expect(page.booking.loadDraft()).toBeNull(); expect(page.pendingDraft).toBeNull(); expect(page.booking.state().holds).toHaveLength(0); expect(page.holdExpiredOpen).toBe(true);
  });
  it('discards the payment screen and persisted draft when an unpaid order expires', async () => {
    await choose(); page.updatePassenger('name', '\u004e\u0067\u0075\u0079\u1ec5\u006e An'); page.updatePassenger('phone', '0901234567');
    const trip = page.currentTrip!; page.selectPoint(0, 'pickup', trip.pickup[0].id); page.selectPoint(0, 'dropoff', trip.dropoff[0].id); page.draft.terms = true;
    await page.createOrder(); const id = page.order!.id;
    vi.mocked(page.booking.now).mockReturnValue(page.expiresAt); await page.tick();
    expect(page.step).toBe('results'); expect(page.order).toBeNull(); expect(page.paymentConfirm).toBe(false); expect(page.booking.loadDraft()).toBeNull();
    expect(page.booking.state().orders.find(order => order.id === id)?.status).toBe('expired');
    await page.load(); expect(page.pendingDraft).toBeNull();
  });
  it('resumes the persisted order after a reload without extending its deadline', async () => {
    await choose(); page.updatePassenger('name', 'Nguyễn An'); page.updatePassenger('phone', '0901234567');
    const leg = page.draft.legs[0], trip = page.tripFor(leg); page.selectPoint(0, 'pickup', trip.pickup[0].id); page.selectPoint(0, 'dropoff', trip.dropoff[0].id); page.draft.terms = true; await page.createOrder();
    const deadline = page.expiresAt, id = page.order!.id; page.returnHome(); await page.load(); page.resume();
    expect(page.step).toBe('payment'); expect(page.order!.id).toBe(id); expect(page.expiresAt).toBe(deadline);
  });
  it('keeps round-trip directions and generates one ticket per selected seat', async () => {
    page.searchForm.roundTrip = true; page.searchForm.returnDate = '2026-10-09'; page.searchForm.count = 2;
    await page.search(); page.selectTrip(page.filteredTrips[0]); expect(page.resultLeg).toBe(1);
    page.selectTrip(page.filteredTrips[0]);
    expect(page.tripFor(page.draft.legs[1]).from).toBe(page.tripFor(page.draft.legs[0]).to);
    await page.toggleSeat('3A'); await page.toggleSeat('4A'); page.seatLeg = 1;
    await page.toggleSeat('3A'); await page.toggleSeat('4A');
    page.updatePassenger('name', 'Nguyễn An'); page.updatePassenger('phone', '0901234567');
    page.draft.legs.forEach((leg, i) => { const trip = page.tripFor(leg); page.selectPoint(i, 'pickup', trip.pickup[0].id); page.selectPoint(i, 'dropoff', trip.dropoff[0].id); });
    page.draft.terms = true; expect(page.canReview).toBe(true); await page.createOrder(); await page.pay(); page.showTicket(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.ticket').length).toBe(4);
  });
  it('does not restore an expired draft after returning or reloading', async () => {
    page.searchForm.count = 2; await choose(); page.updatePassenger('name', 'Nguyễn An');
    vi.mocked(page.booking.now).mockReturnValue(page.expiresAt + 1); page.returnHome(); await page.load();
    expect(page.pendingDraft).toBeNull(); expect(page.booking.loadDraft()).toBeNull(); page.resume(); expect(page.step).toBe('home'); expect(page.draft.passenger.name).toBe(''); expect(page.seatCount).toBe(0);
  });
});
