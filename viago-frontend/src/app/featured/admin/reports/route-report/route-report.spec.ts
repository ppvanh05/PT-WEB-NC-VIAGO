import { TestBed } from '@angular/core/testing';
import { AccountsApiService } from '../../../../core/services/accounts-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { RouteReportComponent, RouteReportItem } from './route-report';

const item = (over: Partial<RouteReportItem> = {}): RouteReportItem => ({
  maTuyen: 'TX001',
  tenTuyen: 'TP.HCM - Cần Thơ',
  diemDi: 'TP.HCM',
  diemDen: 'Cần Thơ',
  khoangCach: '170 km',
  thoiGian: '3.5 giờ',
  trangThai: 'Hoạt động',
  doanhThu: { tongDoanhThu: 1000000, doanhThuTrungBinhChuyen: 500000, tongVeBan: 10, giaVeTrungBinh: 100000 },
  lapDay: { soChuyenChay: 2, soVeDaBan: 10, soVeTrong: 4, tyLeLapDayTrungBinh: 70, soChuyenQuaTai: 0 },
  hieuSuat: { soChuyenDungGio: 2, soChuyenTre: 0, soChuyenHuy: 0, khieuNai: 0, danhGiaSaoTrungBinh: 4.5 },
  chiPhi: 400000,
  ...over,
} as RouteReportItem);

function build() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [RouteReportComponent],
    providers: [
      { provide: AccountsApiService, useValue: { request: async () => ({ items: [], pagination: { totalPages: 1 } }) } },
      { provide: ToastService, useValue: { showError: () => {}, showSuccess: () => {} } },
    ],
  });
  return TestBed.createComponent(RouteReportComponent).componentInstance;
}

describe('Admin route report', () => {
  it('reads profit as recorded revenue minus recorded cost', () => {
    const page = build();
    expect(page.routeProfit(item())).toBe(600000);
    expect(page.routeProfit(item({ chiPhi: 1200000 }))).toBe(-200000);
  });

  it('expresses cost as a share of revenue and never reports more than one hundred per cent', () => {
    const page = build();
    expect(page.costShare(item())).toBe(40);
    expect(page.costShare(item({ chiPhi: 5000000 }))).toBe(100);
  });

  it('treats a route with cost but no revenue as fully loss-making instead of dividing by zero', () => {
    const page = build();
    const noRevenue = { tongDoanhThu: 0, doanhThuTrungBinhChuyen: 0, tongVeBan: 0, giaVeTrungBinh: 0 };
    expect(page.costShare(item({ doanhThu: noRevenue, chiPhi: 300000 }))).toBe(100);
    expect(page.costShare(item({ doanhThu: noRevenue, chiPhi: 0 }))).toBe(0);
  });

  it('totals the filtered routes and derives profit, fill rate and punctuality', () => {
    const page = build();
    page.filteredRoutes = [
      item({ maTuyen: 'TX001' }),
      item({
        maTuyen: 'TX002',
        doanhThu: { tongDoanhThu: 500000, doanhThuTrungBinhChuyen: 250000, tongVeBan: 5, giaVeTrungBinh: 100000 },
        lapDay: { soChuyenChay: 2, soVeDaBan: 5, soVeTrong: 9, tyLeLapDayTrungBinh: 30, soChuyenQuaTai: 0 },
        hieuSuat: { soChuyenDungGio: 1, soChuyenTre: 1, soChuyenHuy: 0, khieuNai: 0, danhGiaSaoTrungBinh: 4 },
        chiPhi: 100000,
      }),
    ];
    page.calculateSummary();
    expect(page.summary.totalRoutesCount).toBe(2);
    expect(page.summary.totalRevenue).toBe(1500000);
    expect(page.summary.totalCost).toBe(500000);
    expect(page.summary.averageProfit).toBe(1000000);
    expect(page.summary.totalTicketsSold).toBe(15);
    expect(page.summary.totalTripsRun).toBe(4);
    expect(page.summary.averageFillRate).toBe(50);
    expect(page.summary.onTimeRate).toBe(75);
  });

  it('keeps suspended routes out of the average fill rate', () => {
    const page = build();
    page.filteredRoutes = [
      item({ trangThai: 'Hoạt động' }),
      item({
        maTuyen: 'TX003',
        trangThai: 'Tạm ngưng',
        lapDay: { soChuyenChay: 0, soVeDaBan: 0, soVeTrong: 0, tyLeLapDayTrungBinh: 0, soChuyenQuaTai: 0 },
      }),
    ];
    page.calculateSummary();
    // Tuyến tạm ngưng không chạy chuyến nào nên không được kéo tỷ lệ lấp đầy xuống.
    expect(page.summary.averageFillRate).toBe(70);
  });

  it('reports zero rates instead of dividing by zero when nothing matched the filters', () => {
    const page = build();
    page.filteredRoutes = [];
    page.calculateSummary();
    expect(page.summary.averageFillRate).toBe(0);
    expect(page.summary.onTimeRate).toBe(0);
    expect(page.summary.totalRevenue).toBe(0);
  });

  it('pages the table ten routes at a time and ignores pages outside the range', () => {
    const page = build();
    page.filteredRoutes = Array.from({ length: 23 }, (_, i) => item({ maTuyen: 'TX' + i }));
    page.updatePaginatedRoutes();
    expect(page.totalPages).toBe(3);
    expect(page.paginatedRoutes).toHaveLength(10);
    page.setPage(3);
    expect(page.paginatedRoutes).toHaveLength(3);
    page.setPage(9);
    expect(page.currentPage).toBe(3);
    page.setPage(0);
    expect(page.currentPage).toBe(3);
  });
});
