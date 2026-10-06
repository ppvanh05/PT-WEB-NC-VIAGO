import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ScheduleItem {
  id: number;
  routeName: string;
  startPoint: string;
  endPoint: string;
  licensePlate: string;
  carName: string;
  driverName: string;
  codriverName: string;
  departureDate: string;
  departureTime: string;
  duration: string;
  status: 'running' | 'waiting' | 'completed' | 'locked';
  seatsCount: number;
  price: number;
}

export interface RouteDetail {
  name: string;
  startPoint: string;
  endPoint: string;
  duration: string;
  price: number;
  pickupPoints: string[];
  stops: string[];
}

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedules.html',
  styleUrls: ['./schedules.css']
})
export class SchedulesComponent implements OnInit {
  activeTab: 'all' | 'running' | 'waiting' | 'completed' | 'locked' = 'all';
  routeFilter = '';
  searchQuery = '';
  sortBy = 'priority';

  selectedDateFilter = '';
  startPointFilter = '';
  endPointFilter = '';

  startPointsList: string[] = [];
  endPointsList: string[] = [];
  routesList: string[] = [];

  allTrips: ScheduleItem[] = [];
  baseFilteredTrips: ScheduleItem[] = [];
  filteredTrips: ScheduleItem[] = [];
  paginatedTrips: ScheduleItem[] = [];

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  isModalOpen = false;
  modalActiveTab: 'setup-car' | 'setup-time' = 'setup-car';
  isEditMode = false;
  currentTrip: Partial<ScheduleItem> = {};
  errors: { [key: string]: boolean } = {};

  routesDb: RouteDetail[] = [
    { name: 'TP.HCM ↔ Cần Thơ', startPoint: 'TP.HCM', endPoint: 'Cần Thơ', duration: '3.5 tiếng', price: 180000, pickupPoints: ['Bến xe Miền Đông Mới', 'Bến xe Miền Tây', 'Bến xe Trung tâm Cần Thơ'], stops: ['Trung Lương', 'Vĩnh Long'] },
    { name: 'TP.HCM ↔ Vũng Tàu', startPoint: 'TP.HCM', endPoint: 'Bà Rịa - Vũng Tàu', duration: '2 tiếng', price: 160000, pickupPoints: ['Bến xe Miền Đông Mới', 'Bến xe Vũng Tàu'], stops: ['Long Thành', 'Bà Rịa'] },
    { name: 'Đà Lạt ↔ Buôn Ma Thuột', startPoint: 'Lâm Đồng', endPoint: 'Đắc Lắc', duration: '5 tiếng', price: 220000, pickupPoints: ['Bến xe Liên Tỉnh Đà Lạt', 'Bến xe Phía Nam Buôn Ma Thuột'], stops: ['Liên Khương', 'Krông Pắc'] },
    { name: 'Đà Lạt ↔ Nha Trang', startPoint: 'Lâm Đồng', endPoint: 'Khánh Hòa', duration: '3 tiếng', price: 170000, pickupPoints: ['Bến xe Liên Tỉnh Đà Lạt', 'Bến xe phía Nam Nha Trang'], stops: ['Khánh Vĩnh'] },
    { name: 'Cần Thơ ↔ Rạch Giá', startPoint: 'Cần Thơ', endPoint: 'Kiên Giang', duration: '2.5 tiếng', price: 150000, pickupPoints: ['Bến xe Trung tâm Cần Thơ', 'Bến xe Rạch Giá'], stops: ['Thốt Nốt', 'Long Xuyên'] },
    { name: 'TP.HCM ↔ Phan Thiết', startPoint: 'TP.HCM', endPoint: 'Bình Thuận', duration: '4 tiếng', price: 200000, pickupPoints: ['Bến xe Miền Đông Mới', 'Bến xe Phan Thiết'], stops: ['Long Thành', 'Dầu Giây'] },
    { name: 'TP.HCM ↔ Đà Lạt', startPoint: 'TP.HCM', endPoint: 'Lâm Đồng', duration: '7 tiếng', price: 250000, pickupPoints: ['Bến xe Miền Đông Mới', 'Bến xe Liên Tỉnh Đà Lạt'], stops: ['Dầu Giây', 'Bảo Lộc', 'Di Linh'] },
    { name: 'TP.HCM ↔ Nha Trang', startPoint: 'TP.HCM', endPoint: 'Khánh Hòa', duration: '8.5 tiếng', price: 300000, pickupPoints: ['Bến xe Miền Đông Mới', 'Bến xe phía Nam Nha Trang'], stops: ['Dầu Giây', 'Phan Thiết', 'Cam Ranh'] }
  ];

