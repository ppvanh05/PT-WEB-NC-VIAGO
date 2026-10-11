import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingService, PAYMENT_GATEWAY, CATALOG_KEY, BOOKING_KEY, DRAFT_KEY } from './booking.service';
import { BookingDraft, Trip, passengerErrors, normalizePhone } from './booking.models';
import { initialCatalog } from './booking.data';

describe('Customer booking rules', () => {
  let service: BookingService;
  const now = Date.parse('2026-10-07T10:00:00+07:00');
  const verify = vi.fn(async (order: { id: string; total: number }) => ({ reference: `TX-${order.id}`, amount: order.total, receivedAt: new Date(now).toISOString() }));
  let trip: Trip;
  const draft = (owner = 'owner-a'): BookingDraft => ({ owner, key: `key-${owner}`, legs: [{ tripId: trip.id, seats: ['3A'], doubleSeats: [], pickupId: trip.pickup[0].id, dropoffId: trip.dropoff[0].id }], passenger: { name: ' Nguyễn   Văn An ', phone: '0901234567', email: 'an@example.com' }, voucher: '', terms: true });
  beforeEach(() => {
    [CATALOG_KEY, BOOKING_KEY, DRAFT_KEY].forEach(key => localStorage.removeItem(key));
    verify.mockReset(); verify.mockImplementation(async order => ({ reference: `TX-${order.id}`, amount: order.total, receivedAt: new Date(now).toISOString() }));
    TestBed.configureTestingModule({ providers: [{ provide: PAYMENT_GATEWAY, useValue: { verify } }] });
    service = TestBed.inject(BookingService); vi.spyOn(service, 'now').mockReturnValue(now);
    const catalog = initialCatalog(now); trip = catalog.find(t => t.from === 'TP.HCM' && t.to === 'Đà Lạt' && t.date === '2026-10-08' && t.seats.includes('6A'))!;
    localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
  });
  afterEach(() => { vi.restoreAllMocks(); TestBed.resetTestingModule(); [CATALOG_KEY, BOOKING_KEY, DRAFT_KEY].forEach(key => localStorage.removeItem(key)); });
  it('does not invent trips for unsupported routes or past departures', () => {
    expect(service.search('Vũng Tàu', 'Đà Nẵng', '2026-10-08')).toEqual([]);
    expect(service.search('TP.HCM', 'Đà Lạt', '2026-10-06')).toEqual([]);
    expect(service.search('TP.HCM', 'Cần Thơ', '2026-10-07').every(t => Date.parse(t.saleClosesAt) > now)).toBe(true);
  });
  it('rejects locked/cancelled and fully sold trips', () => {
    trip.status = 'locked'; localStorage.setItem(CATALOG_KEY, JSON.stringify([trip])); service.refreshCatalog();
    expect(service.search(trip.from, trip.to, trip.date)).toEqual([]);
    trip.status = 'cancelled'; service.refreshCatalog(); localStorage.setItem(CATALOG_KEY, JSON.stringify([trip])); expect(service.search(trip.from, trip.to, trip.date)).toEqual([]);
    trip.status = 'open'; trip.soldSeats = [...trip.seats]; service.refreshCatalog(); localStorage.setItem(CATALOG_KEY, JSON.stringify([trip])); expect(service.search(trip.from, trip.to, trip.date)).toEqual([]);
  });
  it('serializes conflicting seat claims and preserves the original hold deadline', async () => {
    const a = draft(), b = draft('owner-b');
    const results = await Promise.allSettled([service.hold(a.owner, a.legs), service.hold(b.owner, b.legs)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    vi.mocked(service.now).mockReturnValue(now + 60000);
    a.legs[0].seats = ['4A'];
    expect(await service.hold(a.owner, a.legs)).toBe(now + service.holdDuration);
    expect(service.seatStatus(trip, '3A')).toBe('available');
  });
  it('limits the entire order to five seats including both directions', async () => {
    const a = draft(); a.legs[0].seats = ['3A', '4A', '5A', '6A', '7A', '8A'];
    await expect(service.hold(a.owner, a.legs)).rejects.toThrow('5 ghế'); expect(service.state().holds).toHaveLength(0);
  });
  it('does not renew an expired session when a delayed seat change arrives', async () => {
    const d = draft(); const deadline = await service.hold(d.owner, d.legs);
    vi.mocked(service.now).mockReturnValue(deadline);
    await expect(service.hold(d.owner, [{ ...d.legs[0], seats: ['3A', '4A'] }], deadline)).rejects.toThrow();
    await service.sweep(); expect(service.state().holds).toHaveLength(0);
  });
  it('expires pending orders, frees seats, and records expiry exactly once', async () => {
    const a = draft(); await service.hold(a.owner, a.legs); const order = await service.create(a, 'vietqr');
    vi.mocked(service.now).mockReturnValue(order.expiresAt + 1); await service.sweep(); await service.sweep();
    expect(service.state().orders[0].status).toBe('expired'); expect(service.seatStatus(trip, '3A')).toBe('available');
    expect(service.state().audit.filter(l => l.action === 'EXPIRE_BOOKING')).toHaveLength(1);
    await expect(service.pay(order)).rejects.toThrow('hết');
  });
  it('creates one order for repeated requests and normalizes the passenger name', async () => {
    const a = draft(); await service.hold(a.owner, a.legs);
    const [one, two] = await Promise.all([service.create(a, 'vietqr'), service.create(a, 'vietqr')]);
    expect(one.id).toBe(two.id); expect(service.state().orders).toHaveLength(1); expect(one.passenger.name).toBe('Nguyễn Văn An'); expect(one.status).toBe('pending');
  });
  it('rechecks trip availability before creating and confirming payment', async () => {
    const a = draft(); await service.hold(a.owner, a.legs); trip.status = 'locked'; localStorage.setItem(CATALOG_KEY, JSON.stringify([trip])); service.refreshCatalog();
    await expect(service.create(a, 'vietqr')).rejects.toThrow('ngừng bán');
    trip.status = 'open'; localStorage.setItem(CATALOG_KEY, JSON.stringify([trip])); service.refreshCatalog(); const order = await service.create(a, 'vietqr');
    trip.status = 'cancelled'; localStorage.setItem(CATALOG_KEY, JSON.stringify([trip])); service.refreshCatalog();
    await expect(service.pay(order)).rejects.toThrow('ngừng bán'); expect(service.state().orders[0].status).toBe('pending');
  });
  it('validates optional email, required phone and name before ordering', async () => {
    expect(passengerErrors({ name: 'An', phone: '0901234567', email: '' })).toEqual({});
    for (const email of ['bad', '.an@example.com', 'an..x@example.com', 'an@example', 'an@-example.com']) expect(passengerErrors({ name: 'An', phone: '0901234567', email }).email).toBeTruthy();
    expect(normalizePhone('+84901234567')).toBe('0901234567');
    const a = draft(); await service.hold(a.owner, a.legs); a.passenger.phone = 'hello';
    await expect(service.create(a, 'vietqr')).rejects.toThrow('hành khách');
  });
  it('validates vouchers and reserves use limits for pending orders', async () => {
    const a = draft(); await service.hold(a.owner, a.legs); expect(service.voucher('VIAGO2026', a.legs, a.passenger.phone)).toBe(25000);
    expect(() => service.voucher('NOPE', a.legs, a.passenger.phone)).toThrow('không hợp lệ');
    a.voucher = 'BANMOI'; await service.create(a, 'vietqr');
    expect(() => service.voucher('BANMOI', a.legs, a.passenger.phone)).toThrow('hết lượt');
  });
  it('requires valid points and acceptance of terms', async () => {
    const a = draft(); await service.hold(a.owner, a.legs); a.terms = false; await expect(service.create(a, 'vietqr')).rejects.toThrow('điều khoản');
    a.terms = true; a.legs[0].pickupId = 'wrong-direction'; await expect(service.create(a, 'vietqr')).rejects.toThrow('đón/trả');
  });
  it('confirms payment once and makes paid seats unavailable', async () => {
    const a = draft(); await service.hold(a.owner, a.legs); const order = await service.create(a, 'momo');
    const [one, two] = await Promise.all([service.pay(order), service.pay(order)]); expect(one.id).toBe(two.id); expect(one.status).toBe('paid');
    expect(verify).toHaveBeenCalledOnce(); expect(service.seatStatus(trip, '3A')).toBe('sold'); expect(service.state().holds).toHaveLength(0);
    await service.pay(order); expect(verify).toHaveBeenCalledOnce(); expect(service.state().audit.filter(l => l.action === 'PAYMENT_CONFIRMED')).toHaveLength(1);
  });
  it('keeps the pending order on failed verification and permits retry with the same ID', async () => {
    const a = draft(); await service.hold(a.owner, a.legs); const order = await service.create(a, 'vietqr');
    verify.mockRejectedValueOnce(new Error('network')); await expect(service.pay(order)).rejects.toThrow('Chưa xác nhận');
    expect(service.state().orders[0].status).toBe('pending'); expect((await service.pay(order)).id).toBe(order.id);
  });
  it('never reports success when persistence fails or a receipt amount is wrong', async () => {
    const a = draft(); await service.hold(a.owner, a.legs); const order = await service.create(a, 'vietqr');
    verify.mockResolvedValueOnce({ reference: 'bad', amount: 1, receivedAt: new Date(now).toISOString() }); await expect(service.pay(order)).rejects.toThrow('chưa khớp');
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    await expect(service.pay(order)).rejects.toThrow('Không lưu'); storage.mockRestore(); expect(service.state().orders[0].status).toBe('pending');
  });
  it('releases seats on cancellation without a refund transaction', async () => {
    const a = draft(); await service.hold(a.owner, a.legs); await service.create(a, 'vietqr'); await service.release(a.owner);
    expect(service.state().orders[0].status).toBe('cancelled'); expect(service.state().holds).toHaveLength(0); expect(service.state().orders[0].payment).toBeUndefined();
  });
});
