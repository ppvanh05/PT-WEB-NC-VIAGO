import { TestBed } from '@angular/core/testing';
import { AccountsApiService } from '../../../core/services/accounts-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ContractRentalsComponent } from './contract-rentals';

const request = (over: Record<string, unknown> = {}) => ({
  code: 'YC001',
  customer: 'Nguyễn Văn An',
  phone: '0912345678',
  email: null,
  vehicleTypeId: 'LX001',
  vehicleType: 'Giường nằm 34 chỗ',
  rentalType: 'CoTaiXe',
  guests: 30,
  vehicles: 1,
  pickup: 'TP.HCM',
  destination: 'Đà Lạt',
  departure: '2026-07-10T06:00:00.000Z',
  returnAt: null,
  preferredDriver: null,
  promoCode: null,
  estimate: {},
  note: null,
  status: 'ChoBaoGia',
  statusLabel: 'Chờ báo giá',
  cancelReason: null,
  createdAt: '2026-06-20T06:00:00.000Z',
  latestQuote: null,
  canQuote: true,
  ...over,
});

const contract = (over: Record<string, unknown> = {}) => ({
  code: 'HD001',
  quoteCode: 'BG001',
  requestCode: 'YC001',
  customer: 'Nguyễn Văn An',
  phone: '0912345678',
  email: null,
  vehicleType: 'Giường nằm 34 chỗ',
  rentalType: 'Có tài xế',
  vehicles: 1,
  guests: 30,
  pickup: 'TP.HCM',
  destination: 'Đà Lạt',
  startAt: '2026-07-10T06:00:00.000Z',
  endAt: '2026-07-12T06:00:00.000Z',
  price: 20000000,
  fees: 0,
  discount: 0,
  total: 20000000,
  depositRequired: 5000000,
  depositPaid: 5000000,
  paid: 5000000,
  remaining: 15000000,
  status: 'DaKy',
  statusLabel: 'Đã ký',
  staffInCharge: { id: 'NV001', name: 'Nguyễn Minh Quân' },
  terms: [],
  cancelReason: null,
  createdAt: '2026-06-21T06:00:00.000Z',
  signedAt: '2026-06-22T06:00:00.000Z',
  payments: [],
  ...over,
});

function build() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ContractRentalsComponent],
    providers: [
      { provide: AccountsApiService, useValue: { request: async () => ({ items: [], pagination: { totalPages: 1 } }) } },
      { provide: ToastService, useValue: { showError: () => {}, showSuccess: () => {} } },
    ],
  });
  return TestBed.createComponent(ContractRentalsComponent).componentInstance;
}

describe('Admin contract rentals screen', () => {
  it('searches requests by code, customer or phone and combines the vehicle filter', () => {
    const page = build();
    page.requests = [
      request({ code: 'YC001', customer: 'Nguyễn Văn An', phone: '0912345678' }),
      request({ code: 'YC002', customer: 'Trần Thị Bình', phone: '0987654321',
        vehicleType: 'Limousine 22 phòng' }),
    ] as never;
    page.requestSearch = 'trần thị';
    expect(page.filteredRequests.map(r => r.code)).toEqual(['YC002']);
    page.requestSearch = '0912345678';
    expect(page.filteredRequests.map(r => r.code)).toEqual(['YC001']);
    page.requestSearch = '';
    page.requestTypeFilter = 'Limousine 22 phòng';
    expect(page.filteredRequests.map(r => r.code)).toEqual(['YC002']);
  });

  it('filters requests by departure day', () => {
    const page = build();
    page.requests = [
      request({ code: 'YC001', departure: '2026-07-10T06:00:00.000Z' }),
      request({ code: 'YC002', departure: '2026-08-01T06:00:00.000Z' }),
    ] as never;
    page.requestDateFilter = '2026-08-01';
    expect(page.filteredRequests.map(r => r.code)).toEqual(['YC002']);
  });

  it('filters contracts by status and start day', () => {
    const page = build();
    page.contracts = [
      contract({ code: 'HD001', statusLabel: 'Đã ký', startAt: '2026-07-10T06:00:00.000Z' }),
      contract({ code: 'HD002', statusLabel: 'Đã hủy', startAt: '2026-07-20T06:00:00.000Z' }),
    ] as never;
    page.contractStatus = 'Đã hủy';
    expect(page.filteredContracts.map(c => c.code)).toEqual(['HD002']);
    page.contractStatus = 'Tất cả';
    page.contractDateFilter = '2026-07-10';
    expect(page.filteredContracts.map(c => c.code)).toEqual(['HD001']);
  });

  it('keeps a separate page number for each tab', () => {
    const page = build();
    page.requests = Array.from({ length: 25 }, (_, i) => request({ code: 'YC' + i })) as never;
    page.contracts = Array.from({ length: 25 }, (_, i) => contract({ code: 'HD' + i })) as never;
    page.setTab('request');
    page.setPage(3);
    expect(page.currentPage).toBe(3);
    page.setTab('contract');
    // Sang tab khác phải bắt đầu lại từ trang 1 chứ không giữ trang của tab cũ.
    expect(page.currentPage).toBe(1);
    page.setTab('request');
    expect(page.currentPage).toBe(1);
  });

  it('ignores a page number outside the range of the active tab', () => {
    const page = build();
    page.requests = Array.from({ length: 12 }, (_, i) => request({ code: 'YC' + i })) as never;
    page.setTab('request');
    expect(page.totalPages).toBe(2);
    page.setPage(2);
    page.setPage(7);
    expect(page.currentPage).toBe(2);
    page.setPage(0);
    expect(page.currentPage).toBe(2);
  });

  it('counts the visible range from the active tab only', () => {
    const page = build();
    page.requests = Array.from({ length: 23 }, (_, i) => request({ code: 'YC' + i })) as never;
    page.setTab('request');
    expect(page.activeTotalItems).toBe(23);
    expect(page.visibleStart).toBe(1);
    expect(page.visibleEnd).toBe(10);
    page.setPage(3);
    expect(page.visibleStart).toBe(21);
    expect(page.visibleEnd).toBe(23);
  });

  it('shows the empty state only once loading has finished', () => {
    const page = build();
    page.setTab('request');
    page.loading = true;
    expect(page.isTableEmpty()).toBe(false);
    page.loading = false;
    expect(page.isTableEmpty()).toBe(true);
  });

  it('clears every tab filter and returns all tabs to the first page', () => {
    const page = build();
    page.requests = [request({ code: 'YC001' })] as never;
    page.requestSearch = 'không khớp';
    page.contractStatus = 'Đã hủy';
    page.setTab('request');
    page.setPage(1);
    page.refreshFilters();
    expect(page.requestSearch).toBe('');
    expect(page.contractStatus).toBe('Tất cả');
    expect(page.filteredRequests).toHaveLength(1);
    expect(page.currentPage).toBe(1);
  });
});
