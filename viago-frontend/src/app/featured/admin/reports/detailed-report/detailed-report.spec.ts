import { TestBed } from '@angular/core/testing';
import { AccountsApiService } from '../../../../core/services/accounts-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { DetailedReportComponent, ChuyenXeReportItem } from './detailed-report';

const trip = (over: Partial<ChuyenXeReportItem> = {}): ChuyenXeReportItem => ({
  maChuyen: 'LT001',
  tuyenXe: 'TP.HCM - Cần Thơ',
  bienSo: '51B-890.12',
  loaiXe: 'Giường nằm 34 chỗ',
  khoiHanhDate: '2026-06-10',
  khoiHanhTime: '08:00',
  soKhach: 30,
  tongGhe: 34,
  doanhThuVe: 5400000,
  chiPhi: { nhienLieu: 1000000, cauDuongBOT: 200000, luongChuyen: 800000, benBaiAnUong: 100000 },
  taiXeChinh: 'Nguyễn Văn Hùng',
  phuXe: 'Trần Minh Đức',
  trangThai: 'completed',
  coChiPhi: true,
  ...over,
});

function build(trips: ChuyenXeReportItem[] = []) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [DetailedReportComponent],
    providers: [
      { provide: AccountsApiService, useValue: { request: async () => ({ items: [], pagination: { totalPages: 1 } }) } },
      { provide: ToastService, useValue: { showError: () => {}, showSuccess: () => {} } },
    ],
  });
  const page = TestBed.createComponent(DetailedReportComponent).componentInstance;
  page.trips = trips;
  return page;
}

describe('Admin detailed trip report', () => {
  const trips = [
    trip({ maChuyen: 'LT001', khoiHanhDate: '2026-06-10' }),
    trip({
      maChuyen: 'LT002', tuyenXe: 'TP.HCM - Vũng Tàu', bienSo: '51B-234.56',
      khoiHanhDate: '2026-06-20', doanhThuVe: 2000000, trangThai: 'cancelled',
      chiPhi: { nhienLieu: 500000, cauDuongBOT: 100000, luongChuyen: 400000, benBaiAnUong: 0 },
    }),
  ];

  it('adds the four cost lines into one operating cost per trip', () => {
    const page = build();
    expect(page.getTripCost(trip().chiPhi)).toBe(2100000);
  });

  it('reads trip profit as ticket revenue minus operating cost, including a loss', () => {
    const page = build();
    expect(page.getTripProfit(trip())).toBe(3300000);
    expect(page.getTripProfit(trip({ doanhThuVe: 1000000 }))).toBe(-1100000);
  });

  it('totals revenue, cost and every cost line across the filtered trips', () => {
    const page = build(trips);
    page.onViewReport();
    expect(page.summary.totalTrips).toBe(2);
    expect(page.summary.totalRevenue).toBe(7400000);
    expect(page.summary.totalOperatingCost).toBe(3100000);
    expect(page.summary.costBreakdown.nhienLieu).toBe(1500000);
    expect(page.summary.costBreakdown.cauDuongBOT).toBe(300000);
    expect(page.summary.costBreakdown.luongChuyen).toBe(1200000);
    expect(page.summary.costBreakdown.benBaiAnUong).toBe(100000);
  });

  it('filters by departure date range inclusively at both ends', () => {
    const page = build(trips);
    page.filters.fromDate = '2026-06-10';
    page.filters.toDate = '2026-06-10';
    page.onViewReport();
    expect(page.filteredTrips.map(t => t.maChuyen)).toEqual(['LT001']);
    page.filters.toDate = '2026-06-20';
    page.onViewReport();
    expect(page.filteredTrips).toHaveLength(2);
  });

  it('combines the route, plate and status filters', () => {
    const page = build(trips);
    page.filters.tuyenXe = 'TP.HCM - Vũng Tàu';
    page.filters.trangThai = 'completed';
    page.onViewReport();
    expect(page.filteredTrips).toHaveLength(0);
    page.filters.trangThai = 'cancelled';
    page.onViewReport();
    expect(page.filteredTrips.map(t => t.maChuyen)).toEqual(['LT002']);
    page.filters.bienSo = '51B-890.12';
    page.onViewReport();
    expect(page.filteredTrips).toHaveLength(0);
  });

  it('reports zero totals instead of failing when nothing matched', () => {
    const page = build(trips);
    page.filters.fromDate = '2027-01-01';
    page.onViewReport();
    expect(page.summary.totalTrips).toBe(0);
    expect(page.summary.totalRevenue).toBe(0);
    expect(page.summary.totalOperatingCost).toBe(0);
  });

  it('clears the filters and lists every trip again', () => {
    const page = build(trips);
    page.filters.tuyenXe = 'TP.HCM - Vũng Tàu';
    page.onViewReport();
    page.onResetFilters();
    expect(page.filters.tuyenXe).toBe('Tất cả các tuyến');
    expect(page.filteredTrips).toHaveLength(2);
  });
});
