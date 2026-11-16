import {
  Component,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  NgZone,
  HostListener,
  inject,
} from '@angular/core';
import { create } from 'qrcode';
import { Router, NavigationSkipped, NavigationSkippedCode } from '@angular/router';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../shared/components/button/button';
import { Select } from '../../../shared/components/input/select/select';
import { Input } from '../../../shared/components/input/input';
import { Badge, BadgeVariant } from '../../../shared/components/badge/badge';
import { Textarea } from '../../../shared/components/input/textarea/textarea';
import { Toast } from '../../../shared/components/toast/toast';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { SearchableDropdownComponent } from '../../../shared/components/searchable-dropdown/searchable-dropdown';
import { AccountsApiService } from '../../../core/services/accounts-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';

/** Đơn thật từ GET customer/reviews/orders/... (chỉ dùng cho phần đánh giá chuyến đi). */
interface ApiLookupOrder {
  id: string;
  customerId: string | null;
  bookerName: string;
  phone: string;
  email: string | null;
  bookedAt: string;
  route: string;
  scheduleId: string;
  departureAt: string;
  arrivalAt: string;
  presenceMinutes: number;
  pickupId: string;
  pickup: string;
  dropoffId: string;
  dropoff: string;
  plate: string;
  total: number;
  paymentMethod: string;
  editCount: number;
  editLimit: number;
  status: ApiLookupStatus;
  version: string;
  canEdit: boolean;
  seats?: string[];
  points: { id: string; name: string; kind: string; at?: string }[];
  tickets: {
    id: string;
    seat: string;
    passenger: string;
    price: number;
    qr: string;
    status: ApiLookupStatus;
  }[];
}
type ApiLookupStatus = 'pending' | 'upcoming' | 'completed' | 'reviewed' | 'cancelled';

const API_STATUS: Record<
  ApiLookupStatus,
  'Chờ thanh toán' | 'Chờ khởi hành' | 'Đã hoàn thành' | 'Đã hủy' | 'Đã đánh giá'
> = {
  pending: 'Chờ thanh toán',
  upcoming: 'Chờ khởi hành',
  completed: 'Đã hoàn thành',
  reviewed: 'Đã đánh giá',
  cancelled: 'Đã hủy',
};

/** Tách ngày/giờ theo giờ Việt Nam từ chuỗi ISO. */
const vnParts = (iso: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return {
    date: `${p['year']}-${p['month']}-${p['day']}`,
    dmy: `${p['day']}/${p['month']}/${p['year']}`,
    time: `${p['hour']}:${p['minute']}`,
  };
};

interface Ticket {
  MaVe: string;
  SoGhe: string;
  BienSoXe: string;
  DiemDon: string;
  DiemDonThoiGian: string;
  DiemTra: string;
  DiemTraThoiGian: string;
  GiaVe: number;
  TrangThaiVe: 'Chờ thanh toán' | 'Chờ khởi hành' | 'Đã hoàn thành' | 'Đã hủy' | 'Đã đánh giá';
  MaQRVe: string;
}

interface Order {
  MaDonHang: string;
  MaKhachHang: string;
  HoTenNguoiDi: string;
  SoDienThoai: string;
  Email: string;
  ThoiGianDat: string;
  SoLuongVeDaDat: number;
  TenTuyen: string;
  GioKhoiHanh: string;
  GioTra: string;
  DepartureDate: string; // YYYY-MM-DD
  DiemDon: string;
  DiemTra: string;
  ThoiGianCoMatTruoc: string;
  GioCanCoMat: string;
  TongGiaVe: number;
  PhuongThucThanhToan: string;
  TrangThaiDonHang: 'Chờ thanh toán' | 'Chờ khởi hành' | 'Đã hoàn thành' | 'Đã hủy' | 'Đã đánh giá';
  BienSoXe: string;
  MaDiemDon: string;
  MaDiemTra: string;
  SoLanDaSua: number;
  GioiHanChinhSua: number;
  MaLichTrinh?: string;
  GioGoiYCoMat?: string;
  Tickets: Ticket[];
  /** Đơn thật lấy từ DB (khác dữ liệu mẫu): chỉ phần đánh giá được nối backend. */
  FromDb?: boolean;
  /** Đơn thật lấy theo tài khoản đang đăng nhập (gửi đánh giá qua API hồ sơ). */
  ViaAccount?: boolean;
}

interface LocationOption {
  MaDiem: string;
  TenDiem: string;
  ThoiGian?: string;
  DiaChi?: string;
}

interface RatingCriteriaItem {
  Label: string;
  Score: number;
}

@Component({
  selector: 'app-ticket-lookup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    Input,
    Badge,
    Textarea,
    Toast,
    ModalComponent,
    SearchableDropdownComponent,
    Select,
  ],
  templateUrl: './ticket-lookup.html',
  styleUrls: ['./ticket-lookup.css'],
})
export class TicketLookup implements OnInit, OnDestroy {
  locationOptions: LocationOption[] = [];
  private lookupChallenge = '';
  private detailRows = new Map<string, ApiLookupOrder>();
  get pickupLocationOptions() {
    return (this.detailRows.get(this.currentOrder?.MaDonHang ?? '')?.points ?? [])
      .filter((p) => p.kind === 'Don')
      .map((p) => ({ MaDiem: p.id, TenDiem: p.name }));
  }
  get dropoffLocationOptions() {
    return (this.detailRows.get(this.currentOrder?.MaDonHang ?? '')?.points ?? [])
      .filter((p) => p.kind === 'Tra')
      .map((p) => ({ MaDiem: p.id, TenDiem: p.name }));
  }

  statusVariant(status: string): BadgeVariant {
    if (status === 'Đã hủy') return 'danger';
    if (status === 'Chờ thanh toán') return 'warning';
    if (status === 'Chờ khởi hành') return 'info';
    return 'success';
  }

  phoneNumber = '';
  bookingCode = '';
  isLoading = false;
  currentOrder: Order | null = null;
  searchError = '';
  currentStep: 'search' | 'otp' | 'orders' | 'results' = 'search';
  orders: Order[] = [];
  verifiedPhone = '';
  otpCode = '';
  otpError = '';
  phoneError = '';

  otpExpiresAt = 0;
  resendAvailableAt = 0;
  lookupNow = Date.now();
  private otpAttempts = 0;
  private otpTimer: ReturnType<typeof setInterval> | null = null;
  private lookupNavigation: Subscription | null = null;
  private lookupTask: ReturnType<typeof setTimeout> | null = null;

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  showEditModal = false;
  showCancelModal = false;
  showCancelConfirmModal = false;
  showReviewModal = false;
  showPrintModal = false;
  showShareModal = false;
  shareUrl = '';
  shareQrUrl = '';
  printTicket: Ticket | null = null;
  downloadingTicketCode = '';
  private lookupDestroyed = false;
  selectedCancelTicket: Ticket | null = null;
  showDiemDonDropdown = false;
  showDiemTraDropdown = false;
  showEditConfirmationSummary = false;

