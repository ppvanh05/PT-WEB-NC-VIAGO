import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../core/services/toast.service';

export interface LichTrinh {
  id: number;
  routeName: string; // Tuyến đường
  startPoint: string;
  endPoint: string;
  licensePlate: string; // Biển số xe
  carName: string; // Tên xe
  driverName: string; // Tài xế
  codriverName: string; // Phụ xe
  departureDate: string; // Ngày khởi hành
  departureTime: string; // Giờ khởi hành
  duration: string; // Thời gian đi
  status: 'running' | 'waiting' | 'completed' | 'locked'; // Trạng thái
  seatsCount: number; // Số chỗ
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
  protected readonly toastService = inject(ToastService);

  activeTab: 'all' | 'running' | 'waiting' | 'completed' | 'locked' = 'all';
  routeFilter = '';
  searchQuery = '';
  sortBy = 'time-desc';

  // Date strip filter
  selectedDateFilter = '';
  dateStripDays: { label: string; dateStr: string; dayNum: string; monthStr: string }[] = [];

  // Route filters
  startPointFilter = '';
  endPointFilter = '';
  startPointsList: string[] = [];
  endPointsList: string[] = [];

  // Month filter
  selectedMonthFilter = '';

  // Dynamic filter lists
  routesList: string[] = [];
  allTrips: LichTrinh[] = [];
  baseFilteredTrips: LichTrinh[] = [];
  filteredTrips: LichTrinh[] = [];
  paginatedTrips: LichTrinh[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Modal control
  isModalOpen = false;
  modalActiveTab: 'setup-car' | 'setup-time' = 'setup-car';
  isEditMode = false;
  currentTrip: Partial<LichTrinh> = {};
  errors: { [key: string]: boolean } = {};

  // Form options
  routesDb: RouteDetail[] = [
    { name: 'TP.HCM ↔ Cần Thơ', startPoint: 'TP.HCM', endPoint: 'Cần Thơ', duration: '3.5 tiếng', price: 180000, pickupPoints: ['Bến xe Miền Đông Mới', 'Bến xe Miền Tây', 'Bến xe Trung tâm Cần Thơ'], stops: ['Trung Lương', 'Vĩnh Long'] },
    { name: 'TP.HCM ↔ Vũng Tàu', startPoint: 'TP.HCM', endPoint: 'Bà Rịa - Vũng Tàu', duration: '2 tiếng', price: 160000, pickupPoints: ['Bến xe Miền Đông Mới', 'Bến xe Vũng Tàu'], stops: ['Long Thành', 'Bà Rịa'] },
    { name: 'Đà Lạt ↔ Buôn Ma Thuột', startPoint: 'Lâm Đồng', endPoint: 'Đắk Lắk', duration: '5 tiếng', price: 220000, pickupPoints: ['Bến xe Liên Tỉnh Đà Lạt', 'Bến xe Phía Nam Buôn Ma Thuột'], stops: ['Liên Khương', 'Krông Pắc'] },
    { name: 'Đà Lạt ↔ Nha Trang', startPoint: 'Lâm Đồng', endPoint: 'Khánh Hòa', duration: '3 tiếng', price: 170000, pickupPoints: ['Bến xe Liên Tỉnh Đà Lạt', 'Bến xe phía Nam Nha Trang'], stops: ['Khánh Vĩnh'] },
    { name: 'Cần Thơ ↔ Rạch Giá', startPoint: 'Cần Thơ', endPoint: 'Kiên Giang', duration: '2.5 tiếng', price: 150000, pickupPoints: ['Bến xe Trung tâm Cần Thơ', 'Bến xe Rạch Giá'], stops: ['Thốt Nốt', 'Long Xuyên'] },
    { name: 'TP.HCM ↔ Phan Thiết', startPoint: 'TP.HCM', endPoint: 'Bình Thuận', duration: '4 tiếng', price: 200000, pickupPoints: ['Bến xe Miền Đông Mới', 'Bến xe Phan Thiết'], stops: ['Long Thành', 'Dầu Giây'] },
    { name: 'TP.HCM ↔ Đà Lạt', startPoint: 'TP.HCM', endPoint: 'Lâm Đồng', duration: '7 tiếng', price: 250000, pickupPoints: ['Bến xe Miền Đông Mới', 'Bến xe Liên Tỉnh Đà Lạt'], stops: ['Dầu Giây', 'Bảo Lộc', 'Di Linh'] },
    { name: 'TP.HCM ↔ Nha Trang', startPoint: 'TP.HCM', endPoint: 'Khánh Hòa', duration: '8.5 tiếng', price: 300000, pickupPoints: ['Bến xe Miền Đông Mới', 'Bến xe phía Nam Nha Trang'], stops: ['Dầu Giây', 'Phan Thiết', 'Cam Ranh'] },
    { name: 'Nha Trang ↔ Đà Nẵng', startPoint: 'Khánh Hòa', endPoint: 'Đà Nẵng', duration: '11 tiếng', price: 350000, pickupPoints: ['Bến xe phía Nam Nha Trang', 'Bến xe Trung tâm Đà Nẵng'], stops: ['Cam Ranh', 'Quy Nhơn', 'Quảng Ngãi'] }
  ];

  driversList = [
    'Trần Hoàng Long', 'Nguyễn Văn Nam', 'Lê Hoàng Hải', 'Phạm Minh Đức', 'Bùi Công Danh',
    'Nguyễn Tiến Dũng', 'Phạm Thanh Sơn', 'Lê Minh Tuấn', 'Vũ Quốc Khánh', 'Đỗ Anh Đức',
    'Hoàng Văn Thái', 'Nguyễn Mạnh Hùng', 'Phan Thanh Hải', 'Bùi Xuân Trường', 'Trần Hữu Khang',
    'Đặng Hoàng Gia', 'Lý Huỳnh Đức', 'Trần Minh Quân', 'Nguyễn Tấn Đạt', 'Lê Hồng Phong'
  ];
  codriversList = [
    'Lê Thế Hùng', 'Nguyễn Đức Minh', 'Đỗ Hoàng Sơn', 'Vũ Gia Bảo',
    'Phạm Công Thành', 'Nguyễn Hữu Thọ', 'Trần Văn Kiệt', 'Bùi Tiến Dũng'
  ];
  carsList = ['Limousine 1', 'Limousine 2', 'Limousine 3', 'Giường nằm 1', 'Cabin VIP'];
  platesDb: { [key: string]: { plate: string; seats: number } } = {
    'Limousine 1': { plate: '77B-09842', seats: 22 },
    'Limousine 2': { plate: '77B-08021', seats: 22 },
    'Limousine 3': { plate: '77B-02082', seats: 22 },
    'Giường nằm 1': { plate: '77B-05114', seats: 36 },
    'Cabin VIP': { plate: '77B-09999', seats: 24 }
  };

  lowerSeats: string[] = [];
  upperSeats: string[] = [];

  openDaysBefore = 10;
  closeMinutesBefore = 30;
  holdMinutes = 15;
  selectedPickups: string[] = [];
  selectedStops: string[] = [];

  toasts: { id: number; message: string; type: 'success' | 'error' }[] = [];
  toastCounter = 0;
  showCenteredToast = false;
  centeredToastTitle = '';
  centeredToastSubtitle = '';

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.initMockData();
    this.extractRoutesList();
    this.initDateStrip();
    this.extractPointsList();
    this.filterTrips();
    this.generateSeatMap(22);
  }

