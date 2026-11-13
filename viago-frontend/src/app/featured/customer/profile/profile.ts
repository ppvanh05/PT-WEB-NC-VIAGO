import { AccountsApiService } from '../../../core/services/accounts-api.service';
import {
  Component,
  OnInit,
  ChangeDetectorRef,
  OnDestroy,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { VoucherService, Voucher } from '../../../core/services/voucher.service';
import { VoucherCard } from '../../../shared/components/voucher-card/voucher-card';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { SecuritySettingsModal } from '../../../auth/security-settings-modal/security-settings-modal';
import { NoAutofillDirective } from '../../../shared/utils/input-guards';
import { convertSolar2Lunar } from '../../../shared/utils/lunar-calendar';
import {
  birthDateValidator,
  emailDomainValidator,
  focusFirstInvalidField,
  formatDateVN,
  matchesKeyword,
  parseDateValue,
  personNameValidator,
  requiredTrimmedValidator,
  scrollToTop,
  todayIso,
  toIsoDate,
} from '../../../shared/utils/form-validators';

export type TicketStatus =
  'CHỜ THANH TOÁN' | 'CHỜ KHỞI HÀNH' | 'ĐÃ HOÀN THÀNH' | 'ĐÃ ĐÁNH GIÁ' | 'ĐÃ HỦY';

export interface ProfileTicket {
  id: string;
  orderId: string;
  status: TicketStatus;
  date: string; // yyyy-mm-dd
  dateLabel: string; // dd/mm/yyyy
  bookedAt: string; // dd/mm/yyyy
  depTime: string;
  depLoc: string;
  arrTime: string;
  arrLoc: string;
  duration: string;
  seat: string;
  type: string;
  price: number;
  priceLabel: string;
}

const CAN = ['Canh', 'Tân', 'Nhâm', 'Quý', 'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ'];
const CHI = ['Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi'];

/** Các bước của thanh tiến trình trạng thái vé. */
export const TICKET_STEPS = [
  'Đặt vé',
  'Thanh toán',
  'Chờ khởi hành',
  'Hoàn thành chuyến',
  'Đánh giá',
];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    VoucherCard,
    DatePickerComponent,
    Pagination,
    ModalComponent,
    SecuritySettingsModal,
    NoAutofillDirective,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit, OnDestroy {
  @ViewChild('contentTop') contentTop?: ElementRef<HTMLElement>;
  @ViewChild('ticketListTop') ticketListTop?: ElementRef<HTMLElement>;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly backend = inject(AccountsApiService);
  saving = false;
  loading = true;
  twoFactorPassword = '';
  twoFactorTarget = true;
  private querySub?: Subscription;

  readonly today = todayIso();
  readonly ticketSteps = TICKET_STEPS;

  activeTab = 'personal';
  isEditing = false;
  profileForm!: FormGroup;
  avatarPreview: string | null = null;
  avatarError = '';
  profileCompleteness = 0;

  // Bảo mật tài khoản: Modal Đổi mật khẩu
  showChangePasswordModal = false;

  // Device management modals & list
  showLogoutAllModal = false;
  showDeviceLogoutConfirm = false;
  targetLogoutDeviceId = '';

  devicesList: { id: string; name: string; status: string; time: string; isCurrent: boolean }[] =
    [];

  // 2FA state
  is2FAEnabled = false;
  show2FAPopup1 = false;
  show2FAPopup2 = false;
  show2FAEmailErrorPopup = false;
  twoFactorMethod: 'phone' | 'email' = 'phone';
  generatedOtp = '';
  twoFactorOtpVal = '';
  twoFactorOtpError = '';
  twoFactorTimer = 180;
  twoFactorIntervalId: any = null;
  is2FAOtpFocused = false;

  // Carousel thẻ hạng thành viên
  activeCardIndex = 0;

  get vouchersList(): Voucher[] {
    const user = this.authService.currentUser();
    if (!user) return [];
    return this.voucherService.getWalletVouchers(user.id);
  }

  get activeVouchers(): Voucher[] {
    return this.vouchersList.filter((v) =>
      ['available', 'upcoming', 'held'].includes(v.state || ''),
    );
  }

  useVoucher(): void {
    this.toastService.showInfo('Chọn chuyến xe, voucher trong Ví sẽ có sẵn ở bước mã giảm giá.');
    this.router.navigate(['/customer']);
  }

  get expiredVouchers(): any[] {
    return this.vouchersList
      .filter((v) => ['used', 'expired', 'revoked'].includes(v.state || ''))
      .map((v) => ({
        ...v,
        discount: v.title,
        title: v.code,
        status: v.state,
        expiry: v.expiryDate,
        usedAt: v.usedAt,
      }));
  }

  // Khóa tài khoản
  showLockAccountModal = false;
  isLockingProcess = false;
  lockConfirmPassword = '';
  lockPasswordError = '';
  isLockPasswordCorrect = false;

  // Bộ lọc & phân trang Lịch sử mua vé
  searchQuery = '';
  statusFilter = 'Tất cả';
  routeFilter = 'Tất cả tuyến xe';
  sortOption = 'Mới nhất';
  dateFilter = '';

  readonly statusTabs: { value: string; label: string }[] = [
    { value: 'Tất cả', label: 'Tất cả' },
    { value: 'CHỜ THANH TOÁN', label: 'Chờ thanh toán' },
    { value: 'CHỜ KHỞI HÀNH', label: 'Chờ khởi hành' },
    { value: 'ĐÃ HOÀN THÀNH', label: 'Đã hoàn thành' },
    { value: 'ĐÃ ĐÁNH GIÁ', label: 'Đã đánh giá' },
    { value: 'ĐÃ HỦY', label: 'Đã hủy' },
  ];

  readonly sortOptions = ['Mới nhất', 'Cũ nhất', 'Giá vé cao → thấp', 'Giá vé thấp → cao'];

  /** Danh sách tuyến xe (đồng bộ với bộ lọc tuyến xe phía Admin). */
  readonly routesList = [
    'TP.HCM → Cần Thơ',
    'Cần Thơ → TP.HCM',
    'TP.HCM → Vũng Tàu',
    'Vũng Tàu → TP.HCM',
    'Đà Lạt → Buôn Ma Thuột',
    'Buôn Ma Thuột → Đà Lạt',
    'Đà Lạt → Nha Trang',
    'Nha Trang → Đà Lạt',
    'Cần Thơ → Rạch Giá',
    'Rạch Giá → Cần Thơ',
    'TP.HCM → Phan Thiết',
    'Phan Thiết → TP.HCM',
    'TP.HCM → Đà Lạt',
    'Đà Lạt → TP.HCM',
    'TP.HCM → Nha Trang',
    'Nha Trang → TP.HCM',
    'Nha Trang → Đà Nẵng',
    'Đà Nẵng → Nha Trang',
  ];
  currentPage = 1;
  pageSize = 5;

  ticketsList: ProfileTicket[] = [];

  constructor(
    public authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    public toastService: ToastService,
    private cdr: ChangeDetectorRef,
    public voucherService: VoucherService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.initForm();
    await this.authService.ready;
    if (!this.authService.currentUser()) {
      this.router.navigate(['/customer'], { replaceUrl: true });
      return;
    }

    this.querySub = this.route.queryParams.subscribe((params) => {
      if (params['tab'] && params['tab'] !== this.activeTab) {
        this.activeTab = params['tab'];
        this.isEditing = false;
        this.scrollContentToTop();
      }
    });

    this.loadUserData();
    this.loading = false;
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
    this.stop2FAOtpTimer();
    this.clearReviewAttachments();
  }

  // =========================================================================
  // THÔNG TIN CÁ NHÂN
  // =========================================================================

  private initForm(): void {
    this.profileForm = this.fb.group({
      // Họ tên bắt buộc, không để trống khi lưu
      name: ['', [requiredTrimmedValidator(), personNameValidator()]],
      email: ['', [emailDomainValidator()]],
      gender: [''],
      birthday: ['', [birthDateValidator()]],
      occupation: [''],
    });

    this.profileForm.valueChanges.subscribe(() => this.calculateCompleteness());
  }

  /** Họ tên đã nhập lúc đăng ký thì khóa (read-only). Chỉ cho nhập khi tài khoản chưa có tên. */
  get isNameLocked(): boolean {
    return !!this.authService.currentUser()?.name?.trim();
  }

  loadUserData(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    const occ = user.occupation || '';
    const birthday = parseDateValue(user.birthday || user.dob || '');
    this.profileForm.reset({
      name: user.name || '',
      email: user.email || '',
      gender: user.gender || '',
      birthday: birthday ? toIsoDate(birthday) : '',
      occupation: occ,
    });
    this.avatarPreview = user.avatar || '/assets/customer/user.png';
    this.avatarError = '';
    this.calculateCompleteness();

    this.is2FAEnabled = !!user.twoFA;
    void this.reloadServerData();

    const currentRankIdx = this.rankIndex;
    this.activeCardIndex = currentRankIdx === -1 ? 0 : currentRankIdx;
  }

  calculateCompleteness(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.profileCompleteness = 0;
      return;
    }

    const defaultAvatar = '/assets/customer/user.png';
    let score = 20; // SĐT luôn có sẵn (20%)
    const source = this.isEditing ? this.profileForm.value : user;
    const avatarVal = this.avatarPreview || user.avatar || defaultAvatar;

    if (source.name && String(source.name).trim() !== '') score += 20;
    if (
      source.email &&
      String(source.email).trim() !== '' &&
      (!this.isEditing || this.profileForm.get('email')?.valid)
    )
      score += 15;
    if (avatarVal && avatarVal !== defaultAvatar) score += 10;
    if (source.gender && String(source.gender).trim() !== '') score += 10;
    if (source.birthday && String(source.birthday).trim() !== '') score += 15;
    if (source.occupation && String(source.occupation).trim() !== '') score += 10;

    this.profileCompleteness = score;
  }

  /** Ngày sinh hiển thị chuẩn dd/mm/yyyy. */
  get birthdayLabel(): string {
    const user = this.authService.currentUser();
    return formatDateVN(user?.birthday || user?.dob || '');
  }

  /** Ngày âm lịch tương ứng với ngày sinh (có đánh dấu tháng nhuận + năm Can Chi). */
  get lunarBirthdayLabel(): string {
    const user = this.authService.currentUser();
    const date = parseDateValue(user?.birthday || user?.dob || '');
    if (!date) return '';
    const lunar = convertSolar2Lunar(date.getDate(), date.getMonth() + 1, date.getFullYear());
    if (!lunar.day || !lunar.month) return '';
    const canChi = `${CAN[lunar.year % 10]} ${CHI[lunar.year % 12]}`;
    const month = `${String(lunar.month).padStart(2, '0')}${lunar.leap ? ' (nhuận)' : ''}`;
    return `${String(lunar.day).padStart(2, '0')}/${month}/${lunar.year} - năm ${canChi}`;
  }

  showError(field: string): boolean {
    const control = this.profileForm.get(field);
    return !!control && control.invalid && control.touched;
  }

  hasError(field: string, error: string): boolean {
    return !!this.profileForm.get(field)?.hasError(error);
  }

  selectTab(tab: string): void {
    if (tab === this.activeTab) {
      this.scrollContentToTop();
      return;
    }
    this.activeTab = tab;
    this.isEditing = false;
    this.loadUserData();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
    this.scrollContentToTop();
  }

  private scrollContentToTop(): void {
    setTimeout(() => scrollToTop(this.contentTop?.nativeElement));
  }

  startEdit(): void {
    if (this.loading || this.saving) return;
    this.isEditing = true;
    this.loadUserData();
    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.loadUserData();
  }

  async saveEdit(): Promise<void> {
    if (this.loading || this.saving) return;
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.cdr.detectChanges();
      focusFirstInvalidField(this.host.nativeElement);
      return;
    }

    const user = this.authService.currentUser();
    if (!user) return;

    const { email, gender, birthday, occupation } = this.profileForm.value;
    this.saving = true;
    // Họ tên bị khóa: luôn giữ nguyên tên đã đăng ký
    const name = this.isNameLocked ? user.name : String(this.profileForm.value.name).trim();
    const result = await this.authService.updateProfile(user.phoneNumber, name, {
      email: String(email || '').trim(),
      gender,
      birthday,
      occupation,
      avatar: this.avatarPreview || '/assets/customer/user.png',
    });
    this.saving = false;

    if (result.success) {
      this.isEditing = false;
      this.toastService.showSuccess('Cập nhật thông tin cá nhân thành công.');
      this.loadUserData();
    } else {
      this.toastService.showError(result.message);
    }
    this.cdr.markForCheck();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.avatarError = '';
    if (!file) return;

    if (!/^image\/(jpeg|png|jpg)$/.test(file.type)) {
      this.avatarError = 'Chỉ hỗ trợ ảnh định dạng .JPG, .PNG.';
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.avatarError = 'Dung lượng ảnh tối đa là 5MB.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          this.avatarError = 'Không xử lý được ảnh.';
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        this.avatarPreview = canvas.toDataURL('image/webp', 0.85);
        this.calculateCompleteness();
        this.cdr.markForCheck();
      };
      image.onerror = () => {
        this.avatarError = 'Không đọc được ảnh.';
        this.cdr.markForCheck();
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  // =========================================================================
  // ĐĂNG XUẤT
  // =========================================================================

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.toastService.showSuccess('Bạn đã đăng xuất khỏi tài khoản.');
    } catch (error) {
      this.toastService.showError(
        error instanceof Error ? error.message : 'Không thu hồi được phiên trên server.',
      );
    }
    await this.router.navigate(['/customer'], { replaceUrl: true });
  }

  // =========================================================================
  // BẢO MẬT TÀI KHOẢN
  // =========================================================================

  openChangePassword(): void {
    this.showChangePasswordModal = true;
  }

  closeChangePassword(): void {
    this.showChangePasswordModal = false;
    if (!this.authService.currentUser())
      void this.router.navigate(['/customer'], { replaceUrl: true });
  }

  confirmLogoutAllOtherDevices(): void {
    this.showLogoutAllModal = true;
  }

  async logoutAllOtherDevices(): Promise<void> {
    try {
      for (const device of this.devicesList.filter((d) => !d.isCurrent))
        await this.authService.revokeSession(device.id);
      await this.reloadServerData();
      this.showLogoutAllModal = false;
      this.toastService.showSuccess('Đã thu hồi các phiên đăng nhập khác.');
    } catch (error) {
      this.toastService.showError(
        error instanceof Error ? error.message : 'Không thu hồi được phiên.',
      );
    }
  }
  removeDevice(deviceId: string): void {
    this.targetLogoutDeviceId = deviceId;
    this.showDeviceLogoutConfirm = true;
  }

  async confirmDeviceLogout(): Promise<void> {
    if (!this.targetLogoutDeviceId) return;
    try {
      const current = this.devicesList.find((d) => d.id === this.targetLogoutDeviceId)?.isCurrent;
      await this.authService.revokeSession(this.targetLogoutDeviceId);
      this.showDeviceLogoutConfirm = false;
      if (current) {
        this.authService.invalidate();
        await this.router.navigate(['/customer']);
      } else {
        await this.reloadServerData();
        this.toastService.showSuccess('Đã thu hồi phiên đăng nhập.');
      }
    } catch (error) {
      this.toastService.showError(
        error instanceof Error ? error.message : 'Không thu hồi được phiên.',
      );
    } finally {
      this.cdr.markForCheck();
    }
  }
  openLockAccount(): void {
    this.showLockAccountModal = true;
    this.isLockingProcess = false;
    this.lockConfirmPassword = '';
    this.lockPasswordError = '';
    this.isLockPasswordCorrect = false;
  }

  closeLockAccount(): void {
    this.showLockAccountModal = false;
    this.isLockingProcess = false;
    this.lockConfirmPassword = '';
    this.lockPasswordError = '';
    this.isLockPasswordCorrect = false;
  }

  /** Ô đã từng báo lỗi -> kiểm tra liên tục khi gõ, lỗi tự biến mất ngay khi nhập đúng. */
  async checkLockPassword(): Promise<void> {
    this.isLockPasswordCorrect = !!this.lockConfirmPassword;
    this.lockPasswordError = '';
  }
  onLockPasswordBlur(): void {
    if (!this.lockConfirmPassword) this.lockPasswordError = 'Vui lòng nhập mật khẩu hiện tại.';
  }
  async confirmLockAccount(): Promise<void> {
    if (this.isLockingProcess || !this.lockConfirmPassword) return;
    this.isLockingProcess = true;
    const result = await this.authService.softDeleteAccount(
      this.authService.currentUser()?.phoneNumber || '',
      this.lockConfirmPassword,
    );
    if (result.success) {
      this.showLockAccountModal = false;
      await this.router.navigate(['/customer']);
    } else this.lockPasswordError = result.message;
    this.isLockingProcess = false;
    this.cdr.markForCheck();
  }

  // =========================================================================
  // LỊCH SỬ MUA VÉ
  // =========================================================================

  /** Sinh lịch sử vé mẫu theo người dùng: ngày đi quá khứ -> vé đã đi; tương lai -> vé chờ. */
  async reloadServerData(): Promise<void> {
    try {
      const [tickets, sessions] = await Promise.all([
        this.authService.tickets<ProfileTicket>(),
        this.authService.sessions(),
      ]);
      this.ticketsList = tickets;
      this.devicesList = sessions.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.isCurrent ? 'Hiện tại' : '',
        time: d.ip + ' • ' + new Date(d.lastActiveAt).toLocaleString('vi-VN'),
        isCurrent: d.isCurrent,
      }));
      await this.voucherService.refreshWallet();
    } catch (error) {
      this.toastService.showError(
        error instanceof Error ? error.message : 'Không tải được dữ liệu tài khoản.',
      );
    } finally {
      this.cdr.markForCheck();
    }
  }

  getEffectiveStatus(ticket: ProfileTicket): TicketStatus {
    return ticket.status;
  }

  getStatusLabel(status: TicketStatus): string {
    switch (status) {
      case 'CHỜ THANH TOÁN':
        return 'Chờ thanh toán';
      case 'CHỜ KHỞI HÀNH':
        return 'Chờ khởi hành';
      case 'ĐÃ HOÀN THÀNH':
        return 'Đã hoàn thành';
      case 'ĐÃ ĐÁNH GIÁ':
        return 'Đã đánh giá';
      case 'ĐÃ HỦY':
        return 'Đã hủy';
    }
  }

  getStatusModifier(status: TicketStatus): string {
    switch (status) {
      case 'CHỜ THANH TOÁN':
        return 'pending';
      case 'CHỜ KHỞI HÀNH':
        return 'waiting';
      case 'ĐÃ HOÀN THÀNH':
        return 'completed';
      case 'ĐÃ ĐÁNH GIÁ':
        return 'reviewed';
      case 'ĐÃ HỦY':
        return 'canceled';
    }
  }

  /** Chỉ số bước hiện tại trên thanh tiến trình (Status Stepper). */
  getStepIndex(status: TicketStatus): number {
    switch (status) {
      case 'CHỜ THANH TOÁN':
        return 1;
      case 'CHỜ KHỞI HÀNH':
        return 2;
      case 'ĐÃ HOÀN THÀNH':
        return 3;
      case 'ĐÃ ĐÁNH GIÁ':
        return 4;
      case 'ĐÃ HỦY':
        return -1;
    }
  }

  get userTickets(): ProfileTicket[] {
    return this.ticketsList;
  }

  getRouteLabel(ticket: ProfileTicket): string {
    const city = (c: string) =>
      c.trim().toUpperCase() === 'TP.HCM' ? 'TP.HCM' : this.normalizeCityName(c);
    return `${city(ticket.depLoc)} → ${city(ticket.arrLoc)}`;
  }

  /** Lọc theo tìm kiếm, tuyến xe, thời gian (chưa xét trạng thái - dùng để đếm số lượng trên tab). */
  private get ticketsMatchingFilters(): ProfileTicket[] {
    return this.userTickets.filter((t) => {
      // Tìm kiếm theo một phần từ khóa / gần đúng (không phân biệt dấu, hoa thường)
      const matchSearch = matchesKeyword(
        this.searchQuery,
        t.orderId,
        t.id,
        t.depLoc,
        t.arrLoc,
        this.getRouteLabel(t),
        t.type,
        t.seat,
      );
      const matchRoute =
        this.routeFilter === 'Tất cả tuyến xe' || this.getRouteLabel(t) === this.routeFilter;
      const matchDate = !this.dateFilter || t.date === this.dateFilter;
      return matchSearch && matchRoute && matchDate;
    });
  }

  countByStatus(status: string): number {
    const tickets = this.ticketsMatchingFilters;
    return status === 'Tất cả'
      ? tickets.length
      : tickets.filter((t) => this.getEffectiveStatus(t) === status).length;
  }

  get filteredTickets(): ProfileTicket[] {
    const filtered = this.ticketsMatchingFilters.filter(
      (t) => this.statusFilter === 'Tất cả' || this.getEffectiveStatus(t) === this.statusFilter,
    );
    switch (this.sortOption) {
      case 'Cũ nhất':
        return filtered.sort(
          (a, b) => a.date.localeCompare(b.date) || a.depTime.localeCompare(b.depTime),
        );
      case 'Giá vé cao → thấp':
        return filtered.sort((a, b) => b.price - a.price);
      case 'Giá vé thấp → cao':
        return filtered.sort((a, b) => a.price - b.price);
      default:
        return filtered.sort(
          (a, b) => b.date.localeCompare(a.date) || b.depTime.localeCompare(a.depTime),
        );
    }
  }

  selectStatus(status: string): void {
    this.statusFilter = status;
    this.onFiltersChanged();
  }

  get paginatedTickets(): ProfileTicket[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredTickets.slice(startIndex, startIndex + this.pageSize);
  }

  onFiltersChanged(): void {
    this.currentPage = 1;
  }

  /** Phân trang: cuộn về đầu danh sách vé. */
  goToPage(page: number): void {
    this.currentPage = page;
    setTimeout(() => scrollToTop(this.ticketListTop?.nativeElement));
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.statusFilter = 'Tất cả';
    this.routeFilter = 'Tất cả tuyến xe';
    this.sortOption = 'Mới nhất';
    this.dateFilter = '';
    this.currentPage = 1;
  }

  normalizeCityName(city: string): string {
    const clean = city.trim().toUpperCase();
    if (clean === 'TP.HCM' || clean.includes('HỒ CHÍ MINH') || clean.includes('HCM'))
      return 'TP. Hồ Chí Minh';
    if (clean === 'ĐÀ LẠT') return 'Đà Lạt';
    if (clean === 'NHA TRANG') return 'Nha Trang';
    if (clean === 'CẦN THƠ') return 'Cần Thơ';
    if (clean === 'VŨNG TÀU') return 'Vũng Tàu';
    if (clean === 'ĐÀ NẴNG') return 'Đà Nẵng';
    if (clean === 'RẠCH GIÁ') return 'Rạch Giá';
    if (clean === 'BUÔN MA THUỘT') return 'Buôn Ma Thuột';
    return city;
  }

  rebookTicket(ticketId: string): void {
    const ticket = this.ticketsList.find((t) => t.id === ticketId);
    if (ticket) {
      this.router.navigate(['/customer'], {
        queryParams: {
          departure: this.normalizeCityName(ticket.depLoc),
          destination: this.normalizeCityName(ticket.arrLoc),
        },
      });
    }
  }

  // ----- Vé điện tử (Chi tiết) -----
  showTicketDetail = false;
  selectedTicket: ProfileTicket | null = null;

  /**
   * Chi tiết vé: chuyển sang trang Tra cứu vé và mở thẳng phần chi tiết đơn của vé này
   * (cùng 1 trang Chi tiết vé với khi khách tự tra cứu bằng mã đơn + SĐT).
   */
  viewTicketDetail(ticket: ProfileTicket): void {
    void this.router.navigate(['/customer/tra-cuu-ve'], { queryParams: { order: ticket.orderId, ticket: ticket.id } });
  }

  closeTicketDetail(): void {
    this.showTicketDetail = false;
    this.selectedTicket = null;
  }

  /** Giờ cần có mặt: trước giờ khởi hành 15 phút. */
  getPresenceTime(ticket: ProfileTicket): string {
    const [h, m] = ticket.depTime.split(':').map(Number);
    const total = ((h || 0) * 60 + (m || 0) - 15 + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  getPickupPoint(ticket: ProfileTicket): string {
    return `Văn phòng VIAGO ${this.normalizeCityName(ticket.depLoc)}`;
  }

  getDropoffPoint(ticket: ProfileTicket): string {
    return `Văn phòng VIAGO ${this.normalizeCityName(ticket.arrLoc)}`;
  }

  getQrCodeUrl(ticket: ProfileTicket): string {
    const data = `${ticket.orderId}|${ticket.id}|${ticket.seat}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data)}`;
  }

  canPrintTicket(ticket: ProfileTicket): boolean {
    const status = this.getEffectiveStatus(ticket);
    return status !== 'ĐÃ HỦY' && status !== 'CHỜ THANH TOÁN';
  }

  private buildTicketLines(ticket: ProfileTicket): Array<[string, string]> {
    const user = this.authService.currentUser();
    return [
      ['Mã đơn hàng', ticket.orderId],
      ['Họ tên khách', user?.name || 'Khách hàng VIAGO'],
      ['Mã vé', ticket.id],
      [
        'Tuyến xe',
        `${this.normalizeCityName(ticket.depLoc)} - ${this.normalizeCityName(ticket.arrLoc)}`,
      ],
      ['Khởi hành', `${ticket.depTime} ${ticket.dateLabel}`],
      ['Số ghế', ticket.seat],
      ['Loại xe', ticket.type],
      ['Điểm đón', this.getPickupPoint(ticket)],
      ['Điểm trả', this.getDropoffPoint(ticket)],
      ['Giá vé', ticket.priceLabel],
    ];
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>"']/g,
      (ch) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string,
    );
  }

  /**
   * In vé gọn đúng 1 trang: chỉ đưa nội dung vé vào một iframe riêng với @page cố định,
   * không in kèm toàn bộ trang (nguyên nhân lỗi tràn 7 mặt giấy).
   * Hộp thoại in cũng dùng cho "Tải vé PDF" (chọn Lưu dưới dạng PDF, tên tệp Ve-<mã vé>).
   */
  printTicket(ticket: ProfileTicket): void {
    const rows = this.buildTicketLines(ticket)
      .map(
        ([label, value]) =>
          `<tr><td class="l">${this.escapeHtml(label)}:</td><td class="v">${this.escapeHtml(value)}</td></tr>`,
      )
      .join('');
    const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Ve-${this.escapeHtml(ticket.id)}</title>
      <style>
        @page { size: A5 portrait; margin: 10mm; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; color: #0f172a; font-size: 12px; }
        .ticket { width: 100%; max-width: 120mm; margin: 0 auto; padding: 6mm; border: 1px dashed #94a3b8; page-break-inside: avoid; break-inside: avoid; }
        .center { text-align: center; }
        h1 { font-size: 15px; margin: 0 0 2px; }
        h2 { font-size: 16px; margin: 4px 0; letter-spacing: .15em; color: #ff6a00; }
        p { margin: 1px 0; font-size: 11px; color: #475569; }
        .sep { border-top: 1px dashed #94a3b8; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 3px 0; vertical-align: top; }
        td.l { color: #475569; white-space: nowrap; padding-right: 8px; }
        td.v { font-weight: 700; text-align: right; }
        .qr { display: block; width: 35mm; height: 35mm; margin: 6px auto 2px; }
        .note { margin-top: 6px; padding: 6px; border: 1px solid #f59e0b; background: #fffbeb; font-weight: 700; font-size: 12px; color: #b45309; text-align: center; }
      </style></head><body><div class="ticket">
        <div class="center"><h1>CÔNG TY TNHH VIAGO</h1><p>669 Đỗ Mười, khu phố 13, Linh Xuân, TPHCM • MST: 0317654321</p><h2>VÉ XE KHÁCH</h2></div>
        <div class="sep"></div>
        <table>${rows}</table>
        <div class="note">Có mặt tại điểm đón lúc ${this.getPresenceTime(ticket)} ngày ${ticket.dateLabel}</div>
        <img class="qr" src="${this.getQrCodeUrl(ticket)}" alt="QR">
        <div class="center"><p>Quét mã QR tại cổng soát vé để lên xe • Tổng đài hỗ trợ: 1900 1234</p></div>
      </div></body></html>`;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    const triggerPrint = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1000);
    };
    const qr = doc.querySelector('img');
    if (qr && !qr.complete) {
      qr.addEventListener('load', triggerPrint, { once: true });
      qr.addEventListener('error', triggerPrint, { once: true });
    } else {
      setTimeout(triggerPrint, 100);
    }
  }

  /** Tải vé điện tử dạng ảnh PNG. */
  async downloadTicketImage(ticket: ProfileTicket): Promise<void> {
    const lines = this.buildTicketLines(ticket);
    const width = 640;
    const height = 260 + lines.length * 34 + 300;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dashed = (y: number) => {
      ctx.strokeStyle = '#94a3b8';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 40, y);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#00236f';
    ctx.fillRect(0, 0, width, 12);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 26px Inter, Arial, sans-serif';
    ctx.fillText('CÔNG TY TNHH VIAGO', width / 2, 60);
    ctx.fillStyle = '#475569';
    ctx.font = '16px Inter, Arial, sans-serif';
    ctx.fillText('669 Đỗ Mười, khu phố 13, Linh Xuân, TPHCM • MST: 0317654321', width / 2, 90);
    ctx.fillStyle = '#ff6a00';
    ctx.font = 'bold 28px Inter, Arial, sans-serif';
    ctx.fillText('VÉ XE KHÁCH', width / 2, 138);
    dashed(162);

    let y = 200;
    lines.forEach(([label, value]) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#475569';
      ctx.font = '18px Inter, Arial, sans-serif';
      ctx.fillText(`${label}:`, 50, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px Inter, Arial, sans-serif';
      ctx.fillText(value, width - 50, y);
      y += 34;
    });

    ctx.fillStyle = '#fffbeb';
    ctx.fillRect(40, y - 6, width - 80, 44);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 18px Inter, Arial, sans-serif';
    ctx.fillText(
      `Có mặt tại điểm đón lúc ${this.getPresenceTime(ticket)} ngày ${ticket.dateLabel}`,
      width / 2,
      y + 22,
    );
    y += 56;
    dashed(y);

    const qrSize = 180;
    const qrTop = y + 16;
    try {
      const response = await fetch(this.getQrCodeUrl(ticket));
      const bitmap = await createImageBitmap(await response.blob());
      ctx.drawImage(bitmap, (width - qrSize) / 2, qrTop, qrSize, qrSize);
    } catch {
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect((width - qrSize) / 2, qrTop, qrSize, qrSize);
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Inter, Arial, sans-serif';
      ctx.fillText(`${ticket.id}-${ticket.seat}`, width / 2, qrTop + qrSize / 2);
    }
    ctx.fillStyle = '#475569';
    ctx.font = '15px Inter, Arial, sans-serif';
    ctx.fillText(
      'Quét mã QR tại cổng soát vé để lên xe • Tổng đài: 1900 1234',
      width / 2,
      qrTop + qrSize + 32,
    );

    canvas.toBlob((blob) => {
      if (!blob) {
        this.toastService.showError('Không thể tạo ảnh vé, vui lòng thử lại.');
        return;
      }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Ve-${ticket.id}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      this.toastService.showSuccess('Đã tải ảnh vé điện tử.');
    }, 'image/png');
  }

  // ----- Đánh giá chuyến đi -----
  showReviewModal = false;
  reviewTicket: ProfileTicket | null = null;
  reviewSubmitted = false;
  reviewComment = '';
  reviewError = '';
  reviewFileError = '';
  reviewAttachments: { file: File; url: string; isVideo: boolean }[] = [];
  readonly maxReviewFiles = 3;
  readonly quickReviewTags = ['An toàn', 'Sạch sẽ', 'Đúng giờ', 'Tài xế thân thiện', 'Tiện nghi'];
  ratingCriteria = [
    { label: 'An toàn', score: 0 },
    { label: 'Sạch sẽ', score: 0 },
    { label: 'Thái độ nhân viên', score: 0 },
    { label: 'Đúng giờ', score: 0 },
    { label: 'Thông tin đầy đủ', score: 0 },
    { label: 'Tiện nghi', score: 0 },
  ];

  openReview(ticket: ProfileTicket): void {
    this.reviewTicket = ticket;
    this.reviewSubmitted = false;
    this.reviewComment = '';
    this.reviewError = '';
    this.reviewFileError = '';
    this.clearReviewAttachments();
    this.ratingCriteria.forEach((c) => (c.score = 0));
    this.showTicketDetail = false;
    this.showReviewModal = true;
  }

  closeReview(): void {
    this.showReviewModal = false;
    this.reviewTicket = null;
    this.clearReviewAttachments();
  }

  setRating(index: number, score: number): void {
    this.ratingCriteria[index].score = score;
    this.reviewError = '';
  }

  toggleReviewTag(tag: string): void {
    const tags = this.reviewComment
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const idx = tags.indexOf(tag);
    if (idx >= 0) tags.splice(idx, 1);
    else tags.push(tag);
    this.reviewComment = tags.join(', ');
  }

  hasReviewTag(tag: string): boolean {
    return this.reviewComment
      .split(',')
      .map((t) => t.trim())
      .includes(tag);
  }

  /** Chọn ảnh/video: hiển thị thumbnail xem trước thay vì chỉ hiện tên tệp. */
  onReviewFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    input.value = '';
    this.reviewFileError = '';

    for (const file of files) {
      if (this.reviewAttachments.length >= this.maxReviewFiles) {
        this.reviewFileError = `Chỉ được đính kèm tối đa ${this.maxReviewFiles} tệp.`;
        break;
      }
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (
        !['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'].includes(file.type)
      ) {
        this.reviewFileError = 'Chỉ hỗ trợ ảnh JPG, PNG, WebP và video MP4, WebM.';
        continue;
      }
      if ((isImage && file.size > 5 * 1024 * 1024) || (isVideo && file.size > 20 * 1024 * 1024)) {
        this.reviewFileError = `Tệp "${file.name}" vượt quá dung lượng cho phép (ảnh 5MB, video 20MB).`;
        continue;
      }
      this.reviewAttachments = [
        ...this.reviewAttachments,
        { file, url: URL.createObjectURL(file), isVideo },
      ];
    }
  }

  removeReviewFile(index: number): void {
    URL.revokeObjectURL(this.reviewAttachments[index].url);
    this.reviewAttachments = this.reviewAttachments.filter((_, i) => i !== index);
    this.reviewFileError = '';
  }

  private clearReviewAttachments(): void {
    this.reviewAttachments.forEach((item) => URL.revokeObjectURL(item.url));
    this.reviewAttachments = [];
  }

  async submitReview(): Promise<void> {
    if (!this.reviewTicket || this.saving) return;
    if (!this.ratingCriteria.some((c) => c.score > 0)) {
      this.reviewError = 'Vui lòng chấm điểm ít nhất một tiêu chí.';
      return;
    }
    this.saving = true;
    this.reviewError = '';
    try {
      const body = new FormData();
      body.append('scores', JSON.stringify(this.ratingCriteria.map((c) => c.score)));
      body.append('comment', this.reviewComment);
      for (const attachment of this.reviewAttachments) body.append('files', attachment.file);
      await this.backend.request(
        'customer/profile/tickets/' + encodeURIComponent(this.reviewTicket.id) + '/review',
        'POST',
        body,
      );
      await this.reloadServerData();
      this.reviewSubmitted = true;
      this.toastService.showSuccess('Đánh giá đã được lưu.');
    } catch (error) {
      this.reviewError = error instanceof Error ? error.message : 'Không lưu được đánh giá.';
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  get userProfile() {
    const user = this.authService.currentUser();
    return { phone: user?.phoneNumber || '', email: user?.email || '' };
  }

  getMaskedPhone(): string {
    const phone = this.userProfile.phone.trim();
    return phone.length >= 7
      ? phone.substring(0, 4) + '***' + phone.substring(phone.length - 3)
      : phone;
  }

  getMaskedEmail(): string {
    const email = this.userProfile.email.trim();
    const parts = email.split('@');
    if (parts.length === 2) {
      const [name, domain] = parts;
      return (name.length > 3 ? name.substring(0, 3) : name) + '***@' + domain;
    }
    return email;
  }

  onToggle2FAClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.twoFactorTarget = !this.is2FAEnabled;
    this.twoFactorPassword = '';
    this.open2FAPopup1();
  }

  open2FAPopup1(): void {
    this.show2FAPopup1 = true;
    this.twoFactorMethod = 'phone';
  }

  close2FAPopup1(): void {
    this.show2FAPopup1 = false;
  }

  async submit2FAMethod(): Promise<void> {
    if (this.twoFactorMethod !== 'phone') {
      this.toastService.showError('Chưa cấu hình xác thực qua email. Vui lòng chọn SMS.');
      return;
    }
    if (!this.twoFactorPassword) {
      this.toastService.showError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    const result = await this.authService.sendOTP(this.userProfile.phone, null, 'two-factor');
    if (!result.success) {
      this.toastService.showError(result.message);
      return;
    }
    this.twoFactorOtpVal = '';
    this.twoFactorOtpError = '';
    this.show2FAPopup1 = false;
    this.show2FAPopup2 = true;
    this.start2FAOtpTimer();
    this.cdr.markForCheck();
  }

  close2FAPopup2(): void {
    this.show2FAPopup2 = false;
    this.stop2FAOtpTimer();
  }

  goBackTo2FAPopup1(): void {
    this.show2FAPopup2 = false;
    this.stop2FAOtpTimer();
    this.show2FAPopup1 = true;
  }

  on2FAOtpInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = target.value.replace(/\D/g, '').slice(0, 6);
    target.value = val;
    this.twoFactorOtpVal = val;
    if (val) this.twoFactorOtpError = '';
    if (val.length === 6) this.verify2FA();
  }

  on2FAOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const digits = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    this.twoFactorOtpVal = digits;
    this.cdr.detectChanges();
    if (digits.length === 6) this.verify2FA();
  }

  async verify2FA(): Promise<void> {
    if (this.saving || this.twoFactorOtpVal.length !== 6) return;
    this.saving = true;
    this.twoFactorOtpError = '';
    try {
      const verified = await this.authService.verifyOTP(
        this.userProfile.phone,
        this.twoFactorOtpVal,
      );
      if (!verified.success) throw new Error(verified.message);
      const result = await this.authService.setTwoFactor(
        this.twoFactorTarget,
        this.twoFactorPassword,
      );
      if (!result.success) throw new Error(result.message);
      this.is2FAEnabled = !!this.authService.currentUser()?.twoFA;
      this.show2FAPopup2 = false;
      this.twoFactorPassword = '';
      this.stop2FAOtpTimer();
      this.toastService.showSuccess('Đã lưu cài đặt xác thực hai lớp.');
    } catch (error) {
      this.twoFactorOtpError = error instanceof Error ? error.message : 'Không xác thực được.';
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }
  async resend2FAOtp(): Promise<void> {
    const result = await this.authService.sendOTP(this.userProfile.phone, null, 'two-factor');
    if (result.success) {
      this.twoFactorOtpVal = '';
      this.start2FAOtpTimer();
    } else this.twoFactorOtpError = result.message;
    this.cdr.markForCheck();
  }

  start2FAOtpTimer(): void {
    this.stop2FAOtpTimer();
    this.twoFactorTimer = 180;
    this.twoFactorIntervalId = setInterval(() => {
      if (this.twoFactorTimer > 0) {
        this.twoFactorTimer--;
      } else {
        this.stop2FAOtpTimer();
        this.twoFactorOtpError = 'Mã xác thực đã hết hạn. Vui lòng yêu cầu gửi lại mã.';
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  stop2FAOtpTimer(): void {
    if (this.twoFactorIntervalId) {
      clearInterval(this.twoFactorIntervalId);
      this.twoFactorIntervalId = null;
    }
  }

  getFormatted2FATime(): string {
    const minutes = Math.floor(this.twoFactorTimer / 60);
    const seconds = this.twoFactorTimer % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // =========================================================================
  // ĐẶC QUYỀN THÀNH VIÊN (đồng bộ từ hồ sơ khách hàng)
  // =========================================================================

  get tiers() {
    return (this.authService.currentUser()?.membershipTiers || []).map((tier) => {
      const style = (
        {
          Bạc: { code: 'SILVER', modifier: 'silver' },
          Vàng: { code: 'GOLD', modifier: 'gold' },
          'Kim cương': { code: 'DIAMOND', modifier: 'diamond' },
        } as Record<string, { code: string; modifier: string }>
      )[tier.name] || { code: tier.id, modifier: 'silver' };
      return {
        ...tier,
        key: tier.name,
        label: tier.name,
        short: tier.name.toLocaleUpperCase('vi'),
        ...style,
      };
    });
  }

  prevCard(): void {
    this.activeCardIndex =
      this.activeCardIndex > 0 ? this.activeCardIndex - 1 : Math.max(0, this.tiers.length - 1);
  }

  nextCard(): void {
    this.activeCardIndex =
      this.activeCardIndex < this.tiers.length - 1 ? this.activeCardIndex + 1 : 0;
  }

  get rankIndex(): number {
    const rank = this.authService.currentUser()?.rank;
    return this.tiers.findIndex((t) => t.key === rank);
  }

  get currentRankLabel(): string {
    const idx = this.rankIndex;
    return idx === -1
      ? this.authService.currentUser()?.rank || 'Thành viên mới'
      : `Hạng ${this.tiers[idx].label}`;
  }

  /** Điểm tích lũy được quản lý trong hồ sơ Supabase. */
  get loyaltyPoints(): number {
    return this.authService.currentUser()?.points || 0;
  }
  get customOccupation(): string {
    const occupation = this.authService.currentUser()?.occupation || '';
    return ['Học sinh / Sinh viên', 'Nhân viên văn phòng', 'Kinh doanh tự do', 'Khác'].includes(
      occupation,
    )
      ? ''
      : occupation;
  }

  getCardPosition(cardIndex: number): 'active' | 'left' | 'right' {
    const activeIdx = this.activeCardIndex;
    if (cardIndex === activeIdx) return 'active';
    if (cardIndex === activeIdx - 1 || (activeIdx === 0 && cardIndex === this.tiers.length - 1))
      return 'left';
    return 'right';
  }

  isCardLocked(cardIndex: number): boolean {
    return cardIndex > this.rankIndex;
  }

  get membershipProgress() {
    const user = this.authService.currentUser();
    const currentTickets = user?.tickets || 0;
    const currentSpent = user?.spent || 0;
    const nextTier = this.tiers[this.rankIndex + 1];
    const isMaxRank = !nextTier;
    const targetTickets = isMaxRank ? this.tiers.at(-1)?.minTickets || 0 : nextTier.minTickets;
    const targetSpent = isMaxRank ? this.tiers.at(-1)?.minSpent || 0 : nextTier.minSpent;

    const ticketPercent = Math.min(
      100,
      Math.round((targetTickets ? currentTickets / targetTickets : 0) * 100),
    );
    const spentPercent = Math.min(
      100,
      Math.round((targetSpent ? currentSpent / targetSpent : 0) * 100),
    );

    return {
      currentTickets,
      targetTickets,
      ticketPercent,
      ticketPinPercent: ticketPercent === 100 ? 96 : Math.max(0, ticketPercent - 3),
      currentSpent,
      targetSpent,
      spentPercent,
      spentPinPercent: spentPercent === 100 ? 96 : Math.max(0, spentPercent - 3),
      nextRankName: isMaxRank ? '' : nextTier.label,
      remainingTickets: Math.max(0, targetTickets - currentTickets),
      remainingSpent: Math.max(0, targetSpent - currentSpent),
    };
  }

  formatMoneyShort(value: number): string {
    return value >= 1000000
      ? `${(value / 1000000).toLocaleString('vi-VN')}tr`
      : `${value.toLocaleString('vi-VN')}đ`;
  }

  activeVoucherTab = 'active';

  scrollVouchers(containerId: string, direction: 'left' | 'right'): void {
    const container = document.getElementById(containerId);
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
    }
  }

  get tierBenefits(): { title: string; desc: string }[] {
    return this.tiers.find((t) => t.key === this.authService.currentUser()?.rank)?.benefits || [];
  }
  get benefitMatrix(): { label: string; values: string[] }[] {
    const titles = [
      ...new Set(this.tiers.flatMap((tier) => tier.benefits.map((benefit) => benefit.title))),
    ];
    return titles.map((label) => ({
      label,
      values: this.tiers.map(
        (tier) => tier.benefits.find((benefit) => benefit.title === label)?.desc || '—',
      ),
    }));
  }
}
