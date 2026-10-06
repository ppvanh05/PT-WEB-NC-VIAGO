import { create } from 'qrcode';

export type BookingSource = 'tai-quay' | 'hotline' | 'online';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refund-processing' | 'refunded' | 'refund-failed';
export interface BookingState {
  bookingSource?: BookingSource;
  paymentStatus?: PaymentStatus;
  orderStatus?: 'held' | 'confirmed' | 'used' | 'cancelled' | 'expired';
  holdExpiresAt?: number;
  ChieuTuyen?: 'di' | 've';
  tripStatus?: 'open' | 'locked' | 'cancelled' | 'departed';
  passengerName?: string;
  paymentAt?: string;
  paymentStaff?: string;
  transactionCode?: string;
  paidAmount?: number;
  balanceDue?: number;
  refundAmount?: number;
  refundFee?: number;
  refundReason?: string;
  refundStatus?: 'processing' | 'completed' | 'failed';
  refundedAt?: string;
  refundedAmount?: number;
  membershipPoints?: number;
  pointsReversed?: number;
  previousQr?: string;
  printHistory?: { at: string; staff: string }[];
  notificationAt?: string;
}
interface LegacyTicket extends BookingState {
  NguonDat?: BookingSource;
  TrangThaiDonHang: string;
  TrangThaiVe: string;
  TrangThaiGiaoDich?: string;
  ThoiGianDat: string;
  ThoiGianXuatVe?: string;
}
export const HOLD_MS = 10 * 60 * 1000;
export function normalizeTicket<T extends LegacyTicket>(ticket: T, now = Date.now()): T {
  const next = { ...ticket };
  next.bookingSource ??= next.NguonDat ?? 'tai-quay';
  next.NguonDat = next.bookingSource;
  next.ChieuTuyen ??= 'di';
  next.paymentStatus ??= next.TrangThaiGiaoDich === 'da-hoan' && next.TrangThaiDonHang === 'da-thanh-toan'
    ? 'refunded' : next.TrangThaiVe === 'da-huy' && next.TrangThaiDonHang === 'da-thanh-toan'
    ? 'refund-processing' : next.TrangThaiDonHang === 'da-thanh-toan' ? 'paid' : 'pending';
  next.orderStatus ??= next.TrangThaiVe === 'da-huy' ? 'cancelled' : next.TrangThaiVe === 'da-hoan-thanh' ? 'used'
    : next.paymentStatus === 'paid' ? 'confirmed' : 'held';
  if (next.orderStatus === 'held') {
    next.holdExpiresAt ??= new Date(next.ThoiGianDat).getTime() + HOLD_MS;
    if (!Number.isFinite(next.holdExpiresAt) || next.holdExpiresAt <= now) {
      next.orderStatus = 'expired'; next.paymentStatus = 'expired';
    }
  }
  if (next.orderStatus === 'expired' || next.orderStatus === 'cancelled') next.TrangThaiVe = 'da-huy';
  next.TrangThaiDonHang = ['paid', 'refund-processing', 'refunded', 'refund-failed'].includes(next.paymentStatus) ? 'da-thanh-toan' : 'cho-thanh-toan';
  if (next.TrangThaiDonHang !== 'da-thanh-toan') next.ThoiGianXuatVe = '';
  return next;
}
export function paymentLabel(ticket: LegacyTicket): string {
  const t = normalizeTicket(ticket);
  const labels: Partial<Record<PaymentStatus, string>> = {
    paid: 'Đã thanh toán', failed: 'Thanh toán thất bại', expired: 'Hết hạn',
    'refund-processing': 'Hoàn tiền đang xử lý', refunded: 'Đã hoàn tiền', 'refund-failed': 'Hoàn tiền thất bại'
  };
  return labels[t.paymentStatus!] ?? 'Chờ thanh toán';
}
export function ticketLabel(ticket: LegacyTicket): string {
  const t = normalizeTicket(ticket);
  return ({ held: 'Chờ thanh toán', confirmed: 'Đã thanh toán', used: 'Đã hoàn thành', cancelled: 'Đã hủy', expired: 'Hết hạn' })[t.orderStatus!];
}
export function paymentVariant(ticket: LegacyTicket): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  const t = normalizeTicket(ticket);
  return t.paymentStatus === 'paid' || t.paymentStatus === 'refunded' ? 'success'
    : t.paymentStatus === 'failed' || t.paymentStatus === 'refund-failed' ? 'danger'
    : t.paymentStatus === 'expired' || t.orderStatus === 'cancelled' ? 'neutral'
    : t.bookingSource === 'online' || t.paymentStatus === 'refund-processing' ? 'info' : 'warning';
}
export const normalizedName = (name: string) => name.trim().replace(/\s+/g, ' ');
export const validName = (name: string) => normalizedName(name).length >= 2 && normalizedName(name).length <= 100;
export const validPhone = (phone: string) => /^\d{10}$/.test(phone);
export const validEmail = (email: string) => !email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
export function countdown(deadline: number | undefined, now = Date.now()): string {
  const seconds = Math.max(0, Math.ceil(((deadline ?? now) - now) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function couponResult(code: string, route: string, subtotal: number, now = Date.now()) {
  const coupons: Record<string, { amount?: number; percent?: number; expires?: number; route?: string; min?: number; remaining?: number }> = {
    VIP10: { percent: 10, min: 200000 }, VIAGO50: { amount: 50000, min: 400000, route: 'HCM-CT' },
    HETHAN: { amount: 50000, expires: 0 }, HETLUOT: { amount: 50000, remaining: 0 },
    VUNGTAU: { amount: 30000, route: 'HCM-VT' }, DON1TRIEU: { amount: 100000, min: 1000000 }
  };
  code = code.trim().toUpperCase();
  const coupon = coupons[code];
  const error = !code ? '' : !coupon ? 'Mã giảm giá không tồn tại.'
    : coupon.expires !== undefined && coupon.expires <= now ? 'Mã giảm giá đã hết hạn.'
    : coupon.remaining === 0 ? 'Mã giảm giá đã hết lượt sử dụng.'
    : coupon.route && coupon.route !== route ? 'Mã giảm giá không áp dụng cho tuyến này.'
    : coupon.min && subtotal < coupon.min ? `Đơn cần đạt tối thiểu ${coupon.min.toLocaleString('vi-VN')}đ để áp dụng mã.` : '';
  return { valid: !!code && !error, error, amount: error || !coupon ? 0 : Math.min(subtotal, coupon.amount ?? Math.round(subtotal * (coupon.percent ?? 0) / 100)) };
}

const qrCache = new Map<string, string>();
export function localQr(code: string): string {
  const cached = qrCache.get(code); if (cached) return cached;
  const qr = create(code, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size; let path = '';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (qr.modules.get(y, x)) path += `M${x + 4} ${y + 4}h1v1h-1z`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size + 8} ${size + 8}" shape-rendering="crispEdges"><path fill="white" d="M0 0h${size + 8}v${size + 8}H0z"/><path fill="black" d="${path}"/></svg>`;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  qrCache.set(code, url); return url;
}
export type TripStatus = 'Còn chỗ' | 'Hết chỗ' | 'Đã khóa' | 'Đã hủy' | 'Đã khởi hành';
const schedules: Record<string, string[]> = {
  'HCM-CT': ['05:30','07:30','09:30','11:30','13:00','15:00','16:00','18:00','19:30','21:00','23:00'],
  'HCM-VT': ['06:00','08:00','10:00','12:00','14:00','16:30','18:30','20:30'],
  'DL-BMT': ['07:00','10:30','14:30','18:00'], 'DL-NT': ['06:30','09:00','13:30','17:00','20:00'],
  'CT-RG': ['07:15','10:15','13:15','16:15','19:15'], 'HCM-PT': ['06:00','10:00','14:00','18:00','22:00'],
  'HCM-DL': ['08:00','13:00','17:00','21:00','23:00'], 'HCM-NT': ['07:30','12:30','18:30','22:15'],
  'NT-DN': ['09:00','16:00','20:00','23:00']
};
export function mockSchedule(route: string, date: string, direction: 'di' | 've') {
  const day = new Date(`${date}T00:00:00`).getDay();
  if (!Number.isFinite(day) || (route === 'DL-BMT' && day === 0)) return [];
  return (schedules[route] ?? []).filter((_, index) => day % 2 === 0 || index !== 1).map((time, index) => {
    const minutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) + (direction === 've' ? 20 : 0);
    const gio = `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    const status: TripStatus = index === 3 ? 'Đã khóa' : index === 5 ? 'Đã hủy' : index === 7 ? 'Hết chỗ' : 'Còn chỗ';
    return { gio, status };
  });
}
