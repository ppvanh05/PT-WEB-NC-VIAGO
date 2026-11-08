import { Injectable, inject } from '@angular/core';
import { HomeApiError, HomeApiService, type HomeOrder, type HomeTrip } from './home-api.service';
import {
  BookingDraft,
  BookingLeg,
  BookingOrder,
  BookingState,
  Passenger,
  SearchRequest,
  Trip,
  passengerErrors,
} from './booking.models';

export class BookingError extends Error {
  constructor(
    readonly code: 'storage' | 'conflict' | 'closed' | 'expired' | 'validation' | 'payment',
    message: string,
  ) {
    super(message);
  }
}
export const DRAFT_KEY = 'viago_customer_booking_draft_api_v1';
const ORDER_KEY = 'viago_home_order_id';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly api = inject(HomeApiService);
  private readonly trips = new Map<string, Trip>();
  private snapshot: BookingState = { holds: [], orders: [], audit: [] };
  private owner = '';
  private serverOffset = 0;
  private sweeping?: Promise<void>;
  readonly holdDuration = 600000;
  now(): number {
    return Date.now() + this.serverOffset;
  }
  catalog(): Trip[] {
    return [...this.trips.values()];
  }
  state(): BookingState {
    return this.snapshot;
  }
  private seatKey(label: string, floor = 1): string {
    const text = label.trim().toUpperCase(),
      match = /^([AB])0*(\d+)$/.exec(text);
    return match
      ? Number(match[2]) + match[1]
      : /^\d+$/.test(text)
        ? Number(text) + (floor === 2 ? 'B' : 'A')
        : text;
  }
  private cache(raw: HomeTrip): Trip {
    const serverSeats = Object.fromEntries(
      raw.seatDetails.map((s) => [
        this.seatKey(s.label, s.floor),
        { id: s.id, price: s.price, status: s.status, allowDouble: s.allowDouble },
      ]),
    );
    const trip: Trip = {
      ...raw,
      status: raw.status === 'open' ? 'open' : 'cancelled',
      seats: Object.keys(serverSeats),
      soldSeats: Object.entries(serverSeats)
        .filter(([, s]) => ['sold', 'locked'].includes(s.status))
        .map(([key]) => key),
      serverSeats,
    };
    this.trips.set(trip.id, trip);
    return trip;
  }
  trip(id: string): Trip {
    const trip = this.trips.get(id);
    if (!trip) throw new BookingError('closed', 'Chưa tải được chuyến. Vui lòng tìm chuyến lại.');
    return trip;
  }
  isOpen(t: Trip): boolean {
    return (
      t.status === 'open' &&
      Date.parse(t.saleClosesAt) > this.now() &&
      Date.parse(t.departureAt) > this.now()
    );
  }
  async fetchSearch(query: SearchRequest): Promise<void> {
    for (const [id, t] of this.trips)
      if (
        (t.from === query.from && t.to === query.to && t.date === query.date) ||
        (query.roundTrip &&
          t.from === query.to &&
          t.to === query.from &&
          t.date === query.returnDate)
      )
        this.trips.delete(id);
    let page = 1,
      pages = 1;
    do {
      const params = new URLSearchParams({
        from: query.from,
        to: query.to,
        date: query.date,
        count: String(query.count),
        roundTrip: String(query.roundTrip),
        page: String(page),
        pageSize: '100',
      });
      if (query.roundTrip) params.set('returnDate', query.returnDate);
      const r = await this.api.request<{
        outbound: { data: HomeTrip[]; pagination: { totalPages: number } };
        inbound?: { data: HomeTrip[]; pagination: { totalPages: number } };
      }>('/trips?' + params);
      r.outbound.data.forEach((t) => this.cache(t));
      r.inbound?.data.forEach((t) => this.cache(t));
      pages = Math.max(r.outbound.pagination.totalPages, r.inbound?.pagination.totalPages ?? 0);
      page++;
    } while (page <= pages);
  }
  search(from: string, to: string, date: string): Trip[] {
    return this.catalog().filter(
      (t) => t.from === from && t.to === to && t.date === date && this.isOpen(t),
    );
  }
  seatStatus(
    trip: Trip,
    seat: string,
    owner = '',
    state = this.snapshot,
  ): 'available' | 'held' | 'sold' | 'selected' {
    const status = trip.serverSeats?.[seat]?.status;
    if (trip.soldSeats.includes(seat) || status === 'locked' || status === 'sold') return 'sold';
    const hold = state.holds.find(
      (h) => h.tripId === trip.id && h.seat === seat && h.expiresAt > this.now(),
    );
    if (hold) return hold.owner === owner ? 'selected' : 'held';
    return status === 'held'
      ? 'held'
      : status === 'selected'
        ? owner === this.owner
          ? 'selected'
          : 'held'
        : 'available';
  }
  available(t: Trip, state = this.snapshot, owner = ''): number {
    return t.seats.filter((s) =>
      ['available', 'selected'].includes(this.seatStatus(t, s, owner, state)),
    ).length;
  }
  holdExpiry(owner: string): number {
    return Math.min(
      ...this.snapshot.holds
        .filter((h) => h.owner === owner && h.expiresAt > this.now())
        .map((h) => h.expiresAt),
    );
  }
  private apiLegs(legs: BookingLeg[]) {
    return legs.map((leg) => {
      const id = (key: string) => {
        const s = this.trip(leg.tripId).serverSeats?.[key];
        if (!s) throw new BookingError('validation', 'Ghế không hợp lệ.');
        return s.id;
      };
      return {
        tripId: leg.tripId,
        seats: leg.seats.map(id),
        doubleSeats: leg.doubleSeats.map(id),
        ...(leg.pickupId ? { pickupId: leg.pickupId } : {}),
        ...(leg.dropoffId ? { dropoffId: leg.dropoffId } : {}),
      };
    });
  }
  async hold(owner: string, legs: BookingLeg[], expectedExpiry = 0): Promise<number> {
    if (expectedExpiry && expectedExpiry <= this.now())
      throw new BookingError('expired', 'Thời gian giữ ghế đã hết.');
    this.owner = owner;
    const selected = legs.filter((l) => l.seats.length);
    if (!selected.length) {
      await this.api.request('/holds', undefined, 'DELETE');
      this.snapshot.holds = [];
      await this.refreshTrips(legs.map((l) => l.tripId));
      return 0;
    }
    const r = await this.api.request<{ expiresAt: string; serverTime: string }>('/holds', {
      legs: this.apiLegs(selected),
    });
    this.serverOffset = Date.parse(r.serverTime) - Date.now();
    const expiresAt = Date.parse(r.expiresAt);
    this.snapshot.holds = selected.flatMap((l) =>
      l.seats.map((seat) => ({ owner, tripId: l.tripId, seat, expiresAt })),
    );
    await this.refreshTrips(selected.map((l) => l.tripId));
    return expiresAt;
  }
  private async refreshTrips(ids: string[]) {
    await Promise.all(
      [...new Set(ids)].map(async (id) => {
        try {
          this.cache(await this.api.request<HomeTrip>('/trips/' + encodeURIComponent(id)));
        } catch (e) {
          if (e instanceof HomeApiError && e.status === 404) {
            const t = this.trips.get(id);
            if (t) t.status = 'cancelled';
          } else throw e;
        }
      }),
    );
  }
  sweep(): Promise<void> {
    if (this.sweeping) return this.sweeping;
    this.sweeping = this.refreshState().finally(() => (this.sweeping = undefined));
    return this.sweeping;
  }
  private async refreshState() {
    const draft = this.loadDraft();
    this.owner = draft?.owner || this.owner || crypto.randomUUID();
    const holds = await this.api.request<{
      data: { tripId: string; seatId: string; expiresAt: string; orderId?: string }[];
      serverTime: string;
    }>('/holds');
    this.serverOffset = Date.parse(holds.serverTime) - Date.now();
    const pending = await this.api.request<{ order: HomeOrder | null }>('/orders/pending');
    if (pending.order) this.cacheOrder(pending.order, draft);
    let savedId = '';
    try {
      savedId = sessionStorage.getItem(ORDER_KEY) || '';
    } catch {}
    for (const id of new Set([
      ...this.snapshot.orders.filter((o) => o.status === 'pending').map((o) => o.id),
      ...(savedId ? [savedId] : []),
    ]))
      if (id !== pending.order?.id) {
        try {
          this.cacheOrder(
            await this.api.request<HomeOrder>('/orders/' + encodeURIComponent(id)),
            draft,
          );
        } catch (e) {
          if (e instanceof HomeApiError && e.status === 404)
            this.snapshot.orders = this.snapshot.orders.filter((o) => o.id !== id);
          else throw e;
        }
      }
    await this.refreshTrips([
      ...holds.data.map((h) => h.tripId),
      ...(draft?.legs.map((l) => l.tripId) ?? []),
    ]);
    this.snapshot.holds = holds.data.flatMap((h) => {
      const t = this.trips.get(h.tripId);
      const seat = Object.keys(t?.serverSeats ?? {}).find(
        (s) => t!.serverSeats![s].id === h.seatId,
      );
      return seat
        ? [
            {
              owner: this.owner,
              tripId: h.tripId,
              seat,
              expiresAt: Date.parse(h.expiresAt),
              orderId: h.orderId,
            },
          ]
        : [];
    });
  }
  async release(owner: string): Promise<void> {
    const order = this.pending(owner);
    if (order)
      this.cacheOrder(
        await this.api.request<HomeOrder>(
          '/orders/' + encodeURIComponent(order.id) + '/cancel',
          {},
        ),
        order,
      );
    else await this.api.request('/holds', undefined, 'DELETE');
    this.snapshot.holds = this.snapshot.holds.filter((h) => h.owner !== owner);
    await this.refreshTrips(
      this.catalog()
        .filter((t) => Object.values(t.serverSeats ?? {}).some((s) => s.status === 'selected'))
        .map((t) => t.id),
    );
  }
  subtotal(legs: BookingLeg[]): number {
    return legs.reduce(
      (sum, l) =>
        sum +
        l.seats.reduce(
          (n, s) =>
            n +
            (this.trip(l.tripId).serverSeats?.[s]?.price ?? 0) *
              (l.doubleSeats.includes(s) ? 2 : 1),
          0,
        ),
      0,
    );
  }
  private payload(d: BookingDraft) {
    return {
      legs: this.apiLegs(d.legs),
      passenger: {
        name: d.passenger.name.trim(),
        phone: d.passenger.phone,
        ...(d.passenger.email.trim() ? { email: d.passenger.email.trim() } : {}),
      },
      ...(d.voucher ? { voucher: d.voucher } : {}),
    };
  }
  quote(d: BookingDraft) {
    return this.api.request<{ subtotal: number; discount: number; total: number }>(
      '/quote',
      this.payload(d),
    );
  }
  async voucher(
    code: string,
    legs: BookingLeg[],
    phone: string,
    _excludingOrder = '',
  ): Promise<number> {
    const draft = this.loadDraft();
    if (
      !draft ||
      Object.keys(passengerErrors({ ...draft.passenger, phone })).length ||
      legs.some((l) => !l.pickupId || !l.dropoffId)
    )
      throw new BookingError(
        'validation',
        'Điền thông tin hành khách và điểm đón/trả trước khi áp dụng mã.',
      );
    return (
      await this.quote({
        ...draft,
        legs,
        passenger: { ...draft.passenger, phone },
        voucher: code.trim().toUpperCase(),
      })
    ).discount;
  }
  private cacheOrder(raw: HomeOrder, draft: BookingDraft | null = this.loadDraft()): BookingOrder {
    const previous = this.snapshot.orders.find((o) => o.id === raw.id);
    raw.legs.forEach((l) => {
      if (l.trip) this.cache(l.trip);
    });
    const legs = raw.legs.map((l) => {
      const t = this.trip(l.tripId);
      const key = (id: string) =>
        Object.keys(t.serverSeats ?? {}).find((s) => t.serverSeats![s].id === id) || id;
      return {
        tripId: l.tripId,
        seats: l.seats.map(key),
        doubleSeats: l.doubleSeats.map(key),
        pickupId: l.pickupId,
        dropoffId: l.dropoffId,
      };
    });
    const o: BookingOrder = {
      owner: draft?.owner || previous?.owner || this.owner,
      key: draft?.key || previous?.key || crypto.randomUUID(),
      terms: true,
      voucher: draft?.voucher || previous?.voucher || '',
      legs,
      passenger: { ...raw.passenger, email: raw.passenger.email || '' },
      id: raw.id,
      createdAt: raw.createdAt,
      expiresAt: Date.parse(raw.expiresAt),
      status: raw.status === 'partially_cancelled' ? 'cancelled' : raw.status,
      subtotal: raw.subtotal,
      discount: raw.discount,
      total: raw.total,
      method: raw.method,
      ticketToken: raw.tickets[0]?.token,
      tickets: raw.tickets,
      paymentDetails: previous?.paymentDetails,
    };
    this.snapshot.orders = [...this.snapshot.orders.filter((item) => item.id !== o.id), o];
    return o;
  }
  async create(d: BookingDraft, method: string): Promise<BookingOrder> {
    if (method !== 'vietqr')
      throw new BookingError('validation', 'Phương thức thanh toán chưa được hỗ trợ.');
    const o = this.cacheOrder(
      await this.api.request<HomeOrder>('/orders', {
        ...this.payload(d),
        key: d.key,
        terms: d.terms,
      }),
      d,
    );
    try {
      sessionStorage.setItem(ORDER_KEY, o.id);
    } catch {}
    if (o.status === 'pending') await this.loadPayment(o);
    return o;
  }
  private async loadPayment(o: BookingOrder) {
    o.paymentDetails = await this.api.request<NonNullable<BookingOrder['paymentDetails']>>(
      '/orders/' + encodeURIComponent(o.id) + '/payment',
    );
  }
  async setMethod(id: string, method: string): Promise<BookingOrder> {
    if (method !== 'vietqr')
      throw new BookingError('validation', 'Phương thức thanh toán chưa được hỗ trợ.');
    const o = this.snapshot.orders.find((item) => item.id === id);
    if (!o) throw new BookingError('expired', 'Không tìm thấy đơn.');
    await this.loadPayment(o);
    return o;
  }
  async pay(input: BookingOrder): Promise<BookingOrder> {
    const o = this.cacheOrder(
      await this.api.request<HomeOrder>('/orders/' + encodeURIComponent(input.id)),
      input,
    );
    if (o.status === 'paid') return o;
    if (o.status !== 'pending')
      throw new BookingError(
        'expired',
        'Đơn đã hết hạn hoặc bị hủy. Liên hệ hỗ trợ nếu đã chuyển tiền.',
      );
    throw new BookingError(
      'payment',
      'Chưa ghi nhận thanh toán thành công. Hệ thống sẽ tự cập nhật khi nhận xác nhận ngân hàng.',
    );
  }
  pending(owner: string): BookingOrder | undefined {
    return this.snapshot.orders.find(
      (o) => o.owner === owner && o.status === 'pending' && o.expiresAt > this.now(),
    );
  }
  loadDraft(): BookingDraft | null {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  saveDraft(d: BookingDraft): void {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
      this.owner = d.owner;
    } catch {
      throw new BookingError('storage', 'Không lưu được bản nháp.');
    }
  }
  clearDraft(): void {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
  }
  customer(_phone: string): Passenger | null {
    return null;
  }
  profile(): Promise<Passenger> {
    return this.api.request<Passenger>('/customer');
  }
  async loadTicket(token: string): Promise<BookingOrder> {
    const ticket = await this.api.request<{
      id: string;
      passengerName: string;
      seat: string;
      fare: number;
      issuedAt: string;
      roomType: string;
      trip: HomeTrip;
      pickup?: { id: string };
      dropoff?: { id: string };
    }>('/tickets/' + encodeURIComponent(token));
    const trip = this.cache(ticket.trip),
      seat = this.seatKey(ticket.seat);
    const o: BookingOrder = {
      id: ticket.id,
      owner: this.owner,
      key: crypto.randomUUID(),
      terms: true,
      voucher: '',
      status: 'paid',
      method: 'vietqr',
      createdAt: ticket.issuedAt,
      expiresAt: 0,
      subtotal: ticket.fare,
      discount: 0,
      total: ticket.fare,
      passenger: { name: ticket.passengerName, phone: '', email: '' },
      legs: [
        {
          tripId: trip.id,
          seats: [seat],
          doubleSeats: ticket.roomType === 'PhongDoi' ? [seat] : [],
          pickupId: ticket.pickup?.id || '',
          dropoffId: ticket.dropoff?.id || '',
        },
      ],
      ticketToken: token,
      externalTicketToken: token,
      tickets: [
        { id: ticket.id, seat, seatId: trip.serverSeats?.[seat]?.id || '', token, orderId: '' },
      ],
    };
    return o;
  }
  async auditPrint(o: BookingOrder): Promise<void> {
    await this.api.request(
      o.externalTicketToken
        ? '/tickets/' + encodeURIComponent(o.externalTicketToken) + '/print'
        : '/orders/' + encodeURIComponent(o.id) + '/print',
      {},
    );
  }
}
