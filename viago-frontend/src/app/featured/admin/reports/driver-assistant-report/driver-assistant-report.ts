import { AdminTabs } from '../../../../shared/components/admin-tabs/admin-tabs';
import { AdminPageHeader } from '../../../../shared/components/admin-page-header/admin-page-header';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { AccountsApiService } from '../../../../core/services/accounts-api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { Toast } from '../../../../shared/components/toast/toast';

export interface Personnel {
  stt: number;
  maNhanSu: string;
  hoTen: string;
  ngaySinh: string;
  soDienThoai: string;
  cccd: string;
  vaiTro: string; // 'Tài xế' | 'Phụ xe'
  hangBangLai: string; // 'E' | 'D' | 'Không yêu cầu bằng lái'
  thoiHanBangLai: string; // Date string 'DD/MM/YYYY' or empty for assistant driver
  trangThai: string; // 'Đang hoạt động' | 'Đã khóa'
  smsSentCount?: number; // Số lần đã nhắc đổi bằng (tai_xe_phu_xe.solannhachangplx)
  lastSmsSentAt?: string; // Thời gian nhắc gần nhất
  soChuyen: number; // Số chuyến trong tháng đang xem
}

/** Một dòng của GET admin/reports/drivers */
interface ApiPersonnel {
  no: number;
  id: string;
  name: string;
  birthDate: string | null;
  phone: string;
  nationalId: string;
  role: 'TaiXe' | 'PhuXe';
  roleLabel: string;
  licenseClass: string | null;
  licenseExpiry: string | null;
  status: string;
  statusLabel: string;
  reminderCount: number;
  lastReminderAt: string | null;
  trips: number;
}

/** yyyy-MM-dd → dd/MM/yyyy */
const toVnDate = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
const formatDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })
    : '';

