import { ComponentFixtureAutoDetect, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { NewBooking } from './new-booking';
import { BookingOrdersApi, AdminBookingOrder } from '../booking-orders-api';
import { BookingRoutesApi, BookingRouteTrip } from '../booking-management/booking-routes-api';
import { BookingPointsApi } from '../booking-management/booking-points-api';
import { BookingVehicleTypesApi } from '../booking-management/booking-vehicle-types-api';
import { BookingCustomerApi } from '../booking-management/booking-customer-api';
import { ContentApiError } from '../../../../core/services/content-api.service';

const trip: BookingRouteTrip = {
  id: 'LT003',
  route: {
    id: 'TX002',
    name: 'TP.HCM - Vũng Tàu',
    from: 'TP.HCM',
    to: 'Vũng Tàu',
    distance: 100,
    durationMinutes: 120,
    basePrice: 160000,
    tripsPerDay: 2,
    pickupPoints: [{ id: 'DD005', name: 'Văn phòng Quận 10', address: '', city: 'TP.HCM' }],
    dropoffPoints: [{ id: 'DD013', name: 'Bến xe Vũng Tàu', address: '', city: 'Vũng Tàu' }],
  },
  vehicle: { id: 'XE002', name: 'Limousine', licensePlate: 'TEST-01', type: 'Limousine9Cho' },
  departureDate: '2050-01-01',
  departureTime: '06:00',
  departureAt: '2049-12-31T23:00:00Z',
  arrivalAt: '2050-01-01T01:00:00Z',
  status: 'DangMoBan',
  price: 160000,
  seatCount: 1,
  availableSeatCount: 1,
  seats: [
    {
      id: 'GC042',
      name: '1A',
      floor: 1,
      row: 1,
      column: 1,
      type: 'GheNgoi',
      status: 'Trong',
      price: 160000,
    },
  ],
};
const order = {
  id: 'DH_TEST',
  status: 'pending',
  method: 'counter',
  total: 160000,
  tickets: [],
  legs: [],
} as unknown as AdminBookingOrder;

describe('Admin new booking API flow', () => {
  let api: {
    hold: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
    quote: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    seats: ReturnType<typeof vi.fn>;
    options: ReturnType<typeof vi.fn>;
  };
  beforeEach(() => {
    api = {
      hold: vi.fn(async (holdId: string) => ({
        holdId,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        serverTime: new Date().toISOString(),
      })),
      release: vi.fn().mockResolvedValue({ released: true }),
      quote: vi.fn().mockResolvedValue({
        subtotal: 160000,
        insurance: 0,
        discount: 0,
        total: 160000,
        currency: 'VND',
      }),
      create: vi.fn().mockResolvedValue(order),
      seats: vi.fn().mockResolvedValue({
        id: trip.id,
        availableSeats: 0,
        seatDetails: [{ ...trip.seats[0], label: '1A', status: 'held' }],
      }),
      options: vi.fn().mockResolvedValue({ paymentMethods: [{ id: 'vietqr', configured: true }] }),
    };
    TestBed.configureTestingModule({
      imports: [NewBooking],
      providers: [
        provideRouter([]),
        { provide: ComponentFixtureAutoDetect, useValue: false },
        { provide: BookingOrdersApi, useValue: api },
        { provide: BookingRoutesApi, useValue: {} },
        { provide: BookingPointsApi, useValue: {} },
        { provide: BookingVehicleTypesApi, useValue: {} },
        { provide: BookingCustomerApi, useValue: {} },
      ],
    });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
  function page() {
    const result = TestBed.createComponent(NewBooking).componentInstance;
    result.routeTrips.set([structuredClone(trip)]);
    result.selectedTripId.set(trip.id);
    result.tuyenDuocChon.set(trip.route.id);
    result.gioChayDuocChon.set('06:00');
    result.NgayKhoiHanh.set('2050-01-01');
    result.loaiXeDuocChon.set('Limousine 9 chỗ');
    result.sepayReady.set(true);
    return result;
  }
  async function draft() {
    const result = page();
    await result.ChonGhe('1A');
    result.formTen.set('Nguyễn Văn An');
    result.formSdt.set('0901234567');
    return result;
  }
  function multipleSeats(result: NewBooking) {
    result.routeTrips.set([{ ...structuredClone(trip), seatCount: 3, availableSeatCount: 3,
      seats: Array.from({ length: 3 }, (_, index) => ({ ...trip.seats[0], id: 'GC' + (42 + index), name: (index + 1) + 'A' })) }]);
  }
  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(done => { resolve = done; });
    return { promise, resolve };
  }
  const leaseFor = (id: string) => ({ holdId: id, serverTime: new Date().toISOString(), expiresAt: new Date(Date.now() + 600000).toISOString() });
  it('distinguishes unavailable payment options from missing configuration and allows retry', async () => {
    const result = page();
    api.options.mockRejectedValueOnce(new Error('API unavailable'));
    await result.LoadPaymentOptions();
    expect(result.sepayReady()).toBe(false); expect(result.paymentOptionsLoaded()).toBe(true);
    expect(result.paymentOptionsError()).toContain('Chưa kiểm tra được');
    await result.LoadPaymentOptions();
    expect(result.sepayReady()).toBe(true); expect(result.paymentOptionsError()).toBe('');
  });
  it('keeps QR disabled when configuration is incomplete and reloads it after setup', async () => {
    const result = page();
    api.options.mockResolvedValueOnce({ paymentMethods: [{ id: 'vietqr', configured: false }] });
    await result.LoadPaymentOptions();
    expect(result.sepayReady()).toBe(false); expect(result.paymentOptionsError()).toBe('');
    await result.LoadPaymentOptions(); expect(result.sepayReady()).toBe(true);
  });
  it('selects a seat immediately, then confirms the hold without creating local tickets', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const result = page();
    const pending = result.ChonGhe('1A');
    expect(result.gheDangChon()).toEqual(['1A']);
    expect(result.holdSyncing()).toBe(true); expect(result.processing()).toBe(false);
    await pending;
    expect(api.hold).toHaveBeenCalledWith(expect.any(String), 'LT003', ['GC042']);
    expect(result.gheDangChon()).toEqual(['1A']);
    expect(result.holdDeadline()).toBeGreaterThan(Date.now());
    expect(result.danhSachVe()).toEqual([]);
    expect(storage).not.toHaveBeenCalled();
  });
  it('rejects an unavailable seat without pretending it was held', async () => {
    api.hold.mockRejectedValue(new ContentApiError(409, 'Ghế không còn trống.'));
    const result = page();
    await result.ChonGhe('1A');
    expect(result.gheDangChon()).toEqual([]);
    expect(result.toast()?.msg).toContain('không còn trống');
  });
  it('uses the backend quote and actual stop IDs without adding a limousine surcharge', async () => {
    const result = await draft();
    expect(result.formValid()).toBe(true);
    await result.Review();
    result.reviewConfirmed.set(true);
    await result.LuuDatVe();
    expect(api.quote).toHaveBeenCalledWith(
      expect.objectContaining({
        pickupId: 'DD005',
        dropoffId: 'DD013',
        customer: { name: 'Nguyễn Văn An', phone: '0901234567' },
      }),
    );
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedTotal: 160000,
        source: 'TaiQuay',
        payment: { method: 'TIEN_MAT', confirmReceived: false },
      }),
    );
    expect(result.danhSachVe()).toEqual([]);
  });
  it('never confirms a QR transfer from a local paid checkbox', async () => {
    const result = await draft();
    result.formHinhThuc.set('chuyen-khoan');
    await result.Review();
    result.formTrangThaiThanhToan.set('da-thanh-toan');
    result.reviewConfirmed.set(true);
    await result.LuuDatVe();
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ payment: { method: 'VIETQR', confirmReceived: false } }),
    );
  });
  it('opens review immediately during a slow quote and prevents duplicate quotes or premature creation', async () => {
    const result = await draft();
    const pending = deferred<{ subtotal: number; discount: number; total: number; currency: string }>();
    api.quote.mockReturnValueOnce(pending.promise);
    const reviewing = result.Review();
    expect(result.reviewMode()).toBe(true);
    expect(result.reviewLoading()).toBe(true);
    expect(result.processing()).toBe(false);
    await result.Review();
    expect(api.quote).toHaveBeenCalledTimes(1);
    result.reviewConfirmed.set(true);
    expect(result.CanSubmitOrder()).toBe(false);
    await result.LuuDatVe();
    expect(api.create).not.toHaveBeenCalled();
    pending.resolve({ subtotal: 180000, discount: 0, total: 180000, currency: 'VND' });
    await reviewing;
    expect(result.reviewLoading()).toBe(false);
    expect(result.tongTien()).toBe(180000);
    expect(result.CanSubmitOrder()).toBe(true);
  });
  it('keeps quote errors in review and allows retry without creating an order', async () => {
    const result = await draft();
    api.quote.mockRejectedValueOnce(new Error('Không kết nối được máy chủ.'));
    await result.Review();
    expect(result.reviewMode()).toBe(true);
    expect(result.reviewLoading()).toBe(false);
    expect(result.reviewError()).toContain('Không kết nối');
    result.reviewConfirmed.set(true);
    await result.LuuDatVe();
    expect(api.create).not.toHaveBeenCalled();
    await result.Review();
    expect(result.reviewError()).toBe('');
    expect(result.serverQuote()?.value.total).toBe(160000);
    expect(result.reviewConfirmed()).toBe(false);
  });
  it('ignores an older quote after returning to edit and starting a new review', async () => {
    const result = await draft();
    const oldQuote = deferred<unknown>();
    api.quote.mockReturnValueOnce(oldQuote.promise);
    const oldReview = result.Review();
    result.BackReview();
    expect(result.reviewLoading()).toBe(false);
    await result.Review();
    oldQuote.resolve({ subtotal: 999000, discount: 0, total: 999000, currency: 'VND' });
    await oldReview;
    expect(result.reviewMode()).toBe(true);
    expect(result.reviewError()).toBe('');
    expect(result.serverQuote()?.value.total).toBe(160000);
  });
  it('rejects a quote if booking information changes before it returns', async () => {
    const result = await draft();
    const pending = deferred<unknown>();
    api.quote.mockReturnValueOnce(pending.promise);
    const reviewing = result.Review();
    result.formSdt.set('0909999999');
    pending.resolve({ subtotal: 160000, discount: 0, total: 160000, currency: 'VND' });
    await reviewing;
    expect(result.serverQuote()).toBeNull();
    expect(result.reviewError()).toContain('Thông tin vừa thay đổi');
    expect(result.CanSubmitOrder()).toBe(false);
  });
  it('retries an ambiguous create response with the same payload and idempotency key', async () => {
    const result = await draft();
    await result.Review();
    result.reviewConfirmed.set(true);
    api.create.mockRejectedValueOnce(new Error('Network interrupted')).mockResolvedValueOnce(order);
    await result.LuuDatVe();
    await result.LuuDatVe();
    expect(api.create).toHaveBeenCalledTimes(2);
    expect(api.create.mock.calls[0][0]).toEqual(api.create.mock.calls[1][0]);
  });
  it('uses schedule IDs to distinguish vehicles leaving at the same time', async () => {
    const result = page();
    result.routeTrips.set([
      { ...structuredClone(trip), availableSeatCount: 0, seats: [{ ...trip.seats[0], status: 'DaBan' }] },
      { ...structuredClone(trip), id: 'LT_OTHER', seats: [{ ...trip.seats[0], id: 'GC_OTHER' }] },
    ]);
    result.selectedTripId.set('LT_OTHER');
    await result.ChonGhe('1A');
    expect(api.hold).toHaveBeenCalledWith(expect.any(String), 'LT_OTHER', ['GC_OTHER']);
  });
  it('can book a selected trip without requiring the optional vehicle-type filter', async () => {
    const result = await draft();
    result.loaiXeDuocChon.set('');
    expect(result.formValid()).toBe(true);
    expect(result.loaiXeDangChon().category).toBe('limousine');
  });
  it('uses persisted prices and occupied seats for the trip overview', () => {
    const result = page();
    result.routeTrips.set([
      {
        ...structuredClone(trip),
        availableSeatCount: 0,
        seats: [{ ...trip.seats[0], status: 'DaBan' }],
      },
    ]);
    expect(result.HienThiGiaLoaiXe('limousine')).toBe('160.000đ');
    expect(result.GiaVeTheoLoaiGhe('limousine')).toBe(160000);
    expect(result.ThongKeTheoGio('06:00').daThanhToan).toBe(1);
    expect(result.bangTongQuanChuyen()[0].pct).toBe(100);
  });
  it('uses the scheduled pickup time rather than guessing from the point index', () => {
    const result = page();
    const copy = structuredClone(trip);
    copy.route.pickupPoints[0].at = '2050-01-01T06:20:00+07:00';
    result.routeTrips.set([copy]);
    result.formDiemDon.set('Văn phòng Quận 10');
    expect(result.PickupTime('06:00')).toBe('06:20');
    expect(result.LayGioCoMat('06:00')).toBe('06:05');
  });
  it('stops selecting seats when a refresh reports that sales have closed', async () => {
    const result = page();
    api.seats.mockResolvedValue({ status: 'closed', availableSeats: 1, seatDetails: [{ ...trip.seats[0], label: '1A', status: 'available' }] });
    await result.RefreshSeats(); await result.ChonGhe('1A');
    expect(result.TrangThaiChuyen('06:00')).toBe('Đã khóa');
    expect(api.hold).not.toHaveBeenCalled();
  });
  it('coalesces rapid clicks into one request while immediately coloring both seats', async () => {
    const result = page(); multipleSeats(result);
    const first = result.ChonGhe('1A'), second = result.ChonGhe('2A');
    expect(result.gheDangChon()).toEqual(['1A', '2A']); expect(result.processing()).toBe(false);
    await Promise.all([first, second]);
    expect(api.hold).toHaveBeenCalledTimes(1);
    expect(api.hold).toHaveBeenCalledWith(expect.any(String), 'LT003', ['GC42', 'GC43']);
    expect(api.seats).not.toHaveBeenCalled();
  });
  it('serializes changes made during a slow hold and does not overwrite newer choices', async () => {
    const result = page(); multipleSeats(result);
    const first = deferred<ReturnType<typeof leaseFor>>(), second = deferred<ReturnType<typeof leaseFor>>();
    api.hold.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    const pending = result.ChonGhe('1A');
    await vi.waitFor(() => expect(api.hold).toHaveBeenCalledTimes(1));
    void result.ChonGhe('2A'); void result.ChonGhe('3A');
    expect(result.gheDangChon()).toEqual(['1A', '2A', '3A']); expect(api.hold).toHaveBeenCalledTimes(1);
    first.resolve(leaseFor(api.hold.mock.calls[0][0]));
    await vi.waitFor(() => expect(api.hold).toHaveBeenCalledTimes(2));
    expect(result.gheDangChon()).toEqual(['1A', '2A', '3A']); expect(result.holdSyncing()).toBe(true);
    expect(api.hold.mock.calls[1][2]).toEqual(['GC42', 'GC43', 'GC44']);
    second.resolve(leaseFor(api.hold.mock.calls[1][0])); await pending;
    expect(result.holdSyncing()).toBe(false);
  });
  it('releases after an in-flight hold when the draft is discarded', async () => {
    const result = page(), gate = deferred<ReturnType<typeof leaseFor>>();
    api.hold.mockImplementationOnce(() => gate.promise);
    const pending = result.ChonGhe('1A');
    await vi.waitFor(() => expect(api.hold).toHaveBeenCalledTimes(1));
    result.BoChonTatCa();
    expect(result.gheDangChon()).toEqual([]); expect(api.release).not.toHaveBeenCalled();
    gate.resolve(leaseFor(api.hold.mock.calls[0][0])); await pending;
    await vi.waitFor(() => expect(api.release).toHaveBeenCalledTimes(1));
    expect(result.gheDangChon()).toEqual([]); expect(result.holdDeadline()).toBeNull();
  });
  it('blocks checkout after an ambiguous network error and retries the same draft', async () => {
    const result = page(); api.hold.mockRejectedValueOnce(new Error('Network interrupted'));
    await result.ChonGhe('1A'); result.formTen.set('Nguyễn Văn An'); result.formSdt.set('0901234567');
    expect(result.gheDangChon()).toEqual(['1A']); expect(result.holdSyncError()).toContain('Network');
    expect(result.formValid()).toBe(false);
    await result.RetryHold();
    expect(api.hold.mock.calls[0][0]).toBe(api.hold.mock.calls[1][0]);
    expect(result.holdSyncError()).toBe(''); expect(result.formValid()).toBe(true);
  });
  it('makes discarded seats selectable after release without another inventory request', async () => {
    const result = page();
    await result.ChonGhe('1A');
    expect(result.routeTrips()[0].seats[0].status).toBe('DangGiu');
    result.BoChonTatCa();
    await vi.waitFor(() => expect(result.routeTrips()[0].seats[0].status).toBe('Trong'));
    expect(result.SeatDisabled(result.GheTheoMa('1A')!)).toBe(false);
    expect(api.seats).not.toHaveBeenCalled();
    await result.ChonGhe('1A');
    expect(api.hold).toHaveBeenCalledTimes(2);
  });
  it('preserves confirmed seats when an additional seat is rejected', async () => {
    const result = page(); multipleSeats(result); await result.ChonGhe('1A');
    api.hold.mockRejectedValueOnce(new ContentApiError(409, 'Seat taken'));
    await result.ChonGhe('2A');
    expect(result.gheDangChon()).toEqual(['1A']);
  });
  it('shows the last deselected seat as available immediately during a slow release', async () => {
    const result = page(), release = deferred<{ released: boolean }>();
    await result.ChonGhe('1A');
    api.release.mockReturnValueOnce(release.promise);
    await result.ChonGhe('1A');
    expect(result.GheTheoMa('1A')?.TrangThai).toBe('trong');
    expect(result.SeatDisabled(result.GheTheoMa('1A')!)).toBe(false);
    release.resolve({ released: true });
    await vi.waitFor(() => expect(result.routeTrips()[0].seats[0].status).toBe('Trong'));
    expect(result.GheTheoMa('1A')?.TrangThai).toBe('trong');
  });
  it('shows a deselected seat as available while syncing the remaining selection', async () => {
    const result = page(); multipleSeats(result);
    await Promise.all([result.ChonGhe('1A'), result.ChonGhe('2A')]);
    const hold = deferred<ReturnType<typeof leaseFor>>();
    api.hold.mockReturnValueOnce(hold.promise);
    const syncing = result.ChonGhe('1A');
    expect(result.GheTheoMa('1A')?.TrangThai).toBe('trong');
    expect(result.GheTheoMa('2A')?.TrangThai).toBe('dang-chon');
    await vi.waitFor(() => expect(api.hold).toHaveBeenCalledTimes(2));
    hold.resolve(leaseFor(api.hold.mock.calls[1][0])); await syncing;
    expect(result.GheTheoMa('1A')?.TrangThai).toBe('trong');
  });
  it('serializes an immediate reselect behind the previous release', async () => {
    const result = page(), release = deferred<{ released: boolean }>();
    await result.ChonGhe('1A');
    api.release.mockReturnValueOnce(release.promise);
    await result.ChonGhe('1A');
    const selectedAgain = result.ChonGhe('1A');
    expect(result.GheTheoMa('1A')?.TrangThai).toBe('dang-chon');
    await vi.waitFor(() => expect(api.release).toHaveBeenCalledTimes(1));
    expect(api.hold).toHaveBeenCalledTimes(1);
    release.resolve({ released: true }); await selectedAgain;
    expect(api.hold).toHaveBeenCalledTimes(2);
    expect(result.GheTheoMa('1A')?.TrangThai).toBe('dang-chon');
    expect(result.holdSyncing()).toBe(false);
  });
  it('restores the held state and reports a failed release without freeing other peoples seats', async () => {
    const result = page(); multipleSeats(result);
    result.routeTrips.update(trips => trips.map(trip => ({ ...trip, seats: trip.seats.map(seat => seat.name === '2A' ? { ...seat, status: 'DangGiu' } : seat) })));
    await result.ChonGhe('1A');
    api.release.mockRejectedValueOnce(new Error('Network interrupted'));
    await result.ChonGhe('1A');
    await vi.waitFor(() => expect(result.toast()?.msg).toContain('Chưa trả được ghế'));
    expect(result.GheTheoMa('1A')?.TrangThai).toBe('giu-cho');
    expect(result.GheTheoMa('2A')?.TrangThai).toBe('giu-cho');
    expect(result.SeatDisabled(result.GheTheoMa('2A')!)).toBe(true);
  });
  it('waits 30 seconds after a slow inventory response before polling again', async () => {
    vi.useFakeTimers();
    const result = page(), gate = deferred<{ id: string; availableSeats: number; seatDetails: [] }>();
    api.seats.mockImplementationOnce(() => gate.promise);
    const pending = result.RefreshSeats();
    await vi.advanceTimersByTimeAsync(90000);
    expect(api.seats).toHaveBeenCalledTimes(1);
    gate.resolve({ id: trip.id, availableSeats: 0, seatDetails: [] }); await pending;
    await vi.advanceTimersByTimeAsync(29999); expect(api.seats).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); expect(api.seats).toHaveBeenCalledTimes(2);
    result.ngOnDestroy();
  });
  it('pauses and cancels inventory polling while the page is hidden', async () => {
    vi.useFakeTimers(); const result = page();
    await result.RefreshSeats();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    result.InventoryVisibilityChanged();
    await vi.advanceTimersByTimeAsync(120000); await result.RefreshSeats();
    expect(api.seats).toHaveBeenCalledTimes(1); result.ngOnDestroy();
  });
  it('ignores an older inventory response after a selection starts', async () => {
    const result = page(), gate = deferred<unknown>();
    api.seats.mockImplementationOnce(() => gate.promise);
    const oldRead = result.RefreshSeats();
    await result.ChonGhe('1A');
    gate.resolve({ id: trip.id, availableSeats: 0, seatDetails: [{ ...trip.seats[0], label: '1A', status: 'sold' }] });
    await oldRead;
    expect(result.routeTrips()[0].seats[0].status).toBe('DangGiu');
    expect(result.gheDangChon()).toEqual(['1A']);
  });
});
