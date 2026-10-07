import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../core/services/toast.service';

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
  trangThai: 'running' | 'waiting' | 'completed' | 'locked';
}

@Component({
  selector: 'app-detailed-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './detailed-report.html',
  styleUrls: ['./detailed-report.css']
})
export class DetailedReportComponent implements OnInit {
  protected readonly toastService = inject(ToastService);
  trips: ChuyenXeReportItem[] = [];


  // Filters State
  filters = {
    fromDate: '2026-06-20',
    toDate: '2026-06-26',
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
    this.generateTrips();

    const routesSet = new Set(this.trips.map(t => t.tuyenXe));
    this.availableRoutes = ['Tất cả các tuyến', ...Array.from(routesSet)];

    const platesSet = new Set(this.trips.map(t => t.bienSo));
    this.availablePlates = ['Tất cả xe', ...Array.from(platesSet)];

    this.onViewReport();
  }

  generateTrips() {
    const routeTemplates = [
      { name: 'TP.HCM ↔ Cần Thơ', price: 180000, baseFuel: 900000, baseBot: 280000 },
      { name: 'TP.HCM ↔ Vũng Tàu', price: 160000, baseFuel: 600000, baseBot: 180000 },
      { name: 'TP.HCM ↔ Đà Lạt', price: 250000, baseFuel: 2000000, baseBot: 450000 },
      { name: 'Đà Lạt ↔ Nha Trang', price: 170000, baseFuel: 800000, baseBot: 150000 },
      { name: 'TP.HCM ↔ Nha Trang', price: 300000, baseFuel: 2400000, baseBot: 380000 },
      { name: 'Cần Thơ ↔ Rạch Giá', price: 150000, baseFuel: 500000, baseBot: 100000 },
      { name: 'Đà Lạt ↔ Buôn Ma Thuột', price: 220000, baseFuel: 1400000, baseBot: 200000 },
      { name: 'TP.HCM ↔ Phan Thiết', price: 200000, baseFuel: 1000000, baseBot: 220000 },
      { name: 'Nha Trang ↔ Đà Nẵng', price: 350000, baseFuel: 3200000, baseBot: 650000 }
    ];

    const vehicles = [
      { plate: '77B-09842', type: 'Limousine 1', seats: 22 },
      { plate: '77B-08021', type: 'Limousine 2', seats: 22 },
      { plate: '77B-02082', type: 'Limousine 3', seats: 22 },
      { plate: '77B-05114', type: 'Giường nằm 1', seats: 36 },
      { plate: '77B-09999', type: 'Cabin VIP', seats: 24 }
    ];

    const drivers = [
      'Trần Hoàng Long', 'Nguyễn Văn Nam', 'Lê Hoàng Hải', 'Phạm Minh Đức', 'Bùi Công Danh',
      'Nguyễn Tiến Dũng', 'Phạm Thanh Sơn', 'Lê Minh Tuấn', 'Vũ Quốc Khánh', 'Đỗ Anh Đức',
      'Hoàng Văn Thái', 'Nguyễn Mạnh Hùng', 'Phan Thanh Hải', 'Bùi Xuân Trường', 'Trần Hữu Khang',
      'Đặng Hoàng Gia', 'Lý Huỳnh Đức', 'Trần Minh Quân', 'Nguyễn Tấn Đạt', 'Lê Hồng Phong'
    ];

    const codrivers = [
      'Lê Thế Hùng', 'Nguyễn Đức Minh', 'Đỗ Hoàng Sơn', 'Vũ Gia Bảo',
      'Phạm Công Thành', 'Nguyễn Hữu Thọ', 'Trần Văn Kiệt', 'Bùi Tiến Dũng'
    ];

    const startId = 1001;
    const dates = ['2026-06-20', '2026-06-21', '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25', '2026-06-26'];
    const times = ['06:00', '08:00', '10:15', '13:00', '15:30', '18:00', '20:15', '22:00'];

    const generated: ChuyenXeReportItem[] = [];

    for (let i = 0; i < 77; i++) {
      const date = dates[i % dates.length];
      const time = times[i % times.length];
      const route = routeTemplates[i % routeTemplates.length];
      const vehicle = vehicles[i % vehicles.length];
      const driver = drivers[i % drivers.length];
      const codriver = codrivers[i % codrivers.length];
      
      const seats = vehicle.seats;
      const soKhach = Math.floor(seats * 0.5) + Math.floor(Math.random() * (seats * 0.5 + 1));
      const revenue = soKhach * route.price;

      const fuel = route.baseFuel + (Math.floor(Math.random() * 21) - 10) * 10000;
      const bot = route.baseBot;
      const salary = 400000 + (seats > 24 ? 300000 : 150000);
      const meals = 100000 + Math.floor(Math.random() * 11) * 10000;

      generated.push({
        maChuyen: `LT${startId + i}`,
        tuyenXe: route.name,
        bienSo: vehicle.plate,
        loaiXe: vehicle.type,
        khoiHanhDate: date,
        khoiHanhTime: time,
        soKhach: soKhach,
        tongGhe: seats,
        doanhThuVe: revenue,
        chiPhi: {
          nhienLieu: fuel,
          cauDuongBOT: bot,
          luongChuyen: salary,
          benBaiAnUong: meals
        },
        taiXeChinh: driver,
        phuXe: codriver,
        trangThai: date === '2026-06-26' && time > '15:00' ? 'running' : 'completed'
      });
    }

    this.trips = generated;
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
      fromDate: '2026-06-20',
      toDate: '2026-06-26',
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
