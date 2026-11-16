import { AdminTabs } from '../../../../shared/components/admin-tabs/admin-tabs';
import { AdminPageHeader } from '../../../../shared/components/admin-page-header/admin-page-header';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Toast } from '../../../../shared/components/toast/toast';
import { ToastService } from '../../../../core/services/toast.service';
import { AccountsApiService } from '../../../../core/services/accounts-api.service';

/** Một dòng của GET admin/reports/routes */
interface ApiRoute {
  routeId: string;
  name: string;
  from: string;
  to: string;
  distanceKm: number | null;
  durationMinutes: number | null;
  status: 'HoatDong' | 'NgungHoatDong';
  revenue: { total: number; averagePerTrip: number; ticketsSold: number; averageTicketPrice: number };
  fill: { trips: number; ticketsSold: number; emptySeats: number; averageFillRate: number; overloadedTrips: number };
  performance: { onTimeTrips: number; lateTrips: number; cancelledTrips: number; complaints: number; averageRating: number | null };
}

export interface RouteRevenueData {
  tongDoanhThu: number;
  doanhThuTrungBinhChuyen: number;
  tongVeBan: number;
  giaVeTrungBinh: number;
}

export interface RouteFillData {
  soChuyenChay: number;
  soVeDaBan: number;
  soVeTrong: number;
  tyLeLapDayTrungBinh: number; // percentage
  soChuyenQuaTai: number;
}

export interface RoutePerformanceData {
  soChuyenDungGio: number;
  soChuyenTre: number;
  soChuyenHuy: number;
  khieuNai: number;
  danhGiaSaoTrungBinh: number;
}

export interface RouteReportItem {
  maTuyen: string;
  tenTuyen: string;
  diemDi: string;
  diemDen: string;
  khoangCach: string;
  thoiGian: string;
  trangThai: 'Hoạt động' | 'Tạm ngưng';
  doanhThu: RouteRevenueData;
  lapDay: RouteFillData;
  hieuSuat: RoutePerformanceData;
  /** Tổng chi phí chuyến đã ghi nhận (chi_phi_chuyen_xe) */
  chiPhi: number;
}

@Component({
  selector: 'app-route-report',
  standalone: true,
  imports: [
    CommonModule,
    Toast,
    FormsModule,
    AdminPageHeader,
    AdminTabs,
  ],
  templateUrl: './route-report.html',
  styleUrls: ['./route-report.css']
})
export class RouteReportComponent implements OnInit {
  protected readonly toastService = inject(ToastService);
  protected readonly toastStack = this.toastService.toasts$;
  protected dismissToast(id: string): void {
    this.toastService.dismissToast(id);
  }

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly accountsApi = inject(AccountsApiService);
  /** App chạy không có zone.js: gọi API xong thì báo Angular vẽ lại giao diện. */
  private readonly api = {
    request: <T>(...args: Parameters<AccountsApiService['request']>): Promise<T> =>
      this.accountsApi.request<T>(...args).finally(() => this.cdr.markForCheck()),
  };
  loading = false;

  // Dữ liệu từ GET admin/reports/routes (+ chi phí chuyến từ admin/reports/revenue)
  routesReport: RouteReportItem[] = [];

  // Filters State
  filters = {
    fromDate: '',
    toDate: '',
    trangThai: 'Tất cả trạng thái',
    maTuyen: 'Tất cả các tuyến'
  };

