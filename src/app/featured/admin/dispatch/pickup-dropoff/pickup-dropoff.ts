import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DiemDonTra {
  id: number;
  name: string;
  address: string;
  city: string;
  type: 'don-tra' | 'trung-chuyen' | 'dung';
  status: 'active' | 'locked';
  image?: string | null;
  mapLink?: string;
}

@Component({
  selector: 'app-pickup-dropoff',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pickup-dropoff.html',
  styleUrls: ['./pickup-dropoff.css']
})
export class PickupDropoffComponent implements OnInit {
  activeTab: 'don-tra' | 'dung' | 'locked' = 'don-tra';
  
  // Mock data
  allPoints: DiemDonTra[] = [];

  filteredPoints: DiemDonTra[] = [];
  paginatedPoints: DiemDonTra[] = [];
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  
  searchQueries: { [key: string]: string } = {
    'don-tra': '',
    'dung': '',
    'locked': ''
  };

  cityFilters: { [key: string]: string } = {
    'don-tra': 'all',
    'dung': 'all',
    'locked': 'all'
  };

  typeFilters: { [key: string]: string } = {
    'don-tra': 'all',
    'dung': 'all',
    'locked': 'all'
  };

  isModalOpen = false;
  isEditMode = false;
  currentPoint: Partial<DiemDonTra> = {};
  isUploadingImage = false;
  toasts: { id: number; message: string; type: 'success' | 'error' }[] = [];
  toastCounter = 0;
  
  errors: { name?: boolean; city?: boolean; address?: boolean } = {};

