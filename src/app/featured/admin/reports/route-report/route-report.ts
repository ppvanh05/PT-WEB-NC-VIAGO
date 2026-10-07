import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../core/services/toast.service';

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
}

@Component({
  selector: 'app-route-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './route-report.html',
  styleUrls: ['./route-report.css']
})
export class RouteReportComponent implements OnInit {
  protected readonly toastService = inject(ToastService);

  // Mock operational routes report data
  routesReport: RouteReportItem[] = [
    {
      maTuyen: 'TX1001',
      tenTuyen: 'TP.HCM ↔ Cần Thơ',
      diemDi: 'TP.HCM',
      diemDen: 'Cần Thơ',
      khoangCach: '165 km',
      thoiGian: '3.5 tiếng',
      trangThai: 'Hoạt động',
      doanhThu: { tongDoanhThu: 325290000, doanhThuTrungBinhChuyen: 4224500, tongVeBan: 1807, giaVeTrungBinh: 180000 },
      lapDay: { soChuyenChay: 77, soVeDaBan: 1807, soVeTrong: 142, tyLeLapDayTrungBinh: 92, soChuyenQuaTai: 4 },
      hieuSuat: { soChuyenDungGio: 73, soChuyenTre: 3, soChuyenHuy: 1, khieuNai: 2, danhGiaSaoTrungBinh: 4.8 }
    },
    {
      maTuyen: 'TX1002',
      tenTuyen: 'TP.HCM ↔ Vũng Tàu',
      diemDi: 'TP.HCM',
      diemDen: 'Bà Rịa - Vũng Tàu',
      khoangCach: '110 km',
      thoiGian: '2 tiếng',
      trangThai: 'Hoạt động',
      doanhThu: { tongDoanhThu: 184320000, doanhThuTrungBinhChuyen: 2835000, tongVeBan: 1152, giaVeTrungBinh: 160000 },
      lapDay: { soChuyenChay: 65, soVeDaBan: 1152, soVeTrong: 278, tyLeLapDayTrungBinh: 80, soChuyenQuaTai: 1 },
      hieuSuat: { soChuyenDungGio: 61, soChuyenTre: 3, soChuyenHuy: 1, khieuNai: 0, danhGiaSaoTrungBinh: 4.6 }
    },
    {
      maTuyen: 'TX1003',
      tenTuyen: 'TP.HCM ↔ Đà Lạt',
      diemDi: 'TP.HCM',
      diemDen: 'Lâm Đồng',
      khoangCach: '310 km',
      thoiGian: '7 tiếng',
      trangThai: 'Hoạt động',
      doanhThu: { tongDoanhThu: 412500000, doanhThuTrungBinhChuyen: 8250000, tongVeBan: 1650, giaVeTrungBinh: 250000 },
      lapDay: { soChuyenChay: 50, soVeDaBan: 1650, soVeTrong: 150, tyLeLapDayTrungBinh: 91, soChuyenQuaTai: 5 },
      hieuSuat: { soChuyenDungGio: 46, soChuyenTre: 2, soChuyenHuy: 2, khieuNai: 4, danhGiaSaoTrungBinh: 4.9 }
    },
    {
      maTuyen: 'TX1004',
      tenTuyen: 'Đà Lạt ↔ Nha Trang',
      diemDi: 'Lâm Đồng',
      diemDen: 'Khánh Hòa',
      khoangCach: '135 km',
      thoiGian: '3 tiếng',
      trangThai: 'Hoạt động',
      doanhThu: { tongDoanhThu: 97920000, doanhThuTrungBinhChuyen: 3264000, tongVeBan: 576, giaVeTrungBinh: 170000 },
      lapDay: { soChuyenChay: 30, soVeDaBan: 576, soVeTrong: 84, tyLeLapDayTrungBinh: 87, soChuyenQuaTai: 0 },
      hieuSuat: { soChuyenDungGio: 28, soChuyenTre: 2, soChuyenHuy: 0, khieuNai: 1, danhGiaSaoTrungBinh: 4.5 }
    },
    {
      maTuyen: 'TX1005',
      tenTuyen: 'TP.HCM ↔ Nha Trang',
      diemDi: 'TP.HCM',
      diemDen: 'Khánh Hòa',
      khoangCach: '435 km',
      thoiGian: '8.5 tiếng',
      trangThai: 'Hoạt động',
      doanhThu: { tongDoanhThu: 252000000, doanhThuTrungBinhChuyen: 9000000, tongVeBan: 840, giaVeTrungBinh: 300000 },
      lapDay: { soChuyenChay: 28, soVeDaBan: 840, soVeTrong: 168, tyLeLapDayTrungBinh: 83, soChuyenQuaTai: 2 },
      hieuSuat: { soChuyenDungGio: 25, soChuyenTre: 2, soChuyenHuy: 1, khieuNai: 3, danhGiaSaoTrungBinh: 4.7 }
    },
    {
      maTuyen: 'TX1006',
      tenTuyen: 'Cần Thơ ↔ Rạch Giá',
      diemDi: 'Cần Thơ',
      diemDen: 'Kiên Giang',
      khoangCach: '115 km',
      thoiGian: '2.5 tiếng',
      trangThai: 'Hoạt động',
      doanhThu: { tongDoanhThu: 54000000, doanhThuTrungBinhChuyen: 2250000, tongVeBan: 360, giaVeTrungBinh: 150000 },
      lapDay: { soChuyenChay: 24, soVeDaBan: 360, soVeTrong: 168, tyLeLapDayTrungBinh: 68, soChuyenQuaTai: 0 },
      hieuSuat: { soChuyenDungGio: 23, soChuyenTre: 1, soChuyenHuy: 0, khieuNai: 0, danhGiaSaoTrungBinh: 4.3 }
    },
    {
      maTuyen: 'TX1007',
      tenTuyen: 'Đà Lạt ↔ Buôn Ma Thuột',
      diemDi: 'Lâm Đồng',
      diemDen: 'Đắc Lắc',
      khoangCach: '210 km',
      thoiGian: '5 tiếng',
      trangThai: 'Hoạt động',
      doanhThu: { tongDoanhThu: 88000000, doanhThuTrungBinhChuyen: 4400000, tongVeBan: 400, giaVeTrungBinh: 220000 },
      lapDay: { soChuyenChay: 20, soVeDaBan: 400, soVeTrong: 140, tyLeLapDayTrungBinh: 74, soChuyenQuaTai: 1 },
      hieuSuat: { soChuyenDungGio: 18, soChuyenTre: 1, soChuyenHuy: 1, khieuNai: 1, danhGiaSaoTrungBinh: 4.5 }
    },
    {
      maTuyen: 'TX1008',
      tenTuyen: 'TP.HCM ↔ Phan Thiết',
      diemDi: 'TP.HCM',
      diemDen: 'Bình Thuận',
      khoangCach: '200 km',
      thoiGian: '4 tiếng',
      trangThai: 'Tạm ngưng',
      doanhThu: { tongDoanhThu: 0, doanhThuTrungBinhChuyen: 0, tongVeBan: 0, giaVeTrungBinh: 200000 },
      lapDay: { soChuyenChay: 0, soVeDaBan: 0, soVeTrong: 0, tyLeLapDayTrungBinh: 0, soChuyenQuaTai: 0 },
      hieuSuat: { soChuyenDungGio: 0, soChuyenTre: 0, soChuyenHuy: 0, khieuNai: 0, danhGiaSaoTrungBinh: 0 }
    }
  ];