  editFullName = '';
  editPhone = '';
  editEmail = '';
  editDiemDonSearchText = '';
  editDiemTraSearchText = '';
  editMaDiemDon = '';
  editMaDiemTra = '';
  editFieldErrors: Record<string, string> = {};
  editChangeSummary: Array<{ field: string; oldValue: string; newValue: string }> = [];
  selectedCancelReason = 'Tôi đổi kế hoạch';
  cancelPolicies: any[] = [];

  filterDiemDonOptions: LocationOption[] = [];
  filterDiemTraOptions: LocationOption[] = [];

  cancelReasons = ['Tôi đổi kế hoạch', 'Tôi không thể tham gia', 'Tôi gặp sự cố', 'Lý do khác'];

  reviewComment = '';
  reviewFieldError = '';
  reviewFiles: File[] = [];
  ratingCriteria: RatingCriteriaItem[] = [
    { Label: 'An toàn', Score: 0 },
    { Label: 'Sạch sẽ', Score: 0 },
    { Label: 'Thái độ Nhân viên', Score: 0 },
    { Label: 'Đúng giờ', Score: 0 },
    { Label: 'Thông tin đầy đủ', Score: 0 },
    { Label: 'Tiện nghi', Score: 0 },
  ];
  quickReviewTags = ['An toàn', 'Sạch sẽ', 'Đúng giờ', 'Thông tin đầy đủ', 'Tiện nghi'];

  // Local Mock Database
  private readonly DanhSachVeMock: Order[] = [];

