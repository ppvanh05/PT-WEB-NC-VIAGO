import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Vehicle {
  id: number;
  name: string;
  licensePlate: string;
  type: string;
  seats: number;
  registrationExpiry: string;
  insuranceExpiry?: string;
  amenities: string[];
  status: 'Đang hoạt động' | 'Bảo trì' | 'Đã khóa';
  registrationImage?: string | null;
  insuranceImage?: string | null;
  vehicleImage?: string | null;
}

const REGISTRATION_IMAGE_URL = 'asset/images/customer/giaydangkiem.jpg';
const INSURANCE_IMAGE_URL = 'asset/images/customer/baohiemxe.jpg';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehicles.html',
  styleUrls: ['./vehicles.css']
})
export class VehiclesComponent implements OnInit {
  activeTab: 'Tất cả' | 'Đang hoạt động' | 'Bảo trì' | 'Đã khóa' = 'Tất cả';
  searchQuery: string = '';
  selectedType: string = 'Tất cả loại xe';
  selectedStatus: string = 'Tất cả trạng thái';

  isModalOpen = false;
  isEditMode = false;
  currentVehicle: any = {};
  isUploadingReg = false;
  isUploadingIns = false;
  isUploadingVeh = false;
  errors: any = {};
  toasts: { id: number; message: string; type: 'success' | 'error' }[] = [];
  toastCounter = 0;

  vehicleConfigs: { [key: string]: { floors: number, rows: number, seats: number } } = {
    'Limousine': { floors: 2, rows: 2, seats: 22 },
    'Giường nằm': { floors: 2, rows: 3, seats: 34 },
    'Cabin đôi': { floors: 2, rows: 2, seats: 24 }
  };

  amenitiesList = [
    { id: 'wifi', label: 'Wifi', icon: 'wifi' },
    { id: 'tv', label: 'Tivi', icon: 'tv' },
    { id: 'usb', label: 'Ổ sạc USB', icon: 'usb' },
    { id: 'water', label: 'Nước uống & khăn ướt', icon: 'local_drink' },
    { id: 'gps', label: 'GPS', icon: 'gps_fixed' },
    { id: 'ac', label: 'Điều hòa', icon: 'ac_unit' }
  ];

  vehicleTypes = ['Tất cả loại xe', 'Limousine', 'Giường nằm', 'Cabin'];
  statusOptions = ['Tất cả trạng thái', 'Đang hoạt động', 'Bảo trì', 'Đã khóa'];

  allVehicles: Vehicle[] = [
    { id: 1, name: 'VIAGO Limousine 01', licensePlate: '51B-123.45', type: 'Limousine', seats: 9, registrationExpiry: '15/12/2026', amenities: ['Wifi', 'Tivi', 'Ổ sạc USB', 'Nước uống & khăn ướt', 'GPS', 'Điều hòa'], status: 'Đang hoạt động' },
    { id: 2, name: 'VIAGO Limousine 02', licensePlate: '51B-234.56', type: 'Limousine', seats: 9, registrationExpiry: '28/09/2026', amenities: ['Wifi', 'Tivi', 'Ổ sạc USB', 'Nước uống & khăn ướt', 'GPS', 'Điều hòa'], status: 'Đang hoạt động' },
    { id: 3, name: 'VIAGO Limousine 03', licensePlate: '51B-345.67', type: 'Limousine', seats: 9, registrationExpiry: '10/03/2027', amenities: ['Wifi', 'Tivi', 'Ổ sạc USB', 'Nước uống & khăn ướt', 'GPS', 'Điều hòa'], status: 'Bảo trì' },
    { id: 4, name: 'VIAGO Giường Nằm 01', licensePlate: '51F-456.78', type: 'Giường nằm', seats: 34, registrationExpiry: '22/11/2026', amenities: ['Wifi', 'Tivi', 'Ổ sạc USB', 'Nước uống & khăn ướt', 'GPS', 'Điều hòa'], status: 'Đang hoạt động' },
    { id: 5, name: 'VIAGO Giường Nằm 02', licensePlate: '51F-567.89', type: 'Giường nằm', seats: 34, registrationExpiry: '05/01/2027', amenities: ['Wifi', 'Tivi', 'Ổ sạc USB', 'Nước uống & khăn ướt', 'GPS', 'Điều hòa'], status: 'Đang hoạt động' },
    { id: 6, name: 'VIAGO Giường Nằm 03', licensePlate: '51F-678.90', type: 'Giường nằm', seats: 34, registrationExpiry: '18/08/2026', amenities: ['Wifi', 'Tivi', 'Ổ sạc USB', 'Nước uống & khăn ướt', 'GPS', 'Điều hòa'], status: 'Bảo trì' },
    { id: 7, name: 'VIAGO Cabin 01', licensePlate: '51F-789.12', type: 'Cabin', seats: 22, registrationExpiry: '30/04/2027', amenities: ['Wifi', 'Tivi', 'Ổ sạc USB', 'Nước uống & khăn ướt', 'GPS', 'Điều hòa'], status: 'Đang hoạt động' },
    { id: 8, name: 'VIAGO Cabin 02', licensePlate: '51F-890.23', type: 'Cabin', seats: 22, registrationExpiry: '12/06/2027', amenities: ['Wifi', 'Tivi', 'Ổ sạc USB', 'Nước uống & khăn ướt', 'GPS', 'Điều hòa'], status: 'Đang hoạt động' },
    { id: 9, name: 'VIAGO Cabin 03', licensePlate: '51F-901.34', type: 'Cabin', seats: 22, registrationExpiry: '25/10/2026', amenities: ['Wifi', 'Tivi', 'Ổ sạc USB', 'Nước uống & khăn ướt', 'GPS', 'Điều hòa'], status: 'Đã khóa' },
    { id: 10, name: 'VIAGO Giường Nằm 04', licensePlate: '51F-112.45', type: 'Giường nằm', seats: 34, registrationExpiry: '14/02/2027', amenities: ['Wifi', 'Tivi', 'Ổ sạc USB', 'Nước uống & khăn ướt', 'GPS', 'Điều hòa'], status: 'Đang hoạt động' },
  ];