  driversList = [
    { name: 'Trần Hoàng Long', locked: false },
    { name: 'Nguyễn Văn Nam', locked: false },
    { name: 'Lê Hoàng Hải', locked: false },
    { name: 'Phạm Minh Đức', locked: false },
    { name: 'Bùi Công Danh', locked: true }, // Locked driver
    { name: 'Nguyễn Tiến Dũng', locked: false },
    { name: 'Phạm Thanh Sơn', locked: false },
    { name: 'Lê Minh Tuấn', locked: false }
  ];

  codriversList = [
    { name: 'Lê Thế Hùng', locked: false },
    { name: 'Nguyễn Đức Minh', locked: false },
    { name: 'Đỗ Hoàng Sơn', locked: false },
    { name: 'Vũ Gia Bảo', locked: true }, // Locked codriver
    { name: 'Phạm Công Thành', locked: false }
  ];

  carsList = ['Limousine VIP', 'Giường nằm 36', 'Cabin VIP 24', 'Ghế ngồi Premium'];
  platesDb: { [key: string]: { plate: string; seats: number } } = {
    'Limousine VIP': { plate: '77B-098.42', seats: 22 },
    'Giường nằm 36': { plate: '77B-051.14', seats: 36 },
    'Cabin VIP 24': { plate: '77B-099.99', seats: 24 },
    'Ghế ngồi Premium': { plate: '77B-020.82', seats: 28 }
  };

  selectedPickups: string[] = [];
  selectedStops: string[] = [];

  showSuccessToast = false;
  toastMessage = '';

  ngOnInit() {
    this.initMockData();
    this.extractFilterLists();
    this.filterTrips();
  }

  extractFilterLists() {
    this.routesList = this.routesDb.map(r => r.name);
    this.startPointsList = Array.from(new Set(this.routesDb.map(r => r.startPoint)));
    this.endPointsList = Array.from(new Set(this.routesDb.map(r => r.endPoint)));
  }

  initMockData() {
    this.allTrips = [
      {
        id: 1,
        routeName: 'TP.HCM ↔ Đà Lạt',
        startPoint: 'TP.HCM',
        endPoint: 'Lâm Đồng',
        licensePlate: '77B-098.42',
        carName: 'Limousine VIP',
        driverName: 'Trần Hoàng Long',
        codriverName: 'Lê Thế Hùng',
        departureDate: '2026-10-06',
        departureTime: '21:00',
        duration: '7 tiếng',
        status: 'running',
        seatsCount: 22,
        price: 250000
      },
      {
        id: 2,
        routeName: 'TP.HCM ↔ Cần Thơ',
        startPoint: 'TP.HCM',
        endPoint: 'Cần Thơ',
        licensePlate: '77B-051.14',
        carName: 'Giường nằm 36',
        driverName: 'Nguyễn Văn Nam',
        codriverName: 'Nguyễn Đức Minh',
        departureDate: '2026-10-07',
        departureTime: '08:00',
        duration: '3.5 tiếng',
        status: 'waiting',
        seatsCount: 36,
        price: 180000
      },
      {
        id: 3,
        routeName: 'Đà Lạt ↔ Nha Trang',
        startPoint: 'Lâm Đồng',
        endPoint: 'Khánh Hòa',
        licensePlate: '77B-099.99',
        carName: 'Cabin VIP 24',
        driverName: 'Lê Hoàng Hải',
        codriverName: 'Đỗ Hoàng Sơn',
        departureDate: '2026-10-05',
        departureTime: '14:00',
        duration: '3 tiếng',
        status: 'completed',
        seatsCount: 24,
        price: 170000
      },
      {
        id: 4,
        routeName: 'TP.HCM ↔ Vũng Tàu',
        startPoint: 'TP.HCM',
        endPoint: 'Bà Rịa - Vũng Tàu',
        licensePlate: '77B-020.82',
        carName: 'Ghế ngồi Premium',
        driverName: 'Phạm Minh Đức',
        codriverName: 'Phạm Công Thành',
        departureDate: '2026-10-08',
        departureTime: '06:30',
        duration: '2 tiếng',
        status: 'locked',
        seatsCount: 28,
        price: 160000
      }
    ];
  }

