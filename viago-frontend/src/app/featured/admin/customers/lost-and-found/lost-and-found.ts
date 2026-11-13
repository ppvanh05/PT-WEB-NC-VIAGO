import { AdminTabs } from '../../../../shared/components/admin-tabs/admin-tabs';
import { AdminPageHeader } from '../../../../shared/components/admin-page-header/admin-page-header';
import { Card } from '../../../../shared/components/card/card';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Toast } from '../../../../shared/components/toast/toast';
import { ToastService } from '../../../../core/services/toast.service';
import { AccountsApiService } from '../../../../core/services/accounts-api.service';

type ApiStatus = 'DangTimKiem' | 'DaTimThay' | 'DaTraKhach' | 'DongYeuCau';
type StatusLabel = 'Đang tìm kiếm' | 'Đã tìm thấy' | 'Đã trả khách' | 'Đóng yêu cầu';

const STATUS_LABEL: Record<ApiStatus, StatusLabel> = {
  DangTimKiem: 'Đang tìm kiếm',
  DaTimThay: 'Đã tìm thấy',
  DaTraKhach: 'Đã trả khách',
  DongYeuCau: 'Đóng yêu cầu',
};
const STATUS_CODE = Object.fromEntries(Object.entries(STATUS_LABEL).map(([k, v]) => [v, k])) as Record<StatusLabel, ApiStatus>;

export interface LostClaim {
  id: string;
  orderId: string | null;
  ticketId: string | null;
  phone: string;
  description: string;
  submittedAt: string;
  status: 'ChoXacMinh' | 'DaXacNhan' | 'TuChoi';
  statusLabel: string;
  handledBy: string | null;
  handledAt: string | null;
}

/** Hồ sơ đồ thất lạc trên giao diện (map từ GET admin/lost-and-found). */
export interface LostItem {
  ma_do_that_lac: string;
  ma_don_hang?: string | null;
  ma_ve: string;
  chua_ro_chu?: boolean;       // Đồ nhân viên nhặt được, chưa rõ chủ
  ma_lich_trinh?: string | null;
  ten_khach_hang: string;
  so_dien_thoai: string;
  email: string;
  tuyen_xe: string;
  ngay_di_chuyen: string;
  ngay_bao_mat: string;
  vi_tri_ghe?: string | null;
  ten_vat_pham: string;
  mo_ta_vat_pham: string;
  vi_tri_tim_thay?: string | null;
  thoi_gian_tim_thay?: string | null; // yyyy-MM-ddTHH:mm (giờ máy) cho input datetime-local
  vi_tri_luu_tru?: string | null;
  hinh_anh?: string | null;          // ảnh hiển thị
  hinh_anh_moi?: string | null;      // URL ảnh vừa tải lên, chưa lưu
  anh_goc?: string[];
  hinh_anh_tim_thay?: string | null;
  hinh_anh_tim_thay_moi?: string | null;
  anh_tim_thay_goc?: string[];
  ghi_chu?: string | null;
  ly_do_dong?: string;
  trang_thai: StatusLabel;
  trang_thai_goc?: StatusLabel;
  trang_thai_tiep?: StatusLabel[];
  nguoi_ghi_nhan?: string | null;
  yeu_cau_nhan: LostClaim[];
  so_yeu_cau_cho: number;
  ngay_tao: string;
  ngay_cap_nhat: string;
}

export interface TicketInfo {
  ma_ve: string;
  ma_don_hang: string;
  ten_khach_hang: string;
  so_dien_thoai: string;
  email: string;
  tuyen_xe: string;
  ngay_di_chuyen: string;
  vi_tri_ghe: string;
  ma_lich_trinh: string;
}

interface ApiItem {
  id: string;
  type: 'KhachBaoMat' | 'NhanVienNhatDuoc';
  orderId: string | null;
  ticketId: string | null;
  unknownOwner: boolean;
  customerName: string | null;
  phone: string | null;
  email: string | null;
  scheduleId: string | null;
  route: string | null;
  travelDate: string | null;
  reportedAt: string;
  seat: string | null;
  itemName: string;
  description: string | null;
  images: string[];
  foundLocation: string | null;
  foundAt: string | null;
  foundImages: string[];
  storageLocation: string | null;
  note: string | null;
  status: ApiStatus;
  nextStatuses: ApiStatus[];
  recordedBy: string | null;
  createdAt: string;
  updatedAt: string;
  claims: LostClaim[];
  pendingClaims: number;
}

