import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountsApiService } from '../../../core/services/accounts-api.service';
import { ToastService } from '../../../core/services/toast.service';

export interface VehicleImage {
  url: string;
  caption: string;
}

interface PriceItem {
  id: string;
  price: number;
  unit: 'Chuyen' | 'Ngay' | 'Gio' | string;
  rentalScope: string;
  surchargeNote: string | null;
}

/** GET customer/contract-rentals/vehicles (bảng loai_xe_thue + bang_gia_chuan). */
interface ApiVehicle {
  id: string;
  name: string;
  category: string;
  maxPassengers: number;
  description: string;
  engine: string | null;
  fuel: string | null;
  year: number | null;
  transmission: string | null;
  amenities: string[];
  images: { url?: string; caption?: string }[];
  depositRequired: string | null;
  rating: number | null;
  reviewsCount: number;
  prices: { inland: PriceItem | null; intercity: PriceItem | null; daily: PriceItem | null };
}

export interface VehicleDetail extends ApiVehicle {
  passengers: string;
  minPrice: number;
  priceFormatted: string;
  gallery: VehicleImage[];
  selectedImageIndex: number;
}

export interface DriverProfile {
  id: string;
  name: string;
  licenseClass: string | null;
  avatar: string | null;
  initials: string;
}

export interface PromoCode {
  code: string;
  desc: string;
  discountText: string;
}

interface ApiPromo {
  code: string;
  name: string;
  description: string | null;
  type: 'PhanTram' | 'TruTienThang' | string;
  value: number;
  maxDiscount: number | null;
}

export interface RentalEstimate {
  unit: string;
  unitPrice: number;
  units: number;
  vehicles: number;
  basePrice: number;
  surcharge: number;
  surchargeNote: string | null;
  promoCode: string | null;
  discount: number;
  total: number;
  note: string;
}

export interface BookingStep {
  key: 'submitted' | 'quoted' | 'contract' | 'confirmed';
  label: string;
  time: string | null;
  status: 'done' | 'active' | 'pending';
}

/** GET/POST customer/contract-rentals/requests (bảng yeu_cau_thue_xe + báo giá + hợp đồng). */
export interface RentalLookup {
  code: string;
  status: string;
  statusLabel: string;
  cancelReason: string | null;
  vehicle: { id: string; name: string; category: string; image: string | null };
  rentalType: 'CoTaiXe' | 'TuLai';
  driverName: string | null;
  fullName: string;
  pickup: string;
  destination: string;
  startAt: string;
  endAt: string | null;
  passengers: number;
  vehicles: number;
  promoCode: string | null;
  note: string | null;
  submittedAt: string;
  estimate: { unitPrice: number; unit: string; units: number; basePrice: number; surcharge: number; discount: number; total: number };
  quote: {
    code: string;
    version: number;
    status: string;
    statusLabel: string;
    basePrice: number;
    surcharge: number;
    discount: number;
    total: number;
    deposit: number;
    terms: string | null;
    sentAt: string | null;
    expiresAt: string | null;
    canRespond: boolean;
  } | null;
  contract: {
    code: string;
    status: string;
    statusLabel: string;
    total: number;
    depositRequired: number;
    depositPaid: number;
    startAt: string;
    endAt: string;
  } | null;
  steps: BookingStep[];
}

const STEP_DESC: Record<BookingStep['key'], string> = {
  submitted: 'Yêu cầu thuê xe của bạn đã được tiếp nhận. VIAGO đang kiểm tra lịch xe.',
  quoted: 'Nhân viên VIAGO gửi báo giá chính thức để bạn đồng ý hoặc từ chối.',
  contract: 'Hai bên ký hợp đồng thuê xe theo báo giá đã chốt.',
  confirmed: 'Đã nhận tiền cọc, chuyến đi được xác nhận.',
};

