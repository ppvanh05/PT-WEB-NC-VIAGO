import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { AuthService } from '../../../../core/services/auth.service';
import { AccountsApiService } from '../../../../core/services/accounts-api.service';
import { PhoneInputDirective } from '../../../../shared/utils/input-guards';
import { VN_PHONE_REGEX } from '../../../../shared/utils/form-validators';

type ClaimField = 'bookingCode' | 'phone' | 'description';

/** GET customer/lost-and-found/items (bảng do_that_lac, chỉ đồ đã tìm thấy/đã trả). */
export interface LostItem {
  id: string;
  name: string;
  image: string | null;
  foundDate: string;
  route: string | null;
  storage: string | null;
  status: 'stored' | 'processing' | 'returned';
}

/** GET customer/lost-and-found/bookings/:code?phone (đơn hàng + vé đã xác minh SĐT). */
interface BookingInfo {
  orderId: string;
  ticketId: string | null;
  route: string;
  date: string;
  fullName: string;
  email: string | null;
  tickets: { id: string; seat: string; passenger: string }[];
}

interface StatusResult {
  type: 'report' | 'claim';
  code: string;
  itemName: string;
  status: string;
  statusLabel: string;
  storage: string | null;
  timeline: { label: string; time: string }[];
}

interface MyTicket {
  id: string;
  orderId: string;
  status: string;
  date: string;
  dateLabel: string;
  depLoc: string;
  arrLoc: string;
}

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" fill="#6b7280" font-family="sans-serif" font-size="16" text-anchor="middle" dominant-baseline="middle">Chưa có ảnh</text></svg>');