  citiesList = [
    'TP.HCM',
    'Cần Thơ',
    'Bà Rịa - Vũng Tàu',
    'Lâm Đồng',
    'Khánh Hòa',
    'Đắk Lắk',
    'Bình Thuận',
    'Đà Nẵng',
    'Kiên Giang',
    'Đồng Nai',
    'Ninh Thuận'
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.allPoints = [
      // Điểm đón trả
      { id: 1, name: 'Bến xe Miền Đông', address: '292 Đinh Bộ Lĩnh, Phường 26, Bình Thạnh', city: 'TP.HCM', type: 'don-tra', status: 'active' },
      { id: 2, name: 'Văn phòng Quận 1', address: '123 Phạm Ngũ Lão, Quận 1', city: 'TP.HCM', type: 'don-tra', status: 'active' },
      { id: 3, name: 'Bến xe Cần Thơ', address: 'QL1A, Phường Hưng Thạnh, Cái Răng', city: 'Cần Thơ', type: 'don-tra', status: 'active' },
      { id: 4, name: 'Bến xe Vũng Tàu', address: '192 Nam Kỳ Khởi Nghĩa, Phường 3', city: 'Bà Rịa - Vũng Tàu', type: 'don-tra', status: 'active' },
      { id: 5, name: 'Bến xe Liên tỉnh Đà Lạt', address: '01 Tô Hiến Thành, Phường 3', city: 'Lâm Đồng', type: 'don-tra', status: 'active' },
      { id: 6, name: 'Bến xe phía Nam Nha Trang', address: 'Vĩnh Trung, Thành phố Nha Trang', city: 'Khánh Hòa', type: 'don-tra', status: 'active' },
      { id: 7, name: 'Bến xe phía Bắc Buôn Ma Thuột', address: '71 Nguyễn Chí Thanh, Tân An', city: 'Đắk Lắk', type: 'don-tra', status: 'active' },
      { id: 8, name: 'Bến xe Phan Thiết', address: '01 Từ Văn Tư, Phú Trinh', city: 'Bình Thuận', type: 'don-tra', status: 'active' },
      { id: 9, name: 'Bến xe Trung tâm Đà Nẵng', address: '201 Tôn Đức Thắng, Hòa Minh, Liên Chiểu', city: 'Đà Nẵng', type: 'don-tra', status: 'active' },
      { id: 10, name: 'Bến xe Rạch Giá', address: '204 Nguyễn Hùng Sơn, Vĩnh Thanh Vân', city: 'Kiên Giang', type: 'don-tra', status: 'active' },

      // Điểm trung chuyển
      { id: 101, name: 'Sân bay Tân Sơn Nhất', address: 'Trường Sơn, Phường 2, Tân Bình, TP.HCM', city: 'TP.HCM', type: 'trung-chuyen', status: 'active' },
      { id: 102, name: 'Crescent Mall Quận 7', address: '101 Tôn Dật Tiên, Quận 7, TP.HCM', city: 'TP.HCM', type: 'trung-chuyen', status: 'active' },
      { id: 103, name: 'AEON Mall Tân Phú', address: '30 Bờ Bao Tân Thắng, Tân Phú, TP.HCM', city: 'TP.HCM', type: 'trung-chuyen', status: 'active' },
      { id: 104, name: 'Gigamall Thủ Đức', address: '240-242 Phạm Văn Đồng, TP. Thủ Đức, TP.HCM', city: 'TP.HCM', type: 'trung-chuyen', status: 'active' },
      { id: 105, name: 'Quảng trường Lâm Viên', address: 'Trần Quốc Toản, Đà Lạt, Lâm Đồng', city: 'Lâm Đồng', type: 'trung-chuyen', status: 'active' },
      { id: 106, name: 'GO! Đà Lạt', address: 'Quảng trường Lâm Viên, Đà Lạt, Lâm Đồng', city: 'Lâm Đồng', type: 'trung-chuyen', status: 'active' },
      { id: 107, name: 'Hồ Xuân Hương', address: 'Trần Quốc Toản, Đà Lạt, Lâm Đồng', city: 'Lâm Đồng', type: 'trung-chuyen', status: 'active' },
      { id: 108, name: 'Vincom Plaza Nha Trang', address: '78-80 Trần Phú, Nha Trang, Khánh Hòa', city: 'Khánh Hòa', type: 'trung-chuyen', status: 'active' },
      { id: 109, name: 'Tháp Trầm Hương', address: 'Quảng trường 2/4, Trần Phú, Nha Trang, Khánh Hòa', city: 'Khánh Hòa', type: 'trung-chuyen', status: 'active' },
      { id: 110, name: 'Bến du thuyền Ana Marina', address: 'Phạm Văn Đồng, Vĩnh Hòa, Nha Trang, Khánh Hòa', city: 'Khánh Hòa', type: 'trung-chuyen', status: 'active' },

      // Điểm dừng chân
      { id: 201, name: 'Trạm dừng nghỉ Dầu Giây', address: 'QL1A, Dầu Giây, Thống Nhất, Đồng Nai', city: 'Đồng Nai', type: 'dung', status: 'active' },
      { id: 202, name: 'Trạm dừng nghỉ Long Thành', address: 'QL51, Long Thành, Đồng Nai', city: 'Đồng Nai', type: 'dung', status: 'active' },
      { id: 203, name: 'Trạm dừng chân Suối Tre', address: 'Xuân Lộc, Đồng Nai', city: 'Đồng Nai', type: 'dung', status: 'active' },
      { id: 204, name: 'Trạm dừng chân Bảo Lộc', address: 'QL20, Bảo Lộc, Lâm Đồng', city: 'Lâm Đồng', type: 'dung', status: 'active' },
      { id: 205, name: 'Trạm dừng chân Di Linh', address: 'QL20, Di Linh, Lâm Đồng', city: 'Lâm Đồng', type: 'dung', status: 'active' },
      { id: 206, name: 'Trạm dừng nghỉ Liên Khương', address: 'Đức Trọng, Lâm Đồng', city: 'Lâm Đồng', type: 'dung', status: 'active' },
      { id: 207, name: 'Trạm dừng chân Khánh Vĩnh', address: 'QL27C, Khánh Vĩnh', city: 'Khánh Hòa', type: 'dung', status: 'active' },
      { id: 208, name: 'Trạm dừng Cam Ranh', address: 'QL1A, Cam Ranh, Khánh Hòa', city: 'Khánh Hòa', type: 'dung', status: 'active' },
      { id: 209, name: 'Trạm dừng Phan Rang', address: 'QL1A, Phan Rang, Ninh Thuận', city: 'Ninh Thuận', type: 'dung', status: 'active' },
      { id: 210, name: 'Trạm dừng nghỉ Bắc Nha Trang', address: 'Vĩnh Phương, Nha Trang, Khánh Hòa', city: 'Khánh Hòa', type: 'dung', status: 'active' },

      // Khóa
      { id: 301, name: 'Bến xe Miền Tây', address: '395 Kinh Dương Vương, An Lạc, Bình Tân', city: 'TP.HCM', type: 'don-tra', status: 'locked' },
    ];
    this.filterPoints();
  }

  // Helper methods for tab counts
  getLockedCount(): number {
    return this.allPoints.filter(p => p.status === 'locked').length;
  }

