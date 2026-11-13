import { AdminTabs } from '../../../../shared/components/admin-tabs/admin-tabs';
import { AdminPageHeader } from '../../../../shared/components/admin-page-header/admin-page-header';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Toast } from '../../../../shared/components/toast/toast';
import { ToastService } from '../../../../core/services/toast.service';
import { AccountsApiService } from '../../../../core/services/accounts-api.service';

/** Một dòng của GET admin/reports/revenue (lich_trinh + chi phí chuyến). */
interface ApiTrip {
  scheduleId: string;
  route: string;
  plateNumber: string;
  vehicleType: string;
  departureDate: string;
  departureTime: string;
  passengers: number;
  totalSeats: number;
  ticketRevenue: number;
  cost: { fuel: number; toll: number; salary: number; other: number } | null;
  driver: string | null;
  assistant: string | null;
  status: ChuyenXeReportItem['trangThai'];
}

export interface ChiPhiVanHanh {
  nhienLieu: number; // Dầu / Xăng
  cauDuongBOT: number; // Phí BOT cầu đường
  luongChuyen: number; // Lương tài xế + phụ xe
  benBaiAnUong: number; // Bến bãi, ăn uống dọc đường
}

export interface ChuyenXeReportItem {
  maChuyen: string;
  tuyenXe: string;
  bienSo: string;
  loaiXe: string;
  khoiHanhDate: string; // YYYY-MM-DD
  khoiHanhTime: string;
  soKhach: number;
  tongGhe: number;
  doanhThuVe: number;
  chiPhi: ChiPhiVanHanh;
  taiXeChinh: string;
  phuXe: string;
  trangThai: 'running' | 'waiting' | 'completed' | 'locked' | 'cancelled';
  coChiPhi: boolean;
}

@Component({
  selector: 'app-detailed-report',
  standalone: true,
  imports: [
    CommonModule,
    Toast,
    FormsModule,
    AdminPageHeader,
    AdminTabs,
  ],
  templateUrl: './detailed-report.html',
  styleUrls: ['./detailed-report.css']
})
export class DetailedReportComponent implements OnInit {
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
  trips: ChuyenXeReportItem[] = [];
  loading = false;


  // Filters State
  filters = {
    fromDate: '',
    toDate: '',
    tuyenXe: 'Tất cả các tuyến',
    bienSo: 'Tất cả xe',
    trangThai: 'Tất cả trạng thái'
  };

  // Helper arrays for filter dropdowns
  availableRoutes: string[] = [];
  availablePlates: string[] = [];

  // Table Expanded state
  expandedTripId: string | null = null;

