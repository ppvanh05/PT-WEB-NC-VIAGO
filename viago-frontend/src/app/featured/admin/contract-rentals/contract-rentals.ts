import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { AdminPageHeader } from '../../../shared/components/admin-page-header/admin-page-header';
import { AdminTabs } from '../../../shared/components/admin-tabs/admin-tabs';
import { AccountsApiService } from '../../../core/services/accounts-api.service';
import { Toast } from '../../../shared/components/toast/toast';
import { ToastService } from '../../../core/services/toast.service';

type MainTab = 'request' | 'quote' | 'contract';
type QuoteSubTab = 'standard' | 'customer';
type DrawerType = 'request' | 'quote' | 'contract' | 'price' | null;
type PageKey = 'request' | 'standard' | 'customer' | 'contract';
type Unit = 'Chuyen' | 'Ngay' | 'Gio';

interface Estimate { unitPrice: number; unit: Unit; units: number; basePrice: number; surcharge: number; discount: number; total: number }

/** GET admin/contract-rentals/requests (yeu_cau_thue_xe) */
interface RequestItem {
  code: string;
  customer: string;
  phone: string;
  email: string | null;
  vehicleTypeId: string;
  vehicleType: string;
  rentalType: 'CoTaiXe' | 'TuLai';
  guests: number;
  vehicles: number;
  pickup: string;
  destination: string;
  departure: string;
  returnAt: string | null;
  preferredDriver: { id: string; name: string } | null;
  promoCode: string | null;
  estimate: Estimate;
  note: string | null;
  status: string;
  statusLabel: string;
  cancelReason: string | null;
  createdAt: string;
  latestQuote: { code: string; version: number; statusLabel: string; total: number } | null;
  canQuote: boolean;
  history?: { id: string; content: string; by: string; at: string }[];
}

interface PriceCell { id: string; price: number; unit: Unit; status: 'DangApDung' | 'NgungApDung'; surchargeNote: string | null }
interface StandardPriceItem {
  vehicleTypeId: string;
  vehicleType: string;
  seats: number;
  inland: PriceCell | null;
  intercity: PriceCell | null;
  daily: PriceCell | null;
  status: 'DangApDung' | 'NgungApDung';
}

/** GET admin/contract-rentals/quotes (bao_gia_thue_xe) */
interface QuoteItem {
  code: string;
  requestCode: string;
  version: number;
  customer: string;
  phone: string;
  email: string | null;
  vehicleType: string;
  rentalType: string;
  vehicles: number;
  guests: number;
  pickup: string;
  destination: string;
  departure: string;
  unitPrice: number;
  unit: Unit;
  units: number;
  basePrice: number;
  fees: number;
  discount: number;
  total: number;
  deposit: number;
  promoCode: string | null;
  terms: string | null;
  status: string;
  statusLabel: string;
  rejectReason: string | null;
  salesStaff: string;
  createdAt: string;
  sentAt: string | null;
  expiresAt: string | null;
  contract: { code: string; status: string } | null;
  canCreateContract: boolean;
}

/** GET admin/contract-rentals/contracts (hop_dong_thue_xe) */
interface ContractItem {
  code: string;
  quoteCode: string;
  requestCode: string;
  customer: string;
  phone: string;
  email: string | null;
  vehicleType: string;
  rentalType: string;
  vehicles: number;
  guests: number;
  pickup: string;
  destination: string;
  startAt: string;
  endAt: string;
  price: number;
  fees: number;
  discount: number;
  total: number;
  depositRequired: number;
  depositPaid: number;
  paid: number;
  remaining: number;
  status: string;
  statusLabel: string;
  staffInCharge: { id: string; name: string };
  terms: string[];
  cancelReason: string | null;
  createdAt: string;
  signedAt: string | null;
  payments: { id: string; type: string; method: string; amount: number; status: string; content: string | null; collectedBy: string | null; paidAt: string | null }[];
  assignments: { vehicleId: string; vehicleName: string; plateNumber: string; driverId: string | null; driverName: string | null; note: string | null }[];
  cancellationFeeRateIfCancelledNow: number | null;
  nextActions: { collectDeposit: boolean; collectRemaining: boolean; assign: boolean; start: boolean; complete: boolean; cancel: boolean };
}