@Component({
  selector: 'app-driver-assistant-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalComponent,
    Toast,
    Pagination,
    AdminPageHeader,
    AdminTabs,
  ],
  templateUrl: './driver-assistant-report.html',
  styleUrl: './driver-assistant-report.css'
})
export class DriverAssistantReport implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly accountsApi = inject(AccountsApiService);
  /** App chạy không có zone.js: gọi API xong thì báo Angular vẽ lại giao diện. */
  private readonly api = {
    request: <T>(...args: Parameters<AccountsApiService['request']>): Promise<T> =>
      this.accountsApi.request<T>(...args).finally(() => this.cdr.markForCheck()),
  };
  loading = false;
  sendingReminder = false;

  // Dữ liệu từ GET admin/reports/drivers
  allPersonnel: Personnel[] = [];

  // Danh sách sau lọc
  filteredPersonnel: Personnel[] = [];
  paginatedPersonnel: Personnel[] = [];

  // Active Tab state
  activeTab: 'bieu-do' | 'danh-sach' = 'bieu-do';

  // Bộ chọn Tháng/Năm linh hoạt dạng input type="month" (chuẩn HTML5, YYYY-MM)
  selectedMonthYear: string = new Date().toISOString().slice(0, 7);
  private loadedMonth = '';

  get displaySelectedMonthYear(): string {
    if (!this.selectedMonthYear) return '';
    const parts = this.selectedMonthYear.split('-');
    if (parts.length === 2) {
      const year = parts[0];
      const month = parts[1];
      return `Tháng ${month}/${year}`;
    }
    return `Tháng ${this.selectedMonthYear}`;
  }

  // Form Filters
  filterSearchQuery: string = '';
  filterRole: string = 'Tất cả nhân sự';
  filterLicenseClass: string = 'Tất cả hạng bằng';
  filterStatus: string = 'Tất cả trạng thái';

  // Applied Filters
  appliedSearchQuery: string = '';
  appliedRole: string = 'Tất cả nhân sự';
  appliedLicenseClass: string = 'Tất cả hạng bằng';
  appliedStatus: string = 'Tất cả trạng thái';

  // Dashboard Overview Stats
  totalOperating: number = 0;
  totalDrivers: number = 0;
  totalAssistants: number = 0;
  expiringLicensesCount: number = 0;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;
  startIndex: number = 0;
  endIndex: number = 0;

  // SMS Modal & Toast State
  showSmsModal: boolean = false;
  selectedDriverForSms: Personnel | null = null;
  showToast: boolean = false;
  toastTitle: string = '';
  toastMessage: string = '';
  toastVariant: 'success' | 'error' | 'warning' | 'info' = 'success';

  setActiveTab(tab: 'bieu-do' | 'danh-sach') {
    this.activeTab = tab;
  }

  ngOnInit() {
    void this.load();
  }

  /** Tải nhân sự kèm số chuyến trong tháng đang chọn. */
  async load() {
    this.loading = true;
    const month = this.selectedMonthYear || new Date().toISOString().slice(0, 7);
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const range = `from=${month}-01&to=${month}-${String(lastDay).padStart(2, '0')}`;
    try {
      const rows: ApiPersonnel[] = [];
      for (let page = 1; ; page++) {
        const res = await this.api.request<{ items: ApiPersonnel[]; pagination: { totalPages: number } }>(
          `admin/reports/drivers?page=${page}&pageSize=100&${range}`, 'GET', undefined, 'admin');
        rows.push(...res.items);
        if (page >= res.pagination.totalPages || !res.items.length) break;
      }
      this.allPersonnel = rows.map((r, i) => ({
        stt: i + 1,
        maNhanSu: r.id,
        hoTen: r.name,
        ngaySinh: toVnDate(r.birthDate),
        soDienThoai: r.phone ?? '',
        cccd: r.nationalId ?? '',
        vaiTro: r.role === 'TaiXe' ? 'Tài xế' : 'Phụ xe',
        hangBangLai: r.licenseClass ?? 'Không yêu cầu bằng lái',
        thoiHanBangLai: toVnDate(r.licenseExpiry),
        trangThai: r.statusLabel,
        smsSentCount: r.reminderCount,
        lastSmsSentAt: formatDateTime(r.lastReminderAt),
        soChuyen: r.trips,
      }));
      this.loadedMonth = month;
    } catch (error) {
      this.triggerToast('Không tải được dữ liệu', error instanceof Error ? error.message : 'Lỗi tải báo cáo tài xế/phụ xe.', 'error');
    } finally {
      this.loading = false;
      this.calculateStats();
      this.applyFilters();
    }
  }

  onMonthChange() {
    if (this.selectedMonthYear && this.selectedMonthYear !== this.loadedMonth) void this.load();
  }

  /** Mốc hôm nay (0h) để tính hạn bằng lái. */
  private today(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private parseVnDate(value: string): Date | null {
    const parts = value.split('/');
    if (parts.length !== 3) return null;
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  }

  isLicenseExpiringSoon(p: Personnel): boolean {
    if (p.vaiTro !== 'Tài xế' || !p.thoiHanBangLai) return false;
    const expDate = this.parseVnDate(p.thoiHanBangLai);
    if (!expDate) return false;
    const today = this.today();
    const thirtyDaysLater = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
    return expDate <= thirtyDaysLater;
  }

  getDaysUntilExpiration(p: Personnel): number {
    const expDate = p.thoiHanBangLai ? this.parseVnDate(p.thoiHanBangLai) : null;
    if (!expDate) return 0;
    return Math.ceil((expDate.getTime() - this.today().getTime()) / (1000 * 60 * 60 * 24));
  }

  get expiringPersonnelList(): Personnel[] {
    return this.filteredPersonnel.filter(p => this.isLicenseExpiringSoon(p));
  }

  calculateStats() {
    this.totalOperating = this.allPersonnel.length;
    this.totalDrivers = this.allPersonnel.filter(p => p.vaiTro === 'Tài xế').length;
    this.totalAssistants = this.allPersonnel.filter(p => p.vaiTro === 'Phụ xe').length;
    this.expiringLicensesCount = this.allPersonnel.filter(p => this.isLicenseExpiringSoon(p)).length;
  }

  onApplyFilters() {
    this.appliedSearchQuery = this.filterSearchQuery;
    this.appliedRole = this.filterRole;
    this.appliedLicenseClass = this.filterLicenseClass;
    this.appliedStatus = this.filterStatus;

    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters() {
    let result = [...this.allPersonnel];
    const search = this.appliedSearchQuery.trim().toLowerCase();

    if (search) {
      result = result.filter(p =>
        p.maNhanSu.toLowerCase().includes(search) ||
        p.hoTen.toLowerCase().includes(search) ||
        p.soDienThoai.toLowerCase().includes(search) ||
        p.cccd.toLowerCase().includes(search)
      );
    }

    if (this.appliedRole !== 'Tất cả nhân sự') {
      result = result.filter(p => p.vaiTro === this.appliedRole);
    }

    if (this.appliedLicenseClass !== 'Tất cả hạng bằng') {
      result = result.filter(p => p.hangBangLai === this.appliedLicenseClass);
    }

    if (this.appliedStatus !== 'Tất cả trạng thái') {
      if (this.appliedStatus === 'Bằng lái sắp hết hạn (< 30 ngày)') {
        result = result.filter(p => this.isLicenseExpiringSoon(p));
      } else {
        result = result.filter(p => p.trangThai === this.appliedStatus);
      }
    }

    this.filteredPersonnel = result;
    this.totalPages = Math.ceil(this.filteredPersonnel.length / this.pageSize) || 1;
    this.updatePaginatedList();
  }

  onResetFilters() {
    this.filterSearchQuery = '';
    this.filterRole = 'Tất cả nhân sự';
    this.filterLicenseClass = 'Tất cả hạng bằng';
    this.filterStatus = 'Tất cả trạng thái';

    this.appliedSearchQuery = '';
    this.appliedRole = 'Tất cả nhân sự';
    this.appliedLicenseClass = 'Tất cả hạng bằng';
    this.appliedStatus = 'Tất cả trạng thái';

    this.currentPage = 1;
    this.applyFilters();
  }

  updatePaginatedList() {
    this.startIndex = (this.currentPage - 1) * this.pageSize;
    this.endIndex = Math.min(this.startIndex + this.pageSize, this.filteredPersonnel.length);
    this.paginatedPersonnel = this.filteredPersonnel.slice(this.startIndex, this.endIndex);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedList();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  openSmsModal(p: Personnel) {
    this.selectedDriverForSms = p;
    this.showSmsModal = true;
  }

  closeSmsModal() {
    this.showSmsModal = false;
    this.selectedDriverForSms = null;
  }

  /** Ghi nhận đã nhắc đổi bằng (POST admin/reports/drivers/:id/license-reminders) — không gửi SMS thật. */
  async confirmSendSms() {
    const driver = this.selectedDriverForSms;
    if (!driver || this.sendingReminder) return;
    this.sendingReminder = true;
    try {
      const res = await this.api.request<{ reminderCount: number; lastReminderAt: string; daysLeft: number }>(
        `admin/reports/drivers/${encodeURIComponent(driver.maNhanSu)}/license-reminders`, 'POST', {}, 'admin');
      driver.smsSentCount = res.reminderCount;
      driver.lastSmsSentAt = formatDateTime(res.lastReminderAt);
      this.closeSmsModal();
      this.triggerToast(
        'Đã ghi nhận nhắc đổi bằng',
        `Đã ghi nhận nhắc tài xế ${driver.hoTen} (${driver.soDienThoai}) lần thứ ${res.reminderCount}. Vui lòng liên hệ tài xế qua điện thoại/Zalo.`,
        'success'
      );
    } catch (error) {
      this.closeSmsModal();
      this.triggerToast('Chưa ghi nhận được', error instanceof Error ? error.message : 'Không ghi nhận được lần nhắc.', 'error');
    } finally {
      this.sendingReminder = false;
    }
  }

  triggerToast(title: string, message: string, variant: 'success' | 'error' | 'warning' | 'info' = 'success') {
    this.toastTitle = title;
    this.toastMessage = message;
    this.toastVariant = variant;
    this.showToast = true;
  }

  onToastClosed() {
    this.showToast = false;
  }

  get filteredOperatingCount(): number {
    return this.filteredPersonnel.length;
  }

  get driversStrokeDashArray(): string {
    const pct = this.filteredDriversPercent;
    const strokeLength = (pct / 100) * 376.9911;
    const gapLength = 376.9911 - strokeLength;
    return `${strokeLength} ${gapLength}`;
  }

  get assistantsStrokeDashArray(): string {
    const pct = this.filteredAssistantsPercent;
    const strokeLength = (pct / 100) * 376.9911;
    const gapLength = 376.9911 - strokeLength;
    return `${strokeLength} ${gapLength}`;
  }

  get assistantsStrokeDashOffset(): number {
    const pct = this.filteredDriversPercent;
    return -((pct / 100) * 376.9911);
  }

  get activeStrokeDashArray(): string {
    const pct = this.filteredActivePercent;
    const strokeLength = (pct / 100) * 376.9911;
    const gapLength = 376.9911 - strokeLength;
    return `${strokeLength} ${gapLength}`;
  }

  get lockedStrokeDashArray(): string {
    const pct = this.filteredLockedPercent;
    const strokeLength = (pct / 100) * 376.9911;
    const gapLength = 376.9911 - strokeLength;
    return `${strokeLength} ${gapLength}`;
  }

  get lockedStrokeDashOffset(): number {
    const pct = this.filteredActivePercent;
    return -((pct / 100) * 376.9911);
  }

  get filteredDriversCount(): number {
    return this.filteredPersonnel.filter(p => p.vaiTro === 'Tài xế').length;
  }

  get filteredAssistantsCount(): number {
    return this.filteredPersonnel.filter(p => p.vaiTro === 'Phụ xe').length;
  }

  get filteredDriversPercent(): number {
    if (this.filteredOperatingCount === 0) return 0;
    return Math.round((this.filteredDriversCount / this.filteredOperatingCount) * 100);
  }

  get filteredAssistantsPercent(): number {
    if (this.filteredOperatingCount === 0) return 0;
    return Math.round((this.filteredAssistantsCount / this.filteredOperatingCount) * 100);
  }

  get filteredActiveCount(): number {
    return this.filteredPersonnel.filter(p => p.trangThai === 'Đang hoạt động').length;
  }

  get filteredLockedCount(): number {
    return this.filteredPersonnel.filter(p => p.trangThai === 'Đã khóa').length;
  }

  get filteredActivePercent(): number {
    if (this.filteredOperatingCount === 0) return 0;
    return Math.round((this.filteredActiveCount / this.filteredOperatingCount) * 100);
  }

  get filteredLockedPercent(): number {
    if (this.filteredOperatingCount === 0) return 0;
    return Math.round((this.filteredLockedCount / this.filteredOperatingCount) * 100);
  }

  get filteredGradeECount(): number {
    return this.filteredPersonnel.filter(p => p.vaiTro === 'Tài xế' && p.hangBangLai === 'E').length;
  }

  get filteredGradeDCount(): number {
    return this.filteredPersonnel.filter(p => p.vaiTro === 'Tài xế' && p.hangBangLai === 'D').length;
  }

  get totalFilteredDriversForLicense(): number {
    return this.filteredPersonnel.filter(p => p.vaiTro === 'Tài xế').length;
  }

  get filteredGradeEPercent(): number {
    if (this.totalFilteredDriversForLicense === 0) return 0;
    return (this.filteredGradeECount / this.totalFilteredDriversForLicense) * 100;
  }

  get filteredGradeDPercent(): number {
    if (this.totalFilteredDriversForLicense === 0) return 0;
    return (this.filteredGradeDCount / this.totalFilteredDriversForLicense) * 100;
  }

  getLicenseExpiringInDaysRangeCount(startDays: number, endDays: number): number {
    const today = this.today();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + startDays);
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + endDays);
    return this.filteredPersonnel.filter(p => {
      if (p.vaiTro !== 'Tài xế' || !p.thoiHanBangLai) return false;
      const expDate = this.parseVnDate(p.thoiHanBangLai);
      return !!expDate && expDate > startDate && expDate <= endDate;
    }).length;
  }

  get expiring30DaysCount(): number {
    return this.getLicenseExpiringInDaysRangeCount(-1, 30);
  }

  get expiring90DaysCount(): number {
    return this.getLicenseExpiringInDaysRangeCount(-1, 90);
  }

  get expiring180DaysCount(): number {
    return this.getLicenseExpiringInDaysRangeCount(90, 180);
  }

  /** Số chuyến thật trong tháng đang chọn (lich_trinh có tài xế/phụ xe này). */
  get combinedPerformanceList() {
    return this.filteredPersonnel.map(p => {
      const trips = p.soChuyen;
      let label = 'Đạt yêu cầu';
      let colorClass = 'bg-green';
      const high = p.vaiTro === 'Tài xế' ? 25 : 22;
      const low = p.vaiTro === 'Tài xế' ? 15 : 12;
      if (trips > high) {
        label = 'Cảnh báo quá tải';
        colorClass = 'bg-orange';
      } else if (trips < low) {
        label = 'Hiệu suất thấp';
        colorClass = 'bg-blue-light';
      }
      return { ma: p.maNhanSu, ten: p.hoTen, vaiTro: p.vaiTro, trips, label, colorClass };
    }).sort((a, b) => b.trips - a.trips);
  }

  get driverPerformanceList() {
    return this.combinedPerformanceList.filter(p => p.vaiTro === 'Tài xế');
  }

  get assistantPerformanceList() {
    return this.combinedPerformanceList.filter(p => p.vaiTro === 'Phụ xe');
  }

  onExportExcel() {
    let csvContent = '\uFEFF';
    csvContent += 'STT,Mã nhân sự,Họ và tên,Ngày sinh,Số điện thoại,CCCD,Vai trò,Bằng lái & Thời hạn,Trạng thái,Số lần nhắc đổi bằng,Lần nhắc gần nhất\n';

    this.filteredPersonnel.forEach(p => {
      const bangLaiCol = p.vaiTro === 'Tài xế'
        ? `Hạng: ${p.hangBangLai} - Hạn: ${p.thoiHanBangLai}`
        : p.hangBangLai;

      const row = [
        p.stt,
        p.maNhanSu,
        `"${p.hoTen}"`,
        p.ngaySinh,
        p.soDienThoai,
        `'${p.cccd}`,
        p.vaiTro,
        `"${bangLaiCol}"`,
        p.trangThai,
        p.smsSentCount || 0,
        `"${p.lastSmsSentAt || 'Chưa nhắc'}"`
      ].join(',');
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_cao_tai_xe_va_phu_xe_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  printReport() {
    window.print();
  }

  exportPDF() {
    const originalTitle = document.title;
    document.title = 'Bao_cao_phan_tich_truc_quan';
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  }
}