  setTab(tab: 'all' | 'running' | 'waiting' | 'completed' | 'locked') {
    this.activeTab = tab;
    this.filterTrips();
  }

  filterTrips() {
    this.baseFilteredTrips = this.allTrips.filter(t => {
      if (this.routeFilter && t.routeName !== this.routeFilter) return false;
      if (this.selectedDateFilter && t.departureDate !== this.selectedDateFilter) return false;
      if (this.startPointFilter && t.startPoint !== this.startPointFilter) return false;
      if (this.endPointFilter && t.endPoint !== this.endPointFilter) return false;

      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const matchRoute = t.routeName.toLowerCase().includes(q);
        const matchPlate = t.licensePlate.toLowerCase().includes(q);
        const matchDriver = t.driverName.toLowerCase().includes(q);
        if (!matchRoute && !matchPlate && !matchDriver) return false;
      }

      return true;
    });

    this.filteredTrips = this.baseFilteredTrips.filter(t => {
      if (this.activeTab !== 'all' && t.status !== this.activeTab) return false;
      return true;
    });

    // Sort priority logic (running -> waiting -> completed -> locked)
    if (this.sortBy === 'priority') {
      const priorityMap = { running: 1, waiting: 2, completed: 3, locked: 4 };
      this.filteredTrips.sort((a, b) => priorityMap[a.status] - priorityMap[b.status]);
    } else if (this.sortBy === 'time-asc') {
      this.filteredTrips.sort((a, b) => (a.departureDate + a.departureTime).localeCompare(b.departureDate + b.departureTime));
    } else if (this.sortBy === 'time-desc') {
      this.filteredTrips.sort((a, b) => (b.departureDate + b.departureTime).localeCompare(a.departureDate + a.departureTime));
    } else if (this.sortBy === 'price-asc') {
      this.filteredTrips.sort((a, b) => a.price - b.price);
    } else if (this.sortBy === 'price-desc') {
      this.filteredTrips.sort((a, b) => b.price - a.price);
    }