interface ApiTicket {
  ticketId: string | null;
  orderId: string;
  customerName: string;
  phone: string;
  email: string | null;
  scheduleId: string;
  route: string;
  travelDate: string;
  seat: string | null;
  tickets: { id: string; seat: string }[];
}

/** ISO → chuỗi cho input datetime-local theo giờ máy. */
function toLocalInput(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

@Component({
  selector: 'app-lost-and-found',
  standalone: true,
  imports: [
    CommonModule,
    Toast,
    FormsModule,
    Pagination,
    AdminPageHeader,
    Card,
    AdminTabs,
  ],
  templateUrl: './lost-and-found.html',
  styleUrl: './lost-and-found.css'
})
export class LostAndFound implements OnInit {
  items: LostItem[] = [];
  filteredItems: LostItem[] = [];
  loading = false;
  saving = false;

  // Filters
  searchText = '';
  filterTrangThai = 'Tất cả trạng thái';
  filterTuyenXe = 'Tất cả tuyến xe';
  filterSort = 'Mới nhất';

  /** Tuyến lấy từ DB (tuyen_xe.tentuyen) */
  routesList: string[] = [];

  // Modals
  showCreateModal = false;
  showEditModal = false;
  showSuccessModal = false;
  successMessageTitle = '';
  successMessageBody = '';
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  // Tra cứu theo mã đơn / mã vé
  lookupKeyword = '';
  lookupTicketOptions: TicketInfo[] = [];
  lookupSelectedTicket = '';
  private lookupBase: ApiTicket | null = null;

  // Forms
  newItem: Partial<LostItem> = this.emptyNewItem();
  createFormSubmitted = false;
  phoneTouchedCreate = false;
  emailTouchedCreate = false;
  phoneErrorCreate = '';
  emailErrorCreate = '';

  editingItem: LostItem | null = null;
  private editingOriginal: LostItem | null = null;
  editFormSubmitted = false;
  phoneTouchedEdit = false;
  emailTouchedEdit = false;
  phoneErrorEdit = '';
  emailErrorEdit = '';

  // Pagination: 9 items per page
  itemsPerPage = 9;
  currentPage = 1;

  toastService = inject(ToastService);
  protected readonly toastStack = this.toastService.toasts$;
  protected dismissToast(id: string): void {
    this.toastService.dismissToast(id);
  }
  private readonly api = inject(AccountsApiService);
  cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    void this.loadRoutes();
    void this.loadItems();
  }

  // --- TẢI DỮ LIỆU ---
  async loadItems() {
    this.loading = true;
    try {
      const rows: ApiItem[] = [];
      for (let page = 1; ; page++) {
        const res = await this.api.request<{ items: ApiItem[]; pagination: { totalPages: number } }>(
          `admin/lost-and-found?page=${page}&pageSize=100&sort=newest`, 'GET', undefined, 'admin');
        rows.push(...res.items);
        if (page >= res.pagination.totalPages || !res.items.length) break;
      }
      this.items = rows.map(r => this.toItem(r));
      for (const item of this.items) {
        if (item.tuyen_xe && !this.routesList.includes(item.tuyen_xe)) this.routesList.push(item.tuyen_xe);
      }
      this.filterData(false);
    } catch (error) {
      this.toastService.showError(this.message(error, 'Không tải được danh sách đồ thất lạc.'));
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private async loadRoutes() {
    try {
      const routes = await this.api.request<{ value: string; label: string }[]>('customer/lost-and-found/routes');
      for (const r of routes) if (!this.routesList.includes(r.label)) this.routesList.push(r.label);
    } catch {
      // Không có danh sách tuyến thì lấy theo dữ liệu hồ sơ
    }
  }

  private toItem(r: ApiItem): LostItem {
    return {
      ma_do_that_lac: r.id,
      ma_don_hang: r.orderId,
      ma_ve: r.ticketId ?? '',
      chua_ro_chu: r.type === 'NhanVienNhatDuoc',
      ma_lich_trinh: r.scheduleId,
      ten_khach_hang: r.customerName ?? '',
      so_dien_thoai: r.phone ?? '',
      email: r.email ?? '',
      tuyen_xe: r.route ?? '',
      ngay_di_chuyen: r.travelDate ?? '',
      ngay_bao_mat: r.reportedAt,
      vi_tri_ghe: r.seat,
      ten_vat_pham: r.itemName,
      mo_ta_vat_pham: r.description ?? '',
      vi_tri_tim_thay: r.foundLocation,
      thoi_gian_tim_thay: toLocalInput(r.foundAt),
      vi_tri_luu_tru: r.storageLocation,
      hinh_anh: r.images[0] ?? null,
      anh_goc: r.images,
      hinh_anh_tim_thay: r.foundImages[0] ?? null,
      anh_tim_thay_goc: r.foundImages,
      ghi_chu: r.note,
      trang_thai: STATUS_LABEL[r.status],
      trang_thai_goc: STATUS_LABEL[r.status],
      trang_thai_tiep: r.nextStatuses.map(s => STATUS_LABEL[s]),
      nguoi_ghi_nhan: r.recordedBy,
      yeu_cau_nhan: r.claims,
      so_yeu_cau_cho: r.pendingClaims,
      ngay_tao: r.createdAt,
      ngay_cap_nhat: r.updatedAt,
    };
  }

  // --- DATE FORMATTER (dd/mm/yyyy) ---
  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const str = dateStr.trim();
    if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) return str.slice(0, 10);
    if (str.includes('T') && str.endsWith('Z')) {
      return new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
    }
    const parts = str.split(' ')[0].split('T')[0];
    if (parts.includes('-')) {
      const [year, month, day] = parts.split('-');
      if (year && month && day) return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    return dateStr;
  }

  // --- DATETIME FORMATTER (HH:mm dd/mm/yyyy) ---
  formatDateTime(dateTimeStr: string | null | undefined): string {
    if (!dateTimeStr) return '';
    const d = new Date(dateTimeStr);
    if (Number.isNaN(d.getTime())) return dateTimeStr;
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${time} ${date}`;
  }

  // --- VALIDATION HELPERS ---
  isValidPhone(phone: string): boolean {
    return !!phone && /^0[35789]\d{8}$/.test(phone.trim());
  }

  isValidEmail(email: string): boolean {
    return !!email && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
  }

  // --- CREATE FORM VALIDATION ---
  onBlurPhoneCreate() {
    this.phoneTouchedCreate = true;
    this.validatePhoneCreate();
  }

  onInputPhoneCreate() {
    if (this.phoneTouchedCreate || this.createFormSubmitted) this.validatePhoneCreate();
  }

  /** Khách báo mất cần SĐT liên hệ nếu chưa có mã vé/đơn; đồ nhặt được thì không bắt buộc. */
  validatePhoneCreate() {
    const val = this.newItem.so_dien_thoai?.trim();
    const needPhone = !this.newItem.chua_ro_chu && !this.newItem.ma_ve && !this.newItem.ma_don_hang;
    if (!val) this.phoneErrorCreate = needPhone ? 'Vui lòng nhập số điện thoại hoặc tra cứu mã vé' : '';
    else this.phoneErrorCreate = this.isValidPhone(val) ? '' : 'Số điện thoại không hợp lệ (10 chữ số, đầu 03/05/07/08/09)';
  }

  onBlurEmailCreate() {
    this.emailTouchedCreate = true;
    this.validateEmailCreate();
  }

  onInputEmailCreate() {
    if (this.emailTouchedCreate || this.createFormSubmitted) this.validateEmailCreate();
  }

  validateEmailCreate() {
    const val = this.newItem.email?.trim();
    this.emailErrorCreate = val && !this.isValidEmail(val) ? 'Email không đúng định dạng (ví dụ: name@domain.com)' : '';
  }

  // Thông tin khách của hồ sơ đã tạo lấy từ đơn hàng, không sửa ở đây
  onBlurPhoneEdit() {}
  onInputPhoneEdit() {}
  onBlurEmailEdit() {}
  onInputEmailEdit() {}

  focusFirstError(formType: 'create' | 'edit') {
    setTimeout(() => {
      const prefix = formType;
      const fieldIds = [
        `${prefix}-ten-vat-pham`,
        `${prefix}-ma-lich-trinh`,
        `${prefix}-phone`,
        `${prefix}-email`,
        `${prefix}-vi-tri-tim`,
        `${prefix}-thoi-gian-tim`,
        `${prefix}-luu-tru`,
        `${prefix}-ly-do-dong`,
      ];
      for (const id of fieldIds) {
        const el = document.getElementById(id);
        if (el && (el.classList.contains('border-red') || el.parentElement?.querySelector('.field-error-msg'))) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
    }, 50);
  }

  // --- TRA CỨU MÃ ĐƠN / MÃ VÉ (GET admin/lost-and-found/tickets/:code) ---
  async lookupTicketInCreate() {
    const keyword = this.lookupKeyword.trim().toUpperCase();
    this.lookupTicketOptions = [];
    this.lookupSelectedTicket = '';
    this.lookupBase = null;
    if (!keyword) {
      this.toastService.showError('Vui lòng nhập mã đơn hoặc mã vé để tra cứu (VD: DH001, VE001)');
      return;
    }
    try {
      const info = await this.api.request<ApiTicket>(`admin/lost-and-found/tickets/${encodeURIComponent(keyword)}`, 'GET', undefined, 'admin');
      this.lookupBase = info;
      const options: TicketInfo[] = info.tickets.map(t => ({
        ma_ve: t.id,
        ma_don_hang: info.orderId,
        ten_khach_hang: info.customerName,
        so_dien_thoai: info.phone,
        email: info.email ?? '',
        tuyen_xe: info.route,
        ngay_di_chuyen: info.travelDate,
        vi_tri_ghe: t.seat,
        ma_lich_trinh: info.scheduleId,
      }));
      const exact = info.ticketId ? options.find(t => t.ma_ve === info.ticketId) : options.length === 1 ? options[0] : undefined;
      if (exact) {
        this.applyTicketToNewItem(exact);
        this.toastService.showSuccess(`Đã tìm thấy vé ${exact.ma_ve}. Tự động điền dữ liệu thành công.`);
      } else {
        this.lookupTicketOptions = options;
        this.applySharedInfoToNewItem(options[0]);
        this.toastService.showSuccess(`Đơn ${info.orderId} có ${options.length} vé. Vui lòng chọn vé/ghế liên quan.`);
      }
    } catch (error) {
      this.toastService.showError(this.message(error, `Không tìm thấy dữ liệu cho "${keyword}".`));
    }
    this.cdr.detectChanges();
  }

  private applySharedInfoToNewItem(first: TicketInfo) {
    this.newItem.ma_ve = '';
    this.newItem.vi_tri_ghe = '';
    this.newItem.ma_don_hang = first.ma_don_hang;
    this.newItem.ma_lich_trinh = first.ma_lich_trinh;
    this.newItem.ten_khach_hang = first.ten_khach_hang;
    this.newItem.so_dien_thoai = first.so_dien_thoai;
    this.newItem.email = first.email;
    this.newItem.tuyen_xe = first.tuyen_xe;
    this.newItem.ngay_di_chuyen = first.ngay_di_chuyen;
    this.validatePhoneCreate();
    this.validateEmailCreate();
  }

  onSelectLookupTicket(maVe: string) {
    const ticket = this.lookupTicketOptions.find(t => t.ma_ve === maVe);
    if (ticket) this.applyTicketToNewItem(ticket);
  }

  private applyTicketToNewItem(ticket: TicketInfo) {
    this.applySharedInfoToNewItem(ticket);
    this.newItem.ma_ve = ticket.ma_ve;
    this.newItem.vi_tri_ghe = ticket.vi_tri_ghe;
    this.cdr.detectChanges();
  }

  clearLookup() {
    this.lookupKeyword = '';
    this.lookupTicketOptions = [];
    this.lookupSelectedTicket = '';
    this.lookupBase = null;
    Object.assign(this.newItem, {
      ma_don_hang: '', ma_ve: '', ma_lich_trinh: '', tuyen_xe: '', ngay_di_chuyen: '', vi_tri_ghe: '',
      ten_khach_hang: '', so_dien_thoai: '', email: '',
    });
  }

  onUnknownOwnerChange(mode: 'create' | 'edit') {
    if (mode === 'create' && (this.phoneTouchedCreate || this.createFormSubmitted)) {
      this.validatePhoneCreate();
      this.validateEmailCreate();
    }
    this.cdr.detectChanges();
  }

  // --- STATS GETTERS ---
  get totalItemsCount(): number {
    return this.items.length;
  }
  get activeSearchingCount(): number {
    return this.items.filter(i => i.trang_thai_goc === 'Đang tìm kiếm').length;
  }
  get activeFoundCount(): number {
    return this.items.filter(i => i.trang_thai_goc === 'Đã tìm thấy').length;
  }
  get activeReturnedCount(): number {
    return this.items.filter(i => i.trang_thai_goc === 'Đã trả khách').length;
  }
  get activeClosedCount(): number {
    return this.items.filter(i => i.trang_thai_goc === 'Đóng yêu cầu').length;
  }

  // --- FILTERING & SORTING ---
  filterData(resetPage = true) {
    let result = [...this.items];
    if (resetPage) this.currentPage = 1;

    if (this.filterTrangThai !== 'Tất cả trạng thái') {
      result = result.filter(i => i.trang_thai === this.filterTrangThai);
    }
    if (this.filterTuyenXe !== 'Tất cả tuyến xe') {
      result = result.filter(i => i.tuyen_xe === this.filterTuyenXe);
    }
    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase().trim();
      result = result.filter(i =>
        i.ma_do_that_lac.toLowerCase().includes(search) ||
        (i.ma_don_hang && i.ma_don_hang.toLowerCase().includes(search)) ||
        (i.ma_ve && i.ma_ve.toLowerCase().includes(search)) ||
        i.ten_khach_hang.toLowerCase().includes(search) ||
        i.so_dien_thoai.includes(search) ||
        i.tuyen_xe.toLowerCase().includes(search) ||
        i.ten_vat_pham.toLowerCase().includes(search) ||
        i.mo_ta_vat_pham.toLowerCase().includes(search)
      );
    }

    if (this.filterSort === 'Mới nhất') {
      result.sort((a, b) => b.ngay_bao_mat.localeCompare(a.ngay_bao_mat) || b.ma_do_that_lac.localeCompare(a.ma_do_that_lac));
    } else if (this.filterSort === 'Cũ nhất') {
      result.sort((a, b) => a.ngay_bao_mat.localeCompare(b.ngay_bao_mat) || a.ma_do_that_lac.localeCompare(b.ma_do_that_lac));
    } else if (this.filterSort === 'Theo mô tả A-Z') {
      result.sort((a, b) => a.ten_vat_pham.localeCompare(b.ten_vat_pham, 'vi'));
    } else if (this.filterSort === 'Theo mô tả Z-A') {
      result.sort((a, b) => b.ten_vat_pham.localeCompare(a.ten_vat_pham, 'vi'));
    }

    this.filteredItems = result;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    this.cdr.detectChanges();
  }

  selectTab(status: string) {
    this.filterTrangThai = status;
    this.filterData();
  }

  resetFilters() {
    this.searchText = '';
    this.filterTrangThai = 'Tất cả trạng thái';
    this.filterTuyenXe = 'Tất cả tuyến xe';
    this.filterSort = 'Mới nhất';
    this.filterData();
  }

  // --- PAGINATION ---
  scrollToTop() {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  get totalPages(): number {
    return Math.ceil(this.filteredItems.length / this.itemsPerPage) || 1;
  }

  get paginatedItems(): LostItem[] {
    return this.filteredItems.slice(this.startIndex, this.endIndex);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage;
  }

  get endIndex(): number {
    return Math.min(this.startIndex + this.itemsPerPage, this.filteredItems.length);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.scrollToTop();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.scrollToTop();
    }
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.scrollToTop();
    }
  }

  getPages(): number[] {
    const groupStart = Math.floor((this.currentPage - 1) / 3) * 3 + 1;
    const groupEnd = Math.min(groupStart + 2, this.totalPages);
    return Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i);
  }

  // --- MODALS ---
  private emptyNewItem(): Partial<LostItem> {
    return {
      ma_don_hang: '',
      ma_ve: '',
      ma_lich_trinh: '',
      chua_ro_chu: false,
      ten_vat_pham: '',
      mo_ta_vat_pham: '',
      tuyen_xe: '',
      ngay_di_chuyen: '',
      vi_tri_ghe: '',
      ten_khach_hang: '',
      so_dien_thoai: '',
      email: '',
      vi_tri_tim_thay: '',
      vi_tri_luu_tru: '',
      hinh_anh: '',
      hinh_anh_moi: '',
      ghi_chu: ''
    };
  }

  openCreateModal() {
    this.lookupKeyword = '';
    this.lookupTicketOptions = [];
    this.lookupSelectedTicket = '';
    this.lookupBase = null;
    this.newItem = this.emptyNewItem();
    this.createFormSubmitted = false;
    this.phoneTouchedCreate = false;
    this.emailTouchedCreate = false;
    this.phoneErrorCreate = '';
    this.emailErrorCreate = '';
    this.showCreateModal = true;
    this.cdr.detectChanges();
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.cdr.detectChanges();
  }

  /** Tải ảnh lên server (POST admin/lost-and-found/media), xem trước bằng ảnh cục bộ. */
  async onUploadImage(event: Event, mode: 'create' | 'edit', field: 'lost' | 'found') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      this.toastService.showError('Chỉ nhận ảnh JPG, PNG, WEBP tối đa 5 MB.');
      return;
    }
    const form = new FormData();
    form.append('files', file);
    try {
      const res = await this.api.request<{ urls: string[] }>('admin/lost-and-found/media', 'POST', form, 'admin');
      const url = res.urls[0];
      const preview = URL.createObjectURL(file);
      const target = mode === 'create' ? this.newItem : this.editingItem;
      if (!target) return;
      if (field === 'lost') {
        target.hinh_anh = preview;
        target.hinh_anh_moi = url;
      } else {
        target.hinh_anh_tim_thay = preview;
        target.hinh_anh_tim_thay_moi = url;
      }
    } catch (error) {
      this.toastService.showError(this.message(error, 'Không tải được ảnh lên.'));
    }
    this.cdr.detectChanges();
  }

  removeImage(mode: 'create' | 'edit', field: 'lost' | 'found') {
    const target = mode === 'create' ? this.newItem : this.editingItem;
    if (!target) return;
    if (field === 'lost') {
      target.hinh_anh = '';
      target.hinh_anh_moi = '';
    } else {
      target.hinh_anh_tim_thay = '';
      target.hinh_anh_tim_thay_moi = '';
    }
    this.cdr.detectChanges();
  }

  /** Danh sách ảnh gửi lên server: ảnh đầu có thể đã thay/bỏ, các ảnh sau giữ nguyên. */
  private imageList(display: string | null | undefined, uploaded: string | null | undefined, original: string[] = []): string[] {
    const rest = original.slice(1);
    if (uploaded) return [uploaded, ...rest];
    if (display && !display.startsWith('blob:')) return [display, ...rest];
    return rest;
  }

  async saveNewItem() {
    if (this.saving) return;
    this.createFormSubmitted = true;
    this.phoneTouchedCreate = true;
    this.emailTouchedCreate = true;
    this.validatePhoneCreate();
    this.validateEmailCreate();

    const n = this.newItem;
    const found = !!n.chua_ro_chu;
    const hasBooking = !!(n.ma_ve || n.ma_don_hang);
    let hasError = false;
    if ((n.ten_vat_pham?.trim().length ?? 0) < 3) hasError = true;
    if (found && !hasBooking && !n.ma_lich_trinh?.trim()) hasError = true;
    if (found && !n.vi_tri_luu_tru?.trim()) hasError = true;
    if (this.lookupTicketOptions.length > 1 && !n.ma_ve) hasError = true;
    if (this.phoneErrorCreate || this.emailErrorCreate) hasError = true;

    if (hasError) {
      this.toastService.showError('Vui lòng kiểm tra và điền đầy đủ các thông tin bắt buộc');
      this.focusFirstError('create');
      return;
    }

    const images = this.imageList(n.hinh_anh, n.hinh_anh_moi);
    const body: Record<string, unknown> = {
      type: found ? 'NhanVienNhatDuoc' : 'KhachBaoMat',
      ...(hasBooking ? { bookingCode: n.ma_ve || n.ma_don_hang } : n.ma_lich_trinh?.trim() ? { scheduleId: n.ma_lich_trinh.trim().toUpperCase() } : {}),
      itemName: n.ten_vat_pham!.trim(),
      ...(n.mo_ta_vat_pham?.trim() ? { description: n.mo_ta_vat_pham.trim() } : {}),
      ...(n.ten_khach_hang && n.ten_khach_hang.trim().length >= 2 ? { reporterName: n.ten_khach_hang.trim() } : {}),
      ...(n.so_dien_thoai?.trim() ? { phone: n.so_dien_thoai.trim() } : {}),
      ...(n.email?.trim() ? { email: n.email.trim() } : {}),
      ...(n.vi_tri_ghe?.trim() ? { seat: n.vi_tri_ghe.trim() } : {}),
      ...(images.length ? { images } : {}),
      ...(found && n.vi_tri_tim_thay?.trim() ? { foundLocation: n.vi_tri_tim_thay.trim() } : {}),
      ...(found ? { storageLocation: n.vi_tri_luu_tru!.trim() } : {}),
      ...(n.ghi_chu?.trim() ? { note: n.ghi_chu.trim() } : {}),
    };

    this.saving = true;
    try {
      const created = await this.api.request<ApiItem>('admin/lost-and-found', 'POST', body, 'admin');
      this.closeCreateModal();
      await this.loadItems();
      this.showCenteredSuccess(
        'Tiếp nhận yêu cầu thành công',
        `Hồ sơ ${created.id} đã được tạo với trạng thái '${STATUS_LABEL[created.status]}'.`
      );
    } catch (error) {
      this.toastService.showError(this.message(error, 'Không tạo được hồ sơ.'));
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  async openEditModal(item: LostItem) {
    this.editingItem = { ...item, yeu_cau_nhan: [...item.yeu_cau_nhan], ly_do_dong: '' };
    this.editingOriginal = item;
    this.editFormSubmitted = false;
    this.showEditModal = true;
    this.cdr.detectChanges();
    try {
      const fresh = this.toItem(await this.api.request<ApiItem>(`admin/lost-and-found/${encodeURIComponent(item.ma_do_that_lac)}`, 'GET', undefined, 'admin'));
      if (this.editingItem?.ma_do_that_lac === fresh.ma_do_that_lac) {
        this.editingItem = { ...fresh, ly_do_dong: '' };
        this.editingOriginal = fresh;
      }
    } catch {
      // Dùng dữ liệu đang có trong danh sách
    }
    this.cdr.detectChanges();
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingItem = null;
    this.editingOriginal = null;
    this.cdr.detectChanges();
  }

  /** Trạng thái được chọn: trạng thái hiện tại + các bước kế tiếp hợp lệ. */
  statusOptions(item: LostItem): StatusLabel[] {
    return [item.trang_thai_goc ?? item.trang_thai, ...(item.trang_thai_tiep ?? [])];
  }

  get editLocked(): boolean {
    const s = this.editingOriginal?.trang_thai_goc;
    return s === 'Đã trả khách' || s === 'Đóng yêu cầu';
  }

  onStatusChange() {
    if (this.editingItem && this.editingItem.trang_thai === 'Đã tìm thấy') {
      if (!this.editingItem.thoi_gian_tim_thay) this.editingItem.thoi_gian_tim_thay = toLocalInput(new Date().toISOString());
      if (!this.editingItem.vi_tri_tim_thay) this.editingItem.vi_tri_tim_thay = 'Trên xe khách';
    }
    this.cdr.detectChanges();
  }

  async saveEditItem() {
    const item = this.editingItem;
    const orig = this.editingOriginal;
    if (!item || !orig || this.saving) return;
    this.editFormSubmitted = true;

    const toFound = item.trang_thai === 'Đã tìm thấy' && orig.trang_thai_goc !== 'Đã tìm thấy';
    const toClose = item.trang_thai === 'Đóng yêu cầu' && orig.trang_thai_goc !== 'Đóng yêu cầu';
    let hasError = false;
    if (!this.editLocked && (item.ten_vat_pham?.trim().length ?? 0) < 3) hasError = true;
    if (toFound && (!item.vi_tri_tim_thay?.trim() || !item.thoi_gian_tim_thay || !item.vi_tri_luu_tru?.trim())) hasError = true;
    if (toClose && !item.ly_do_dong?.trim()) hasError = true;
    if (hasError) {
      this.toastService.showError('Vui lòng kiểm tra và điền đầy đủ các thông tin bắt buộc');
      this.focusFirstError('edit');
      return;
    }

    const id = encodeURIComponent(item.ma_do_that_lac);
    this.saving = true;
    try {
      // 1) Sửa thông tin mô tả / tìm thấy (chỉ khi hồ sơ chưa kết thúc và có thay đổi)
      if (!this.editLocked) {
        const changes: Record<string, unknown> = {};
        const str = (v: string | null | undefined) => (v ?? '').trim();
        if (str(item.ten_vat_pham) !== str(orig.ten_vat_pham)) changes['itemName'] = str(item.ten_vat_pham);
        if (str(item.mo_ta_vat_pham) !== str(orig.mo_ta_vat_pham)) changes['description'] = str(item.mo_ta_vat_pham);
        if (str(item.vi_tri_ghe) !== str(orig.vi_tri_ghe)) changes['seat'] = str(item.vi_tri_ghe);
        if (str(item.ghi_chu) !== str(orig.ghi_chu)) changes['note'] = str(item.ghi_chu);
        const images = this.imageList(item.hinh_anh, item.hinh_anh_moi, orig.anh_goc);
        if (JSON.stringify(images) !== JSON.stringify(orig.anh_goc ?? [])) changes['images'] = images;
        if (!toFound) {
          if (str(item.vi_tri_tim_thay) !== str(orig.vi_tri_tim_thay)) changes['foundLocation'] = str(item.vi_tri_tim_thay);
          if (str(item.vi_tri_luu_tru) !== str(orig.vi_tri_luu_tru)) changes['storageLocation'] = str(item.vi_tri_luu_tru);
          if (item.thoi_gian_tim_thay && item.thoi_gian_tim_thay !== orig.thoi_gian_tim_thay)
            changes['foundAt'] = new Date(item.thoi_gian_tim_thay).toISOString();
          const foundImages = this.imageList(item.hinh_anh_tim_thay, item.hinh_anh_tim_thay_moi, orig.anh_tim_thay_goc);
          if (JSON.stringify(foundImages) !== JSON.stringify(orig.anh_tim_thay_goc ?? [])) changes['foundImages'] = foundImages;
        }
        if (Object.keys(changes).length) await this.api.request(`admin/lost-and-found/${id}`, 'PATCH', changes, 'admin');
      }

      // 2) Đổi trạng thái theo luồng
      if (item.trang_thai !== orig.trang_thai_goc) {
        const body: Record<string, unknown> = { status: STATUS_CODE[item.trang_thai] };
        if (toFound) {
          body['foundLocation'] = item.vi_tri_tim_thay!.trim();
          body['storageLocation'] = item.vi_tri_luu_tru!.trim();
          body['foundAt'] = new Date(item.thoi_gian_tim_thay!).toISOString();
          const foundImages = this.imageList(item.hinh_anh_tim_thay, item.hinh_anh_tim_thay_moi, orig.anh_tim_thay_goc);
          if (foundImages.length) body['foundImages'] = foundImages;
        }
        if (toClose) body['note'] = item.ly_do_dong!.trim();
        await this.api.request(`admin/lost-and-found/${id}/status`, 'PATCH', body, 'admin');
      }

      const code = item.ma_do_that_lac;
      this.closeEditModal();
      await this.loadItems();
      this.showCenteredSuccess('Cập nhật thông tin thành công', `Hồ sơ ${code} đã được lưu vào hệ thống.`);
    } catch (error) {
      this.toastService.showError(this.message(error, 'Không lưu được thay đổi.'));
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  /** Xác nhận / từ chối yêu cầu nhận đồ (PATCH admin/lost-and-found/claims/:id). */
  async decideClaim(claim: LostClaim, decision: 'approve' | 'reject') {
    let note: string | undefined;
    if (decision === 'reject') {
      note = window.prompt('Lý do từ chối yêu cầu nhận đồ:')?.trim();
      if (!note) return;
    }
    try {
      const updated = await this.api.request<ApiItem>(`admin/lost-and-found/claims/${encodeURIComponent(claim.id)}`, 'PATCH',
        { decision, ...(note ? { note } : {}) }, 'admin');
      const fresh = this.toItem(updated);
      this.editingItem = { ...fresh, ly_do_dong: '' };
      this.editingOriginal = fresh;
      this.toastService.showSuccess(decision === 'approve' ? `Đã xác nhận yêu cầu ${claim.id}.` : `Đã từ chối yêu cầu ${claim.id}.`);
      void this.loadItems();
    } catch (error) {
      this.toastService.showError(this.message(error, 'Không xử lý được yêu cầu nhận đồ.'));
    }
    this.cdr.detectChanges();
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    if (this.successTimer) {
      clearTimeout(this.successTimer);
      this.successTimer = null;
    }
    this.cdr.detectChanges();
  }

  private showCenteredSuccess(title: string, body: string) {
    this.successMessageTitle = title;
    this.successMessageBody = body;
    this.showSuccessModal = true;
    this.cdr.detectChanges();
    if (this.successTimer) clearTimeout(this.successTimer);
    this.successTimer = setTimeout(() => this.closeSuccessModal(), 2000);
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
  }
}
