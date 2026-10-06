import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pagination } from '../../../../shared/components/pagination/pagination';

export interface ChiPhiVanHanh {
  nhienLieu: number;
  cauDuongBOT: number;
  luongChuyen: number;
  benBaiAnUong: number;
}

export interface ChuyenXeReportItem {
  maChuyen: string;
  tuyenXe: string;
  bienSo: string;
  loaiXe: string;
  khoiHanhDate: string;
  khoiHanhTime: string;
  soKhach: number;
  tongGhe: number;
  doanhThuVe: number;
  chiPhi: ChiPhiVanHanh;
  taiXeChinh: string;
  phuXe: string;
  trangThai: 'running' | 'waiting' | 'completed' | 'cancelled' | 'delayed';
  tyLeLapDay: number;
}

@Component({
  selector: 'app-detailed-report',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './detailed-report.html',
  styleUrl: './detailed-report.css'
})
export class DetailedReportComponent implements OnInit {
  trips: ChuyenXeReportItem[] = [];
  Math = Math;

  // Filters State - Dynamic initial 30 days window
  filters = {
    fromDate: this.getInitialFromDate(),
    toDate: this.getInitialToDate(),
    tuyenXe: 'Tất cả các tuyến',
    bienSo: 'Tất cả xe',
    trangThai: 'Tất cả trạng thái'
  };

  availableRoutes: string[] = [];
  availablePlates: string[] = [];
  expandedTripId: string | null = null;
  selectedDetailTrip: ChuyenXeReportItem | null = null;

  filteredTrips: ChuyenXeReportItem[] = [];
  paginatedTrips: ChuyenXeReportItem[] = [];

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  activeReportTab: 'charts' | 'table' = 'charts';
  dateValidationError = '';

  summary = {
    totalTrips: 0,
    completedTrips: 0,
    runningTrips: 0,
    delayedTrips: 0,
    cancelledTrips: 0,
    fullCapacityTrips: 0, // Chuyến lấp đầy 100%
    unsoldSeats: 0, // Số ghế không bán được trong kỳ
    totalRevenue: 0,
    totalOperatingCost: 0,
    totalProfit: 0,
    avgOccupancy: 0,
    costBreakdown: {
      nhienLieu: 0,
      cauDuongBOT: 0,
      luongChuyen: 0,
      benBaiAnUong: 0
    }
  };

  topRoutes: { name: string; revenue: number; trips: number; profit: number; occupancy: number }[] = [];

  private cdr = inject(ChangeDetectorRef);

  getInitialFromDate(): string {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }

  getInitialToDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

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
      { name: 'TP.HCM ↔ Bà Rịa - Vũng Tàu', price: 160000, baseFuel: 600000, baseBot: 180000 },
      { name: 'TP.HCM ↔ Lâm Đồng', price: 250000, baseFuel: 2000000, baseBot: 450000 },
      { name: 'Lâm Đồng ↔ Khánh Hòa', price: 170000, baseFuel: 800000, baseBot: 150000 },
      { name: 'TP.HCM ↔ Khánh Hòa', price: 300000, baseFuel: 2400000, baseBot: 380000 },
      { name: 'Cần Thơ ↔ Kiên Giang', price: 150000, baseFuel: 500000, baseBot: 100000 },
      { name: 'Lâm Đồng ↔ Đắk Lắk', price: 220000, baseFuel: 1400000, baseBot: 200000 },
      { name: 'TP.HCM ↔ Bình Thuận', price: 200000, baseFuel: 1000000, baseBot: 220000 },
      { name: 'Khánh Hòa ↔ Đà Nẵng', price: 350000, baseFuel: 3200000, baseBot: 650000 }
    ];

    const vehicles = [
      { plate: '77B-09842', type: 'Limousine 22 chỗ', seats: 22 },
      { plate: '77B-08021', type: 'Limousine 22 chỗ', seats: 22 },
      { plate: '77B-02082', type: 'Limousine 22 chỗ', seats: 22 },
      { plate: '77B-05114', type: 'Giường nằm 36 chỗ', seats: 36 },
      { plate: '77B-09999', type: 'Cabin Cung Điện 24 phòng', seats: 24 }
    ];

    const drivers = [
      'Trần Hoàng Long', 'Nguyễn Văn Nam', 'Lê Hoàng Hải', 'Phạm Minh Đức', 'Bùi Công Danh',
      'Nguyễn Tiến Dũng', 'Phạm Thanh Sơn', 'Lê Minh Tuấn', 'Vũ Quốc Khánh', 'Đỗ Anh Đức'
    ];

    const codrivers = [
      'Lê Thế Hùng', 'Nguyễn Đức Minh', 'Đỗ Hoàng Sơn', 'Vũ Gia Bảo', 'Phạm Công Thành'
    ];

    const generated: ChuyenXeReportItem[] = [];
    const today = new Date();

    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (i % 35));
      const dateStr = d.toISOString().slice(0, 10);
      const route = routeTemplates[i % routeTemplates.length];
      const vehicle = vehicles[i % vehicles.length];
      const driver = drivers[i % drivers.length];
      const codriver = codrivers[i % codrivers.length];
      
      const seats = vehicle.seats;
      // Generate some 100% full trips
      const isFull = (i % 5 === 0);
      const soKhach = isFull ? seats : Math.floor(seats * 0.5) + Math.floor(Math.random() * (seats * 0.45));
      const revenue = soKhach * route.price;
      const occupancy = Math.round((soKhach / seats) * 100);

      const fuel = route.baseFuel + (Math.floor(Math.random() * 10) - 5) * 10000;
      const bot = route.baseBot;
      const salary = 400000 + (seats > 24 ? 300000 : 150000);
      const meals = 100000 + Math.floor(Math.random() * 10) * 10000;

      let status: 'running' | 'waiting' | 'completed' | 'cancelled' | 'delayed' = 'completed';
      if (i % 17 === 0) status = 'cancelled';
      else if (i % 13 === 0) status = 'delayed';
      else if (i % 19 === 0) status = 'running';

      generated.push({
        maChuyen: `LT${1001 + i}`,
        tuyenXe: route.name,
        bienSo: vehicle.plate,
        loaiXe: vehicle.type,
        khoiHanhDate: dateStr,
        khoiHanhTime: `${String(6 + (i % 14)).padStart(2, '0')}:00`,
        soKhach: soKhach,
        tongGhe: seats,
        doanhThuVe: status === 'cancelled' ? 0 : revenue,
        chiPhi: {
          nhienLieu: status === 'cancelled' ? 0 : fuel,
          cauDuongBOT: status === 'cancelled' ? 0 : bot,
          luongChuyen: status === 'cancelled' ? 0 : salary,
          benBaiAnUong: status === 'cancelled' ? 0 : meals
        },
        taiXeChinh: driver,
        phuXe: codriver,
        trangThai: status,
        tyLeLapDay: status === 'cancelled' ? 0 : occupancy
      });
    }

    this.trips = generated;
  }

  validateDateRange(): boolean {
    this.dateValidationError = '';
    if (this.filters.fromDate && this.filters.toDate) {
      if (this.filters.fromDate > this.filters.toDate) {
        this.dateValidationError = 'Ngày bắt đầu không được lớn hơn ngày kết thúc!';
        return false;
      }
    }
    return true;
  }

  onViewReport() {
    if (!this.validateDateRange()) return;

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
    this.calculateTopRoutes();
    this.currentPage = 1;
    this.updatePaginatedTrips();
  }

  calculateSummary() {
    const summary = {
      totalTrips: this.filteredTrips.length,
      completedTrips: 0,
      runningTrips: 0,
      delayedTrips: 0,
      cancelledTrips: 0,
      fullCapacityTrips: 0,
      unsoldSeats: 0,
      totalRevenue: 0,
      totalOperatingCost: 0,
      totalProfit: 0,
      avgOccupancy: 0,
      costBreakdown: {
        nhienLieu: 0,
        cauDuongBOT: 0,
        luongChuyen: 0,
        benBaiAnUong: 0
      }
    };

    let totalOccupancySum = 0;

    this.filteredTrips.forEach(t => {
      if (t.trangThai === 'completed') summary.completedTrips++;
      else if (t.trangThai === 'running') summary.runningTrips++;
      else if (t.trangThai === 'delayed') summary.delayedTrips++;
      else if (t.trangThai === 'cancelled') summary.cancelledTrips++;

      if (t.soKhach >= t.tongGhe && t.trangThai !== 'cancelled') {
        summary.fullCapacityTrips++;
      }

      if (t.trangThai !== 'cancelled') {
        summary.unsoldSeats += (t.tongGhe - t.soKhach);
        totalOccupancySum += t.tyLeLapDay;
      }

      const tripCost = this.getTripCost(t.chiPhi);
      summary.totalRevenue += t.doanhThuVe;
      summary.totalOperatingCost += tripCost;

      summary.costBreakdown.nhienLieu += t.chiPhi.nhienLieu;
      summary.costBreakdown.cauDuongBOT += t.chiPhi.cauDuongBOT;
      summary.costBreakdown.luongChuyen += t.chiPhi.luongChuyen;
      summary.costBreakdown.benBaiAnUong += t.chiPhi.benBaiAnUong;
    });

    summary.totalProfit = summary.totalRevenue - summary.totalOperatingCost;
    const activeTripsCount = this.filteredTrips.filter(t => t.trangThai !== 'cancelled').length;
    summary.avgOccupancy = activeTripsCount > 0 ? Math.round(totalOccupancySum / activeTripsCount) : 0;

    this.summary = summary;
  }

  calculateTopRoutes() {
    const routeMap = new Map<string, { revenue: number; trips: number; profit: number; occupancySum: number }>();

    this.filteredTrips.forEach(t => {
      if (!routeMap.has(t.tuyenXe)) {
        routeMap.set(t.tuyenXe, { revenue: 0, trips: 0, profit: 0, occupancySum: 0 });
      }
      const item = routeMap.get(t.tuyenXe)!;
      item.revenue += t.doanhThuVe;
      item.trips++;
      item.profit += this.getTripProfit(t);
      item.occupancySum += t.tyLeLapDay;
    });

    const list = Array.from(routeMap.entries()).map(([name, val]) => ({
      name,
      revenue: val.revenue,
      trips: val.trips,
      profit: val.profit,
      occupancy: val.trips > 0 ? Math.round(val.occupancySum / val.trips) : 0
    }));

    // Sort by revenue descending and pick Top 5
    list.sort((a, b) => b.revenue - a.revenue);
    this.topRoutes = list.slice(0, 5);
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
      fromDate: this.getInitialFromDate(),
      toDate: this.getInitialToDate(),
      tuyenXe: 'Tất cả các tuyến',
      bienSo: 'Tất cả xe',
      trangThai: 'Tất cả trạng thái'
    };
    this.dateValidationError = '';
    this.onViewReport();
  }

  openTripDetail(trip: ChuyenXeReportItem) {
    this.selectedDetailTrip = trip;
  }

  closeTripDetail() {
    this.selectedDetailTrip = null;
  }

  getTripCost(chiPhi: ChiPhiVanHanh): number {
    return chiPhi.nhienLieu + chiPhi.cauDuongBOT + chiPhi.luongChuyen + chiPhi.benBaiAnUong;
  }

  getTripProfit(t: ChuyenXeReportItem): number {
    return t.doanhThuVe - this.getTripCost(t.chiPhi);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
  }

  exportReport(format: 'excel' | 'csv') {
    if (this.filteredTrips.length === 0) {
      alert('Không có dữ liệu để xuất báo cáo!');
      return;
    }

    let csvContent = '\uFEFF';
    csvContent += 'BÁO CÁO CHI TIẾT VẬN HÀNH VÀ LỢI NHUẬN TUYẾN XE VIAGO\n';
    csvContent += `Phạm vi dữ liệu: ${this.filters.fromDate} đến ${this.filters.toDate} | Tuyến: ${this.filters.tuyenXe} | Trạng thái: ${this.filters.trangThai}\n\n`;
    csvContent += 'Mã chuyến,Tuyến đường,Biển số,Loại xe,Ngày khởi hành,Giờ khởi hành,Số khách/Ghế,Doanh thu vé,Tổng chi phí,Nhiên liệu,Phí BOT,Lương chuyến,Bến bãi,Lợi nhuận tuyến,Tài xế chính,Phụ xe,Trạng thái\n';

    this.filteredTrips.forEach(t => {
      const totalCost = this.getTripCost(t.chiPhi);
      const profit = this.getTripProfit(t);
      csvContent += `${t.maChuyen},${t.tuyenXe},${t.bienSo},${t.loaiXe},${t.khoiHanhDate},${t.khoiHanhTime},${t.soKhach}/${t.tongGhe},${t.doanhThuVe},${totalCost},${t.chiPhi.nhienLieu},${t.chiPhi.cauDuongBOT},${t.chiPhi.luongChuyen},${t.chiPhi.benBaiAnUong},${profit},${t.taiXeChinh},${t.phuXe},${t.trangThai}\n`;
    });

    const ext = format === 'excel' ? 'xlsx' : 'csv';
    const mime = format === 'excel' ? 'application/vnd.ms-excel;charset=utf-8;' : 'text/csv;charset=utf-8;';
    const blob = new Blob([csvContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `BaoCaoChiTietDoanhThu_${this.filters.fromDate}_${this.filters.toDate}.${ext}`);
    link.click();
  }
}