  // Filters State
  filters = {
    fromDate: '2026-06-20',
    toDate: '2026-06-26',
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
    averageFillRate: 0,
    totalTripsRun: 0,
    onTimeRate: 0 // percentage
  };

  ngOnInit() {
    this.availableRoutesList = ['Tất cả các tuyến', ...this.routesReport.map(r => r.tenTuyen)];
    this.onViewReport();
  }

  onViewReport() {
    this.filteredRoutes = this.routesReport.filter(r => {
      // Status Filter
      const matchStatus = this.filters.trangThai === 'Tất cả trạng thái' || r.trangThai === this.filters.trangThai;
      
      // Specific Route Filter
      const matchRoute = this.filters.maTuyen === 'Tất cả các tuyến' || r.tenTuyen === this.filters.maTuyen;

      return matchStatus && matchRoute;
    });

    this.calculateSummary();
    this.currentPage = 1;
    this.updatePaginatedRoutes();
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
      fromDate: '2026-06-20',
      toDate: '2026-06-26',
      trangThai: 'Tất cả trạng thái',
      maTuyen: 'Tất cả các tuyến'
    };
    this.onViewReport();
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

    this.filteredRoutes.forEach(r => {
      totalRevenue += r.doanhThu.tongDoanhThu;
      totalTickets += r.doanhThu.tongVeBan;
      totalTrips += r.lapDay.soChuyenChay;
      totalOnTimeTrips += r.hieuSuat.soChuyenDungGio;
      if (r.trangThai === 'Hoạt động') {
        activeRoutesCount++;
        sumFillRate += r.lapDay.tyLeLapDayTrungBinh;
      }
    });

    this.summary = {
      totalRoutesCount: this.filteredRoutes.length,
      totalTicketsSold: totalTickets,
      totalRevenue: totalRevenue,
      averageProfit: totalRevenue * 0.45, // Assume 45% margin for mock purposes
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
    csvContent += 'Mã tuyến,Tên tuyến,Trạng thái,Cự ly,Thời gian đi,Số chuyến chạy,Vé bán,Vé trống,% Lấp đầy TB,Doanh thu,Lợi nhuận TB/chuyến,Sao đánh giá,Chuyến trễ,Chuyến hủy\n';

    this.filteredRoutes.forEach(r => {
      csvContent += `${r.maTuyen},${r.tenTuyen},${r.trangThai},${r.khoangCach},${r.thoiGian},${r.lapDay.soChuyenChay},${r.lapDay.soVeDaBan},${r.lapDay.soVeTrong},${r.lapDay.tyLeLapDayTrungBinh}%,${r.doanhThu.tongDoanhThu},${r.doanhThu.doanhThuTrungBinhChuyen},${r.hieuSuat.danhGiaSaoTrungBinh},${r.hieuSuat.soChuyenTre},${r.hieuSuat.soChuyenHuy}\n`;
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
