import { Injectable, InjectionToken, inject } from '@angular/core';
import { initialCatalog, SAVED_PASSENGER_EXAMPLES, VOUCHERS } from './booking.data';
import { BookingAudit, BookingDraft, BookingLeg, BookingOrder, BookingState, Passenger, Trip, passengerErrors, normalizeName, vietnamDate } from './booking.models';

export class BookingError extends Error {
  constructor(readonly code: 'storage' | 'conflict' | 'closed' | 'expired' | 'validation' | 'payment', message: string) { super(message); }
}
export interface PaymentReceipt { reference: string; amount: number; receivedAt: string; }
export interface PaymentGateway { verify(order: BookingOrder): Promise<PaymentReceipt>; }
// Frontend-only payment adapter; never use this implementation as payment verification in production.
export const PAYMENT_GATEWAY = new InjectionToken<PaymentGateway>('booking.paymentGateway', {
  providedIn: 'root', factory: () => ({ async verify(order) {
    await new Promise(resolve => setTimeout(resolve, 450));
    if (!navigator.onLine) throw new Error('offline');
    return { reference: `TX-${order.id}`, amount: order.total, receivedAt: new Date().toISOString() };
  } }),
});
export const CATALOG_KEY = 'viago_customer_trip_catalog_v1';
export const BOOKING_KEY = 'viago_customer_booking_state_v1';
export const DRAFT_KEY = 'viago_customer_booking_draft_v1';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly gateway = inject(PAYMENT_GATEWAY);
  private paymentRequests = new Map<string, Promise<BookingOrder>>();
  readonly holdDuration = 10 * 60 * 1000;
  private catalogCache?: Trip[];
  refreshCatalog(): void { this.catalogCache = undefined; }
  now(): number { return Date.now(); }
  private read<T>(key: string, fallback: T): T {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
    catch { throw new BookingError('storage', 'Không đọc được dữ liệu. Vui lòng thử lại.'); }
  }
  private write(key: string, value: unknown): void {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { throw new BookingError('storage', 'Không lưu được dữ liệu. Kiểm tra dung lượng lưu trữ rồi thử lại.'); }
  }
  catalog(): Trip[] {
    if (this.catalogCache) return this.catalogCache;
    const saved = this.read<Trip[] | null>(CATALOG_KEY, null);
    if (saved === null) { const trips = initialCatalog(this.now()); this.write(CATALOG_KEY, trips); return this.catalogCache = trips; }
    if (!Array.isArray(saved) || saved.some(t => !t?.id || !Array.isArray(t.seats) || !Array.isArray(t.pickup) || !Array.isArray(t.dropoff))) throw new BookingError('storage', 'Dữ liệu lịch trình không hợp lệ. Vui lòng thử lại.');
    let corrected = false;
    for (const trip of saved) if (trip.type === 'Cabin 22 chỗ' && trip.seats.includes('11B') && !trip.seats.includes('12A')) {
      trip.seats = [...Array.from({ length: 12 }, (_, i) => `${i + 1}A`), ...Array.from({ length: 10 }, (_, i) => `${i + 1}B`)]; corrected = true;
    }
    if (corrected) this.write(CATALOG_KEY, saved);
    return this.catalogCache = saved;
  }
  state(): BookingState {
    const state = this.read<BookingState>(BOOKING_KEY, { holds: [], orders: [], audit: [] });
    if (!Array.isArray(state.holds) || !Array.isArray(state.orders) || !Array.isArray(state.audit)) throw new BookingError('storage', 'Dữ liệu đặt vé không hợp lệ.');
    return state;
  }
  private audit(state: BookingState, owner: string, action: string, orderId: string, before: string, after: string, result: 'success' | 'failure' = 'success'): void {
    const user = this.read<{id?: string; name?: string; phoneNumber?: string} | null>('viago_current_user', null);
    const actor = action === 'EXPIRE_BOOKING' ? { code: '', name: 'Hệ thống', username: '', phone: '', role: 'Hệ thống' } : { code: user?.id || '', name: user?.name || 'Khách vãng lai', username: user?.phoneNumber || '', phone: user?.phoneNumber || '', role: 'Khách hàng' };
    state.audit.push({ id: crypto.randomUUID(), at: new Date(this.now()).toISOString(), owner, action, orderId, before, after, result, actor, userAgent: navigator.userAgent });
  }
  private expire(state: BookingState): void {
    const now = this.now();
    for (const order of state.orders) if (order.status === 'pending' && order.expiresAt <= now) {
      order.status = 'expired'; this.audit(state, order.owner, 'EXPIRE_BOOKING', order.id, 'pending', 'expired');
    }
    state.holds = state.holds.filter(hold => hold.expiresAt > now && (!hold.orderId || state.orders.some(o => o.id === hold.orderId && o.status === 'pending')));
  }
  private async exclusive<T>(run: () => T): Promise<T> {
    // Web Locks serialize seat claims across tabs in the same browser. Cross-device locking belongs to the API.
    if (typeof navigator !== 'undefined' && navigator.locks) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      try {
        return await navigator.locks.request(BOOKING_KEY, { signal: controller.signal }, () => {
          clearTimeout(timer); return run();
        });
      } catch (error) {
        if (controller.signal.aborted) throw new BookingError('conflict', 'Thao tác đang bận. Vui lòng thử lại.');
        throw error;
      } finally { clearTimeout(timer); }
    }
    return run();
  }
  async sweep(): Promise<void> { await this.exclusive(() => {
    const state = this.state(); const before = JSON.stringify(state); this.expire(state);
    if (before !== JSON.stringify(state)) this.write(BOOKING_KEY, state);
    const draft = this.loadDraft();
    if (draft?.legs.some(leg => leg.seats.length) && !state.holds.some(hold => hold.owner === draft.owner) && !state.orders.some(order => order.owner === draft.owner && order.status === 'pending' && order.expiresAt > this.now())) this.clearDraft();
  }); }
  trip(id: string): Trip { const trip = this.catalog().find(t => t.id === id); if (!trip) throw new BookingError('closed', 'Chuyến đã ngừng bán vé. Vui lòng chọn chuyến khác.'); return trip; }
  isOpen(trip: Trip): boolean { return trip.status === 'open' && Date.parse(trip.saleClosesAt) > this.now() && Date.parse(trip.departureAt) > this.now(); }
  search(from: string, to: string, date: string): Trip[] {
    const state = this.state();
    return this.catalog().filter(t => t.from === from && t.to === to && t.date === date && this.isOpen(t) && this.available(t, state) > 0);
  }
  seatStatus(trip: Trip, seat: string, owner = '', state = this.state()): 'available' | 'held' | 'sold' | 'selected' {
    if (trip.soldSeats.includes(seat) || state.orders.some(o => o.status === 'paid' && o.legs.some(l => l.tripId === trip.id && l.seats.includes(seat)))) return 'sold';
    const hold = state.holds.find(h => h.tripId === trip.id && h.seat === seat && h.expiresAt > this.now());
    return hold ? hold.owner === owner ? 'selected' : 'held' : 'available';
  }
  available(trip: Trip, state = this.state(), owner = ''): number { return trip.seats.filter(seat => ['available', 'selected'].includes(this.seatStatus(trip, seat, owner, state))).length; }
  holdExpiry(owner: string): number { return Math.min(...this.state().holds.filter(h => h.owner === owner && h.expiresAt > this.now()).map(h => h.expiresAt)); }
  async hold(owner: string, legs: BookingLeg[], expectedExpiry = 0): Promise<number> {
    return this.exclusive(() => {
      if (expectedExpiry && expectedExpiry <= this.now()) throw new BookingError('expired', 'Hết thời gian giữ ghế. Vui lòng chọn lại ghế.');
      const state = this.state(); this.expire(state);
      const count = legs.reduce((sum, leg) => sum + leg.seats.length, 0);
      if (count > 5) throw new BookingError('validation', 'Tối đa 5 ghế cho mỗi đơn.');
      if (state.orders.some(o => o.owner === owner && o.status === 'pending')) throw new BookingError('validation', 'Đơn đang chờ thanh toán. Vui lòng hủy giữ chỗ trước khi đổi ghế.');
      for (const leg of legs) {
        const trip = this.trip(leg.tripId);
        if (!this.isOpen(trip)) throw new BookingError('closed', 'Chuyến đã ngừng bán vé. Vui lòng chọn chuyến khác.');
        if (new Set(leg.seats).size !== leg.seats.length || leg.seats.some(seat => !trip.seats.includes(seat))) throw new BookingError('validation', 'Ghế không hợp lệ.');
        if (leg.seats.some(seat => !['available', 'selected'].includes(this.seatStatus(trip, seat, owner, state)))) throw new BookingError('conflict', 'Ghế vừa được người khác đặt. Vui lòng chọn ghế khác.');
      }
      const oldExpiry = Math.min(...state.holds.filter(h => h.owner === owner).map(h => h.expiresAt));
      const expiresAt = Number.isFinite(oldExpiry) ? oldExpiry : this.now() + this.holdDuration;
      const before = JSON.stringify(state.holds.filter(h => h.owner === owner).map(h => ({ tripId: h.tripId, seat: h.seat })));
      state.holds = state.holds.filter(h => h.owner !== owner);
      for (const leg of legs) for (const seat of leg.seats) state.holds.push({ owner, tripId: leg.tripId, seat, expiresAt });
      this.audit(state, owner, 'HOLD_SEATS', '', before, JSON.stringify(legs.map(l => ({ tripId: l.tripId, seats: l.seats }))));
      this.write(BOOKING_KEY, state);
      return count ? expiresAt : 0;
    });
  }
  async release(owner: string): Promise<void> { await this.exclusive(() => {
    const state = this.state(); this.expire(state);
    for (const order of state.orders) if (order.owner === owner && order.status === 'pending') {
      order.status = 'cancelled'; this.audit(state, owner, 'CANCEL_HOLD', order.id, 'pending', 'cancelled');
    }
    state.holds = state.holds.filter(h => h.owner !== owner); this.write(BOOKING_KEY, state);
  }); }
  subtotal(legs: BookingLeg[]): number {
    return legs.reduce((sum, leg) => { const trip = this.trip(leg.tripId); return sum + leg.seats.reduce((s, seat) => s + trip.price * (trip.type === 'Cabin 22 chỗ' && leg.doubleSeats.includes(seat) ? 2 : 1), 0); }, 0);
  }
  voucher(code: string, legs: BookingLeg[], phone: string, excludingOrder = ''): number {
    if (!code) return 0;
    const rule = VOUCHERS.find(v => v.code === code.trim().toUpperCase()); const date = vietnamDate(this.now());
    if (!rule || !rule.active || date < rule.startsAt || date > rule.endsAt) throw new BookingError('validation', 'Mã không hợp lệ hoặc đã hết hạn.');
    const subtotal = this.subtotal(legs);
    if (subtotal < rule.minimum) throw new BookingError('validation', `Đơn cần từ ${rule.minimum.toLocaleString('vi-VN')}đ để dùng mã này.`);
    if (rule.routes.length && legs.some(l => !rule.routes.includes(`${this.trip(l.tripId).from} → ${this.trip(l.tripId).to}`))) throw new BookingError('validation', 'Mã không áp dụng cho tuyến này.');
    const validPhone = /^0[35789]\d{8}$/.test(phone);
    const used = this.state().orders.filter(o => o.id !== excludingOrder && o.voucher === rule.code && (o.status === 'paid' || o.status === 'pending' && o.expiresAt > this.now()));
    if (used.length >= rule.limit || validPhone && used.filter(o => o.passenger.phone === phone).length >= rule.perPhone) throw new BookingError('validation', 'Mã đã hết lượt sử dụng.');
    return Math.min(subtotal, rule.maximum, rule.amount || Math.round(subtotal * rule.percent / 100));
  }
  private validate(draft: BookingDraft, state: BookingState): void {
    if (Object.keys(passengerErrors(draft.passenger)).length || !draft.terms) throw new BookingError('validation', 'Kiểm tra thông tin hành khách và chấp nhận điều khoản.');
    const count = draft.legs.reduce((sum, leg) => sum + leg.seats.length, 0);
    if (!draft.legs.length || count < 1 || count > 5 || draft.legs.some(l => !l.seats.length)) throw new BookingError('validation', 'Chọn ghế cho từng chiều, tối đa 5 ghế/đơn.');
    for (const leg of draft.legs) {
      const trip = this.trip(leg.tripId);
      if (!this.isOpen(trip)) throw new BookingError('closed', 'Chuyến đã ngừng bán vé. Vui lòng chọn chuyến khác.');
      const pickup = trip.pickup.find(p => p.id === leg.pickupId), dropoff = trip.dropoff.find(p => p.id === leg.dropoffId);
      if (!pickup || !dropoff || Date.parse(pickup.at) <= this.now() || Date.parse(pickup.at) >= Date.parse(dropoff.at)) throw new BookingError('validation', 'Chọn điểm đón/trả hợp lệ, còn thời gian đón.');
      if (new Set(leg.seats).size !== leg.seats.length || leg.seats.some(seat => !trip.seats.includes(seat))) throw new BookingError('validation', 'Ghế không hợp lệ.');
      if (leg.doubleSeats.some(seat => !leg.seats.includes(seat)) || trip.type !== 'Cabin 22 chỗ' && leg.doubleSeats.length) throw new BookingError('validation', 'Loại phòng không hợp lệ.');
      if (leg.seats.some(seat => !state.holds.some(h => h.owner === draft.owner && h.tripId === trip.id && h.seat === seat && h.expiresAt > this.now()))) throw new BookingError('expired', 'Thời gian giữ ghế đã hết. Vui lòng chọn ghế lại.');
    }
    if (draft.legs.length === 2 && Date.parse(this.trip(draft.legs[1].tripId).departureAt) <= Date.parse(this.trip(draft.legs[0].tripId).arrivalAt)) throw new BookingError('validation', 'Chuyến về phải khởi hành sau khi chuyến đi đến nơi.');
  }
  async create(draft: BookingDraft, method: string): Promise<BookingOrder> {
    return this.exclusive(() => {
      const state = this.state(); this.expire(state);
      const existing = state.orders.find(o => o.key === draft.key && o.owner === draft.owner);
      if (existing) { if (existing.status === 'pending' || existing.status === 'paid') return existing; throw new BookingError('expired', 'Đơn đã hết hạn hoặc bị hủy. Vui lòng đặt lại.'); }
      this.validate(draft, state);
      if (!['vietqr', 'vnpay', 'momo', 'zalopay'].includes(method)) throw new BookingError('validation', 'Phương thức thanh toán không hợp lệ.');
      const subtotal = this.subtotal(draft.legs), discount = this.voucher(draft.voucher, draft.legs, draft.passenger.phone);
      const expiresAt = Math.min(...state.holds.filter(h => h.owner === draft.owner).map(h => h.expiresAt));
      const order: BookingOrder = { ...structuredClone(draft), passenger: { ...draft.passenger, name: normalizeName(draft.passenger.name), email: draft.passenger.email.trim() }, id: `VIG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, createdAt: new Date(this.now()).toISOString(), expiresAt, status: 'pending', subtotal, discount, total: subtotal - discount, method };
      state.orders.push(order); state.holds.forEach(h => { if (h.owner === draft.owner) h.orderId = order.id; });
      this.audit(state, draft.owner, 'CREATE_BOOKING', order.id, '', 'pending'); this.write(BOOKING_KEY, state);
      return order;
    });
  }
  async setMethod(orderId: string, method: string): Promise<BookingOrder> { return this.exclusive(() => {
    const state = this.state(); this.expire(state); const order = state.orders.find(o => o.id === orderId);
    if (!order || order.status !== 'pending') throw new BookingError('expired', 'Đơn không còn trong thời hạn thanh toán.');
    if (!['vietqr', 'vnpay', 'momo', 'zalopay'].includes(method)) throw new BookingError('validation', 'Phương thức thanh toán không hợp lệ.');
    order.method = method; this.write(BOOKING_KEY, state); return order;
  }); }
  pay(order: BookingOrder): Promise<BookingOrder> {
    const running = this.paymentRequests.get(order.id); if (running) return running;
    const request = this.verifyPayment(order).finally(() => this.paymentRequests.delete(order.id));
    this.paymentRequests.set(order.id, request); return request;
  }
  private async verifyPayment(input: BookingOrder): Promise<BookingOrder> {
    let order = this.state().orders.find(o => o.id === input.id && o.owner === input.owner);
    if (order?.status === 'paid') return order;
    if (!order || order.status !== 'pending' || order.expiresAt <= this.now()) throw new BookingError('expired', 'Thời gian thanh toán đã hết. Vui lòng đặt vé lại.');
    let receipt: PaymentReceipt;
    try { receipt = await this.gateway.verify(structuredClone(order)); }
    catch {
      await this.exclusive(() => { const state = this.state(); this.audit(state, input.owner, 'PAYMENT_FAILED', input.id, 'pending', 'pending', 'failure'); this.write(BOOKING_KEY, state); });
      throw new BookingError('payment', 'Chưa xác nhận được giao dịch. Vui lòng kiểm tra kết nối và thử lại.');
    }
    return this.exclusive(() => {
      const state = this.state(); this.expire(state); order = state.orders.find(o => o.id === input.id && o.owner === input.owner);
      if (order?.status === 'paid') return order;
      if (!order || order.status !== 'pending') throw new BookingError('expired', 'Đơn đã hết hạn hoặc bị hủy. Liên hệ hỗ trợ nếu bạn đã thanh toán.');
      this.validate(order, state);
      if (!receipt.reference || receipt.amount !== order.total || !Number.isFinite(Date.parse(receipt.receivedAt))) throw new BookingError('payment', 'Giao dịch chưa khớp với đơn hàng. Vui lòng liên hệ hỗ trợ.');
      if (state.orders.some(o => o.id !== order!.id && o.payment?.reference === receipt.reference)) throw new BookingError('payment', 'Giao dịch đã được sử dụng cho đơn khác.');
      order.status = 'paid'; order.payment = { ...receipt, status: 'confirmed' }; order.ticketToken = crypto.randomUUID();
      state.holds = state.holds.filter(h => h.orderId !== order!.id);
      this.audit(state, order.owner, 'PAYMENT_CONFIRMED', order.id, 'pending', 'paid'); this.write(BOOKING_KEY, state);
      return order;
    });
  }
  pending(owner: string): BookingOrder | undefined { return this.state().orders.find(o => o.owner === owner && o.status === 'pending' && o.expiresAt > this.now()); }
  loadDraft(): BookingDraft | null { return this.read(DRAFT_KEY, null); }
  saveDraft(draft: BookingDraft): void { this.write(DRAFT_KEY, draft); }
  clearDraft(): void { try { localStorage.removeItem(DRAFT_KEY); } catch { throw new BookingError('storage', 'Không xóa được bản nháp.'); } }
  customer(phone: string): Passenger | null {
    const values = this.read<{ phone: string; name: string; email?: string }[]>('viago_admin_customer_accounts_v1', []);
    const found = values.find(c => c.phone === phone) || SAVED_PASSENGER_EXAMPLES.find(c => c.phone === phone);
    return found ? { name: found.name, phone: found.phone, email: found.email || '' } : null;
  }
  auditPrint(order: BookingOrder): void { const state = this.state(); this.audit(state, order.owner, 'PRINT_TICKET', order.id, '', 'print-dialog-opened'); this.write(BOOKING_KEY, state); }
}
