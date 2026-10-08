export type VehicleType = 'Limousine 9 chỗ' | 'Cabin 22 chỗ' | 'Giường nằm 34 chỗ';
export type BookingStep = 'home' | 'results' | 'booking' | 'review' | 'payment' | 'success' | 'failure';
export interface TripPoint { id: string; name: string; address: string; at: string; kind: 'station' | 'shuttle'; }
export interface Trip {
  id: string; from: string; to: string; date: string; departureAt: string; arrivalAt: string;
  saleClosesAt: string; status: 'open' | 'locked' | 'cancelled'; type: VehicleType;
  price: number; distance: number; seats: string[]; soldSeats: string[];
  pickup: TripPoint[]; dropoff: TripPoint[]; amenities: string[];
}
export interface SearchRequest { from: string; to: string; date: string; returnDate: string; roundTrip: boolean; count: number; }
export interface BookingLeg { tripId: string; seats: string[]; doubleSeats: string[]; pickupId: string; dropoffId: string; }
export interface Passenger { name: string; phone: string; email: string; }
export interface BookingDraft { owner: string; legs: BookingLeg[]; passenger: Passenger; voucher: string; terms: boolean; key: string; search?: SearchRequest; }
export interface SeatHold { owner: string; tripId: string; seat: string; expiresAt: number; orderId?: string; }
export interface BookingOrder extends BookingDraft {
  id: string; createdAt: string; expiresAt: number; status: 'pending' | 'paid' | 'expired' | 'cancelled';
  subtotal: number; discount: number; total: number; method: string;
  ticketToken?: string;
  payment?: { reference: string; amount: number; receivedAt: string; status: 'confirmed' };
}
export interface BookingAudit { id: string; at: string; action: string; owner: string; orderId: string; result: 'success' | 'failure'; before: string; after: string; actor: {code: string; name: string; username: string; phone: string; role: string}; userAgent: string; }
export interface BookingState { holds: SeatHold[]; orders: BookingOrder[]; audit: BookingAudit[]; }
export interface VoucherRule { code: string; title: string; percent: number; amount: number; maximum: number; minimum: number; startsAt: string; endsAt: string; active: boolean; routes: string[]; limit: number; perPhone: number; }

export function vietnamDate(time = Date.now()): string { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(time)); }
export function normalizeName(value: string): string { return value.trim().replace(/\s+/g, ' '); }
export function normalizePhone(value: string): string { return value.replace(/^\+84/, '0').replace(/\D/g, '').slice(0, 10); }
export function passengerErrors(passenger: Passenger): Partial<Record<keyof Passenger, string>> {
  const errors: Partial<Record<keyof Passenger, string>> = {};
  const name = normalizeName(passenger.name);
  if (name.length < 2 || name.length > 100 || !/^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(name)) errors.name = 'Nhập họ tên hợp lệ, từ 2–100 ký tự.';
  if (!/^0[35789]\d{8}$/.test(passenger.phone)) errors.phone = 'Nhập SĐT di động hợp lệ, gồm 10 số.';
  const email = passenger.email.trim();
  const local = email.split('@')[0];
  if (email && (email.length > 254 || local.length > 64 || local.startsWith('.') || local.endsWith('.') || email.includes('..') || !/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(email))) errors.email = 'Email không hợp lệ.';
  return errors;
}