  // Rendered Data list
  filteredTrips: ChuyenXeReportItem[] = [];
  paginatedTrips: ChuyenXeReportItem[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  activeReportTab: 'charts' | 'table' = 'charts';

  // Summary Metrics
  summary = {
    totalTrips: 0,
    totalRevenue: 0,
    totalOperatingCost: 0,
    totalProfit: 0,
    costBreakdown: {
      nhienLieu: 0,
      cauDuongBOT: 0,
      luongChuyen: 0,
      benBaiAnUong: 0
    }
  };

  ngOnInit() {
    void this.loadTrips();
  }

  /** Tải toàn bộ chuyến từ DB; lọc ngày/tuyến/xe/trạng thái làm trên trình duyệt. */
  async loadTrips() {
    this.loading = true;
    try {
      const rows: ApiTrip[] = [];
      for (let page = 1; ; page++) {
        const res = await this.api.request<{ items: ApiTrip[]; pagination: { totalPages: number } }>(
          `admin/reports/revenue?page=${page}&pageSize=100`, 'GET', undefined, 'admin');
        rows.push(...res.items);
        if (page >= res.pagination.totalPages || !res.items.length) break;
      }
      this.trips = rows.map(r => ({
        maChuyen: r.scheduleId,
        tuyenXe: r.route,
        bienSo: r.plateNumber,
        loaiXe: r.vehicleType,
        khoiHanhDate: r.departureDate,
        khoiHanhTime: r.departureTime,
        soKhach: r.passengers,
        tongGhe: r.totalSeats,
        doanhThuVe: r.ticketRevenue,
        chiPhi: {
          nhienLieu: r.cost?.fuel ?? 0,
          cauDuongBOT: r.cost?.toll ?? 0,
          luongChuyen: r.cost?.salary ?? 0,
          benBaiAnUong: r.cost?.other ?? 0,
        },
        coChiPhi: !!r.cost && (r.cost.fuel + r.cost.toll + r.cost.salary + r.cost.other) > 0,
        taiXeChinh: r.driver ?? '',
        phuXe: r.assistant ?? '',
        trangThai: r.status,
      }));
      this.availableRoutes = ['Tất cả các tuyến', ...new Set(this.trips.map(t => t.tuyenXe))];
      this.availablePlates = ['Tất cả xe', ...new Set(this.trips.map(t => t.bienSo))];
    } catch (error) {
      this.toastService.showError(error instanceof Error ? error.message : 'Không tải được báo cáo chuyến xe.');
    } finally {
      this.loading = false;
      this.onViewReport();
    }
  }

  onViewReport() {
    this.filteredTrips = this.trips.filter(t => {
      let matchDate = true;
      if (this.filters.fromDate) {
        matchDate = matchDate && t.khoiHanhDate >= this.filters.fromDate;
      }
      if (this.filters.toDate) {
        matchDate = matchDate && t.khoiHanhDate <= this.filters.toDate;
      }

      const matchRoute = this.filters.tuyenXe === 'Tất cả các tuyến' || t.tuyenXe === this.filters.tuyenXe;
      const matchPlate = this.filters.bienSo === 'Tất cả xe' || t.bienSo === this.filters.bienSo;
      const matchStatus = this.filters.trangThai === 'Tất cả trạng thái' || t.trangThai === this.filters.trangThai;

      return matchDate && matchRoute && matchPlate && matchStatus;
    });

    this.calculateSummary();
    this.currentPage = 1;
    this.updatePaginatedTrips();
  }

  updatePaginatedTrips() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredTrips.length / this.pageSize));
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedTrips = this.filteredTrips.slice(startIndex, startIndex + this.pageSize);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedTrips();
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
      tuyenXe: 'Tất cả các tuyến',
      bienSo: 'Tất cả xe',
      trangThai: 'Tất cả trạng thái'
    };
    this.onViewReport();
    this.toastService.showSuccess('Đã xóa tất cả bộ lọc báo cáo!');
  }

  toggleRow(maChuyen: string) {
    if (this.expandedTripId === maChuyen) {
      this.expandedTripId = null;
    } else {
      this.expandedTripId = maChuyen;
    }
  }

  calculateSummary() {
    const summary = {
      totalTrips: this.filteredTrips.length,
      totalRevenue: 0,
      totalOperatingCost: 0,
      totalProfit: 0,
      costBreakdown: {
        nhienLieu: 0,
        cauDuongBOT: 0,
        luongChuyen: 0,
        benBaiAnUong: 0
      }
    };

    this.filteredTrips.forEach(t => {
      const tripCost = this.getTripCost(t.chiPhi);
      summary.totalRevenue += t.doanhThuVe;
      summary.totalOperatingCost += tripCost;

      summary.costBreakdown.nhienLieu += t.chiPhi.nhienLieu;
      summary.costBreakdown.cauDuongBOT += t.chiPhi.cauDuongBOT;
      summary.costBreakdown.luongChuyen += t.chiPhi.luongChuyen;
      summary.costBreakdown.benBaiAnUong += t.chiPhi.benBaiAnUong;
    });

    summary.totalProfit = summary.totalRevenue - summary.totalOperatingCost;
    this.summary = summary;
  }

  getTripCost(chiPhi: ChiPhiVanHanh): number {
    return chiPhi.nhienLieu + chiPhi.cauDuongBOT + chiPhi.luongChuyen + chiPhi.benBaiAnUong;
  }

  getTripProfit(t: ChuyenXeReportItem): number {
    return t.doanhThuVe - this.getTripCost(t.chiPhi);
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

  onExportExcel() {
    if (this.filteredTrips.length === 0) {
      this.toastService.showError('Không có dữ liệu để xuất báo cáo!');
      return;
    }

    let csvContent = '\uFEFF';
    csvContent += 'BÁO CÁO CHI TIẾT VẬN HÀNH VÀ CHI PHÍ CHUYẾN XE\n';
    csvContent += `Thời gian lọc: ${this.filters.fromDate || 'Tất cả'} đến ${this.filters.toDate || 'Tất cả'}\n\n`;
    csvContent += 'Mã chuyến,Tuyến đường,Biển số,Loại xe,Ngày khởi hành,Giờ khởi hành,Số khách/Ghế,Doanh thu vé,Tổng chi phí,Nhiên liệu,Phí BOT,Lương chuyến,Bến bãi & Khác,Lợi nhuận,Tài xế chính,Phụ xe\n';

    this.filteredTrips.forEach(t => {
      const totalCost = this.getTripCost(t.chiPhi);
      const profit = this.getTripProfit(t);
      csvContent += `${t.maChuyen},${t.tuyenXe},${t.bienSo},${t.loaiXe},${t.khoiHanhDate},${t.khoiHanhTime},${t.soKhach}/${t.tongGhe},${t.doanhThuVe},${totalCost},${t.chiPhi.nhienLieu},${t.chiPhi.cauDuongBOT},${t.chiPhi.luongChuyen},${t.chiPhi.benBaiAnUong},${profit},${t.taiXeChinh},${t.phuXe}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `BaoCaoChiTietChuyenXe_${new Date().toISOString().slice(0,10)}.csv`);
    link.click();
    this.toastService.showSuccess('Xuất file báo cáo Excel thành công!');
  }

}