  getCountByType(type: 'don-tra' | 'dung'): number {
    return this.allPoints.filter(p => p.status === 'active' && p.type === type).length;
  }

  setTab(tab: 'don-tra' | 'dung' | 'locked') {
    this.activeTab = tab;
    this.filterPoints();
  }

  filterPoints() {
    const query = this.searchQueries[this.activeTab].toLowerCase();
    const city = this.cityFilters[this.activeTab];
    const type = this.typeFilters[this.activeTab];

    this.filteredPoints = this.allPoints.filter(p => {
      let matchesTab = false;
      if (this.activeTab === 'don-tra') {
        matchesTab = p.status === 'active' && p.type === 'don-tra';
      } else if (this.activeTab === 'dung') {
        matchesTab = p.status === 'active' && p.type === 'dung';
      } else if (this.activeTab === 'locked') {
        matchesTab = p.status === 'locked';
        if (matchesTab && type !== 'all') {
          matchesTab = p.type === type;
        }
      }

      const matchesCity = city === 'all' || p.city === city;
      const matchesSearch = !query || p.name.toLowerCase().includes(query) || p.address.toLowerCase().includes(query);
      
      return matchesTab && matchesCity && matchesSearch;
    });
    this.currentPage = 1;
    this.updatePaginatedPoints();
  }

  updatePaginatedPoints() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredPoints.length / this.pageSize));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedPoints = this.filteredPoints.slice(startIndex, startIndex + this.pageSize);
  }

  setPage(page: number | string) {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedPoints();
    }
  }

  getPaginationItems(): (number | string)[] {
    const groupStart = Math.floor((this.currentPage - 1) / 3) * 3 + 1;
    const groupEnd = Math.min(groupStart + 2, this.totalPages);
    return Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i);
  }

  applyFilter() {
    this.filterPoints();
  }

  clearFilter() {
    this.searchQueries[this.activeTab] = '';
    this.cityFilters[this.activeTab] = 'all';
    this.typeFilters[this.activeTab] = 'all';
    this.filterPoints();
    this.addToast('Đã xóa bộ lọc địa điểm.', 'success');
  }

  openAddModal() {
    this.isEditMode = false;
    this.errors = {};
    
    let defaultType: 'don-tra' | 'dung' = 'don-tra';
    if (this.activeTab === 'dung') defaultType = 'dung';

    this.currentPoint = {
      status: 'active',
      type: defaultType,
      city: '',
      image: null,
      mapLink: ''
    };
    this.isModalOpen = true;
  }

  openEditModal(point: DiemDonTra) {
    this.isEditMode = true;
    this.errors = {};
    this.currentPoint = { ...point };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.errors = {};
  }

  savePoint() {
    this.errors = {
      name: !this.currentPoint.name,
      city: !this.currentPoint.city || this.currentPoint.city === '',
      address: !this.currentPoint.address
    };

    if (Object.values(this.errors).some(Boolean)) {
      this.addToast('Vui lòng nhập đầy đủ thông tin bắt buộc.', 'error');
      return;
    }

    if (this.isEditMode) {
      const index = this.allPoints.findIndex(p => p.id === this.currentPoint.id);
      if (index !== -1) {
        this.allPoints[index] = this.currentPoint as DiemDonTra;
      }
      this.addToast('Đã cập nhật địa điểm thành công.', 'success');
    } else {
      const newPoint: DiemDonTra = {
        ...(this.currentPoint as DiemDonTra),
        id: Math.max(0, ...this.allPoints.map(p => p.id)) + 1
      };
      this.allPoints.push(newPoint);
      this.addToast('Đã thêm địa điểm mới thành công.', 'success');
    }

    this.filterPoints();
    this.closeModal();
  }

  toggleStatus() {
    if (this.currentPoint.status === 'active') {
      this.currentPoint.status = 'locked';
      this.addToast('Đã khóa địa điểm.', 'success');
    } else {
      this.currentPoint.status = 'active';
      this.addToast('Đã mở khóa địa điểm.', 'success');
    }
  }

  onImageUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isUploadingImage = true;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.currentPoint.image = e.target.result;
        this.isUploadingImage = false;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.currentPoint.image = null;
  }

  addToast(message: string, type: 'success' | 'error') {
    const id = this.toastCounter++;
    this.toasts.push({ id, message, type });
    setTimeout(() => this.removeToast(id), 3000);
  }

  removeToast(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }
}