  extractPointsList() {
    this.startPointsList = Array.from(new Set(this.routesDb.map(r => r.startPoint)));
    this.endPointsList = Array.from(new Set(this.routesDb.map(r => r.endPoint)));
  }

  initDateStrip() {
    this.dateStripDays = [
      { label: 'Th 2', dateStr: '2026-10-05', dayNum: '05', monthStr: 'T10' },
      { label: 'Th 3', dateStr: '2026-10-06', dayNum: '06', monthStr: 'T10' },
      { label: 'Th 4', dateStr: '2026-10-07', dayNum: '07', monthStr: 'T10' },
      { label: 'Th 5', dateStr: '2026-10-08', dayNum: '08', monthStr: 'T10' },
      { label: 'Th 6', dateStr: '2026-10-09', dayNum: '09', monthStr: 'T10' },
      { label: 'T 7', dateStr: '2026-10-10', dayNum: '10', monthStr: 'T10' },
      { label: 'CN', dateStr: '2026-10-11', dayNum: '11', monthStr: 'T10' }
    ];
  }

  initMockData() {
    this.allTrips = [];
    const routes = this.routesDb;
    const cars = this.carsList;
    const drivers = this.driversList;
    const codrivers = this.codriversList;
    
    const dates: string[] = [];
    const start = new Date('2026-09-15');
    const end = new Date('2026-11-30');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().substring(0, 10));
    }
    
    const times = ['05:00', '09:00', '13:30', '17:45', '21:00'];
    let id = 1;
    
    dates.forEach((date, dateIdx) => {
      times.forEach((time, timeIdx) => {
        const route = routes[(dateIdx * 3 + timeIdx) % routes.length];
        const car = cars[(timeIdx * 2) % cars.length];
        const driver = drivers[(dateIdx * 4 + timeIdx) % drivers.length];
        const codriver = codrivers[(dateIdx * 2 + timeIdx) % codrivers.length];
        const plate = this.platesDb[car].plate;
        const seats = this.platesDb[car].seats;

        let status: 'running' | 'waiting' | 'completed' | 'locked' = 'waiting';
        if (date < '2026-10-07') {
          status = 'completed';
        } else if (date === '2026-10-07') {
          status = 'running';
        } else {
          status = (id % 15 === 0) ? 'locked' : 'waiting';
        }

        this.allTrips.push({
          id,
          routeName: route.name,
          startPoint: route.startPoint,
          endPoint: route.endPoint,
          licensePlate: plate,
          carName: car,
          driverName: driver,
          codriverName: codriver,
          departureDate: date,
          departureTime: time,
          duration: route.duration,
          status,
          seatsCount: seats,
          price: route.price
        });
        id++;
      });
    });
  }

  extractRoutesList() {
    this.routesList = this.routesDb.map(r => r.name);
  }

  setTab(tab: 'all' | 'running' | 'waiting' | 'completed' | 'locked') {
    this.activeTab = tab;
    this.filterTrips();
  }

  removeAccents(str: string): string {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  }

  updateTripStatusesAutomatically() {
    const now = new Date();
    // Use the current local date (YYYY-MM-DD)
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().substring(0, 10);
    // Use current local time HH:mm
    const currentTimeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    this.allTrips.forEach(trip => {
      // Preserve manually locked status
      if (trip.status === 'locked') return;

      const tripDate = trip.departureDate || '';
      const tripTime = trip.departureTime || '08:00';
      const durationHours = parseFloat(trip.duration) || 3;

      // Calculate approximate end time
      const [h, m] = tripTime.split(':').map(Number);
      const endTotalMinutes = h * 60 + m + Math.round(durationHours * 60);
      const endH = Math.floor(endTotalMinutes / 60);
      const endM = endTotalMinutes % 60;
      
      // If end time passes midnight, we just assume it's next day for comparison
      // but for simplicity, we can just compare Date objects
      const tripDateTime = new Date(`${tripDate}T${tripTime}:00`);
      const tripEndDateTime = new Date(tripDateTime.getTime() + durationHours * 3600000);

      if (now < tripDateTime) {
        trip.status = 'waiting';
      } else if (now >= tripDateTime && now <= tripEndDateTime) {
        trip.status = 'running';
      } else {
        trip.status = 'completed';
      }
    });
  }

  filterTrips() {
    this.updateTripStatusesAutomatically();

    this.baseFilteredTrips = this.allTrips.filter(t => {
      if (this.routeFilter && t.routeName !== this.routeFilter) return false;
      if (this.selectedDateFilter && t.departureDate !== this.selectedDateFilter) return false;
      if (this.startPointFilter && t.startPoint !== this.startPointFilter) return false;
      if (this.endPointFilter && t.endPoint !== this.endPointFilter) return false;
      if (this.selectedMonthFilter && !t.departureDate.startsWith(this.selectedMonthFilter)) return false;

      if (this.searchQuery) {
        const query = this.removeAccents(this.searchQuery.trim());
        const matchesRoute = this.removeAccents(t.routeName).includes(query);
        const matchesPlate = this.removeAccents(t.licensePlate).includes(query);
        const matchesDriver = this.removeAccents(t.driverName).includes(query);
        const matchesCodriver = this.removeAccents(t.codriverName || '').includes(query);
        const matchesCar = this.removeAccents(t.carName).includes(query);
        const matchesStart = this.removeAccents(t.startPoint).includes(query);
        const matchesEnd = this.removeAccents(t.endPoint).includes(query);
        if (!matchesRoute && !matchesPlate && !matchesDriver && !matchesCodriver && !matchesCar && !matchesStart && !matchesEnd) return false;
      }

      return true;
    });

    this.filteredTrips = this.baseFilteredTrips.filter(t => {
      if (this.activeTab !== 'all' && t.status !== this.activeTab) return false;
      return true;
    });

    if (this.sortBy === 'time-asc') {
      this.filteredTrips.sort((a, b) => (a.departureDate + ' ' + a.departureTime).localeCompare(b.departureDate + ' ' + b.departureTime));
    } else if (this.sortBy === 'time-desc') {
      this.filteredTrips.sort((a, b) => (b.departureDate + ' ' + b.departureTime).localeCompare(a.departureDate + ' ' + a.departureTime));
    } else if (this.sortBy === 'price-asc') {
      this.filteredTrips.sort((a, b) => a.price - b.price);
    } else if (this.sortBy === 'price-desc') {
      this.filteredTrips.sort((a, b) => b.price - a.price);
    } else if (this.sortBy === 'default' || this.sortBy === 'time-desc') {
      this.filteredTrips.sort((a, b) => {
        const statusRank: Record<string, number> = {
          'running': 1,
          'waiting': 2,
          'completed': 3,
          'locked': 4
        };
        
        const rankA = statusRank[a.status] || 5;
        const rankB = statusRank[b.status] || 5;

        if (rankA !== rankB) {
          return rankA - rankB;
        }

        const timeA = a.departureDate + ' ' + a.departureTime;
        const timeB = b.departureDate + ' ' + b.departureTime;

        if (a.status === 'completed' || a.status === 'locked') {
          // Sort descending for past trips
          return timeB.localeCompare(timeA);
        } else {
          // Sort ascending for upcoming/running trips
          return timeA.localeCompare(timeB);
        }
      });
    }

    this.currentPage = 1;
    this.updatePaginatedTrips();
  }

  updatePaginatedTrips() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredTrips.length / this.pageSize));
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedTrips = this.filteredTrips.slice(startIndex, startIndex + this.pageSize);
  }

  setPage(page: number | string) {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedTrips();
    }
  }

  getPaginationItems(): (number | string)[] {
    const groupStart = Math.floor((this.currentPage - 1) / 3) * 3 + 1;
    const groupEnd = Math.min(groupStart + 2, this.totalPages);
    return Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i);
  }

  onMonthChange() {
    if (this.selectedMonthFilter === '2026-07') {
      this.dateStripDays = [
        { label: 'Th 4', dateStr: '2026-07-01', dayNum: '01', monthStr: 'T07' },
        { label: 'Th 5', dateStr: '2026-07-02', dayNum: '02', monthStr: 'T07' },
        { label: 'Th 6', dateStr: '2026-07-03', dayNum: '03', monthStr: 'T07' },
        { label: 'T 7', dateStr: '2026-07-04', dayNum: '04', monthStr: 'T07' },
        { label: 'CN', dateStr: '2026-07-05', dayNum: '05', monthStr: 'T07' },
        { label: 'Th 2', dateStr: '2026-07-06', dayNum: '06', monthStr: 'T07' },
        { label: 'Th 3', dateStr: '2026-07-07', dayNum: '07', monthStr: 'T07' }
      ];
    } else {
      this.initDateStrip();
    }
    this.selectedDateFilter = '';
    this.filterTrips();
  }

  selectDate(dateStr: string) {
    this.selectedDateFilter = dateStr;
    this.filterTrips();
  }

  clearRouteFilters() {
    this.selectedDateFilter = '';
    this.startPointFilter = '';
    this.endPointFilter = '';
    this.filterTrips();
  }

  clearFilters() {
    this.routeFilter = '';
    this.searchQuery = '';
    this.sortBy = 'default';
    this.selectedDateFilter = '';
    this.selectedMonthFilter = '';
    this.startPointFilter = '';
    this.endPointFilter = '';
    this.initDateStrip();
    this.filterTrips();
    this.toastService.showSuccess('Đã xóa tất cả bộ lọc tìm kiếm!');
  }

  getTripProgress(trip: LichTrinh): number {
    if (trip.status === 'completed') return 100;
    if (trip.status === 'waiting' || trip.status === 'locked') return 0;
    if (trip.status === 'running') {
      try {
        const departure = new Date(`${trip.departureDate}T${trip.departureTime}:00`);
        const now = new Date();
        const durationHours = parseFloat(trip.duration);
        const durationMs = durationHours * 60 * 60 * 1000;
        const elapsedMs = now.getTime() - departure.getTime();
        if (elapsedMs <= 0) return 8;
        if (elapsedMs >= durationMs) return 96;
        return Math.min(Math.round((elapsedMs / durationMs) * 100), 98);
      } catch (e) {
        return 40;
      }
    }
    return 0;
  }

  getForecastedRevenue(): number {
    return this.baseFilteredTrips
      .filter(t => t.status !== 'locked')
      .reduce((sum, t) => sum + (t.price * t.seatsCount), 0);
  }

  getMostBookedRoute(): string {
    if (this.baseFilteredTrips.length === 0) return 'Không có';
    const routeCounts: { [key: string]: number } = {};
    this.baseFilteredTrips.forEach(t => {
      routeCounts[t.routeName] = (routeCounts[t.routeName] || 0) + 1;
    });
    let mostBooked = '';
    let maxCount = -1;
    for (const route in routeCounts) {
      if (routeCounts[route] > maxCount) {
        maxCount = routeCounts[route];
        mostBooked = route;
      }
    }
    return mostBooked ? `${mostBooked} (${maxCount} chuyến)` : 'Không có';
  }

  getDispatchedDriversCount(): number {
    const activeDrivers = new Set<string>();
    this.baseFilteredTrips.forEach(t => {
      if (t.status === 'running' || t.status === 'waiting') {
        if (t.driverName) activeDrivers.add(t.driverName);
      }
    });
    return activeDrivers.size;
  }

  minAllowedDate: string = '';

  triggerCenteredToast(title: string, subtitle: string) {
    this.centeredToastTitle = title;
    this.centeredToastSubtitle = subtitle;
    this.showCenteredToast = true;
    setTimeout(() => {
      this.showCenteredToast = false;
      this.closeModal();
    }, 1800);
  }

  getMinAllowedDate(): string {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 7);
    return minDate.toISOString().substring(0, 10);
  }

  openAddModal() {
    this.minAllowedDate = this.getMinAllowedDate();
    this.isEditMode = false;
    this.currentTrip = {
      routeName: '',
      carName: '',
      licensePlate: '',
      driverName: '',
      codriverName: '',
      departureDate: this.minAllowedDate,
      departureTime: '08:00',
      status: 'waiting',
      seatsCount: 22,
      price: 150000
    };
    this.selectedPickups = [];
    this.selectedStops = [];
    this.errors = {};
    this.modalActiveTab = 'setup-time';
    this.isModalOpen = true;
  }

  openEditModal(trip: LichTrinh, event: Event) {
    event.stopPropagation();
    this.minAllowedDate = this.getMinAllowedDate();
    this.isEditMode = true;
    this.currentTrip = JSON.parse(JSON.stringify(trip));
    this.selectedPickups = this.getRoutePickups();
    this.selectedStops = this.getRouteStops();
    this.errors = {};
    this.modalActiveTab = 'setup-time';
    this.isModalOpen = true;
    this.generateSeatMap(trip.seatsCount);
  }

  closeModal() {
    this.isModalOpen = false;
  }

  onCarChange() {
    if (this.currentTrip.carName && this.platesDb[this.currentTrip.carName]) {
      const data = this.platesDb[this.currentTrip.carName];
      this.currentTrip.licensePlate = data.plate;
      this.currentTrip.seatsCount = data.seats;
      this.generateSeatMap(data.seats);
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

  getEstimatedStopHour(idx: number, isStop: boolean = false): number {
    if (!this.currentTrip.departureTime) return 8;
    const [h] = this.currentTrip.departureTime.split(':').map(Number);
    const offset = isStop ? (idx + 1) * 2 : idx * 1.5;
    return Math.floor((h + offset) % 24);
  }

  getEstimatedStopMinute(idx: number, isStop: boolean = false): number {
    if (!this.currentTrip.departureTime) return 0;
    const [, m] = this.currentTrip.departureTime.split(':').map(Number);
    return m;
  }

  generateSeatMap(seats: number) {
    this.lowerSeats = [];
    this.upperSeats = [];
    const countPerDeck = Math.ceil(seats / 2);
    for (let i = 1; i <= countPerDeck; i++) {
      this.lowerSeats.push(`${i}A`);
    }
    for (let i = countPerDeck + 1; i <= seats; i++) {
      this.upperSeats.push(`${i - countPerDeck}B`);
    }
  }

  isDriverBusy(driverName: string): boolean {
    if (!driverName || !this.currentTrip.departureDate || !this.currentTrip.departureTime) return false;

    const tripDate = this.currentTrip.departureDate;
    const tripTime = this.currentTrip.departureTime;

    return this.allTrips.some(t => {
      if (t.id === this.currentTrip.id) return false;
      if (t.status === 'locked' || t.status === 'completed') return false;
      if (t.driverName !== driverName) return false;
      if (t.departureDate !== tripDate) return false;

      const [h1] = tripTime.split(':').map(Number);
      const [h2] = (t.departureTime || '08:00').split(':').map(Number);
      return Math.abs(h1 - h2) < 4;
    });
  }

  isCodriverBusy(codriverName: string): boolean {
    if (!codriverName || !this.currentTrip.departureDate || !this.currentTrip.departureTime) return false;

    const tripDate = this.currentTrip.departureDate;
    const tripTime = this.currentTrip.departureTime;

    return this.allTrips.some(t => {
      if (t.id === this.currentTrip.id) return false;
      if (t.status === 'locked' || t.status === 'completed') return false;
      if (t.codriverName !== codriverName) return false;
      if (t.departureDate !== tripDate) return false;

      const [h1] = tripTime.split(':').map(Number);
      const [h2] = (t.departureTime || '08:00').split(':').map(Number);
      return Math.abs(h1 - h2) < 4;
    });
  }

  saveTrip() {
    this.errors = {
      routeName: !this.currentTrip.routeName,
      carName: !this.currentTrip.carName,
      driverName: !this.currentTrip.driverName,
      departureDate: !this.currentTrip.departureDate,
      departureTime: !this.currentTrip.departureTime
    };

    if (Object.values(this.errors).some(Boolean)) {
      this.toastService.showError('Vui lòng nhập đầy đủ các thông tin bắt buộc (*)!');
      return;
    }

    const selectedDateTime = new Date(`${this.currentTrip.departureDate}T${this.currentTrip.departureTime}:00`);
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (selectedDateTime < oneWeekFromNow) {
      this.toastService.showError('Thời gian khởi hành phải cách thời điểm hiện tại ít nhất 1 tuần (7 ngày)!');
      return;
    }

    if (this.currentTrip.driverName && this.isDriverBusy(this.currentTrip.driverName)) {
      this.toastService.showError('Tài xế chính đã chọn bị trùng lịch chạy với chuyến xe khác trong khung giờ này!');
      return;
    }

    if (this.isEditMode) {
      const idx = this.allTrips.findIndex(t => t.id === this.currentTrip.id);
      if (idx > -1) {
        this.allTrips[idx] = this.currentTrip as LichTrinh;
      }
      this.filterTrips();
      this.closeModal();
      this.toastService.showSuccess('Cập nhật lịch trình thành công!');
    } else {
      const newTrip: LichTrinh = {
        ...(this.currentTrip as LichTrinh),
        id: this.allTrips.length > 0 ? Math.max(...this.allTrips.map(t => t.id)) + 1 : 1
      };
      this.allTrips.push(newTrip);
      this.filterTrips();
      this.closeModal();
      this.toastService.showSuccess('Tạo lịch trình mới thành công!');
    }
  }

  toggleLockStatus() {
    if (this.currentTrip.status === 'locked') {
      this.currentTrip.status = 'waiting';
      this.toastService.showSuccess('Đã mở khóa lịch chạy!');
    } else {
      this.currentTrip.status = 'locked';
      this.toastService.showError('Đã khóa lịch chạy này!');
    }
  }


  getRoutePickups(): string[] {
    if (!this.currentTrip.routeName) return [];
    const route = this.routesDb.find(r => r.name === this.currentTrip.routeName);
    return route ? route.pickupPoints : [];
  }

  getRouteStops(): string[] {
    if (!this.currentTrip.routeName) return [];
    const route = this.routesDb.find(r => r.name === this.currentTrip.routeName);
    return route ? route.stops : [];
  }

  getArrivalTime(): string {
    if (!this.currentTrip.departureTime || !this.currentTrip.duration) return '--:--';
    const [h, m] = this.currentTrip.departureTime.split(':').map(Number);
    const durationNum = parseFloat(this.currentTrip.duration);
    const totalMinutes = h * 60 + m + durationNum * 60;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = Math.floor(totalMinutes % 60);
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  }

  getArrivalDate(): string {
    if (!this.currentTrip.departureDate || !this.currentTrip.departureTime || !this.currentTrip.duration) return '---';
    const [h, m] = this.currentTrip.departureTime.split(':').map(Number);
    const durationNum = parseFloat(this.currentTrip.duration);
    const totalMinutes = h * 60 + m + durationNum * 60;
    const daysOffset = Math.floor(totalMinutes / 1440);
    
    const dateObj = new Date(this.currentTrip.departureDate);
    dateObj.setDate(dateObj.getDate() + daysOffset);
    const d = dateObj.getDate().toString().padStart(2, '0');
    const mStr = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const y = dateObj.getFullYear();
    return `${d}/${mStr}/${y}`;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    const d = dateObj.getDate().toString().padStart(2, '0');
    const mStr = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const y = dateObj.getFullYear();
    return `${d}/${mStr}/${y}`;
  }

  getRunningCount() { return this.baseFilteredTrips.filter(t => t.status === 'running').length; }
  getWaitingCount() { return this.baseFilteredTrips.filter(t => t.status === 'waiting').length; }
  getCompletedCount() { return this.baseFilteredTrips.filter(t => t.status === 'completed').length; }
  getLockedCount() { return this.baseFilteredTrips.filter(t => t.status === 'locked').length; }
}
