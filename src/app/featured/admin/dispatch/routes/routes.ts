import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface TuyenXe {
  id: number;
  name: string;
  startPoint: string;
  endPoint: string;
  distanceNum: number; // Raw integer in km
  duration: string;
  tripsPerDay: number;
  price: number;
  carTypesList: string[]; // Independent checkboxes
  carTypes: string; // Formatted display string
  status: 'active' | 'locked';
  pickupPoints: string[];
  dropoffPoints: string[];
  stops: string[];
  shuttles: string[];
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

@Component({
  selector: 'app-admin-routes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './routes.html',
  styleUrl: './routes.css'
})
export class RoutesComponent implements OnInit {
  activeTab: 'all' | 'active' | 'locked' = 'all';
  searchQuery = '';
  startPointFilter = '';
  endPointFilter = '';

  startPoints: string[] = [];
  endPoints: string[] = [];

  allRoutes: TuyenXe[] = [];
  filteredRoutes: TuyenXe[] = [];
  paginatedRoutes: TuyenXe[] = [];
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Toast system state
  toasts: ToastMessage[] = [];
  toastIdCounter = 0;

  // Centered Toast Modal state
  showCenteredToast = false;
  centeredToastTitle = '';
  centeredToastSubtitle = '';
  private centeredToastTimer: any = null;

  // Form Modal state
  isModalOpen = false;
  isEditMode = false;
  currentRoute: Partial<TuyenXe> & {
    carTypesObj?: { [key: string]: boolean };
  } = {};
  errors: { [key: string]: boolean } = {};

  provincesList = [
    'TP.HCM',
    'Cần Thơ',
    'Bà Rịa - Vũng Tàu',
    'Lâm Đồng',
    'Khánh Hòa',
    'Đắk Lắk',
    'Bình Thuận',
    'Đà Nẵng',
    'Kiên Giang',
    'Hà Nội',
    'Hải Phòng',
    'Quảng Ninh',
    'Thừa Thiên Huế',
    'An Giang',
    'Cà Mau'
  ];

  availableCarTypes = ['Limousine', 'Cabin', 'Giường nằm', 'Ghế ngồi'];

  pickupPointsDb: { [key: string]: string[] } = {
    'TP.HCM': ['Bến xe Miền Đông Mới', 'Bến xe Miền Tây', 'Văn phòng Quận 1', 'Văn phòng Quận 5', 'Văn phòng Quận 10', 'Ngã tư Thủ Đức', 'Ngã tư An Sương', 'Suối Tiên'],
    'Cần Thơ': ['Bến xe Trung tâm Cần Thơ', 'Văn phòng Ninh Kiều', 'Bến Ninh Kiều', 'Đại học Cần Thơ'],
    'Bà Rịa - Vũng Tàu': ['Bến xe Vũng Tàu', 'Văn phòng Vũng Tàu', 'Bãi Sau', 'Bãi Trước'],
    'Lâm Đồng': ['Bến xe Liên Tỉnh Đà Lạt', 'Chợ Đà Lạt', 'Hồ Xuân Hương', 'Quảng trường Lâm Viên'],
    'Khánh Hòa': ['Bến xe phía Nam Nha Trang', 'Ga Nha Trang', 'Quảng trường 2/4', 'Vinpearl Harbour'],
    'Đắk Lắk': ['Bến xe Phía Nam Buôn Ma Thuột', 'Ngã Sáu Buôn Ma Thuột', 'Coopmart Buôn Ma Thuột'],
    'Bình Thuận': ['Bến xe Phan Thiết', 'Chợ Phan Thiết', 'Mũi Né', 'NovaWorld Phan Thiết'],
    'Đà Nẵng': ['Bến xe Trung tâm Đà Nẵng', 'Sân bay Đà Nẵng', 'Công viên Biển Đông', 'Cầu Rồng'],
    'Kiên Giang': ['Bến xe Rạch Giá', 'Bến tàu Rạch Giá', 'Văn phòng Rạch Giá']
  };

  shuttlesDb: { [key: string]: string[] } = {
    'TP.HCM': ['Sân bay Tân Sơn Nhất', 'Crescent Mall Quận 7', 'AEON Mall Tân Phú', 'Gigamall Thủ Đức'],
    'Cần Thơ': ['Vincom Xuân Khánh', 'LOTTE Mart Cần Thơ'],
    'Lâm Đồng': ['Quảng trường Lâm Viên', 'Big C Đà Lạt'],
    'Khánh Hòa': ['Vincom Plaza Nha Trang', 'Tháp Trầm Hương'],
    'Đà Nẵng': ['Vincom Đà Nẵng', 'Cầu Rồng'],
    'Bà Rịa - Vũng Tàu': ['LOTTE Mart Vũng Tàu', 'Bãi Sau'],
    'Bình Thuận': ['NovaWorld Phan Thiết', 'Mũi Né'],
    'Đắk Lắk': ['Coopmart Buôn Ma Thuột', 'Ngã Sáu Buôn Ma Thuột'],
    'Kiên Giang': ['Coopmart Rạch Giá', 'Bến tàu Rạch Giá']
  };

  stopsDb: string[] = [
    'Trung Lương', 'Cai Lậy', 'Cái Bè', 'Vĩnh Long',
    'Long Thành', 'Bà Rịa', 'Dầu Giây', 'Hàm Thuận Nam',
    'Bảo Lộc', 'Di Linh', 'Phan Thiết', 'Phan Rang',
    'Cam Ranh', 'Khánh Vĩnh', 'Liên Khương', 'Krông Pắc',
    'Quy Nhơn', 'Quảng Ngãi', 'Tam Kỳ', 'Thốt Nốt', 'Long Xuyên'
  ];

  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.initMockData();
    this.extractFilterOptions();
    this.filterRoutes();
  }

  initMockData() {
    this.allRoutes = [
      {
        id: 1,
        name: 'TP.HCM ↔ Cần Thơ',
        startPoint: 'TP.HCM',
        endPoint: 'Cần Thơ',
        distanceNum: 170,
        duration: '3.5 tiếng',
        tripsPerDay: 12,
        price: 180000,
        carTypesList: ['Limousine', 'Cabin'],
        carTypes: 'Limousine, Cabin',
        status: 'active',
        pickupPoints: ['Bến xe Miền Đông Mới', 'Bến xe Miền Tây'],
        dropoffPoints: ['Bến xe Trung tâm Cần Thơ', 'Văn phòng Ninh Kiều'],
        stops: ['Trung Lương', 'Cai Lậy', 'Vĩnh Long'],
        shuttles: ['Sân bay Tân Sơn Nhất', 'Vincom Xuân Khánh']
      },
      {
        id: 2,
        name: 'TP.HCM ↔ Bà Rịa - Vũng Tàu',
        startPoint: 'TP.HCM',
        endPoint: 'Bà Rịa - Vũng Tàu',
        distanceNum: 100,
        duration: '2 tiếng',
        tripsPerDay: 20,
        price: 160000,
        carTypesList: ['Limousine', 'Giường nằm'],
        carTypes: 'Limousine, Giường nằm',
        status: 'active',
        pickupPoints: ['Bến xe Miền Đông Mới', 'Văn phòng Quận 1'],
        dropoffPoints: ['Bến xe Vũng Tàu', 'Bãi Sau'],
        stops: ['Long Thành', 'Bà Rịa'],
        shuttles: ['Sân bay Tân Sơn Nhất', 'LOTTE Mart Vũng Tàu']
      },
      {
        id: 3,
        name: 'Lâm Đồng ↔ Đắk Lắk',
        startPoint: 'Lâm Đồng',
        endPoint: 'Đắk Lắk',
        distanceNum: 210,
        duration: '5 tiếng',
        tripsPerDay: 8,
        price: 220000,
        carTypesList: ['Giường nằm'],
        carTypes: 'Giường nằm',
        status: 'active',
        pickupPoints: ['Bến xe Liên Tỉnh Đà Lạt'],
        dropoffPoints: ['Bến xe Phía Nam Buôn Ma Thuột'],
        stops: ['Liên Khương', 'Krông Pắc'],
        shuttles: ['Quảng trường Lâm Viên', 'Coopmart Buôn Ma Thuột']
      },
      {
        id: 4,
        name: 'Lâm Đồng ↔ Khánh Hòa',
        startPoint: 'Lâm Đồng',
        endPoint: 'Khánh Hòa',
        distanceNum: 140,
        duration: '3 tiếng',
        tripsPerDay: 15,
        price: 170000,
        carTypesList: ['Limousine', 'Cabin'],
        carTypes: 'Limousine, Cabin',
        status: 'active',
        pickupPoints: ['Bến xe Liên Tỉnh Đà Lạt'],
        dropoffPoints: ['Bến xe phía Nam Nha Trang', 'Vinpearl Harbour'],
        stops: ['Khánh Vĩnh'],
        shuttles: ['Quảng trường Lâm Viên', 'Vincom Plaza Nha Trang']
      },
      {
        id: 5,
        name: 'Cần Thơ ↔ Kiên Giang',
        startPoint: 'Cần Thơ',
        endPoint: 'Kiên Giang',
        distanceNum: 115,
        duration: '2.5 tiếng',
        tripsPerDay: 10,
        price: 150000,
        carTypesList: ['Giường nằm', 'Limousine'],
        carTypes: 'Giường nằm, Limousine',
        status: 'active',
        pickupPoints: ['Bến xe Trung tâm Cần Thơ'],
        dropoffPoints: ['Bến xe Rạch Giá', 'Bến tàu Rạch Giá'],
        stops: ['Thốt Nốt', 'Long Xuyên'],
        shuttles: ['LOTTE Mart Cần Thơ', 'Bến tàu Rạch Giá']
      },
      {
        id: 6,
        name: 'TP.HCM ↔ Bình Thuận',
        startPoint: 'TP.HCM',
        endPoint: 'Bình Thuận',
        distanceNum: 200,
        duration: '4 tiếng',
        tripsPerDay: 18,
        price: 200000,
        carTypesList: ['Giường nằm'],
        carTypes: 'Giường nằm',
        status: 'active',
        pickupPoints: ['Bến xe Miền Đông Mới'],
        dropoffPoints: ['Bến xe Phan Thiết', 'Mũi Né'],
        stops: ['Long Thành', 'Dầu Giây'],
        shuttles: ['Sân bay Tân Sơn Nhất', 'NovaWorld Phan Thiết']
      },
      {
        id: 7,
        name: 'TP.HCM ↔ Lâm Đồng',
        startPoint: 'TP.HCM',
        endPoint: 'Lâm Đồng',
        distanceNum: 310,
        duration: '7 tiếng',
        tripsPerDay: 25,
        price: 250000,
        carTypesList: ['Cabin', 'Limousine'],
        carTypes: 'Cabin, Limousine',
        status: 'active',
        pickupPoints: ['Bến xe Miền Đông Mới', 'Văn phòng Quận 1'],
        dropoffPoints: ['Bến xe Liên Tỉnh Đà Lạt', 'Chợ Đà Lạt'],
        stops: ['Dầu Giây', 'Bảo Lộc', 'Di Linh'],
        shuttles: ['Sân bay Tân Sơn Nhất', 'Big C Đà Lạt']
      },
      {
        id: 8,
        name: 'TP.HCM ↔ Khánh Hòa',
        startPoint: 'TP.HCM',
        endPoint: 'Khánh Hòa',
        distanceNum: 435,
        duration: '8.5 tiếng',
        tripsPerDay: 22,
        price: 300000,
        carTypesList: ['Limousine', 'Giường nằm'],
        carTypes: 'Limousine, Giường nằm',
        status: 'active',
        pickupPoints: ['Bến xe Miền Đông Mới'],
        dropoffPoints: ['Bến xe phía Nam Nha Trang', 'Ga Nha Trang'],
        stops: ['Dầu Giây', 'Phan Thiết', 'Phan Rang', 'Cam Ranh'],
        shuttles: ['Sân bay Tân Sơn Nhất', 'Tháp Trầm Hương']
      },
      {
        id: 9,
        name: 'Khánh Hòa ↔ Đà Nẵng',
        startPoint: 'Khánh Hòa',
        endPoint: 'Đà Nẵng',
        distanceNum: 530,
        duration: '11 tiếng',
        tripsPerDay: 14,
        price: 350000,
        carTypesList: ['Limousine', 'Cabin'],
        carTypes: 'Limousine, Cabin',
        status: 'locked',
        pickupPoints: ['Bến xe phía Nam Nha Trang'],
        dropoffPoints: ['Bến xe Trung tâm Đà Nẵng', 'Sân bay Đà Nẵng'],
        stops: ['Cam Ranh', 'Quy Nhơn', 'Quảng Ngãi', 'Tam Kỳ'],
        shuttles: ['Vincom Plaza Nha Trang', 'Vincom Đà Nẵng']
      }
    ];
  }

  extractFilterOptions() {
    const startSet = new Set<string>();
    const endSet = new Set<string>();
    this.allRoutes.forEach(r => {
      if (r.startPoint) startSet.add(r.startPoint);
      if (r.endPoint) endSet.add(r.endPoint);
    });
    this.provincesList.forEach(p => {
      startSet.add(p);
      endSet.add(p);
    });
    this.startPoints = Array.from(startSet);
    this.endPoints = Array.from(endSet);
  }

  getActiveRoutesCount(): number {
    return this.allRoutes.filter(r => r.status === 'active').length;
  }

  getLockedRoutesCount(): number {
    return this.allRoutes.filter(r => r.status === 'locked').length;
  }

  setTab(tab: 'all' | 'active' | 'locked') {
    this.activeTab = tab;
    this.filterRoutes();
  }

  filterRoutes() {
    const query = this.searchQuery.trim().toLowerCase();
    this.filteredRoutes = this.allRoutes.filter(r => {
      if (this.activeTab === 'active' && r.status !== 'active') return false;
      if (this.activeTab === 'locked' && r.status !== 'locked') return false;

      if (this.startPointFilter && r.startPoint !== this.startPointFilter) return false;
      if (this.endPointFilter && r.endPoint !== this.endPointFilter) return false;

      if (query) {
        const matchesName = r.name.toLowerCase().includes(query);
        const matchesCar = r.carTypes.toLowerCase().includes(query);
        return matchesName || matchesCar;
      }

      return true;
    });
    this.currentPage = 1;
    this.updatePaginatedRoutes();
  }

  updatePaginatedRoutes() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredRoutes.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedRoutes = this.filteredRoutes.slice(startIndex, startIndex + this.pageSize);
  }

  setPage(page: number) {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }
    this.currentPage = page;
    this.updatePaginatedRoutes();
  }

  getPaginationItems(): number[] {
    const groupStart = Math.floor((this.currentPage - 1) / 3) * 3 + 1;
    const groupEnd = Math.min(groupStart + 2, this.totalPages);
    return Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i);
  }

  clearFilters() {
    this.searchQuery = '';
    this.startPointFilter = '';
    this.endPointFilter = '';
    this.filterRoutes();
    this.addToast('Đã xóa tất cả bộ lọc tìm kiếm!', 'success');
  }

  addToast(message: string, type: 'success' | 'error') {
    const id = this.toastIdCounter++;
    this.toasts.push({ id, message, type });
    setTimeout(() => {
      this.removeToast(id);
    }, 3000);
  }

  removeToast(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  triggerCenteredToast(title: string, subtitle: string) {
    if (this.centeredToastTimer) {
      clearTimeout(this.centeredToastTimer);
    }
    this.centeredToastTitle = title;
    this.centeredToastSubtitle = subtitle;
    this.showCenteredToast = true;

    this.centeredToastTimer = setTimeout(() => {
      this.showCenteredToast = false;
      this.closeModal();
    }, 1800);
  }

  closeCenteredToast() {
    this.showCenteredToast = false;
    if (this.centeredToastTimer) {
      clearTimeout(this.centeredToastTimer);
      this.centeredToastTimer = null;
    }
  }

  openAddModal() {
    this.isEditMode = false;
    this.currentRoute = {
      name: '',
      startPoint: '',
      endPoint: '',
      distanceNum: 100,
      duration: '2.5 tiếng',
      tripsPerDay: 5,
      price: 150000,
      carTypesList: ['Limousine'],
      carTypesObj: { 'Limousine': true, 'Cabin': false, 'Giường nằm': false, 'Ghế ngồi': false },
      status: 'active',
      pickupPoints: [],
      dropoffPoints: [],
      stops: [],
      shuttles: []
    };
    this.errors = {};
    this.isModalOpen = true;
  }

  openEditModal(route: TuyenXe, event: Event) {
    event.stopPropagation();
    this.isEditMode = true;
    const cloned = JSON.parse(JSON.stringify(route));
    
    const carObj: { [key: string]: boolean } = {};
    this.availableCarTypes.forEach(type => {
      carObj[type] = cloned.carTypesList ? cloned.carTypesList.includes(type) : cloned.carTypes.includes(type);
    });

    this.currentRoute = {
      ...cloned,
      carTypesObj: carObj
    };
    this.errors = {};
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.errors = {};
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  toggleCarType(type: string) {
    if (!this.currentRoute.carTypesObj) {
      this.currentRoute.carTypesObj = {};
    }
    this.currentRoute.carTypesObj[type] = !this.currentRoute.carTypesObj[type];
  }

  toggleSelection(listName: 'pickupPoints' | 'dropoffPoints' | 'stops' | 'shuttles', item: string) {
    if (!this.currentRoute[listName]) {
      this.currentRoute[listName] = [];
    }
    const list = this.currentRoute[listName] as string[];
    const index = list.indexOf(item);
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(item);
    }
  }

  isSelected(listName: 'pickupPoints' | 'dropoffPoints' | 'stops' | 'shuttles', item: string): boolean {
    if (!this.currentRoute[listName]) return false;
    return (this.currentRoute[listName] as string[]).includes(item);
  }

  getPickupPointsForSelectedProvinces(): string[] {
    const list: string[] = [];
    if (this.currentRoute.startPoint && this.pickupPointsDb[this.currentRoute.startPoint]) {
      list.push(...this.pickupPointsDb[this.currentRoute.startPoint]);
    }
    return list;
  }

  getDropoffPointsForSelectedProvinces(): string[] {
    const list: string[] = [];
    if (this.currentRoute.endPoint && this.pickupPointsDb[this.currentRoute.endPoint]) {
      list.push(...this.pickupPointsDb[this.currentRoute.endPoint]);
    }
    return list;
  }

  getShuttlesForSelectedProvinces(): string[] {
    const list: string[] = [];
    if (this.currentRoute.startPoint && this.shuttlesDb[this.currentRoute.startPoint]) {
      list.push(...this.shuttlesDb[this.currentRoute.startPoint]);
    }
    if (this.currentRoute.endPoint && this.shuttlesDb[this.currentRoute.endPoint] && this.currentRoute.endPoint !== this.currentRoute.startPoint) {
      list.push(...this.shuttlesDb[this.currentRoute.endPoint]);
    }
    return list;
  }

  validateForm(): boolean {
    this.errors = {
      startPoint: !this.currentRoute.startPoint,
      endPoint: !this.currentRoute.endPoint,
      distanceNum: !this.currentRoute.distanceNum || this.currentRoute.distanceNum <= 0,
      duration: !this.currentRoute.duration || !this.currentRoute.duration.trim(),
      price: !this.currentRoute.price || this.currentRoute.price <= 0,
      tripsPerDay: !this.currentRoute.tripsPerDay || this.currentRoute.tripsPerDay <= 0
    };

    if (this.currentRoute.startPoint && this.currentRoute.endPoint && this.currentRoute.startPoint === this.currentRoute.endPoint) {
      this.errors['samePoints'] = true;
      this.addToast('Điểm đầu và điểm cuối không thể trùng nhau!', 'error');
      return false;
    }

    return !Object.values(this.errors).some(Boolean);
  }

  saveRoute() {
    if (!this.validateForm()) {
      this.addToast('Vui lòng điền đầy đủ và đúng thông tin!', 'error');
      return;
    }

    const selectedCarTypes = this.availableCarTypes.filter(type => this.currentRoute.carTypesObj && this.currentRoute.carTypesObj[type]);
    const carTypesStr = selectedCarTypes.length > 0 ? selectedCarTypes.join(', ') : 'Limousine';

    this.currentRoute.name = `${this.currentRoute.startPoint} ↔ ${this.currentRoute.endPoint}`;
    this.currentRoute.carTypesList = selectedCarTypes;
    this.currentRoute.carTypes = carTypesStr;

    if (this.isEditMode) {
      const idx = this.allRoutes.findIndex(r => r.id === this.currentRoute.id);
      if (idx > -1) {
        this.allRoutes[idx] = { ...(this.currentRoute as TuyenXe) };
      }
      this.filterRoutes();
      this.triggerCenteredToast('Cập Nhật Thành Công', 'Thông tin tuyến xe đã được ghi nhận vào hệ thống.');
    } else {
      const newRoute: TuyenXe = {
        ...(this.currentRoute as TuyenXe),
        id: this.allRoutes.length > 0 ? Math.max(...this.allRoutes.map(r => r.id)) + 1 : 1
      };
      this.allRoutes.unshift(newRoute);
      this.filterRoutes();
      this.triggerCenteredToast('Tạo Tuyến Xe Thành Công', 'Tuyến xe mới đã được đăng ký và đưa vào hoạt động.');
    }
    this.extractFilterOptions();
  }

  toggleRouteStatus(route: TuyenXe | Partial<TuyenXe>, event: Event) {
    event.stopPropagation();
    if (!route) return;
    route.status = route.status === 'active' ? 'locked' : 'active';
    this.filterRoutes();

    const name = route.name || '';
    if (route.status === 'locked') {
      this.addToast(`Đã tạm khóa tuyến xe ${name}!`, 'success');
    } else {
      this.addToast(`Đã mở khóa tuyến xe ${name}!`, 'success');
    }
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
  }
}