  availableRoutesList: string[] = [];
  filteredRoutes: RouteReportItem[] = [];
  paginatedRoutes: RouteReportItem[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  expandedRouteId: string | null = null;
  activeReportTab: 'charts' | 'table' = 'charts';

  chartColors = [
    '#1E3A8A',
    '#FF6A00',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#3053B3',
    '#FF8126',
    '#152C68'
  ];

  // Summary KPI values
  summary = {
    totalRoutesCount: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    averageProfit: 0,
    totalCost: 0,
    averageFillRate: 0,
    totalTripsRun: 0,
    onTimeRate: 0 // percentage
  };

  ngOnInit() {
    void this.onViewReport();
  }

  /** Tải lại số liệu theo khoảng ngày rồi lọc theo tuyến/trạng thái. */
  async onViewReport() {
    this.loading = true;
    try {
      const range = new URLSearchParams();
      if (this.filters.fromDate) range.set('from', this.filters.fromDate);
      if (this.filters.toDate) range.set('to', this.filters.toDate);
      const [routes, trips] = await Promise.all([
        this.loadAll<ApiRoute>('admin/reports/routes', range),
        this.loadAll<{ routeId: string; totalCost: number }>('admin/reports/revenue', range),
      ]);
      const costByRoute = new Map<string, number>();
      for (const t of trips) costByRoute.set(t.routeId, (costByRoute.get(t.routeId) ?? 0) + (t.totalCost ?? 0));
      this.routesReport = routes.map(r => ({
        maTuyen: r.routeId,
        tenTuyen: r.name,
        diemDi: r.from,
        diemDen: r.to,
        khoangCach: r.distanceKm != null ? `${r.distanceKm} km` : '—',
        thoiGian: r.durationMinutes != null ? `${Math.round((r.durationMinutes / 60) * 10) / 10} tiếng` : '—',
        trangThai: r.status === 'HoatDong' ? 'Hoạt động' : 'Tạm ngưng',
        doanhThu: {
          tongDoanhThu: r.revenue.total,
          doanhThuTrungBinhChuyen: r.revenue.averagePerTrip,
          tongVeBan: r.revenue.ticketsSold,
          giaVeTrungBinh: r.revenue.averageTicketPrice,
        },
        lapDay: {
          soChuyenChay: r.fill.trips,
          soVeDaBan: r.fill.ticketsSold,
          soVeTrong: r.fill.emptySeats,
          tyLeLapDayTrungBinh: r.fill.averageFillRate,
          soChuyenQuaTai: r.fill.overloadedTrips,
        },
        hieuSuat: {
          soChuyenDungGio: r.performance.onTimeTrips,
          soChuyenTre: r.performance.lateTrips,
          soChuyenHuy: r.performance.cancelledTrips,
          khieuNai: r.performance.complaints,
          danhGiaSaoTrungBinh: r.performance.averageRating ?? 0,
        },
        chiPhi: costByRoute.get(r.routeId) ?? 0,
      }));
      this.availableRoutesList = ['Tất cả các tuyến', ...this.routesReport.map(r => r.tenTuyen)];
    } catch (error) {
      this.toastService.showError(error instanceof Error ? error.message : 'Không tải được báo cáo tuyến xe.');
    } finally {
      this.loading = false;
    }

    this.filteredRoutes = this.routesReport.filter(r => {
      const matchStatus = this.filters.trangThai === 'Tất cả trạng thái' || r.trangThai === this.filters.trangThai;
      const matchRoute = this.filters.maTuyen === 'Tất cả các tuyến' || r.tenTuyen === this.filters.maTuyen;
      return matchStatus && matchRoute;
    });

    this.calculateSummary();
    this.currentPage = 1;
    this.updatePaginatedRoutes();
  }

  private async loadAll<T>(path: string, range: URLSearchParams): Promise<T[]> {
    const rows: T[] = [];
    for (let page = 1; ; page++) {
      const params = new URLSearchParams(range);
      params.set('page', String(page));
      params.set('pageSize', '100');
      const res = await this.api.request<{ items: T[]; pagination: { totalPages: number } }>(`${path}?${params}`, 'GET', undefined, 'admin');
      rows.push(...res.items);
      if (page >= res.pagination.totalPages || !res.items.length) return rows;
    }
  }

  /** Lợi nhuận = doanh thu vé - chi phí chuyến đã ghi nhận. */
  routeProfit(item: RouteReportItem): number {
    return item.doanhThu.tongDoanhThu - item.chiPhi;
  }

  costShare(item: RouteReportItem): number {
    const revenue = item.doanhThu.tongDoanhThu;
    if (revenue <= 0) return item.chiPhi > 0 ? 100 : 0;
    return Math.min(100, Math.round((item.chiPhi / revenue) * 100));
  }

  updatePaginatedRoutes() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredRoutes.length / this.pageSize));
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedRoutes = this.filteredRoutes.slice(startIndex, startIndex + this.pageSize);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedRoutes();
    }
  }

  getVisiblePages(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  onResetFilters() {
    this.filters = {
      fromDate: '',
      toDate: '',
      trangThai: 'Tất cả trạng thái',
      maTuyen: 'Tất cả các tuyến'
    };
    void this.onViewReport();
    this.toastService.showSuccess('Đã xóa tất cả bộ lọc báo cáo!');
  }

  toggleRow(maTuyen: string) {
    this.expandedRouteId = this.expandedRouteId === maTuyen ? null : maTuyen;
  }

  calculateSummary() {
    let totalRevenue = 0;
    let totalTickets = 0;
    let totalTrips = 0;
    let totalOnTimeTrips = 0;
    let activeRoutesCount = 0;
    let sumFillRate = 0;
    let totalCost = 0;

    this.filteredRoutes.forEach(r => {
      totalRevenue += r.doanhThu.tongDoanhThu;
      totalTickets += r.doanhThu.tongVeBan;
      totalTrips += r.lapDay.soChuyenChay;
      totalOnTimeTrips += r.hieuSuat.soChuyenDungGio;
      totalCost += r.chiPhi;
      if (r.trangThai === 'Hoạt động') {
        activeRoutesCount++;
        sumFillRate += r.lapDay.tyLeLapDayTrungBinh;
      }
    });

    this.summary = {
      totalRoutesCount: this.filteredRoutes.length,
      totalTicketsSold: totalTickets,
      totalRevenue: totalRevenue,
      averageProfit: totalRevenue - totalCost,
      totalCost,
      totalTripsRun: totalTrips,
      averageFillRate: activeRoutesCount > 0 ? Math.round(sumFillRate / activeRoutesCount) : 0,
      onTimeRate: totalTrips > 0 ? Math.round((totalOnTimeTrips / totalTrips) * 100) : 0
    };
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(value)
      .replace('₫', 'đ');
  }

  getPercentage(value: number, total: number): number {
    if (!total) return 0;
    return Math.round((value / total) * 100);
  }

  getStarRatingArray(rating: number): number[] {
    const stars = [];
    const floor = Math.floor(rating);
    for (let i = 0; i < floor; i++) {
      stars.push(1);
    }
    if (rating - floor >= 0.5) {
      stars.push(0.5);
    }
    return stars;
  }

  onExportExcel() {
    if (this.filteredRoutes.length === 0) {
      this.toastService.showError('Không có dữ liệu để xuất báo cáo!');
      return;
    }

    let csvContent = '\uFEFF';
    csvContent += 'BÁO CÁO TỔNG HỢP VÀ DOANH THU THEO TUYẾN XE\n';
    csvContent += `Thời gian lọc: ${this.filters.fromDate || 'Tất cả'} đến ${this.filters.toDate || 'Tất cả'}\n\n`;
    csvContent += 'Mã tuyến,Tên tuyến,Trạng thái,Cự ly,Thời gian đi,Số chuyến chạy,Vé bán,Vé trống,% Lấp đầy TB,Doanh thu,Chi phí,Lợi nhuận,Doanh thu TB/chuyến,Sao đánh giá,Chuyến trễ,Chuyến hủy\n';

    this.filteredRoutes.forEach(r => {
      csvContent += `${r.maTuyen},${r.tenTuyen},${r.trangThai},${r.khoangCach},${r.thoiGian},${r.lapDay.soChuyenChay},${r.lapDay.soVeDaBan},${r.lapDay.soVeTrong},${r.lapDay.tyLeLapDayTrungBinh}%,${r.doanhThu.tongDoanhThu},${r.chiPhi},${this.routeProfit(r)},${r.doanhThu.doanhThuTrungBinhChuyen},${r.hieuSuat.danhGiaSaoTrungBinh},${r.hieuSuat.soChuyenTre},${r.hieuSuat.soChuyenHuy}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `BaoCaoDoanhThuTuyenXe_${new Date().toISOString().slice(0,10)}.csv`);
    link.click();
    this.toastService.showSuccess('Xuất file báo cáo Excel thành công!');
  }

  onExportChart() {
    this.toastService.showSuccess('Đã xuất biểu đồ phân tích tuyến xe thành công!');
  }

}