  filteredVehicles: Vehicle[] = [];
  paginatedVehicles: Vehicle[] = [];
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.allVehicles = this.allVehicles.map(vehicle => ({
      ...vehicle,
      insuranceExpiry: vehicle.insuranceExpiry || vehicle.registrationExpiry,
      registrationImage: REGISTRATION_IMAGE_URL,
      insuranceImage: INSURANCE_IMAGE_URL
    }));
    this.filterVehicles();
  }

  // Helper methods for tab counts
  getTotalCount(): number {
    return this.allVehicles.length;
  }

  getCountByStatus(status: string): number {
    return this.allVehicles.filter(v => v.status === status).length;
  }

  setTab(tab: 'Tất cả' | 'Đang hoạt động' | 'Bảo trì' | 'Đã khóa') {
    this.activeTab = tab;
    this.filterVehicles();
  }

  filterVehicles() {
    this.filteredVehicles = this.allVehicles.filter(v => {
      const matchesTab = this.activeTab === 'Tất cả' || v.status === this.activeTab;
      const matchesSearch = !this.searchQuery || 
        v.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
        v.licensePlate.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesType = this.selectedType === 'Tất cả loại xe' || v.type === this.selectedType;
      const matchesStatus = this.selectedStatus === 'Tất cả trạng thái' || v.status === this.selectedStatus;

      return matchesTab && matchesSearch && matchesType && matchesStatus;
    });
    this.currentPage = 1;
    this.updatePaginatedVehicles();
  }

  updatePaginatedVehicles() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredVehicles.length / this.pageSize));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedVehicles = this.filteredVehicles.slice(startIndex, startIndex + this.pageSize);
  }

  setPage(page: number | string) {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedVehicles();
    }
  }

  getPaginationItems(): (number | string)[] {
    const groupStart = Math.floor((this.currentPage - 1) / 3) * 3 + 1;
    const groupEnd = Math.min(groupStart + 2, this.totalPages);
    return Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i);
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedType = 'Tất cả loại xe';
    this.selectedStatus = 'Tất cả trạng thái';
    this.filterVehicles();
    this.addToast('Đã xóa bộ lọc phương tiện.', 'success');
  }

  openAddModal() {
    this.isEditMode = false;
    this.errors = {};
    this.currentVehicle = {
      status: 'Đang hoạt động',
      type: '',
      name: '',
      licensePlate: '',
      registrationExpiry: '',
      insuranceExpiry: '',
      floors: 1,
      rows: 0,
      seats: 0,
      amenities: [],
      registrationImage: null,
      insuranceImage: null,
      vehicleImage: null
    };
    this.isModalOpen = true;
  }

  openEditModal(vehicle: Vehicle) {
    this.isEditMode = true;
    this.errors = {};
    this.currentVehicle = { ...vehicle };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveVehicle() {
    this.errors = {
      name: !this.currentVehicle.name,
      licensePlate: !this.currentVehicle.licensePlate,
      type: !this.currentVehicle.type,
      registrationExpiry: !this.currentVehicle.registrationExpiry,
      insuranceExpiry: !this.currentVehicle.insuranceExpiry,
      floors: !this.currentVehicle.floors,
      rows: !this.currentVehicle.rows,
      seats: !this.currentVehicle.seats,
      amenities: !this.currentVehicle.amenities || this.currentVehicle.amenities.length === 0,
      vehicleImage: !this.currentVehicle.vehicleImage
    };

    if (Object.values(this.errors).some(Boolean)) {
      this.addToast('Vui lòng nhập đầy đủ thông tin bắt buộc.', 'error');
      return;
    }

    if (this.isEditMode) {
      const index = this.allVehicles.findIndex(v => v.id === this.currentVehicle.id);
      if (index !== -1) this.allVehicles[index] = this.currentVehicle;
      this.addToast('Đã cập nhật phương tiện thành công.', 'success');
    } else {
      this.currentVehicle.id = Math.max(0, ...this.allVehicles.map(v => v.id)) + 1;
      this.allVehicles.push(this.currentVehicle);
      this.addToast('Đã thêm phương tiện mới thành công.', 'success');
    }
    this.filterVehicles();
    this.closeModal();
  }

  onVehicleTypeChange() {
    const config = this.vehicleConfigs[this.currentVehicle.type];
    if (config) {
      this.currentVehicle.seats = config.seats;
    }
  }

  toggleAmenity(label: string) {
    if (!this.currentVehicle.amenities) this.currentVehicle.amenities = [];
    const index = this.currentVehicle.amenities.indexOf(label);
    if (index === -1) {
      this.currentVehicle.amenities.push(label);
    } else {
      this.currentVehicle.amenities.splice(index, 1);
    }
  }

  hasAmenity(label: string): boolean {
    return this.currentVehicle.amenities?.includes(label) || false;
  }

  onImageUpload(event: any, field: string) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.currentVehicle[field] = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(field: string) {
    this.currentVehicle[field] = null;
  }

  toggleStatus() {
    this.currentVehicle.status = this.currentVehicle.status === 'Đã khóa' ? 'Đang hoạt động' : 'Đã khóa';
    this.addToast(
      this.currentVehicle.status === 'Đã khóa' ? 'Đã khóa phương tiện.' : 'Đã mở khóa phương tiện.',
      'success'
    );
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
