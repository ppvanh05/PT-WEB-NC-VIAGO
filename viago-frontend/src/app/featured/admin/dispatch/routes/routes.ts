import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../core/services/toast.service';

export interface TuyenXe {
  id: number;
  name: string;
  startPoint: string;
  endPoint: string;
  distanceNum: number; // Raw integer in km
  durationNum?: number; // Raw float in hours
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

  protected readonly toastService = inject(ToastService);

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
    'TP.HCM', 'Cần Thơ', 'Bà Rịa - Vũng Tàu', 'Lâm Đồng', 'Khánh Hòa', 'Đắc Lắk', 'Bình Thuận',
    'Đà Nẵng', 'Kiên Giang', 'Hà Nội', 'Hải Phòng', 'Quảng Ninh', 'Thừa Thiên Huế', 'An Giang',
    'Cà Mau', 'An Giang', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh', 'Bến Tre', 'Bình Định',
    'Bình Dương', 'Bình Phước', 'Cao Bằng', 'Đắk Nông', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp',
    'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình', 'Hưng Yên',
    'Kon Tum', 'Lai Châu', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An', 'Ninh Bình',
    'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Trị',
    'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa', 'Tiền Giang',
    'Trà Vinh', 'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
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

  removeAccents(str: string): string {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  }

  filterRoutes() {
    const query = this.removeAccents(this.searchQuery.trim());
    this.filteredRoutes = this.allRoutes.filter(r => {
      if (this.activeTab === 'active' && r.status !== 'active') return false;
      if (this.activeTab === 'locked' && r.status !== 'locked') return false;

      if (this.startPointFilter && r.startPoint !== this.startPointFilter) return false;
      if (this.endPointFilter && r.endPoint !== this.endPointFilter) return false;

      if (query) {
        const matchesName = this.removeAccents(r.name).includes(query);
        const matchesCar = this.removeAccents(r.carTypes).includes(query);
        const matchesStart = this.removeAccents(r.startPoint).includes(query);
        const matchesEnd = this.removeAccents(r.endPoint).includes(query);
        return matchesName || matchesCar || matchesStart || matchesEnd;
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
    this.toastService.showSuccess('Đã xóa tất cả bộ lọc tìm kiếm!');
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
      distanceNum: undefined,
      durationNum: undefined,
      duration: '',
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
    this.formattedPrice = this.currentRoute.price ? this.currentRoute.price.toLocaleString('vi-VN') : '';
    this.errors = {};
    this.isModalOpen = true;
  }

  openEditModal(route: TuyenXe, event: Event) {
    event.stopPropagation();
    this.isEditMode = true;
    const cloned = JSON.parse(JSON.stringify(route));
    (cloned as any).durationNum = (cloned as any).durationNum || parseFloat(cloned.duration) || 2.5;

    if (cloned.startPoint && cloned.endPoint && cloned.startPoint === cloned.endPoint) {
      cloned.endPoint = '';
    }

    const carObj: { [key: string]: boolean } = {};
    this.availableCarTypes.forEach(type => {
      carObj[type] = cloned.carTypesList ? cloned.carTypesList.includes(type) : cloned.carTypes.includes(type);
    });

    this.currentRoute = {
      ...cloned,
      carTypesObj: carObj
    };
    this.formattedPrice = this.currentRoute.price ? this.currentRoute.price.toLocaleString('vi-VN') : '';
    this.errors = {};
    this.isModalOpen = true;
  }

  formattedPrice: string = '';
  onPriceChange(value: string) {
    const rawValue = value.replace(/[^0-9]/g, '');
    if (rawValue) {
      this.currentRoute.price = parseInt(rawValue, 10);
      this.formattedPrice = this.currentRoute.price.toLocaleString('vi-VN');
    } else {
      this.currentRoute.price = 0;
      this.formattedPrice = '';
    }
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

  // Car types dropdown open state
  isCarTypesDropdownOpen = false;

  toggleCarTypesDropdown() {
    this.isCarTypesDropdownOpen = !this.isCarTypesDropdownOpen;
  }

  closeCarTypesDropdown() {
    this.isCarTypesDropdownOpen = false;
  }

  getSelectedCarTypesDisplay(): string {
    if (!this.currentRoute.carTypesObj) return 'Limousine';
    const selected = this.availableCarTypes.filter(type => this.currentRoute.carTypesObj && this.currentRoute.carTypesObj[type]);
    return selected.length > 0 ? selected.join(', ') : '-- Chọn loại xe --';
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

  togglePickupDropoffSelection(item: string) {
    this.toggleSelection('pickupPoints', item);
    this.toggleSelection('dropoffPoints', item);
  }

  isSelected(listName: 'pickupPoints' | 'dropoffPoints' | 'stops' | 'shuttles', item: string): boolean {
    if (!this.currentRoute[listName]) return false;
    return (this.currentRoute[listName] as string[]).includes(item);
  }

  getAllPickupDropoffPointsForSelectedProvinces(): string[] {
    const set = new Set<string>();
    if (this.currentRoute.startPoint && this.pickupPointsDb[this.currentRoute.startPoint]) {
      this.pickupPointsDb[this.currentRoute.startPoint].forEach(p => set.add(p));
    }
    if (this.currentRoute.endPoint && this.pickupPointsDb[this.currentRoute.endPoint]) {
      this.pickupPointsDb[this.currentRoute.endPoint].forEach(p => set.add(p));
    }
    return Array.from(set);
  }

  getPickupPointsForSelectedProvinces(): string[] {
    const list: string[] = [];
    if (this.currentRoute.startPoint && this.pickupPointsDb[this.currentRoute.startPoint]) {
      list.push(...this.pickupPointsDb[this.currentRoute.startPoint]);
    }
    return list;
  }

  getFilteredStartProvinces(): string[] {
    if (!this.currentRoute.endPoint) return this.provincesList;
    return this.provincesList.filter(p => p !== this.currentRoute.endPoint);
  }

  getFilteredEndProvinces(): string[] {
    if (!this.currentRoute.startPoint) return this.provincesList;
    return this.provincesList.filter(p => p !== this.currentRoute.startPoint);
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

  distanceMap: { [key: string]: number } = {
    'TP.HCM_Cần Thơ': 170,
    'Cần Thơ_TP.HCM': 170,
    'TP.HCM_Bà Rịa - Vũng Tàu': 100,
    'Bà Rịa - Vũng Tàu_TP.HCM': 100,
    'TP.HCM_Lâm Đồng': 310,
    'Lâm Đồng_TP.HCM': 310,
    'TP.HCM_Khánh Hòa': 435,
    'Khánh Hòa_TP.HCM': 435,
    'TP.HCM_Bình Thuận': 200,
    'Bình Thuận_TP.HCM': 200,
    'Cần Thơ_Kiên Giang': 115,
    'Kiên Giang_Cần Thơ': 115,
    'Lâm Đồng_Đắk Lắk': 210,
    'Đắk Lắk_Lâm Đồng': 210,
    'Lâm Đồng_Khánh Hòa': 140,
    'Khánh Hòa_Lâm Đồng': 140,
    'Khánh Hòa_Đà Nẵng': 530,
    'Đà Nẵng_Khánh Hòa': 530,
    'Hà Nội_Hải Phòng': 120,
    'Hải Phòng_Hà Nội': 120,
    'Hà Nội_Quảng Ninh': 160,
    'Quảng Ninh_Hà Nội': 160,
    'Đà Nẵng_Thừa Thiên Huế': 100,
    'Thừa Thiên Huế_Đà Nẵng': 100,
    'Hà Nội_TP.HCM': 1720,
    'TP.HCM_Hà Nội': 1720,
    'Hà Nội_Đà Nẵng': 760,
    'Đà Nẵng_Hà Nội': 760,
    'TP.HCM_Đà Nẵng': 850,
    'Đà Nẵng_TP.HCM': 850
  };

  private getRegion(province: string): string {
    const mienNam = ['TP.HCM', 'Cần Thơ', 'Bà Rịa - Vũng Tàu', 'Bình Dương', 'Bình Phước', 'Đồng Nai', 'Tây Ninh', 'An Giang', 'Bạc Liêu', 'Bến Tre', 'Cà Mau', 'Đồng Tháp', 'Hậu Giang', 'Kiên Giang', 'Long An', 'Sóc Trăng', 'Tiền Giang', 'Trà Vinh', 'Vĩnh Long'];
    const tayNguyen = ['Lâm Đồng', 'Đắk Lắk', 'Đắk Nông', 'Gia Lai', 'Kon Tum'];
    const namTrungBo = ['Khánh Hòa', 'Bình Thuận', 'Ninh Thuận', 'Phú Yên', 'Bình Định', 'Quảng Ngãi', 'Quảng Nam', 'Đà Nẵng'];
    const bacTrungBo = ['Thừa Thiên Huế', 'Quảng Trị', 'Quảng Bình', 'Hà Tĩnh', 'Nghệ An', 'Thanh Hóa'];
    if (mienNam.includes(province)) return 'MN';
    if (tayNguyen.includes(province)) return 'TN';
    if (namTrungBo.includes(province)) return 'NTB';
    if (bacTrungBo.includes(province)) return 'BTB';
    return 'MB';
  }

  getEstimatedDistance(p1: string, p2: string): number {
    const key1 = `${p1}_${p2}`;
    const key2 = `${p2}_${p1}`;
    if (this.distanceMap[key1]) return this.distanceMap[key1];
    if (this.distanceMap[key2]) return this.distanceMap[key2];

    const r1 = this.getRegion(p1);
    const r2 = this.getRegion(p2);
    if (r1 === r2) return r1 === 'MB' ? 140 : 130;
    
    const pair = [r1, r2].sort().join('_');
    switch (pair) {
      case 'MN_TN': return 310;
      case 'MN_NTB': return 420;
      case 'MN_BTB': return 850;
      case 'MB_MN': return 1720; // Tuyến đường xa Bắc - Nam
      case 'BTB_MB': return 380;
      case 'MB_NTB': return 780;
      case 'MB_TN': return 1150;
      case 'NTB_TN': return 220;
      case 'BTB_TN': return 550;
      case 'BTB_NTB': return 400;
      default: return 300;
    }
  }

  onStartOrEndPointChange() {
    if (this.currentRoute.startPoint && this.currentRoute.endPoint) {
      if (this.currentRoute.startPoint === this.currentRoute.endPoint) {
        this.errors['samePoints'] = true;
        this.currentRoute.distanceNum = undefined;
        this.currentRoute.durationNum = undefined;
        this.toastService.showError('Điểm đầu và điểm cuối không được trùng nhau! Vui lòng chọn điểm khác.');
      } else {
        this.errors['samePoints'] = false;
        const estimatedDist = this.getEstimatedDistance(this.currentRoute.startPoint, this.currentRoute.endPoint);
        this.currentRoute.distanceNum = estimatedDist;
        this.autoEstimateDuration();
      }
    } else {
      this.errors['samePoints'] = false;
      this.currentRoute.distanceNum = undefined;
      this.currentRoute.durationNum = undefined;
    }
    this.extractFilterOptions();
  }

  onDistanceChange() {
    this.autoEstimateDuration();
  }

  autoEstimateDuration() {
    const dist = this.currentRoute.distanceNum;
    if (dist && dist > 0) {
      let speed = 50;
      if (dist > 500) {
        speed = 42; // Tuyến xa có dừng nghỉ & đường dài
      } else if (dist > 200) {
        speed = 45;
      }
      const hrs = dist / speed;
      this.currentRoute.durationNum = Math.max(0.5, Math.round(hrs * 2) / 2);
    }
  }

  stepDuration(delta: number) {
    let current = Number(this.currentRoute.durationNum) || 0;
    current = Math.max(0.5, Math.round((current + delta) * 10) / 10);
    this.currentRoute.durationNum = current;
  }

  validateForm(): boolean {
    this.errors = {
      startPoint: !this.currentRoute.startPoint,
      endPoint: !this.currentRoute.endPoint,
      samePoints: !!(this.currentRoute.startPoint && this.currentRoute.endPoint && this.currentRoute.startPoint === this.currentRoute.endPoint),
      distanceNum: !this.currentRoute.distanceNum || this.currentRoute.distanceNum <= 0,
      durationNum: !this.currentRoute.durationNum || Number(this.currentRoute.durationNum) <= 0,
      price: !this.currentRoute.price || this.currentRoute.price <= 0,
      tripsPerDay: !this.currentRoute.tripsPerDay || this.currentRoute.tripsPerDay <= 0
    };

    if (this.errors['samePoints']) {
      this.toastService.showError('Điểm đầu và điểm cuối không được giống nhau!');
      return false;
    }

    return !Object.values(this.errors).some(Boolean);
  }

  saveRoute() {
    if (!this.validateForm()) {
      this.toastService.showError('Vui lòng nhập đầy đủ thông tin hợp lệ.');
      return;
    }

    const selectedCarTypes = this.availableCarTypes.filter(type => this.currentRoute.carTypesObj && this.currentRoute.carTypesObj[type]);
    const carTypesStr = selectedCarTypes.length > 0 ? selectedCarTypes.join(', ') : 'Limousine';

    this.currentRoute.name = `${this.currentRoute.startPoint} ↔ ${this.currentRoute.endPoint}`;
    this.currentRoute.carTypesList = selectedCarTypes;
    this.currentRoute.carTypes = carTypesStr;
    this.currentRoute.duration = `${this.currentRoute.durationNum} tiếng`;

    if (this.isEditMode) {
      const idx = this.allRoutes.findIndex(r => r.id === this.currentRoute.id);
      if (idx > -1) {
        this.allRoutes[idx] = { ...(this.currentRoute as TuyenXe) };
      }
      this.filterRoutes();
      this.closeModal();
      this.toastService.showSuccess('Cập nhật thông tin tuyến xe thành công!');
    } else {
      const newRoute: TuyenXe = {
        ...(this.currentRoute as TuyenXe),
        id: this.allRoutes.length > 0 ? Math.max(...this.allRoutes.map(r => r.id)) + 1 : 1
      };
      this.allRoutes.unshift(newRoute);
      this.filterRoutes();
      this.closeModal();
      this.toastService.showSuccess('Tạo tuyến xe mới thành công!');
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
      this.toastService.showError(`Đã tạm khóa tuyến xe ${name}!`);
    } else {
      this.toastService.showSuccess(`Đã mở khóa tuyến xe ${name}!`);
    }
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN').format(price) + ' đ';
  }
}