const UNIT_LABEL: Record<string, string> = { Chuyen: 'chuyến', Ngay: 'ngày', Gio: 'giờ' };
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1000&auto=format&fit=crop&q=80';
const SAVED_LOOKUP_KEY = 'viago_rental_lookup';

/** Chuỗi cho input datetime-local theo giờ máy người dùng. */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class Services implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly accountsApi = inject(AccountsApiService);
  /** App chạy không có zone.js: gọi API xong thì báo Angular vẽ lại giao diện. */
  private readonly api = {
    request: <T>(...args: Parameters<AccountsApiService['request']>): Promise<T> =>
      this.accountsApi.request<T>(...args).finally(() => this.cdr.markForCheck()),
  };
  private readonly toast = inject(ToastService);

  // Navigation State: 'list' | 'detail' | 'order'
  viewState: 'list' | 'detail' | 'order' = 'list';
  activeVehicle: VehicleDetail | null = null;
  activeDetailTab: 'overview' | 'conditions' | 'drivers' | 'policy' | 'promo' = 'overview';

  loading = true;
  loadError = '';
  submitting = false;
  submitError = '';
  deciding = false;

  // Yêu cầu vừa gửi / vừa tra cứu
  currentOrder: RentalLookup | null = null;
  private orderPhone = '';

  // Tra cứu yêu cầu đã gửi
  lookupForm = { code: '', phone: '' };
  lookupLoading = false;
  lookupError = '';

  // Booking Form State
  bookingForm = {
    rentalType: 'driver' as 'driver' | 'self',
    tripScope: 'LienTinh' as 'NoiTinh' | 'LienTinh',
    fullName: '',
    phone: '',
    email: '',
    startAt: '',
    endAt: '',
    pickupLocation: '',
    destination: '',
    passengers: 1,
    vehicles: 1,
    selectedDriverId: '',
    appliedPromo: '',
    note: '',
  };
  private idempotencyKey = this.newKey();

  // Giá tạm tính từ POST customer/contract-rentals/estimate
  estimate: RentalEstimate | null = null;
  estimateError = '';
  estimating = false;
  private estimateTimer: ReturnType<typeof setTimeout> | null = null;

  promosList: PromoCode[] = [];
  driversList: DriverProfile[] = [];
  vehiclesList: VehicleDetail[] = [];

  // 6 thẻ giới thiệu tĩnh (nội dung quảng bá, không có trong DB)
  serviceInfoList = [
    { id: 1, title: 'Du lịch', subtitle: 'Nghỉ dưỡng, tham quan' },
    { id: 2, title: 'Công tác', subtitle: 'Lịch trình linh hoạt' },
    { id: 3, title: 'Sân bay', subtitle: 'Đón tiễn đúng giờ' },
    { id: 4, title: 'Đám cưới', subtitle: 'Xe đoàn trang trọng' },
    { id: 5, title: 'Sự kiện', subtitle: 'Phục vụ theo đoàn' },
    { id: 6, title: 'Team Building', subtitle: 'Di chuyển nhóm lớn' }
  ];

  get averageRating(): string {
    const rated = this.vehiclesList.filter(v => v.rating != null);
    if (!rated.length) return '—';
    return (rated.reduce((s, v) => s + (v.rating ?? 0), 0) / rated.length).toFixed(1);
  }

  ngOnInit(): void {
    this.resetSchedule();
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_LOOKUP_KEY) ?? 'null');
      if (saved?.code && saved?.phone) this.lookupForm = { code: saved.code, phone: saved.phone };
    } catch { /* bỏ qua */ }
    void this.load();
  }

  ngOnDestroy(): void {
    if (this.estimateTimer) clearTimeout(this.estimateTimer);
  }

  async load(): Promise<void> {
    this.loading = true;
    this.loadError = '';
    try {
      const [vehicles, drivers, promos] = await Promise.all([
        this.api.request<ApiVehicle[]>('customer/contract-rentals/vehicles'),
        this.api.request<{ id: string; name: string; licenseClass: string | null; avatar: string | null }[]>('customer/contract-rentals/drivers'),
        this.api.request<ApiPromo[]>('customer/contract-rentals/promotions'),
      ]);
      this.vehiclesList = vehicles.map(v => this.toVehicle(v));
      this.driversList = drivers.map(d => ({
        ...d,
        initials: d.name.split(/\s+/).slice(-2).map(w => w[0]).join('').toUpperCase(),
      }));
      this.promosList = promos.map(p => ({
        code: p.code,
        desc: p.description || p.name,
        discountText: p.type === 'PhanTram' ? `Giảm ${p.value}%` : `Giảm ${this.shortMoney(p.value)}`,
      }));
    } catch (error) {
      this.loadError = this.message(error, 'Không tải được danh sách xe cho thuê.');
    } finally {
      this.loading = false;
    }
  }

  private toVehicle(v: ApiVehicle): VehicleDetail {
    const prices = [v.prices.inland, v.prices.intercity, v.prices.daily].filter((p): p is PriceItem => !!p);
    const minPrice = prices.length ? Math.min(...prices.map(p => p.price)) : 0;
    const gallery = (v.images ?? [])
      .filter(img => !!img?.url)
      .map(img => ({ url: img.url!, caption: img.caption ?? v.name }));
    return {
      ...v,
      passengers: `Tối đa ${v.maxPassengers} khách`,
      minPrice,
      priceFormatted: minPrice ? this.formatMoney(minPrice) : 'Liên hệ',
      gallery: gallery.length ? gallery : [{ url: FALLBACK_IMAGE, caption: v.name }],
      selectedImageIndex: 0,
    };
  }

  // ─── NAVIGATION ACTIONS ──────────────────────────────────────────────────

  selectVehicle(vehicle: VehicleDetail): void {
    this.activeVehicle = { ...vehicle, selectedImageIndex: 0 };
    this.activeDetailTab = 'overview';
    this.viewState = 'detail';
    this.submitError = '';
    this.bookingForm.passengers = Math.min(Math.max(1, this.bookingForm.passengers), vehicle.maxPassengers * this.bookingForm.vehicles);
    this.scheduleEstimate();
    this.scrollToTop();
  }

  backToList(): void {
    this.activeVehicle = null;
    this.viewState = 'list';
    this.scrollToTop();
  }

  goToHome(): void {
    this.activeVehicle = null;
    this.currentOrder = null;
    this.viewState = 'list';
    this.scrollToTop();
  }

  viewAnotherVehicle(): void {
    this.currentOrder = null;
    this.viewState = 'list';
    this.scrollToTop();
  }

  selectDetailImage(index: number): void {
    if (this.activeVehicle) {
      this.activeVehicle.selectedImageIndex = index;
    }
  }

  applyPromoCode(code: string): void {
    this.bookingForm.appliedPromo = this.bookingForm.appliedPromo === code ? '' : code;
    this.scheduleEstimate();
  }

  chooseDriver(id: string): void {
    this.bookingForm.rentalType = 'driver';
    this.bookingForm.selectedDriverId = this.bookingForm.selectedDriverId === id ? '' : id;
    this.scheduleEstimate();
  }

  setRentalType(type: 'driver' | 'self'): void {
    this.bookingForm.rentalType = type;
    if (type === 'self') this.bookingForm.selectedDriverId = '';
    this.scheduleEstimate();
  }

  /** Giá niêm yết đang áp dụng cho hình thức thuê đang chọn. */
  get currentPrice(): PriceItem | null {
    const v = this.activeVehicle;
    if (!v) return null;
    if (this.bookingForm.rentalType === 'self') return v.prices.daily;
    return this.bookingForm.tripScope === 'NoiTinh' ? v.prices.inland : v.prices.intercity;
  }

  unitLabel(unit: string | null | undefined): string {
    return UNIT_LABEL[unit ?? ''] ?? unit ?? '';
  }

  // ─── GIÁ TẠM TÍNH ────────────────────────────────────────────────────────

  scheduleEstimate(): void {
    if (this.estimateTimer) clearTimeout(this.estimateTimer);
    this.estimateTimer = setTimeout(() => void this.runEstimate(), 400);
  }

  private async runEstimate(): Promise<void> {
    if (!this.activeVehicle || !this.bookingForm.startAt) return;
    this.estimating = true;
    try {
      this.estimate = await this.api.request<RentalEstimate>('customer/contract-rentals/estimate', 'POST', this.basePayload(true));
      this.estimateError = '';
    } catch (error) {
      this.estimate = null;
      this.estimateError = this.message(error, 'Chưa tính được giá tạm.');
    } finally {
      this.estimating = false;
    }
  }

  private basePayload(forEstimate: boolean): Record<string, unknown> {
    const f = this.bookingForm;
    const self = f.rentalType === 'self';
    const phone = f.phone.trim();
    return {
      vehicleTypeId: this.activeVehicle!.id,
      rentalType: self ? 'TuLai' : 'CoTaiXe',
      ...(self ? {} : { tripScope: f.tripScope }),
      startAt: new Date(f.startAt).toISOString(),
      ...(f.endAt ? { endAt: new Date(f.endAt).toISOString() } : {}),
      vehicles: Number(f.vehicles) || 1,
      ...(f.appliedPromo.trim() ? { promoCode: f.appliedPromo.trim().toUpperCase() } : {}),
      ...(forEstimate && /^0[35789]\d{8}$/.test(phone) ? { phone } : {}),
    };
  }

  // ─── BOOKING SUBMIT ──────────────────────────────────────────────────────

  async submitBookingForm(): Promise<void> {
    if (!this.activeVehicle || this.submitting) return;
    const f = this.bookingForm;
    const error = this.validateForm();
    if (error) {
      this.submitError = error;
      return;
    }
    this.submitting = true;
    this.submitError = '';
    try {
      const phone = f.phone.trim();
      const order = await this.api.request<RentalLookup>('customer/contract-rentals/requests', 'POST', {
        ...this.basePayload(false),
        fullName: f.fullName.trim(),
        phone,
        ...(f.email.trim() ? { email: f.email.trim() } : {}),
        pickup: f.pickupLocation.trim(),
        destination: f.destination.trim(),
        passengers: Number(f.passengers),
        ...(f.rentalType === 'driver' && f.selectedDriverId ? { driverId: f.selectedDriverId } : {}),
        ...(f.note.trim() ? { note: f.note.trim() } : {}),
        idempotencyKey: this.idempotencyKey,
      });
      this.showOrder(order, phone);
      this.idempotencyKey = this.newKey();
      this.toast.showSuccess(`Đã gửi yêu cầu ${order.code}. VIAGO sẽ liên hệ báo giá.`);
    } catch (err) {
      this.submitError = this.message(err, 'Không gửi được yêu cầu thuê xe.');
    } finally {
      this.submitting = false;
    }
  }

  private validateForm(): string {
    const f = this.bookingForm;
    const v = this.activeVehicle!;
    if (f.fullName.trim().length < 2) return 'Vui lòng nhập họ tên người thuê.';
    if (!/^0[35789]\d{8}$/.test(f.phone.trim())) return 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.';
    if (!f.startAt) return 'Vui lòng chọn thời gian đi.';
    if (f.rentalType === 'self' && !f.endAt) return 'Thuê tự lái cần chọn thời gian trả xe.';
    if (f.endAt && new Date(f.endAt) <= new Date(f.startAt)) return 'Thời gian về phải sau thời gian đi.';
    if (f.pickupLocation.trim().length < 3) return 'Vui lòng nhập điểm đón (tối thiểu 3 ký tự).';
    if (f.destination.trim().length < 3) return 'Vui lòng nhập điểm đến (tối thiểu 3 ký tự).';
    const max = v.maxPassengers * (Number(f.vehicles) || 1);
    if (!(Number(f.passengers) >= 1) || Number(f.passengers) > max) return `Số khách phải từ 1 đến ${max}.`;
    return '';
  }

  // ─── TRA CỨU & DUYỆT BÁO GIÁ ─────────────────────────────────────────────

  async lookupRequest(): Promise<void> {
    const code = this.lookupForm.code.trim().toUpperCase();
    const phone = this.lookupForm.phone.trim();
    if (!code || !/^0[35789]\d{8}$/.test(phone)) {
      this.lookupError = 'Nhập mã yêu cầu (VD: YCTX001) và số điện thoại đã dùng khi gửi.';
      return;
    }
    this.lookupLoading = true;
    this.lookupError = '';
    try {
      const order = await this.api.request<RentalLookup>(
        `customer/contract-rentals/requests/${encodeURIComponent(code)}?phone=${encodeURIComponent(phone)}`);
      this.showOrder(order, phone);
    } catch (error) {
      this.lookupError = this.message(error, 'Không tìm thấy yêu cầu.');
    } finally {
      this.lookupLoading = false;
    }
  }

  async refreshOrder(): Promise<void> {
    if (!this.currentOrder) return;
    try {
      const order = await this.api.request<RentalLookup>(
        `customer/contract-rentals/requests/${encodeURIComponent(this.currentOrder.code)}?phone=${encodeURIComponent(this.orderPhone)}`);
      this.currentOrder = order;
    } catch (error) {
      this.toast.showError(this.message(error, 'Không tải lại được trạng thái.'));
    }
  }

  async decideQuote(decision: 'accept' | 'reject'): Promise<void> {
    if (!this.currentOrder || this.deciding) return;
    let reason: string | undefined;
    if (decision === 'reject') {
      reason = window.prompt('Lý do từ chối báo giá (không bắt buộc):')?.trim() || undefined;
    }
    this.deciding = true;
    try {
      await this.api.request(`customer/contract-rentals/requests/${encodeURIComponent(this.currentOrder.code)}/quote-decision`, 'POST', {
        phone: this.orderPhone,
        decision,
        ...(reason ? { reason } : {}),
      });
      this.toast.showSuccess(decision === 'accept' ? 'Đã đồng ý báo giá. VIAGO sẽ liên hệ ký hợp đồng.' : 'Đã từ chối báo giá.');
      await this.refreshOrder();
    } catch (error) {
      this.toast.showError(this.message(error, 'Không gửi được phản hồi báo giá.'));
    } finally {
      this.deciding = false;
    }
  }

  private showOrder(order: RentalLookup, phone: string): void {
    this.currentOrder = order;
    this.orderPhone = phone;
    this.lookupForm = { code: order.code, phone };
    try {
      localStorage.setItem(SAVED_LOOKUP_KEY, JSON.stringify({ code: order.code, phone }));
    } catch { /* bỏ qua */ }
    this.viewState = 'order';
    this.scrollToTop();
  }

  stepDesc(step: BookingStep): string {
    return STEP_DESC[step.key] ?? '';
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────

  private resetSchedule(): void {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(8, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    this.bookingForm.startAt = toLocalInput(start);
    this.bookingForm.endAt = toLocalInput(end);
  }

  get minStart(): string {
    return toLocalInput(new Date(Date.now() + 12 * 3600 * 1000));
  }

  formatMoney(value: number | null | undefined): string {
    return `${Math.round(Number(value) || 0).toLocaleString('vi-VN')}đ`;
  }

  private shortMoney(value: number): string {
    return value >= 1000 && value % 1000 === 0 ? `${value / 1000}K` : this.formatMoney(value);
  }

  formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh',
    });
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  private newKey(): string {
    const c = globalThis.crypto as Crypto | undefined;
    return c?.randomUUID ? c.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