@Component({
  selector: 'app-lost-and-found',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination, PhoneInputDirective],
  templateUrl: './lost-and-found.html',
  styleUrl: './lost-and-found.css',
})
export class LostAndFound implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly accountsApi = inject(AccountsApiService);
  /** App chạy không có zone.js: gọi API xong thì báo Angular vẽ lại giao diện. */
  private readonly api = {
    request: <T>(...args: Parameters<AccountsApiService['request']>): Promise<T> =>
      this.accountsApi.request<T>(...args).finally(() => this.cdr.markForCheck()),
  };

  readonly placeholderImage = PLACEHOLDER_IMAGE;

  // Danh sách đồ thất lạc (phân trang phía server)
  paginatedItems: LostItem[] = [];
  totalItems = 0;
  loadingItems = false;
  itemsError = '';

  searchQuery = '';
  selectedRoute = '';
  selectedStatus = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  /** Tuyến lấy từ GET customer/lost-and-found/routes */
  routes: { value: string; label: string }[] = [];
  statuses = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'stored', label: 'Đang lưu trữ' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'returned', label: 'Đã trao trả' },
  ];

  currentPage = 1;
  pageSize = 8;
  totalPages = 1;

  // Form khai báo mất đồ → POST customer/lost-and-found/reports
  reportForm = this.emptyReport();
  booking: BookingInfo | null = null;
  bookingCodeError = '';
  checkingBooking = false;
  reportImages: { file: File; preview: string }[] = [];
  imageError = '';
  submittingReport = false;

  /** Vé của tôi (chỉ khi đã đăng nhập) — GET customer/profile/tickets */
  myTrips: MyTicket[] = [];
  selectedTripId = '';

  // Tra cứu hồ sơ / yêu cầu đã gửi → GET customer/lost-and-found/status/:code
  statusForm = { code: '', phone: '' };
  statusResult: StatusResult | null = null;
  statusError = '';
  checkingStatus = false;

  showToast = false;
  toastMessage = '';
  toastError = false;
  isClaimModalOpen = false;
  selectedClaimItem: LostItem | null = null;
  submittingClaim = false;

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.applyUserContact();
      this.claimForm.phone = user.phoneNumber || '';
      this.statusForm.phone = user.phoneNumber || '';
      void this.loadMyTrips();
    }
    void this.loadRoutes();
    void this.loadItems();
  }

  private emptyReport() {
    return {
      bookingCode: '',
      maVe: '',
      itemName: '',
      description: '',
      seat: '',
      fullName: '',
      phone: '',
      email: '',
    };
  }

  private async loadRoutes() {
    try {
      this.routes = await this.api.request<{ value: string; label: string }[]>('customer/lost-and-found/routes');
    } catch {
      this.routes = [];
    }
  }

  private async loadMyTrips() {
    try {
      const res = await this.api.request<{ items: MyTicket[] }>('customer/profile/tickets?page=1&pageSize=20&sort=newest');
      this.myTrips = res.items.filter(t => t.status !== 'ĐÃ HỦY');
    } catch {
      this.myTrips = [];
    }
  }

  async loadItems() {
    this.loadingItems = true;
    this.itemsError = '';
    const params = new URLSearchParams({ page: String(this.currentPage), pageSize: String(this.pageSize) });
    if (this.searchQuery.trim()) params.set('search', this.searchQuery.trim());
    if (this.selectedRoute) params.set('routeId', this.selectedRoute);
    if (this.selectedStatus) params.set('status', this.selectedStatus);
    try {
      const res = await this.api.request<{ items: LostItem[]; pagination: { total: number; totalPages: number } }>(
        `customer/lost-and-found/items?${params}`);
      this.paginatedItems = res.items;
      this.totalItems = res.pagination.total;
      this.totalPages = res.pagination.totalPages;
    } catch (error) {
      this.itemsError = this.message(error, 'Không tải được danh sách đồ thất lạc.');
      this.paginatedItems = [];
      this.totalItems = 0;
      this.totalPages = 1;
    } finally {
      this.loadingItems = false;
    }
  }

  private applyUserContact() {
    const user = this.authService.currentUser();
    if (!user) return;
    this.reportForm.fullName = this.reportForm.fullName || user.name || '';
    this.reportForm.phone = this.reportForm.phone || user.phoneNumber || '';
    this.reportForm.email = this.reportForm.email || user.email || '';
  }

  filterItems() {
    this.currentPage = 1;
    void this.loadItems();
  }

  onSearchInput() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.filterItems(), 350);
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedRoute = '';
    this.selectedStatus = '';
    this.filterItems();
  }

  setPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    void this.loadItems();
    const listElement = document.getElementById('items-list-top');
    if (listElement) {
      listElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // ─── KHAI BÁO MẤT ĐỒ ─────────────────────────────────────────────────────

  /** Xác minh mã đơn/mã vé + SĐT người đặt rồi tự điền tuyến, ngày, ghế. */
  async onBookingCodeChange() {
    this.bookingCodeError = '';
    const code = this.reportForm.bookingCode.trim().toUpperCase();
    const phone = this.reportForm.phone.trim();
    if (!code) {
      this.booking = null;
      return;
    }
    if (!VN_PHONE_REGEX.test(phone)) {
      this.booking = null;
      this.bookingCodeError = 'Nhập số điện thoại người đặt để xác minh mã này.';
      return;
    }
    if (this.booking && (this.booking.orderId === code || this.booking.ticketId === code)) return;
    this.checkingBooking = true;
    try {
      const info = await this.api.request<BookingInfo>(
        `customer/lost-and-found/bookings/${encodeURIComponent(code)}?phone=${encodeURIComponent(phone)}`);
      this.booking = info;
      this.reportForm.bookingCode = code;
      this.reportForm.fullName = this.reportForm.fullName || info.fullName;
      this.reportForm.email = this.reportForm.email || info.email || '';
      const ticket = info.ticketId ? info.tickets.find(t => t.id === info.ticketId) : info.tickets.length === 1 ? info.tickets[0] : undefined;
      this.reportForm.maVe = ticket?.id ?? '';
      this.reportForm.seat = ticket?.seat ?? '';
    } catch (error) {
      this.booking = null;
      this.bookingCodeError = this.message(error, 'Không tìm thấy mã này.');
    } finally {
      this.checkingBooking = false;
    }
  }

  get orderTickets() {
    return this.booking && !this.booking.ticketId && this.booking.tickets.length > 1 ? this.booking.tickets : [];
  }

  onSelectMyTrip(ticketId: string) {
    if (!ticketId) return;
    this.reportForm.bookingCode = ticketId;
    this.reportForm.phone = this.authService.currentUser()?.phoneNumber || this.reportForm.phone;
    this.booking = null;
    void this.onBookingCodeChange();
  }

  onSelectOrderTicket(ticketId: string) {
    const ticket = this.booking?.tickets.find(t => t.id === ticketId);
    this.reportForm.seat = ticket?.seat ?? '';
  }

  onImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.imageError = '';
    for (const file of files) {
      if (this.reportImages.length >= MAX_IMAGES) {
        this.imageError = `Tối đa ${MAX_IMAGES} ảnh.`;
        break;
      }
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        this.imageError = 'Chỉ nhận ảnh JPG, PNG hoặc WEBP.';
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        this.imageError = 'Mỗi ảnh tối đa 5 MB.';
        continue;
      }
      this.reportImages.push({ file, preview: URL.createObjectURL(file) });
    }
  }

  removeImage(index: number) {
    const [removed] = this.reportImages.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed.preview);
  }

  async submitReport() {
    if (this.submittingReport) return;
    const f = this.reportForm;
    if (!f.bookingCode.trim() || !VN_PHONE_REGEX.test(f.phone.trim())) {
      this.triggerToast('Vui lòng nhập mã đơn/mã vé và số điện thoại người đặt.', true);
      return;
    }
    if (!this.booking) await this.onBookingCodeChange();
    if (!this.booking) {
      this.triggerToast(this.bookingCodeError || 'Mã đơn hoặc mã vé không hợp lệ.', true);
      return;
    }
    if (this.orderTickets.length && !f.maVe) {
      this.triggerToast('Đơn có nhiều vé, vui lòng chọn ghế của người để quên đồ.', true);
      return;
    }
    if (f.itemName.trim().length < 3) {
      this.triggerToast('Vui lòng nhập tên vật phẩm (tối thiểu 3 ký tự).', true);
      return;
    }
    if (f.description.trim().length < 10) {
      this.triggerToast('Mô tả chi tiết cần tối thiểu 10 ký tự.', true);
      return;
    }
    if (f.fullName.trim().length < 2) {
      this.triggerToast('Vui lòng nhập họ tên hành khách.', true);
      return;
    }
    if (f.email.trim() && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(f.email.trim())) {
      this.triggerToast('Địa chỉ email không hợp lệ!', true);
      return;
    }

    const form = new FormData();
    form.append('bookingCode', f.bookingCode.trim());
    form.append('phone', f.phone.trim());
    if (f.maVe) form.append('ticketId', f.maVe);
    form.append('itemName', f.itemName.trim());
    form.append('description', f.description.trim());
    if (f.seat.trim()) form.append('seat', f.seat.trim());
    form.append('fullName', f.fullName.trim());
    if (f.email.trim()) form.append('email', f.email.trim());
    this.reportImages.forEach(img => form.append('files', img.file));

    this.submittingReport = true;
    try {
      const res = await this.api.request<{ code: string; statusLabel: string }>('customer/lost-and-found/reports', 'POST', form);
      this.triggerToast(`Đã gửi khai báo ${res.code}. Lưu mã này để tra cứu tiến trình.`);
      this.statusForm = { code: res.code, phone: f.phone.trim() };
      this.reportImages.forEach(img => URL.revokeObjectURL(img.preview));
      this.reportImages = [];
      this.reportForm = this.emptyReport();
      this.booking = null;
      this.bookingCodeError = '';
      this.selectedTripId = '';
      this.applyUserContact();
      void this.checkStatus();
    } catch (error) {
      this.triggerToast(this.message(error, 'Không gửi được khai báo.'), true);
    } finally {
      this.submittingReport = false;
    }
  }

  // ─── TRA CỨU ─────────────────────────────────────────────────────────────

  async checkStatus() {
    const code = this.statusForm.code.trim().toUpperCase();
    const phone = this.statusForm.phone.trim();
    if (!code || !VN_PHONE_REGEX.test(phone)) {
      this.statusError = 'Nhập mã hồ sơ (DTL...) hoặc mã yêu cầu nhận đồ (YCND...) và số điện thoại.';
      return;
    }
    this.checkingStatus = true;
    this.statusError = '';
    try {
      this.statusResult = await this.api.request<StatusResult>(
        `customer/lost-and-found/status/${encodeURIComponent(code)}?phone=${encodeURIComponent(phone)}`);
    } catch (error) {
      this.statusResult = null;
      this.statusError = this.message(error, 'Không tìm thấy hồ sơ.');
    } finally {
      this.checkingStatus = false;
    }
  }

  // ─── BÁO NHẬN SỞ HỮU ─────────────────────────────────────────────────────

  openClaimModal(item: LostItem) {
    this.selectedClaimItem = item;
    this.isClaimModalOpen = true;
  }

  closeClaimModal() {
    this.isClaimModalOpen = false;
    this.selectedClaimItem = null;
    this.claimForm = {
      bookingCode: '',
      phone: this.authService.currentUser()?.phoneNumber || '',
      description: ''
    };
    this.claimErrors = { bookingCode: '', phone: '', description: '' };
    this.claimTouched = { bookingCode: false, phone: false, description: false };
  }

  // YEU_CAU_NHAN_DO: mã đơn hoặc mã vé + SĐT người đặt + đặc điểm nhận dạng
  claimForm = {
    bookingCode: '',
    phone: '',
    description: ''
  };

  claimErrors = { bookingCode: '', phone: '', description: '' };
  private claimTouched = { bookingCode: false, phone: false, description: false };

  private claimFieldError(field: ClaimField): string {
    const value = this.claimForm[field].trim();
    if (field === 'bookingCode') {
      if (!value) return 'Vui lòng nhập mã đơn hoặc mã vé';
      return /^[A-Za-z0-9_-]{3,60}$/.test(value) ? '' : 'Mã đơn hoặc mã vé không hợp lệ';
    }
    if (field === 'phone') {
      if (!value) return 'Vui lòng nhập số điện thoại';
      if (!VN_PHONE_REGEX.test(value)) return 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0)';
      return '';
    }
    if (!value) return 'Vui lòng nhập đặc điểm nhận dạng';
    return value.length < 10 ? 'Mô tả tối thiểu 10 ký tự' : '';
  }

  onClaimBlur(field: ClaimField) {
    this.claimTouched[field] = true;
    this.claimErrors[field] = this.claimFieldError(field);
  }

  onClaimInput(field: ClaimField) {
    if (this.claimTouched[field] || this.claimErrors[field]) {
      this.claimErrors[field] = this.claimFieldError(field);
    }
  }

  async submitClaim() {
    if (this.submittingClaim || !this.selectedClaimItem) return;
    const fields: ClaimField[] = ['bookingCode', 'phone', 'description'];
    fields.forEach(f => {
      this.claimTouched[f] = true;
      this.claimErrors[f] = this.claimFieldError(f);
    });
    const firstInvalid = fields.find(f => this.claimErrors[f]);
    if (firstInvalid) {
      setTimeout(() => {
        const el = document.getElementById(`claim-${firstInvalid}`);
        el?.focus();
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return;
    }
    this.submittingClaim = true;
    try {
      const phone = this.claimForm.phone.trim();
      const res = await this.api.request<{ code: string }>(
        `customer/lost-and-found/items/${encodeURIComponent(this.selectedClaimItem.id)}/claims`, 'POST', {
          bookingCode: this.claimForm.bookingCode.trim().toUpperCase(),
          phone,
          description: this.claimForm.description.trim(),
        });
      this.triggerToast(`Đã gửi yêu cầu ${res.code}. Bộ phận CSKH sẽ xác minh và liên hệ.`);
      this.statusForm = { code: res.code, phone };
      this.closeClaimModal();
      void this.loadItems();
      void this.checkStatus();
    } catch (error) {
      // Lỗi xác minh mã/SĐT hiển thị ngay dưới ô mã đơn
      this.claimErrors.bookingCode = this.message(error, 'Không gửi được yêu cầu.');
    } finally {
      this.submittingClaim = false;
    }
  }

  triggerToast(msg: string, isError = false) {
    this.toastMessage = msg;
    this.toastError = isError;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
      this.cdr.markForCheck();
    }, 3500);
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return '';
    const [y, m, d] = value.slice(0, 10).split('-');
    return d ? `${d}/${m}/${y}` : value;
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('vi-VN', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh',
    });
  }

  getStatusLabel(status: string): string {
    const s = this.statuses.find(x => x.value === status);
    return s ? s.label : status;
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
  }
}