    this.currentPage = 1;
    this.updatePaginatedTrips();
  }

  updatePaginatedTrips() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredTrips.length / this.pageSize));
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedTrips = this.filteredTrips.slice(start, start + this.pageSize);
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedTrips();
    }
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    return pages;
  }

  clearFilters() {
    this.routeFilter = '';
    this.searchQuery = '';
    this.selectedDateFilter = '';
    this.startPointFilter = '';
    this.endPointFilter = '';
    this.sortBy = 'priority';
    this.filterTrips();
  }

  openAddModal() {
    this.isEditMode = false;
    this.currentTrip = {
      routeName: '',
      carName: '',
      licensePlate: '',
      driverName: '',
      codriverName: '',
      departureDate: new Date().toISOString().substring(0, 10),
      departureTime: '08:00',
      status: 'waiting',
      seatsCount: 22,
      price: 180000
    };
    this.selectedPickups = [];
    this.selectedStops = [];
    this.errors = {};
    this.modalActiveTab = 'setup-car';
    this.isModalOpen = true;
  }

  openEditModal(trip: ScheduleItem, event: Event) {
    event.stopPropagation();
    this.isEditMode = true;
    this.currentTrip = JSON.parse(JSON.stringify(trip));
    this.onRouteChange();
    this.errors = {};
    this.modalActiveTab = 'setup-car';
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  onCarChange() {
    if (this.currentTrip.carName && this.platesDb[this.currentTrip.carName]) {
      const data = this.platesDb[this.currentTrip.carName];
      this.currentTrip.licensePlate = data.plate;
      this.currentTrip.seatsCount = data.seats;
    }
  }

  onRouteChange() {
    if (this.currentTrip.routeName) {
      const route = this.routesDb.find(r => r.name === this.currentTrip.routeName);
      if (route) {
        this.currentTrip.price = route.price;
        this.currentTrip.duration = route.duration;
        this.currentTrip.startPoint = route.startPoint;
        this.currentTrip.endPoint = route.endPoint;
        this.selectedPickups = [...route.pickupPoints];
        this.selectedStops = [...route.stops];
      }
    }
  }

  nextStep() {
    this.errors = {
      routeName: !this.currentTrip.routeName,
      carName: !this.currentTrip.carName,
      driverName: !this.currentTrip.driverName
    };

    if (Object.values(this.errors).some(Boolean)) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc!');
      return;
    }

    this.modalActiveTab = 'setup-time';
  }

  saveTrip() {
    if (!this.currentTrip.departureDate || !this.currentTrip.departureTime) {
      alert('Vui lòng chọn ngày và giờ khởi hành!');
      return;
    }

    if (this.isEditMode) {
      const idx = this.allTrips.findIndex(t => t.id === this.currentTrip.id);
      if (idx > -1) {
        this.allTrips[idx] = this.currentTrip as ScheduleItem;
      }
      this.showToast('Cập nhật lịch trình thành công!');
    } else {
      const newTrip: ScheduleItem = {
        ...(this.currentTrip as ScheduleItem),
        id: this.allTrips.length > 0 ? Math.max(...this.allTrips.map(t => t.id)) + 1 : 1
      };
      this.allTrips.push(newTrip);
      this.showToast('Tạo lịch trình mới thành công!');
    }

    this.filterTrips();
    this.closeModal();
  }

  toggleLockStatus(trip: ScheduleItem, event: Event) {
    event.stopPropagation();
    if (trip.status === 'locked') {
      trip.status = 'waiting';
      this.showToast(`Đã mở khóa lịch chạy chuyến #${trip.id}`);
    } else {
      trip.status = 'locked';
      this.showToast(`Đã khóa lịch chạy chuyến #${trip.id}`);
    }
    this.filterTrips();
  }

  showToast(msg: string) {
    this.toastMessage = msg;
    this.showSuccessToast = true;
    setTimeout(() => {
      this.showSuccessToast = false;
    }, 2500);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(value)
      .replace('₫', 'đ');
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'running': return 'badge-running';
      case 'waiting': return 'badge-waiting';
      case 'completed': return 'badge-completed';
      case 'locked': return 'badge-locked';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'running': return 'Đang chạy';
      case 'waiting': return 'Chờ khởi hành';
      case 'completed': return 'Hoàn thành';
      case 'locked': return 'Đang khóa';
      default: return status;
    }
  }

  getRunningCount() { return this.baseFilteredTrips.filter(t => t.status === 'running').length; }
  getWaitingCount() { return this.baseFilteredTrips.filter(t => t.status === 'waiting').length; }
  getCompletedCount() { return this.baseFilteredTrips.filter(t => t.status === 'completed').length; }
  getLockedCount() { return this.baseFilteredTrips.filter(t => t.status === 'locked').length; }
}