  get cancelReasonOptions() {
    return this.cancelReasons.map((value) => ({ value, label: value }));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isLoading) return;
    if (this.showCancelConfirmModal) this.closeCancelConfirmModal();
    else if (this.showEditConfirmationSummary) this.closeEditConfirmationSummary();
    else if (this.showPrintModal) this.closePrintModal();
    else if (this.showShareModal) this.showShareModal = false;
    else if (this.showReviewModal) this.closeReviewModal();
    else if (this.showCancelModal) this.closeCancelModal();
    else if (this.showEditModal) this.closeEditOrderModal();
  }

  constructor(
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private router: Router,
  ) {}

  private readonly accountsApi = inject(AccountsApiService);
  protected readonly auth = inject(AuthService);
  private readonly authModal = inject(AuthModalService);
  /** Đang tìm đơn thật theo mã (khách chưa đăng nhập). */
  findingRealOrder = false;
  /** Vé được chọn để đánh giá khi đơn thật có nhiều vé đã hoàn thành. */
  reviewTicketId = '';

  ngOnInit(): void {
    this.lookupNavigation = this.router.events.subscribe((event) => {
      if (
        event instanceof NavigationSkipped &&
        event.code === NavigationSkippedCode.IgnoredSameUrlNavigation
      ) {
        this.resetLookup();
        this.cdr.detectChanges();
      }
    });
    const params = new URLSearchParams(window.location.search);
    const phone = params.get('phone');
    const code = params.get('code');
    if (phone) this.phoneNumber = phone.replace(/\D/g, '').slice(0, 10);
    if (code) this.bookingCode = code.trim().toUpperCase();
    const accountOrder = params.get('order');
    if (accountOrder) void this.openAccountOrder(accountOrder, params.get('ticket'));
    else
      void this.auth.ready.then(() => {
        if (this.auth.currentUser()) {
          this.phoneNumber = this.loggedInPhone;
          this.verifiedPhone = this.phoneNumber;
          void this.showOrders();
        }
      });
  }

  /**
   * Đi từ Hồ sơ → Lịch sử mua vé → Chi tiết: mở thẳng trang Chi tiết vé của đơn thuộc tài khoản,
   * cùng màn hình với khi tra cứu bằng mã đơn + SĐT.
   */
  private async openAccountOrder(code: string, ticketId: string | null): Promise<void> {
    await this.auth.ready;
    await this.openOrder({ MaDonHang: code } as Order);
  }

  ngOnDestroy(): void {
    this.lookupDestroyed = true;
    this.lookupNavigation?.unsubscribe();
    if (this.otpTimer) clearInterval(this.otpTimer);
    if (this.lookupTask) clearTimeout(this.lookupTask);
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  get otpSecondsLeft(): number {
    return Math.max(0, Math.ceil((this.otpExpiresAt - this.lookupNow) / 1000));
  }

  get resendSecondsLeft(): number {
    return Math.max(0, Math.ceil((this.resendAvailableAt - this.lookupNow) / 1000));
  }

  get filteredOrders(): Order[] {
    const code = this.bookingCode.trim().toUpperCase();
    return code ? this.orders.filter((order) => order.MaDonHang === code) : this.orders;
  }

  onLookupPhoneChange(value: string): void {
    this.phoneNumber = value.replace(/\D/g, '').slice(0, 10);
    this.phoneError = /^0\d{9}$/.test(this.phoneNumber)
      ? ''
      : 'Số điện thoại phải có 10 chữ số và bắt đầu bằng 0.';
    this.searchError = '';
  }

  onOtpChange(value: string): void {
    this.otpCode = value.replace(/\D/g, '').slice(0, 6);
    this.otpError = '';
  }

  searchTickets(): void {
    if (this.isLoading) return;
    if (this.verifiedPhone && this.verifiedPhone === this.phoneNumber) {
      this.showOrders();
      return;
    }
    this.requestOtp();
  }

  async requestOtp(resend = false): Promise<void> {
    if (this.isLoading || (resend && Date.now() < this.resendAvailableAt)) return;
    if (!/^0\d{9}$/.test(this.phoneNumber)) {
      this.phoneError = 'Số điện thoại phải gồm 10 chữ số.';
      return;
    }
    this.isLoading = true;
    this.otpError = '';
    this.searchError = '';
    try {
      const data = await this.accountsApi.request<{ challengeId: string; expiresAt: string }>(
        'customer/auth/otp/request',
        'POST',
        { phoneNumber: this.phoneNumber, purpose: 'TraCuuVe' },
      );
      this.lookupChallenge = data.challengeId;
      this.otpCode = '';
      this.currentStep = 'otp';
      this.lookupNow = Date.now();
      this.otpExpiresAt = Date.parse(data.expiresAt);
      this.resendAvailableAt = Date.now() + 60000;
      if (this.otpTimer) clearInterval(this.otpTimer);
      this.otpTimer = setInterval(() => {
        this.lookupNow = Date.now();
        this.cdr.detectChanges();
      }, 1000);
    } catch (e) {
      this.searchError = e instanceof Error ? e.message : 'Không gửi được mã.';
      this.otpError = this.searchError;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async verifyOtp(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;
    this.otpError = '';
    try {
      const proof = await this.accountsApi.request<{ verificationToken: string }>(
        'customer/auth/otp/verify',
        'POST',
        { challengeId: this.lookupChallenge, code: this.otpCode },
      );
      await this.accountsApi.request('customer/ticket-lookup/session', 'POST', {
        phoneNumber: this.phoneNumber,
        verificationToken: proof.verificationToken,
      });
      this.verifiedPhone = this.phoneNumber;
      if (this.otpTimer) clearInterval(this.otpTimer);
      await this.showOrders();
    } catch (e) {
      this.otpError = e instanceof Error ? e.message : 'Xác thực thất bại.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private readOrders(): Order[] {
    return [];
  }

  async showOrders(): Promise<void> {
    this.isLoading = true;
    this.searchError = '';
    try {
      let page = 1,
        pages = 1;
      const rows: ApiLookupOrder[] = [];
      do {
        const data = await this.accountsApi.request<{
          items: ApiLookupOrder[];
          pagination?: { totalPages: number };
        }>('customer/ticket-lookup/orders?page=' + page);
        rows.push(...data.items);
        pages = data.pagination?.totalPages ?? 1;
        page++;
      } while (page <= pages);
      this.orders = rows.map((row) => this.fromApi(row, !!this.auth.currentUser()));
      this.currentOrder = null;
      this.currentStep = 'orders';
      this.verifiedPhone = this.loggedInPhone || this.verifiedPhone;
    } catch (e) {
      this.searchError = e instanceof Error ? e.message : 'Không tải được đơn.';
      this.orders = [];
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // ─── ĐƠN THẬT (chỉ phục vụ đánh giá chuyến đi) ──────────────────────────────

  get loggedInPhone(): string {
    return (this.auth.currentUser()?.phoneNumber || '').replace(/\D/g, '');
  }

  openLogin(): void {
    this.authModal.open('login');
  }

  /** Khách đã đăng nhập: vào thẳng danh sách đơn của tài khoản, không cần OTP. */
  openMyOrders(): void {
    const phone = this.loggedInPhone;
    if (!phone) return;
    this.changeLookupPhone();
    this.phoneNumber = phone;
    this.verifiedPhone = phone;
    this.showOrders();
  }

  /** Đơn thật của tài khoản đang đăng nhập (GET customer/reviews/orders/mine) khi SĐT tra cứu trùng SĐT tài khoản. */
  private async mergeAccountOrders(): Promise<void> {
    await this.showOrders();
  }

  /** Khách chưa đăng nhập: tìm đơn thật theo mã đơn/mã vé + SĐT đã nhập (GET customer/reviews/orders/:code). */
  async findRealOrder(): Promise<void> {
    const id = this.bookingCode.trim();
    if (!id) return;
    await this.openOrder({ MaDonHang: id } as Order);
  }

  private addRealOrders(list: Order[]): void {
    const others = this.orders.filter((o) => !list.some((n) => n.MaDonHang === o.MaDonHang));
    this.orders = [...list, ...others];
  }

  private fromApi(o: ApiLookupOrder, viaAccount: boolean): Order {
    this.detailRows.set(o.id, o);
    const dep = vnParts(o.departureAt);
    const pickupAt = o.points?.find((p) => p.id === o.pickupId)?.at || o.departureAt;
    const pickup = vnParts(pickupAt);
    const dropoff = vnParts(o.points?.find((p) => p.id === o.dropoffId)?.at || o.arrivalAt);
    const arr = vnParts(o.arrivalAt);
    const booked = vnParts(o.bookedAt);
    const presence = vnParts(
      new Date(new Date(pickupAt).getTime() - o.presenceMinutes * 60000).toISOString(),
    );
    return {
      MaDonHang: o.id,
      MaKhachHang: o.customerId ?? '',
      HoTenNguoiDi: o.bookerName,
      SoDienThoai: o.phone,
      Email: o.email ?? '',
      ThoiGianDat: `${booked.dmy} ${booked.time}`,
      SoLuongVeDaDat: o.seats?.length ?? o.tickets.length,
      TenTuyen: o.route,
      GioKhoiHanh: dep.time,
      GioTra: arr.time,
      DepartureDate: dep.date,
      DiemDon: o.pickup,
      DiemTra: o.dropoff,
      ThoiGianCoMatTruoc: `${o.presenceMinutes} phút`,
      GioCanCoMat: presence.time,
      TongGiaVe: o.total,
      PhuongThucThanhToan: o.paymentMethod,
      TrangThaiDonHang: API_STATUS[o.status],
      BienSoXe: o.plate,
      MaDiemDon: o.pickupId,
      MaDiemTra: o.dropoffId,
      SoLanDaSua: o.editCount,
      GioiHanChinhSua: o.editLimit,
      MaLichTrinh: o.scheduleId,
      Tickets: o.tickets.map((t) => ({
        MaVe: t.id,
        SoGhe: t.seat,
        BienSoXe: o.plate,
        DiemDon: o.pickup,
        DiemDonThoiGian: `${pickup.time} - ${pickup.dmy}`,
        DiemTra: o.dropoff,
        DiemTraThoiGian: `${dropoff.time} - ${dropoff.dmy}`,
        GiaVe: t.price,
        TrangThaiVe: API_STATUS[t.status],
        MaQRVe: t.qr,
      })),
      FromDb: true,
      ViaAccount: viaAccount,
    };
  }

  /** Vé của đơn thật còn đánh giá được (đã hoàn thành, chưa đánh giá). */
  get reviewableTickets(): Ticket[] {
    return this.currentOrder?.FromDb
      ? this.currentOrder.Tickets.filter((t) => t.TrangThaiVe === 'Đã hoàn thành')
      : [];
  }

  private async reloadRealOrder(order: Order): Promise<void> {
    const row = await this.accountsApi.request<ApiLookupOrder>(
      'customer/ticket-lookup/orders/' + encodeURIComponent(order.MaDonHang),
    );
    const fresh = this.fromApi(row, !!order.ViaAccount);
    this.orders = this.orders.map((o) => (o.MaDonHang === fresh.MaDonHang ? fresh : o));
    if (this.currentOrder?.MaDonHang === fresh.MaDonHang) this.currentOrder = fresh;
  }

  /** Gửi đánh giá đơn thật: đã đăng nhập → API hồ sơ; chưa đăng nhập → mã đơn + SĐT người đặt. */
  private async submitRealReview(): Promise<void> {
    const order = this.currentOrder!;
    const ticketId = this.reviewTicketId || this.reviewableTickets[0]?.MaVe;
    if (!ticketId) {
      this.showToast('Đơn này không còn vé nào chờ đánh giá.', 'error');
      return;
    }
    const form = new FormData();
    form.append('scores', JSON.stringify(this.ratingCriteria.map((c) => c.Score)));
    if (this.reviewComment.trim()) form.append('comment', this.reviewComment.trim());
    if (!order.ViaAccount) {
      form.append('phone', this.verifiedPhone);
      form.append('ticketId', ticketId);
    }
    this.reviewFiles.forEach((file) => form.append('files', file));
    const path = order.ViaAccount
      ? `customer/profile/tickets/${encodeURIComponent(ticketId)}/review`
      : `customer/reviews/orders/${encodeURIComponent(order.MaDonHang)}/review`;
    this.isLoading = true;
    try {
      await this.accountsApi.request(path, 'POST', form);
      this.closeReviewModal();
      await this.reloadRealOrder(order);
      this.showToast(
        `Đã gửi đánh giá cho vé ${ticketId}. Đánh giá đã hiển thị ở trang Đánh giá.`,
        'success',
      );
    } catch (error) {
      this.showToast(
        error instanceof Error && error.message ? error.message : 'Không gửi được đánh giá.',
        'error',
      );
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  orderSeats(order: Order): string {
    return (
      this.detailRows.get(order.MaDonHang)?.seats ?? order.Tickets.map((ticket) => ticket.SoGhe)
    ).join(', ');
  }

  async openOrder(order: Order): Promise<void> {
    this.isLoading = true;
    try {
      const row = await this.accountsApi.request<ApiLookupOrder>(
        'customer/ticket-lookup/orders/' + encodeURIComponent(order.MaDonHang),
      );
      this.currentOrder = this.fromApi(row, !!this.auth.currentUser());
      this.currentStep = 'results';
      this.locationOptions = row.points.map((p) => ({ MaDiem: p.id, TenDiem: p.name }));
    } catch (e) {
      this.showToast(e instanceof Error ? e.message : 'Không tải được đơn.', 'error');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  backToSearch(): void {
    this.currentOrder = null;
    this.searchError = '';
    this.showEditModal = false;
    this.showCancelModal = false;
    this.showCancelConfirmModal = false;
    this.showReviewModal = false;
    this.showPrintModal = false;
    this.showShareModal = false;
    this.selectedCancelTicket = null;
    this.showOrders();
  }

  maskPhone(phone: string): string {
    return phone;
  }

  maskEmail(Email: string): string {
    if (!Email || !Email.includes('@')) {
      return Email;
    }
    const [name, domain] = Email.split('@');
    const maskedName = name.length <= 2 ? `${name[0]}*` : `${name.slice(0, 2)}***`;
    return `${maskedName}@${domain}`;
  }

  getStatusClasses(status: string): { [key: string]: boolean } {
    return {
      'bg-success/10 text-success': status === 'Đã hoàn thành' || status === 'Đã đánh giá',
      'bg-error/10 text-error': status === 'Đã hủy',
      'bg-primary/10 text-primary': status === 'Chờ thanh toán',
      'bg-warning/10 text-warning': status === 'Chờ khởi hành',
    };
  }

  getTicketStatusClasses(status: string): { [key: string]: boolean } {
    return {
      'bg-success/10 text-success': status === 'Đã hoàn thành' || status === 'Đã đánh giá',
      'bg-error/10 text-error': status === 'Đã hủy',
      'bg-primary/10 text-primary': status === 'Chờ thanh toán',
      'bg-warning/10 text-warning': status === 'Chờ khởi hành',
    };
  }

  getPresenceTimeLabel(): string {
    if (!this.currentOrder) {
      return '';
    }
    const gio = this.formatTimeStr(this.currentOrder.GioGoiYCoMat || this.currentOrder.GioCanCoMat);
    return `${gio} ${this.formatDisplayDate(this.currentOrder.DepartureDate)}`;
  }

  formatTimeStr(timeStr: string): string {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
    return timeStr;
  }

  getEditLimit(): number {
    return this.currentOrder?.GioiHanChinhSua ?? 0;
  }

  getEditRemaining(): number {
    if (!this.currentOrder) {
      return 0;
    }
    return Math.max(this.getEditLimit() - (this.currentOrder.SoLanDaSua || 0), 0);
  }

  canEditOrder(): boolean {
    return this.getEditRemaining() > 0;
  }

  getHoursUntilDeparture(): number | null {
    if (!this.currentOrder || !this.currentOrder.DepartureDate || !this.currentOrder.GioKhoiHanh) {
      return null;
    }
    const departureDateTime = this.buildDepartureDate(
      this.currentOrder.DepartureDate,
      this.currentOrder.GioKhoiHanh,
    );
    if (!departureDateTime) {
      return null;
    }
    const now = new Date();
    const diffMs = departureDateTime.getTime() - now.getTime();
    return diffMs / (1000 * 60 * 60);
  }

  get isEditButtonEnabled(): boolean {
    if (!this.currentOrder) return false;
    if (this.detailRows.has(this.currentOrder.MaDonHang))
      return this.detailRows.get(this.currentOrder.MaDonHang)!.canEdit;
    const orderStatus = this.currentOrder.TrangThaiDonHang;
    const hasEditableTicket = this.currentOrder.Tickets.some(
      (ticket) => ticket.TrangThaiVe === 'Chờ thanh toán' || ticket.TrangThaiVe === 'Chờ khởi hành',
    );
    const hasFinishedTicket = this.currentOrder.Tickets.some(
      (ticket) => ticket.TrangThaiVe === 'Đã hoàn thành' || ticket.TrangThaiVe === 'Đã đánh giá',
    );
    const canEditCount = this.getEditRemaining() > 0;
    const hoursRemaining = this.getHoursUntilDeparture();
    const hasEnoughTime = hoursRemaining !== null && hoursRemaining >= 2;

    return (
      (orderStatus === 'Chờ thanh toán' || orderStatus === 'Chờ khởi hành') &&
      hasEditableTicket &&
      !hasFinishedTicket &&
      canEditCount &&
      hasEnoughTime
    );
  }

  get isEditButtonDisabled(): boolean {
    return !this.isEditButtonEnabled;
  }

  canCancelTicket(ticket: Ticket): boolean {
    if (!this.currentOrder) return false;
    const orderCanCancel = this.currentOrder.TrangThaiDonHang === 'Chờ khởi hành';
    const ticketCanCancel = ticket.TrangThaiVe === 'Chờ khởi hành';
    return orderCanCancel && ticketCanCancel && this.getRefundPercentage() > 0;
  }

  isTicketCancelDisabled(ticket: Ticket): boolean {
    return !this.canCancelTicket(ticket);
  }

  getCancelButtonTitle(ticket: Ticket): string {
    if (ticket.TrangThaiVe === 'Đã hủy') {
      return 'Vé này đã được hủy.';
    }
    if (ticket.TrangThaiVe !== 'Chờ khởi hành') {
      return 'Chỉ hủy được vé đang chờ khởi hành.';
    }
    if (this.getRefundPercentage() === 0) {
      return 'Không thể hủy vé khi chỉ còn dưới 12 giờ trước khởi hành.';
    }
    return 'Hủy riêng vé này.';
  }

  getActiveTicketCount(): number {
    return (
      this.currentOrder?.Tickets.filter((ticket) => ticket.TrangThaiVe !== 'Đã hủy').length || 0
    );
  }

  getCanceledTicketCount(): number {
    return (
      this.currentOrder?.Tickets.filter((ticket) => ticket.TrangThaiVe === 'Đã hủy').length || 0
    );
  }

  getActiveTicketTotal(): number {
    return (
      this.currentOrder?.Tickets.filter((ticket) => ticket.TrangThaiVe !== 'Đã hủy').reduce(
        (total, ticket) => total + ticket.GiaVe,
        0,
      ) || 0
    );
  }

  get isReviewButtonEnabled(): boolean {
    if (!this.currentOrder) return false;
    if (this.currentOrder.FromDb) return this.reviewableTickets.length > 0;
    const orderStatus = this.currentOrder.TrangThaiDonHang;
    const ticketsStatusValid = this.currentOrder.Tickets.every(
      (ticket) => ticket.TrangThaiVe === 'Đã hoàn thành',
    );
    return orderStatus === 'Đã hoàn thành' && ticketsStatusValid;
  }

  get isReviewButtonDisabled(): boolean {
    return !this.isReviewButtonEnabled;
  }

  formatPrice(price: number): string {
    return (price || 0).toLocaleString('vi-VN') + 'đ';
  }

  formatDisplayDate(dateString: string): string {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
  }

  getRefundPercentage(): number {
    if (!this.currentOrder) return 0;
    const departure = this.buildDepartureDate(
      this.currentOrder.DepartureDate,
      this.currentOrder.GioKhoiHanh,
    );
    if (!departure) return 0;
    const diffHours = (departure.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    if (diffHours <= 0) return 0;
    if (diffHours >= 24) return 100;
    if (diffHours >= 12) return 50;
    return 0;
  }

  getSelectedCancelTicketPrice(): number {
    return this.selectedCancelTicket?.GiaVe || 0;
  }

  getRefundFee(): number {
    return this.getSelectedCancelTicketPrice() * (1 - this.getRefundPercentage() / 100);
  }

  getRefundAmount(): number {
    return this.getSelectedCancelTicketPrice() * (this.getRefundPercentage() / 100);
  }

  getQrCodeUrl(ticket: Ticket): string {
    const orderCode = this.currentOrder?.MaDonHang || 'unknown';
    const data = ticket.MaQRVe;
    return this.localQr(data);
  }

  openEditOrderModal(): void {
    if (!this.currentOrder) return;

    if (this.isEditButtonDisabled) {
      const hoursRemaining = this.getHoursUntilDeparture();
      if (hoursRemaining !== null && hoursRemaining < 2) {
        this.showToast(
          'Bạn chỉ có thể chỉnh sửa thông tin đơn hàng khi còn ít nhất 2 tiếng trước giờ khởi hành.',
          'error',
        );
      } else {
        this.showToast(
          'Bạn không thể chỉnh sửa thông tin đơn hàng ở trạng thái hiện tại.',
          'error',
        );
      }
      return;
    }

    this.editFullName = this.currentOrder.HoTenNguoiDi;
    this.editPhone = this.currentOrder.SoDienThoai;
    this.editEmail = this.currentOrder.Email;

    const currentDiemDonOpt = this.locationOptions.find(
      (l) => l.MaDiem === this.currentOrder!.MaDiemDon,
    );
    const currentDiemTraOpt = this.locationOptions.find(
      (l) => l.MaDiem === this.currentOrder!.MaDiemTra,
    );

    this.editDiemDonSearchText = currentDiemDonOpt
      ? currentDiemDonOpt.TenDiem
      : this.currentOrder.DiemDon;
    this.editDiemTraSearchText = currentDiemTraOpt
      ? currentDiemTraOpt.TenDiem
      : this.currentOrder.DiemTra;
    this.editMaDiemDon = this.currentOrder.MaDiemDon;
    this.editMaDiemTra = this.currentOrder.MaDiemTra;

    this.filterDiemDonOptions = [...this.locationOptions];
    this.filterDiemTraOptions = [...this.locationOptions];

    this.showDiemDonDropdown = false;
    this.showDiemTraDropdown = false;
    this.showEditModal = true;
  }

  closeEditOrderModal(): void {
    this.showEditModal = false;
    this.showEditConfirmationSummary = false;
    this.editFieldErrors = {};
    this.editChangeSummary = [];
    this.closeEditDropdowns();
  }

  onEditDiemDonInput(): void {
    const search = this.editDiemDonSearchText.toLowerCase().trim();
    this.filterDiemDonOptions = search
      ? this.locationOptions.filter(
          (item) =>
            item.TenDiem.toLowerCase().includes(search) ||
            (item.DiaChi || '').toLowerCase().includes(search),
        )
      : [...this.locationOptions];
    this.showDiemDonDropdown = true;
  }

  onEditDiemTraInput(): void {
    const search = this.editDiemTraSearchText.toLowerCase().trim();
    this.filterDiemTraOptions = search
      ? this.locationOptions.filter(
          (item) =>
            item.TenDiem.toLowerCase().includes(search) ||
            (item.DiaChi || '').toLowerCase().includes(search),
        )
      : [...this.locationOptions];
    this.showDiemTraDropdown = true;
  }

  closeEditDropdowns(): void {
    this.showDiemDonDropdown = false;
    this.showDiemTraDropdown = false;
  }

  isEditSaveDisabled(): boolean {
    if (!this.currentOrder || !this.canEditOrder()) return true;
    const hoursRemaining = this.getHoursUntilDeparture();
    if (hoursRemaining === null || hoursRemaining < 2) return true;

    const hasFullNameChanged = this.editFullName.trim() !== this.currentOrder.HoTenNguoiDi;
    const hasPhoneChanged = this.editPhone.trim() !== this.currentOrder.SoDienThoai;
    const hasEmailChanged = this.editEmail.trim() !== this.currentOrder.Email;
    const hasPickupChanged = this.editMaDiemDon !== this.currentOrder.MaDiemDon;
    const hasDropoffChanged = this.editMaDiemTra !== this.currentOrder.MaDiemTra;

    return !(
      hasFullNameChanged ||
      hasPhoneChanged ||
      hasEmailChanged ||
      hasPickupChanged ||
      hasDropoffChanged
    );
  }

  private validateEditForm(): boolean {
    this.editFieldErrors = {};
    const fullName = this.editFullName.trim();
    const phone = this.editPhone.trim();
    const MaDiemDon = this.editMaDiemDon.trim();
    const MaDiemTra = this.editMaDiemTra.trim();

    if (!fullName) {
      this.editFieldErrors['HoTenNguoiDi'] = 'Họ tên người đi không được bỏ trống.';
    } else if (fullName.length < 3) {
      this.editFieldErrors['HoTenNguoiDi'] = 'Họ tên phải có ít nhất 3 ký tự.';
    }

    if (!phone) {
      this.editFieldErrors['SoDienThoai'] = 'Số điện thoại không được bỏ trống.';
    } else if (!/^0\d{9,10}$/.test(phone.replace(/\s/g, ''))) {
      this.editFieldErrors['SoDienThoai'] =
        'Số điện thoại không hợp lệ. Vui lòng nhập 10-11 chữ số bắt đầu từ 0.';
    }

    if (!MaDiemDon) {
      this.editFieldErrors['MaDiemDon'] = 'Vui lòng chọn điểm đón.';
    }
    if (!MaDiemTra) {
      this.editFieldErrors['MaDiemTra'] = 'Vui lòng chọn điểm trả.';
    }

    if (Object.keys(this.editFieldErrors).length > 0) {
      this.cdr.detectChanges();
      return false;
    }
    return true;
  }

  private buildEditChangeSummary(): boolean {
    if (!this.currentOrder) return false;
    this.editChangeSummary = [];

    if (this.editFullName.trim() !== this.currentOrder.HoTenNguoiDi) {
      this.editChangeSummary.push({
        field: 'Họ tên người đi',
        oldValue: this.currentOrder.HoTenNguoiDi,
        newValue: this.editFullName.trim(),
      });
    }

    if (this.editPhone.trim() !== this.currentOrder.SoDienThoai) {
      this.editChangeSummary.push({
        field: 'Số điện thoại',
        oldValue: this.currentOrder.SoDienThoai,
        newValue: this.editPhone.trim(),
      });
    }

    if (this.editEmail.trim() !== this.currentOrder.Email) {
      this.editChangeSummary.push({
        field: 'Email',
        oldValue: this.currentOrder.Email,
        newValue: this.editEmail.trim(),
      });
    }

    const oldDiemDon =
      this.locationOptions.find((d) => d.MaDiem === this.currentOrder?.MaDiemDon)?.TenDiem ||
      this.currentOrder?.DiemDon ||
      'N/A';
    const newDiemDon =
      this.locationOptions.find((d) => d.MaDiem === this.editMaDiemDon)?.TenDiem || '';
    if (this.editMaDiemDon !== this.currentOrder.MaDiemDon) {
      this.editChangeSummary.push({
        field: 'Điểm đón',
        oldValue: oldDiemDon,
        newValue: newDiemDon,
      });
    }

    const oldDiemTra =
      this.locationOptions.find((d) => d.MaDiem === this.currentOrder?.MaDiemTra)?.TenDiem ||
      this.currentOrder?.DiemTra ||
      'N/A';
    const newDiemTra =
      this.locationOptions.find((d) => d.MaDiem === this.editMaDiemTra)?.TenDiem || '';
    if (this.editMaDiemTra !== this.currentOrder.MaDiemTra) {
      this.editChangeSummary.push({
        field: 'Điểm trả',
        oldValue: oldDiemTra,
        newValue: newDiemTra,
      });
    }

    return this.editChangeSummary.length > 0;
  }

  async saveEditChanges(): Promise<void> {
    if (!this.currentOrder || this.isLoading) return;
    const id = this.currentOrder.MaDonHang;
    this.isLoading = true;
    try {
      const row = await this.accountsApi.request<ApiLookupOrder>(
        'customer/ticket-lookup/orders/' + encodeURIComponent(id),
        'PATCH',
        {
          version: this.detailRows.get(id)?.version,
          email: this.editEmail.trim(),
          pickupId: this.editMaDiemDon,
          dropoffId: this.editMaDiemTra,
        },
      );
      this.currentOrder = this.fromApi(row, !!this.auth.currentUser());
      this.orders = this.orders.map((o) => (o.MaDonHang === id ? this.currentOrder! : o));
      this.showEditModal = false;
      this.showEditConfirmationSummary = false;
      this.showToast('Cập nhật thông tin thành công.', 'success');
    } catch (e) {
      this.showToast(e instanceof Error ? e.message : 'Không lưu được thông tin.', 'error');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  closeToast(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.toastMessage = '';
  }

  openCancelModal(ticket: Ticket): void {
    if (!this.currentOrder) return;
    if (this.currentOrder.FromDb) {
      this.showToast(
        'Hủy vé của đơn hàng thật chưa hỗ trợ trên trang này. Vui lòng liên hệ tổng đài VIAGO.',
        'error',
      );
      return;
    }
    if (this.isTicketCancelDisabled(ticket)) {
      this.showToast(this.getCancelButtonTitle(ticket), 'error');
      return;
    }

    this.selectedCancelTicket = ticket;
    this.isLoading = true;

    // Tải chính sách hủy vé ngay lập tức
    this.cancelPolicies = [
      {
        title: 'Chính sách hoàn 100%',
        description: 'Hủy trước 24 giờ khởi hành: Hoàn tiền 100% giá trị vé (không tính phí).',
      },
      {
        title: 'Chính sách hoàn 50%',
        description: 'Hủy từ 12 - 24 giờ trước khởi hành: Hoàn tiền 50% giá trị vé.',
      },
      {
        title: 'Chính sách không hoàn',
        description: 'Hủy dưới 12 giờ trước khởi hành: Không áp dụng chính sách hoàn tiền.',
      },
    ];
    this.showCancelModal = true;
    this.isLoading = false;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.showCancelConfirmModal = false;
    this.selectedCancelTicket = null;
  }

  openCancelConfirmModal(): void {
    if (!this.selectedCancelTicket) return;
    this.showCancelConfirmModal = true;
  }

  closeCancelConfirmModal(): void {
    this.showCancelConfirmModal = false;
  }

  confirmCancelTicket(): void {
    if (!this.currentOrder || !this.selectedCancelTicket) return;

    if (!this.selectedCancelReason.trim()) {
      this.showToast('Vui lòng chọn lý do hủy vé.', 'error');
      return;
    }

    if (this.getRefundPercentage() === 0) {
      this.showToast('Không thể hủy vé khi chỉ còn dưới 12 giờ trước khởi hành.', 'error');
      return;
    }

    this.isLoading = true;
    const orderCode = this.currentOrder.MaDonHang;
    const ticketCode = this.selectedCancelTicket.MaVe;

    setTimeout(() => {
      this.ngZone.run(() => {
        const dbOrder = this.DanhSachVeMock.find((o) => o.MaDonHang === orderCode);
        if (dbOrder) {
          const dbTicket = dbOrder.Tickets.find((ticket) => ticket.MaVe === ticketCode);
          if (dbTicket) {
            dbTicket.TrangThaiVe = 'Đã hủy';

            // Cascading cancellation: if outbound leg is canceled, auto-cancel same-day return leg tickets
            const isOutbound = dbTicket.DiemDon === dbOrder.DiemDon;
            if (isOutbound) {
              const parts = dbTicket.DiemDonThoiGian.split(' - ');
              const cancelDate = parts.length > 1 ? parts[1] : '';
              if (cancelDate) {
                dbOrder.Tickets.forEach((t) => {
                  if (t.MaVe !== dbTicket.MaVe && t.DiemDon === dbOrder.DiemTra) {
                    const tParts = t.DiemDonThoiGian.split(' - ');
                    const tDate = tParts.length > 1 ? tParts[1] : '';
                    if (tDate === cancelDate) {
                      t.TrangThaiVe = 'Đã hủy';
                    }
                  }
                });
              }
            }
          }
          this.syncOrderStatusAfterTicketCancel(dbOrder);
          this.currentOrder = JSON.parse(JSON.stringify(dbOrder));
        }
        this.showCancelModal = false;
        this.showCancelConfirmModal = false;
        this.selectedCancelTicket = null;
        this.isLoading = false;
        this.showToast('Hủy vé thành công.', 'success');
      });
    }, 200);
  }

  private syncOrderStatusAfterTicketCancel(order: Order): void {
    const allCanceled = order.Tickets.every((ticket) => ticket.TrangThaiVe === 'Đã hủy');
    if (allCanceled) {
      order.TrangThaiDonHang = 'Đã hủy';
    }
  }

  openReviewModal(): void {
    this.reviewTicketId = this.reviewableTickets[0]?.MaVe ?? '';
    this.showReviewModal = true;
  }

  closeReviewModal(): void {
    this.showReviewModal = false;
    this.reviewComment = '';
    this.reviewFiles = [];
    this.reviewFieldError = '';
    this.ratingCriteria.forEach((c) => (c.Score = 0));
  }

  setRating(index: number, Score: number): void {
    this.ratingCriteria[index].Score = Score;
  }

  addReviewTag(tag: string): void {
    if (this.reviewComment.includes(tag)) {
      this.reviewComment = this.reviewComment
        .replace(tag, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      return;
    }
    this.reviewComment = this.reviewComment ? `${this.reviewComment}, ${tag}` : tag;
  }

  onReviewFilesSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files ? Array.from(target.files) : [];
    this.reviewFiles = [...this.reviewFiles, ...files].slice(0, 3);
    target.value = '';
  }

  removeReviewFile(index: number): void {
    this.reviewFiles = this.reviewFiles.filter((_, itemIndex) => itemIndex !== index);
  }

  submitReview(): void {
    if (!this.currentOrder || this.isReviewSubmitDisabled) return;
    if (this.reviewFieldError) {
      this.showToast('Vui lòng sửa lỗi ở ô nhận xét trước khi gửi.', 'error');
      return;
    }
    if (this.currentOrder.FromDb) {
      void this.submitRealReview();
      return;
    }

    this.isLoading = true;

    setTimeout(() => {
      this.ngZone.run(() => {
        const dbOrder = this.DanhSachVeMock.find(
          (o) => o.MaDonHang === this.currentOrder!.MaDonHang,
        );
        if (dbOrder) {
          dbOrder.TrangThaiDonHang = 'Đã đánh giá';
          dbOrder.Tickets.forEach((ticket) => {
            ticket.TrangThaiVe = 'Đã đánh giá';
          });
          this.currentOrder = JSON.parse(JSON.stringify(dbOrder));
        }
        this.showReviewModal = false;
        this.reviewComment = '';
        this.reviewFiles = [];
        this.showToast('Đánh giá đã được gửi thành công.', 'success');
        this.isLoading = false;
      });
    }, 200);
  }

  private async preparePrint(ticket: Ticket): Promise<boolean> {
    if (!this.currentOrder) return false;
    try {
      const row = await this.accountsApi.request<ApiLookupOrder>(
        'customer/ticket-lookup/orders/' +
          encodeURIComponent(this.currentOrder.MaDonHang) +
          '/tickets/' +
          encodeURIComponent(ticket.MaVe) +
          '/print',
        'POST',
        {},
      );
      this.currentOrder = this.fromApi(row, !!this.auth.currentUser());
      return true;
    } catch (e) {
      this.showToast(e instanceof Error ? e.message : 'Không in được vé.', 'error');
      return false;
    }
  }
  async downloadTicket(ticket: Ticket): Promise<void> {
    if (!(await this.preparePrint(ticket))) return;
    ticket = this.currentOrder!.Tickets.find((t) => t.MaVe === ticket.MaVe)!;
    if (this.downloadingTicketCode || !this.currentOrder || ticket.TrangThaiVe === 'Đã hủy') return;
    const order = JSON.parse(JSON.stringify(this.currentOrder)) as Order;
    const ticketCopy = { ...ticket };
    this.downloadingTicketCode = ticket.MaVe;
    try {
      if (this.lookupDestroyed) return;
      const canvas = this.drawTicketImage(order, ticketCopy);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error('Không thể tạo ảnh vé'))),
          'image/png',
        );
      });
      if (this.lookupDestroyed) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = ('VIAGO-' + ticketCopy.MaVe).replace(/[^a-zA-Z0-9_-]/g, '_') + '.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.showToast('Đã tạo file vé PNG để tải về.', 'success');
    } catch {
      if (!this.lookupDestroyed) this.showToast('Không thể tải vé. Vui lòng thử lại.', 'error');
    } finally {
      this.downloadingTicketCode = '';
      if (!this.lookupDestroyed) this.cdr.detectChanges();
    }
  }

  private drawTicketImage(order: Order, ticket: Ticket): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ xuất ảnh vé');
    const styles = getComputedStyle(document.documentElement);
    const color = (token: string, fallback: string) =>
      styles.getPropertyValue(token).trim() || fallback;
    const font = styles.getPropertyValue('--font-family-base').trim() || 'Inter, sans-serif';
    const primary = color('--color-primary-600', '#00236f');
    const text = color('--color-text-primary', '#0f172a');
    const muted = color('--color-text-secondary', '#64748b');
    const border = color('--color-border', '#e2e8f0');
    ctx.font = '500 32px ' + font;
    const wrap = (value: string): string[] => {
      const lines: string[] = [];
      let line = '';
      for (const char of value) {
        if (line && ctx.measureText(line + char).width > 952) {
          lines.push(line.trim());
          line = '';
        }
        line += char;
      }
      lines.push(line.trim());
      return lines;
    };
    const rows = [
      ['Mã đơn hàng', order.MaDonHang],
      ['Mã vé', ticket.MaVe],
      ['Người đặt', order.HoTenNguoiDi],
      ['Số điện thoại', order.SoDienThoai],
      ['Tuyến xe', order.TenTuyen],
      [
        'Khởi hành',
        this.formatTimeStr(order.GioKhoiHanh) + ' · ' + this.formatDisplayDate(order.DepartureDate),
      ],
      ['Ghế · Biển số xe', ticket.SoGhe + ' · ' + ticket.BienSoXe],
      ['Điểm đón', ticket.DiemDon + ' · ' + ticket.DiemDonThoiGian],
      ['Điểm trả', ticket.DiemTra + ' · ' + ticket.DiemTraThoiGian],
      ['Giá vé', this.formatPrice(ticket.GiaVe)],
      ['Trạng thái vé', ticket.TrangThaiVe],
    ].map(([label, value]) => ({ label, lines: wrap(value || '—') }));
    const qr = create(order.MaDonHang + '|' + ticket.MaVe + '|' + ticket.MaQRVe, {
      errorCorrectionLevel: 'M',
    });
    const moduleSize = 10;
    const qrSize = (qr.modules.size + 8) * moduleSize;
    canvas.height =
      250 + rows.reduce((height, row) => height + 78 + row.lines.length * 44, 0) + qrSize + 164;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textBaseline = 'top';
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, canvas.width, 12);
    ctx.font = '700 48px ' + font;
    ctx.fillText('VIAGO', 64, 60);
    ctx.fillStyle = text;
    ctx.font = '600 34px ' + font;
    ctx.fillText('VÉ ĐIỆN TỬ', 64, 132);
    let y = 230;
    for (const row of rows) {
      ctx.fillStyle = muted;
      ctx.font = '400 25px ' + font;
      ctx.fillText(row.label, 64, y);
      y += 38;
      ctx.fillStyle = text;
      ctx.font = '500 32px ' + font;
      for (const line of row.lines) {
        ctx.fillText(line, 64, y);
        y += 44;
      }
      y += 16;
      ctx.fillStyle = border;
      ctx.fillRect(64, y, 952, 1);
      y += 24;
    }
    const qrX = (canvas.width - qrSize) / 2;
    ctx.fillStyle = '#000000';
    for (let row = 0; row < qr.modules.size; row++) {
      for (let col = 0; col < qr.modules.size; col++) {
        if (qr.modules.get(row, col))
          ctx.fillRect(
            qrX + (col + 4) * moduleSize,
            y + (row + 4) * moduleSize,
            moduleSize,
            moduleSize,
          );
      }
    }
    y += qrSize + 20;
    ctx.textAlign = 'center';
    ctx.fillStyle = muted;
    ctx.font = '400 24px ' + font;
    ctx.fillText('Xuất trình mã QR khi lên xe', canvas.width / 2, y);
    ctx.fillText('Hotline hỗ trợ: 1900 1234', canvas.width / 2, y + 40);
    return canvas;
  }

  openPrintModal(ticket: Ticket): void {
    this.printTicket = ticket;
    this.showPrintModal = true;
  }

  closePrintModal(): void {
    this.showPrintModal = false;
    this.printTicket = null;
  }

  async doPrint(): Promise<void> {
    if (!this.printTicket || !(await this.preparePrint(this.printTicket))) return;
    this.printTicket = this.currentOrder!.Tickets.find((t) => t.MaVe === this.printTicket!.MaVe)!;
    this.cdr.detectChanges();
    document.body.classList.add('print-ticket-lookup');
    const cleanup = () => document.body.classList.remove('print-ticket-lookup');
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
  }

  selectDiemDon(option: LocationOption): void {
    this.editMaDiemDon = option.MaDiem;
    this.editDiemDonSearchText = option.TenDiem;
    this.showDiemDonDropdown = false;
    this.filterDiemDonOptions = [option];
  }

  selectDiemTra(option: LocationOption): void {
    this.editMaDiemTra = option.MaDiem;
    this.editDiemTraSearchText = option.TenDiem;
    this.showDiemTraDropdown = false;
    this.filterDiemTraOptions = [option];
  }

  private buildDepartureDate(dateString: string, timeString: string): Date | null {
    if (!dateString || !timeString) return null;
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    const timeParts = timeString.split(':');
    if (timeParts.length < 2) return null;
    const hour = parseInt(timeParts[0]);
    const minute = parseInt(timeParts[1]);

    if (
      Number.isNaN(year) ||
      Number.isNaN(month) ||
      Number.isNaN(day) ||
      Number.isNaN(hour) ||
      Number.isNaN(minute)
    ) {
      return null;
    }
    return new Date(year, month - 1, day, hour, minute, 0, 0);
  }

  getDestinationBookingLink(): string {
    if (!this.currentOrder) return 'https://www.booking.com';
    return `https://www.booking.com/searchresults.vi.html?ss=${encodeURIComponent(this.currentOrder.DiemTra)}`;
  }

  shareJourneyLink(): void {
    if (!this.currentOrder) return;
    this.shareUrl = `${window.location.origin}${window.location.pathname}?phone=${this.currentOrder.SoDienThoai}&code=${this.currentOrder.MaDonHang}`;
    this.shareQrUrl = this.localQr(this.shareUrl);
    this.showShareModal = true;
  }

  copyShareUrl(): void {
    navigator.clipboard
      .writeText(this.shareUrl)
      .then(() => {
        this.showToast('Đã sao chép liên kết chia sẻ hành trình vào bộ nhớ tạm.', 'success');
      })
      .catch((err) => {
        this.showToast('Không thể sao chép liên kết.', 'error');
      });
  }

  private readonly qrCache = new Map<string, string>();

  private localQr(code: string): string {
    const cached = this.qrCache.get(code);
    if (cached) return cached;
    const qr = create(code, { errorCorrectionLevel: 'M' });
    const size = qr.modules.size;
    let path = '';
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        if (qr.modules.get(y, x)) path += `M${x + 4} ${y + 4}h1v1h-1z`;
      }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size + 8} ${size + 8}" shape-rendering="crispEdges"><path fill="white" d="M0 0h${size + 8}v${size + 8}H0z"/><path fill="black" d="${path}"/></svg>`;
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    this.qrCache.set(code, url);
    return url;
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.toastMessage = '';
    this.toastType = type;
    this.toastMessage = message;
    this.cdr.detectChanges();

    this.toastTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.closeToast();
      });
    }, 3000);
  }

  onEditDiemDonBlur(event: FocusEvent) {
    setTimeout(() => {
      this.showDiemDonDropdown = false;
    }, 120);
  }

  onEditDiemTraBlur(event: FocusEvent) {
    setTimeout(() => {
      this.showDiemTraDropdown = false;
    }, 120);
  }

  getEditTimesLabel(): string {
    if (!this.currentOrder) return '';
    const max = this.currentOrder.GioiHanChinhSua;
    const used = this.currentOrder.SoLanDaSua || 0;
    return `${Math.max(0, max - used)}/${max} lần chỉnh`;
  }

  get canReview(): boolean {
    if (!this.currentOrder) return false;
    if (this.currentOrder.FromDb) return this.reviewableTickets.length > 0;
    return (
      this.currentOrder.TrangThaiDonHang === 'Đã hoàn thành' &&
      this.currentOrder.Tickets.length > 0 &&
      this.currentOrder.Tickets.every((ticket) => ticket.TrangThaiVe === 'Đã hoàn thành')
    );
  }

  get isReviewSubmitDisabled(): boolean {
    const hasAnyScore = this.ratingCriteria.some((c) => c.Score > 0);
    return !hasAnyScore;
  }

  resetLookup(): void {
    if (this.lookupTask) clearTimeout(this.lookupTask);
    this.lookupTask = null;
    this.isLoading = false;
    this.changeLookupPhone();
    this.phoneNumber = '';
    this.bookingCode = '';
    this.otpExpiresAt = 0;
    this.resendAvailableAt = 0;
    this.showEditModal = false;
    this.showEditConfirmationSummary = false;
    this.showCancelModal = false;
    this.showCancelConfirmModal = false;
    this.showReviewModal = false;
    this.showShareModal = false;
    this.showPrintModal = false;
    this.printTicket = null;
    this.selectedCancelTicket = null;
    this.closeToast();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  changeLookupPhone(): void {
    if (this.isLoading) return;
    if (this.otpTimer) clearInterval(this.otpTimer);
    this.otpTimer = null;
    this.verifiedPhone = '';
    this.orders = [];
    this.currentOrder = null;
    this.otpCode = '';
    this.otpError = '';
    this.phoneError = '';
    this.searchError = '';
    this.currentStep = 'search';
  }

  closeEditConfirmationSummary(): void {
    this.showEditConfirmationSummary = false;
  }

  confirmAndSaveEdit(): void {
    this.proceedWithSaveAfterValidation();
  }

  proceedWithSaveAfterValidation(): void {
    if (!this.currentOrder || this.isEditSaveDisabled() || !this.validateEditForm()) return;
    void this.saveEditChanges();
  }
}