interface AssignmentOptions {
  vehiclesNeeded: number;
  needDriver: boolean;
  preferredDriverId: string | null;
  vehicles: { id: string; name: string; plateNumber: string; available: boolean }[];
  drivers: { id: string; name: string; licenseClass: string; available: boolean }[];
}

interface Page<T> { items: T[]; pagination: { totalPages: number } }

const UNIT_LABEL: Record<string, string> = { Chuyen: 'chuyến', Ngay: 'ngày', Gio: 'giờ' };
const PAYMENT_TYPE_LABEL: Record<string, string> = { TienCoc: 'Tiền cọc', ThanhToanConLai: 'Thanh toán còn lại', PhatSinh: 'Phát sinh' };
const METHOD_LABEL: Record<string, string> = {
  TIEN_MAT: 'Tiền mặt', CHUYEN_KHOAN: 'Chuyển khoản', VIETQR: 'VietQR', VNPAY: 'VNPay', MOMO: 'MoMo', ZALOPAY: 'ZaloPay', THE: 'Thẻ',
};

@Component({
  selector: 'app-contract-rentals',
  standalone: true,
  imports: [
    CommonModule,
    Toast,
    FormsModule,
    Pagination,
    AdminPageHeader,
    AdminTabs,
  ],
  templateUrl: './contract-rentals.html',
  styleUrls: ['./contract-rentals.css'],
})
export class ContractRentalsComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly accountsApi = inject(AccountsApiService);
  /** App chạy không có zone.js: gọi API xong thì báo Angular vẽ lại giao diện. */
  private readonly api = {
    request: <T>(...args: Parameters<AccountsApiService['request']>): Promise<T> =>
      this.accountsApi.request<T>(...args).finally(() => this.cdr.markForCheck()),
  };
  private readonly toast = inject(ToastService);
  protected readonly toastStack = this.toast.toasts$;
  protected dismissToast(id: string): void {
    this.toast.dismissToast(id);
  }

  // Tabs State
  activeMainTab: MainTab = 'request';
  activeQuoteSubTab: QuoteSubTab = 'standard';
  pageSize = 10;
  currentPages: Record<PageKey, number> = { request: 1, standard: 1, customer: 1, contract: 1 };

  loading = false;
  busy = false;

  // Filters State
  requestSearch = '';
  requestTypeFilter = 'Tất cả loại xe';
  requestStatusFilter = 'Tất cả trạng thái';
  requestDateFilter = '';

  standardPriceSearch = '';
  standardPriceStatus = 'Tất cả';

  customerQuoteSearch = '';
  customerQuoteStatus = 'Tất cả';

  contractSearch = '';
  contractStatus = 'Tất cả';
  contractDateFilter = '';

  // Drawer State
  activeDrawer: DrawerType = null;
  selectedItem: any = null;

  // Dữ liệu từ DB
  requests: RequestItem[] = [];
  standardPrices: StandardPriceItem[] = [];
  customerQuotes: QuoteItem[] = [];
  contracts: ContractItem[] = [];
  vehicleTypeNames: string[] = [];

  readonly requestStatuses = ['Chờ báo giá', 'Đã báo giá', 'Đồng ý', 'Từ chối', 'Đã hủy'];
  readonly quoteStatuses = ['Chờ khách duyệt', 'Đã chấp nhận', 'Đã từ chối', 'Hết hiệu lực', 'Đã hủy'];
  readonly contractStatuses = ['Mới tạo', 'Đã ký', 'Đã cọc', 'Đang thực hiện', 'Hoàn thành', 'Đã hủy'];
  readonly paymentMethods = Object.entries(METHOD_LABEL).map(([value, label]) => ({ value, label }));

  // Form lập báo giá
  quoteForm = { scope: 'LienTinh', surcharge: 0, promoCode: '', depositRate: 30, validDays: 3, terms: '' };
  // Form sửa bảng giá
  priceForm = { inland: 0, intercity: 0, daily: 0, status: 'DangApDung' as 'DangApDung' | 'NgungApDung', surchargeNote: '' };
  // Form thu tiền
  paymentForm = { open: false, type: 'TienCoc' as 'TienCoc' | 'ThanhToanConLai' | 'PhatSinh', method: 'CHUYEN_KHOAN', amount: 0, note: '' };
  // Phân công xe
  assignOptions: AssignmentOptions | null = null;
  assignForm: { vehicleId: string; driverId: string }[] = [];

  ngOnInit(): void {
    void this.loadAll();
  }

  // ─── TẢI DỮ LIỆU ─────────────────────────────────────────────────────────

  async loadAll(): Promise<void> {
    this.loading = true;
    try {
      const [requests, prices, quotes, contracts, types] = await Promise.all([
        this.loadPages<RequestItem>('admin/contract-rentals/requests'),
        this.get<StandardPriceItem[]>('admin/contract-rentals/price-list'),
        this.loadPages<QuoteItem>('admin/contract-rentals/quotes'),
        this.loadPages<ContractItem>('admin/contract-rentals/contracts'),
        this.get<{ name: string }[]>('admin/contract-rentals/vehicle-types'),
      ]);
      this.requests = requests;
      this.standardPrices = prices;
      this.customerQuotes = quotes;
      this.contracts = contracts;
      this.vehicleTypeNames = types.map(t => t.name);
    } catch (error) {
      this.toast.showError(this.message(error, 'Không tải được dữ liệu thuê xe hợp đồng.'));
    } finally {
      this.loading = false;
    }
  }

  private async loadPages<T>(path: string): Promise<T[]> {
    const rows: T[] = [];
    for (let page = 1; ; page++) {
      const res = await this.get<Page<T>>(`${path}?page=${page}&pageSize=100`);
      rows.push(...res.items);
      if (page >= res.pagination.totalPages || !res.items.length) return rows;
    }
  }

  private get<T>(path: string): Promise<T> {
    return this.api.request<T>(path, 'GET', undefined, 'admin');
  }

  private send<T>(path: string, method: 'POST' | 'PATCH' | 'PUT', body: unknown): Promise<T> {
    return this.api.request<T>(path, method, body, 'admin');
  }

  // ─── STATS ───────────────────────────────────────────────────────────────
  get pendingRequestCount() { return this.requests.filter(r => r.status === 'ChoBaoGia').length; }
  get pendingQuoteCount() { return this.customerQuotes.filter(q => q.status === 'ChoKhachDuyet').length; }
  get activeContractCount() { return this.contracts.filter(c => c.status === 'DangThucHien').length; }

  // ─── FILTER ──────────────────────────────────────────────────────────────
  get filteredRequests() {
    const s = this.requestSearch.toLowerCase().trim();
    return this.requests.filter(r =>
      (r.code.toLowerCase().includes(s) || r.customer.toLowerCase().includes(s) || r.phone.includes(s)) &&
      (this.requestTypeFilter === 'Tất cả loại xe' || r.vehicleType === this.requestTypeFilter) &&
      (this.requestStatusFilter === 'Tất cả trạng thái' || r.statusLabel === this.requestStatusFilter) &&
      (!this.requestDateFilter || r.departure.slice(0, 10) === this.requestDateFilter)
    );
  }

  get filteredStandardPrices() {
    const s = this.standardPriceSearch.toLowerCase().trim();
    return this.standardPrices.filter(p =>
      p.vehicleType.toLowerCase().includes(s) &&
      (this.standardPriceStatus === 'Tất cả' || this.priceStatusLabel(p.status) === this.standardPriceStatus)
    );
  }

  get filteredCustomerQuotes() {
    const s = this.customerQuoteSearch.toLowerCase().trim();
    return this.customerQuotes.filter(q =>
      (q.code.toLowerCase().includes(s) || q.requestCode.toLowerCase().includes(s) || q.customer.toLowerCase().includes(s)) &&
      (this.customerQuoteStatus === 'Tất cả' || q.statusLabel === this.customerQuoteStatus)
    );
  }

  get filteredContracts() {
    const s = this.contractSearch.toLowerCase().trim();
    return this.contracts.filter(c =>
      (c.code.toLowerCase().includes(s) || c.customer.toLowerCase().includes(s) || c.phone.includes(s)) &&
      (this.contractStatus === 'Tất cả' || c.statusLabel === this.contractStatus) &&
      (!this.contractDateFilter || c.startAt.slice(0, 10) === this.contractDateFilter)
    );
  }

  get paginatedRequests() { return this.paginateItems(this.filteredRequests); }
  get paginatedStandardPrices() { return this.paginateItems(this.filteredStandardPrices); }
  get paginatedCustomerQuotes() { return this.paginateItems(this.filteredCustomerQuotes); }
  get paginatedContracts() { return this.paginateItems(this.filteredContracts); }

  get currentPage(): number { return this.currentPages[this.activePageKey]; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.activeTotalItems / this.pageSize)); }
  get activeTotalItems(): number { return this.getActiveFilteredItems().length; }
  get visibleStart(): number { return this.activeTotalItems > 0 ? (this.currentPage - 1) * this.pageSize + 1 : 0; }
  get visibleEnd(): number { return Math.min(this.currentPage * this.pageSize, this.activeTotalItems); }

  get activeListLabel(): string {
    if (this.activeMainTab === 'request') return 'yêu cầu';
    if (this.activeMainTab === 'quote' && this.activeQuoteSubTab === 'standard') return 'bảng giá';
    if (this.activeMainTab === 'quote') return 'báo giá';
    return 'hợp đồng';
  }

  setPage(page: number | string) {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPages[this.activePageKey] = page;
    }
  }

  resetActivePagination() {
    this.currentPages[this.activePageKey] = 1;
  }

  setTab(tab: MainTab) {
    this.activeMainTab = tab;
    this.resetActivePagination();
    this.closeDrawer();
  }

  setSubTab(tab: QuoteSubTab) {
    this.activeQuoteSubTab = tab;
    this.resetActivePagination();
  }

  isTableEmpty(): boolean {
    return !this.loading && this.getActiveFilteredItems().length === 0;
  }

  refreshFilters() {
    this.requestSearch = '';
    this.requestTypeFilter = 'Tất cả loại xe';
    this.requestStatusFilter = 'Tất cả trạng thái';
    this.requestDateFilter = '';
    this.standardPriceSearch = '';
    this.standardPriceStatus = 'Tất cả';
    this.customerQuoteSearch = '';
    this.customerQuoteStatus = 'Tất cả';
    this.contractSearch = '';
    this.contractStatus = 'Tất cả';
    this.contractDateFilter = '';
    this.currentPages = { request: 1, standard: 1, customer: 1, contract: 1 };
  }

  /** Nút hành động đầu trang: mở mục cần xử lý tiếp theo. */
  openCreateAction() {
    if (this.activeMainTab === 'request') {
      const next = this.requests.find(r => r.canQuote) ?? this.filteredRequests[0];
      if (next) void this.viewDetail(next, 'request');
      else this.toast.showSuccess('Không có yêu cầu nào đang chờ báo giá.');
      return;
    }
    if (this.activeMainTab === 'quote') {
      this.activeQuoteSubTab = 'customer';
      const next = this.customerQuotes.find(q => q.canCreateContract || q.status === 'ChoKhachDuyet') ?? this.filteredCustomerQuotes[0];
      if (next) void this.viewDetail(next, 'quote');
      return;
    }
    const next = this.contracts.find(c => Object.values(c.nextActions).some(Boolean)) ?? this.filteredContracts[0];
    if (next) void this.viewDetail(next, 'contract');
  }

  // ─── DRAWER ──────────────────────────────────────────────────────────────

  async viewDetail(item: any, type: DrawerType) {
    this.selectedItem = item;
    this.activeDrawer = type;
    this.paymentForm.open = false;
    this.assignOptions = null;
    try {
      if (type === 'request') {
        const detail = await this.get<RequestItem>(`admin/contract-rentals/requests/${encodeURIComponent(item.code)}`);
        this.selectedItem = detail;
        this.quoteForm = {
          scope: detail.rentalType === 'TuLai' ? 'TheoNgay' : 'LienTinh',
          surcharge: 0,
          promoCode: detail.promoCode ?? '',
          depositRate: 30,
          validDays: 3,
          terms: '',
        };
      } else if (type === 'quote') {
        this.selectedItem = await this.get<QuoteItem>(`admin/contract-rentals/quotes/${encodeURIComponent(item.code)}`);
      } else if (type === 'contract') {
        this.selectedItem = await this.get<ContractItem>(`admin/contract-rentals/contracts/${encodeURIComponent(item.code)}`);
      }
    } catch (error) {
      this.toast.showError(this.message(error, 'Không tải được chi tiết.'));
    }
  }

  editPrice(item: StandardPriceItem) {
    this.selectedItem = item;
    this.activeDrawer = 'price';
    this.priceForm = {
      inland: item.inland?.price ?? 0,
      intercity: item.intercity?.price ?? 0,
      daily: item.daily?.price ?? 0,
      status: item.status,
      surchargeNote: item.inland?.surchargeNote ?? item.intercity?.surchargeNote ?? item.daily?.surchargeNote ?? '',
    };
  }

  closeDrawer() {
    this.activeDrawer = null;
    this.selectedItem = null;
    this.paymentForm.open = false;
    this.assignOptions = null;
  }

  private async run(action: () => Promise<void>, success: string) {
    if (this.busy) return;
    this.busy = true;
    try {
      await action();
      this.toast.showSuccess(success);
    } catch (error) {
      this.toast.showError(this.message(error, 'Thao tác không thành công.'));
    } finally {
      this.busy = false;
    }
  }

  // ─── YÊU CẦU → BÁO GIÁ ───────────────────────────────────────────────────

  createQuoteFromRequest(request: RequestItem) {
    if (!request?.canQuote) return;
    const f = this.quoteForm;
    void this.run(async () => {
      const quote = await this.send<QuoteItem>(`admin/contract-rentals/requests/${encodeURIComponent(request.code)}/quotes`, 'POST', {
        scope: f.scope,
        surcharge: Number(f.surcharge) || 0,
        promoCode: f.promoCode.trim(),
        depositRate: Math.min(100, Math.max(0, Number(f.depositRate) || 0)) / 100,
        validDays: Number(f.validDays) || 3,
        ...(f.terms.trim() ? { terms: f.terms.trim() } : {}),
      });
      await this.loadAll();
      this.activeMainTab = 'quote';
      this.activeQuoteSubTab = 'customer';
      await this.viewDetail(quote, 'quote');
    }, 'Đã lập và gửi báo giá cho khách.');
  }

  cancelRequest(request: RequestItem) {
    const reason = window.prompt('Lý do hủy yêu cầu (tối thiểu 5 ký tự):')?.trim();
    if (!reason) return;
    void this.run(async () => {
      await this.send(`admin/contract-rentals/requests/${encodeURIComponent(request.code)}/cancel`, 'PATCH', { reason });
      await this.loadAll();
      await this.viewDetail(request, 'request');
    }, 'Đã hủy yêu cầu.');
  }

  // ─── BÁO GIÁ → HỢP ĐỒNG ──────────────────────────────────────────────────

  decideQuote(quote: QuoteItem, decision: 'accept' | 'reject') {
    let reason: string | undefined;
    if (decision === 'reject') {
      reason = window.prompt('Lý do khách từ chối (không bắt buộc):')?.trim() || undefined;
    }
    void this.run(async () => {
      await this.send(`admin/contract-rentals/quotes/${encodeURIComponent(quote.code)}/decision`, 'PATCH', { decision, ...(reason ? { reason } : {}) });
      await this.loadAll();
      await this.viewDetail(quote, 'quote');
    }, decision === 'accept' ? 'Đã ghi nhận khách đồng ý báo giá.' : 'Đã ghi nhận khách từ chối báo giá.');
  }

  convertQuoteToContract(quote: QuoteItem) {
    if (!quote?.canCreateContract) return;
    void this.run(async () => {
      const contract = await this.send<ContractItem>(`admin/contract-rentals/quotes/${encodeURIComponent(quote.code)}/contract`, 'POST', {});
      await this.loadAll();
      this.activeMainTab = 'contract';
      await this.viewDetail(contract, 'contract');
    }, 'Đã lập hợp đồng từ báo giá.');
  }

  // ─── HỢP ĐỒNG ────────────────────────────────────────────────────────────

  openPayment(contract: ContractItem, type: 'TienCoc' | 'ThanhToanConLai') {
    this.paymentForm = {
      open: true,
      type,
      method: 'CHUYEN_KHOAN',
      amount: type === 'TienCoc' ? Math.max(0, contract.depositRequired - contract.depositPaid) : contract.remaining,
      note: '',
    };
  }

  submitPayment(contract: ContractItem) {
    const f = this.paymentForm;
    if (!(Number(f.amount) >= 1000)) {
      this.toast.showError('Số tiền tối thiểu 1.000đ.');
      return;
    }
    void this.run(async () => {
      await this.send(`admin/contract-rentals/contracts/${encodeURIComponent(contract.code)}/payments`, 'POST', {
        type: f.type, method: f.method, amount: Number(f.amount), ...(f.note.trim() ? { note: f.note.trim() } : {}),
      });
      this.paymentForm.open = false;
      await this.loadAll();
      await this.viewDetail(contract, 'contract');
    }, 'Đã ghi nhận thanh toán.');
  }

  async openAssign(contract: ContractItem) {
    try {
      const options = await this.get<AssignmentOptions>(`admin/contract-rentals/contracts/${encodeURIComponent(contract.code)}/assignment-options`);
      this.assignOptions = options;
      this.assignForm = Array.from({ length: options.vehiclesNeeded }, (_, i) => ({
        vehicleId: contract.assignments[i]?.vehicleId ?? '',
        driverId: contract.assignments[i]?.driverId ?? (i === 0 ? options.preferredDriverId ?? '' : ''),
      }));
    } catch (error) {
      this.toast.showError(this.message(error, 'Không tải được danh sách xe/tài xế.'));
    }
  }

  submitAssign(contract: ContractItem) {
    const opt = this.assignOptions;
    if (!opt) return;
    if (this.assignForm.some(a => !a.vehicleId) || (opt.needDriver && this.assignForm.some(a => !a.driverId))) {
      this.toast.showError(opt.needDriver ? 'Chọn đủ xe và tài xế cho từng xe.' : 'Chọn đủ xe.');
      return;
    }
    void this.run(async () => {
      await this.send(`admin/contract-rentals/contracts/${encodeURIComponent(contract.code)}/assignments`, 'PUT', {
        items: this.assignForm.map(a => ({ vehicleId: a.vehicleId, ...(a.driverId ? { driverId: a.driverId } : {}) })),
      });
      this.assignOptions = null;
      await this.loadAll();
      await this.viewDetail(contract, 'contract');
    }, 'Đã phân công xe.');
  }

  updateContractStatus(contract: ContractItem, status: 'DangThucHien' | 'HoanThanh' | 'DaHuy') {
    let reason: string | undefined;
    if (status === 'DaHuy') {
      const rate = contract.cancellationFeeRateIfCancelledNow;
      reason = window.prompt(`Lý do hủy hợp đồng${rate != null ? ` (phí hủy hiện tại ${Math.round(rate * 100)}% tiền cọc)` : ''}:`)?.trim();
      if (!reason) return;
    }
    const label = status === 'DangThucHien' ? 'Đã bắt đầu thực hiện hợp đồng.' : status === 'HoanThanh' ? 'Đã hoàn thành hợp đồng.' : 'Đã hủy hợp đồng.';
    void this.run(async () => {
      await this.send(`admin/contract-rentals/contracts/${encodeURIComponent(contract.code)}/status`, 'PATCH', { status, ...(reason ? { reason } : {}) });
      await this.loadAll();
      await this.viewDetail(contract, 'contract');
    }, label);
  }

  // ─── BẢNG GIÁ CHUẨN ──────────────────────────────────────────────────────

  savePrice(item: StandardPriceItem) {
    const f = this.priceForm;
    const cells: [PriceCell | null, number][] = [[item.inland, f.inland], [item.intercity, f.intercity], [item.daily, f.daily]];
    const note = f.surchargeNote.trim();
    void this.run(async () => {
      for (const [cell, price] of cells) {
        if (!cell) continue;
        const body: Record<string, unknown> = {};
        if (Number(price) !== cell.price) body['price'] = Number(price);
        if (f.status !== cell.status) body['status'] = f.status;
        if (note !== (cell.surchargeNote ?? '')) body['surchargeNote'] = note;
        if (Object.keys(body).length) await this.send(`admin/contract-rentals/price-list/${encodeURIComponent(cell.id)}`, 'PATCH', body);
      }
      await this.loadAll();
      this.closeDrawer();
    }, 'Đã cập nhật bảng giá.');
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────

  money(value: number | null | undefined): string {
    return `${Math.round(Number(value) || 0).toLocaleString('vi-VN')}đ`;
  }

  priceText(cell: PriceCell | null): string {
    return cell ? `${this.money(cell.price)}/${UNIT_LABEL[cell.unit] ?? cell.unit}` : '—';
  }

  priceStatusLabel(status: string): string {
    return status === 'DangApDung' ? 'Đang áp dụng' : 'Ngưng áp dụng';
  }

  unitLabel(unit: string): string {
    return UNIT_LABEL[unit] ?? unit;
  }

  paymentTypeLabel(type: string): string {
    return PAYMENT_TYPE_LABEL[type] ?? type;
  }

  methodLabel(method: string): string {
    return METHOD_LABEL[method] ?? method;
  }

  rentalTypeLabel(type: string): string {
    return type === 'TuLai' ? 'Tự lái' : 'Có tài xế';
  }

  date(iso: string | null | undefined): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
  }

  dateTime(iso: string | null | undefined): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  private get activePageKey(): PageKey {
    if (this.activeMainTab === 'quote') {
      return this.activeQuoteSubTab === 'standard' ? 'standard' : 'customer';
    }
    return this.activeMainTab;
  }

  private getActiveFilteredItems(): unknown[] {
    if (this.activeMainTab === 'request') return this.filteredRequests;
    if (this.activeMainTab === 'quote') {
      return this.activeQuoteSubTab === 'standard' ? this.filteredStandardPrices : this.filteredCustomerQuotes;
    }
    return this.filteredContracts;
  }

  private paginateItems<T>(items: T[]): T[] {
    const totalPages = Math.max(1, Math.ceil(items.length / this.pageSize));
    const key = this.activePageKey;
    const safePage = Math.min(Math.max(this.currentPages[key], 1), totalPages);
    this.currentPages[key] = safePage;
    const startIndex = (safePage - 1) * this.pageSize;
    return items.slice(startIndex, startIndex + this.pageSize);
  }
}
