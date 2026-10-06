import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { Button } from '../../../../shared/components/button/button';

export interface Personnel {
  id: number;
  name: string;
  role: 'Tài xế' | 'Phụ xe';
  dob: string;
  phone: string;
  identityNumber?: string;
  licenseClass: string;
  licenseExpiry: string;
  status: 'Đang làm việc' | 'Nghỉ phép' | 'Đã khóa';
  avatar?: string | null;
  licenseImage?: string | null;
  licenseFrontImage?: string | null;
  licenseBackImage?: string | null;
  identityFrontImage?: string | null;
  identityBackImage?: string | null;
}

const DRIVER_PORTRAIT_IMAGE_URL = '/assets/customer/chandungtaixe.jpg';
const LICENSE_FRONT_IMAGE_URL = '/assets/customer/gplxmattruoc.jpg';
const LICENSE_BACK_IMAGE_URL = '/assets/customer/gplxmatsau.jpg';
const IDENTITY_FRONT_IMAGE_URL = '/assets/customer/cccdmattruoc.jpg';
const IDENTITY_BACK_IMAGE_URL = '/assets/customer/cccdmatsau.jpg';

@Component({
  selector: 'app-drivers-assistants',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination, Button],
  templateUrl: './drivers-assistants.html',
  styleUrls: ['./drivers-assistants.css']
})
export class DriversAssistants implements OnInit {
  activeTab: 'Tất cả' | 'Tài xế' | 'Phụ xe' | 'Đã khóa' = 'Tất cả';
  searchQuery: string = '';
  roleFilter: string = 'Tất cả';
  licenseFilter: string = 'Tất cả';
  statusFilter: string = 'Tất cả';

  isModalOpen = false;
  isEditMode = false;
  currentPersonnel: any = {};
  isUploadingAvatar = false;
  isUploadingLicense = false;
  errors: any = {};
  toasts: { id: number; message: string; type: 'success' | 'error' }[] = [];
  toastCounter = 0;

  roleOptions = ['Tất cả', 'Tài xế', 'Phụ xe'];
  licenseOptions = ['Tất cả', 'B2', 'C', 'D', 'E'];
  statusOptions = ['Tất cả', 'Đang làm việc', 'Nghỉ phép', 'Sắp hết hạn', 'Đã khóa'];

  allPersonnel: Personnel[] = [
    { id: 1, name: 'Nguyễn Văn Minh', role: 'Tài xế', dob: '15/03/1985', phone: '0901234567', licenseClass: 'E', licenseExpiry: '20/08/2028', status: 'Đang làm việc' },
    { id: 2, name: 'Trần Quốc Huy', role: 'Tài xế', dob: '22/07/1988', phone: '0912345678', licenseClass: 'E', licenseExpiry: '14/11/2027', status: 'Đang làm việc' },
    { id: 3, name: 'Lê Hoàng Nam', role: 'Tài xế', dob: '10/12/1983', phone: '0933456789', licenseClass: 'E', licenseExpiry: '05/04/2029', status: 'Nghỉ phép' },
    { id: 4, name: 'Phạm Đức Thành', role: 'Tài xế', dob: '28/01/1990', phone: '0944567890', licenseClass: 'D', licenseExpiry: '18/09/2028', status: 'Đang làm việc' },
    { id: 5, name: 'Võ Thanh Tùng', role: 'Tài xế', dob: '07/05/1987', phone: '0965678901', licenseClass: 'D', licenseExpiry: '30/06/2027', status: 'Đang làm việc' },
    { id: 6, name: 'Nguyễn Văn Phúc', role: 'Phụ xe', dob: '12/09/1995', phone: '0976789012', licenseClass: 'B2', licenseExpiry: '15/05/2028', status: 'Đang làm việc' },
    { id: 7, name: 'Trần Minh Khang', role: 'Phụ xe', dob: '25/11/1998', phone: '0987890123', licenseClass: 'B2', licenseExpiry: '22/10/2027', status: 'Đang làm việc' },
    { id: 8, name: 'Lê Quốc Bảo', role: 'Phụ xe', dob: '18/02/1996', phone: '0398901234', licenseClass: 'C', licenseExpiry: '09/03/2029', status: 'Nghỉ phép' },
    { id: 9, name: 'Phan Gia Hưng', role: 'Phụ xe', dob: '04/06/1999', phone: '0389012345', licenseClass: 'B2', licenseExpiry: '28/12/2028', status: 'Đang làm việc' },
    { id: 10, name: 'Đặng Nhật Quang', role: 'Phụ xe', dob: '30/08/1997', phone: '0370123456', licenseClass: 'C', licenseExpiry: '17/07/2027', status: 'Đã khóa' },
  ];

  filteredPersonnel: Personnel[] = [];
  paginatedPersonnel: Personnel[] = [];
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.allPersonnel = this.allPersonnel.map(personnel => ({
      ...personnel,
      identityNumber: personnel.identityNumber || '079000000000',
      avatar: DRIVER_PORTRAIT_IMAGE_URL,
      licenseFrontImage: LICENSE_FRONT_IMAGE_URL,
      licenseBackImage: LICENSE_BACK_IMAGE_URL,
      identityFrontImage: IDENTITY_FRONT_IMAGE_URL,
      identityBackImage: IDENTITY_BACK_IMAGE_URL
    }));
    this.filterPersonnel();
  }

  // Helper methods for tab counts
  getTotalCount(): number {
    return this.allPersonnel.length;
  }

  getDriverCount(): number {
    return this.allPersonnel.filter(p => p.role === 'Tài xế' && p.status !== 'Đã khóa').length;
  }

  getAssistantCount(): number {
    return this.allPersonnel.filter(p => p.role === 'Phụ xe' && p.status !== 'Đã khóa').length;
  }

  getLockedCount(): number {
    return this.allPersonnel.filter(p => p.status === 'Đã khóa').length;
  }

  setTab(tab: 'Tất cả' | 'Tài xế' | 'Phụ xe' | 'Đã khóa') {
    this.activeTab = tab;
    this.filterPersonnel();
  }

  filterPersonnel() {
    this.filteredPersonnel = this.allPersonnel.filter(p => {
      // Filter by Tabs
      let matchesTab = true;
      if (this.activeTab === 'Tài xế') matchesTab = p.role === 'Tài xế' && p.status !== 'Đã khóa';
      else if (this.activeTab === 'Phụ xe') matchesTab = p.role === 'Phụ xe' && p.status !== 'Đã khóa';
      else if (this.activeTab === 'Đã khóa') matchesTab = p.status === 'Đã khóa';
      else matchesTab = true;

      const matchesSearch = !this.searchQuery || 
        p.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
        p.phone.includes(this.searchQuery) ||
        !!p.identityNumber?.includes(this.searchQuery);

      const matchesRole = this.roleFilter === 'Tất cả' || p.role === this.roleFilter;
      const matchesLicense = this.licenseFilter === 'Tất cả' || p.licenseClass === this.licenseFilter;
      const matchesStatus = this.statusFilter === 'Tất cả' ||
        (this.statusFilter === 'Sắp hết hạn' ? this.isLicenseExpiringSoon(p) : p.status === this.statusFilter);

      return matchesTab && matchesSearch && matchesRole && matchesLicense && matchesStatus;
    });
    this.currentPage = 1;
    this.updatePaginatedPersonnel();
  }

  updatePaginatedPersonnel() {
    this.totalPages = Math.max(1, Math.ceil(this.filteredPersonnel.length / this.pageSize));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedPersonnel = this.filteredPersonnel.slice(startIndex, startIndex + this.pageSize);
  }

  setPage(page: number | string) {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedPersonnel();
    }
  }


  clearFilters() {
    this.searchQuery = '';
    this.roleFilter = 'Tất cả';
    this.licenseFilter = 'Tất cả';
    this.statusFilter = 'Tất cả';
    this.filterPersonnel();
    this.addToast('Đã xóa bộ lọc nhân sự.', 'success');
  }

  openAddModal() {
    this.isEditMode = false;
    this.errors = {};
    this.currentPersonnel = {
      status: 'Đang làm việc',
      role: this.activeTab === 'Phụ xe' ? 'Phụ xe' : 'Tài xế',
      licenseClass: '',
      identityNumber: '',
      avatar: null,
      licenseImage: null,
      licenseFrontImage: null,
      licenseBackImage: null,
      identityFrontImage: null,
      identityBackImage: null
    };
    this.isModalOpen = true;
  }

  openEditModal(p: Personnel) {
    this.isEditMode = true;
    this.errors = {};
    this.currentPersonnel = {
      ...p,
      dob: this.toDateInput(p.dob),
      licenseExpiry: this.toDateInput(p.licenseExpiry)
    };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  savePersonnel() {
    this.errors = {
      name: !this.currentPersonnel.name,
      phone: !this.currentPersonnel.phone,
      identityNumber: !this.currentPersonnel.identityNumber,
      role: !this.currentPersonnel.role,
      licenseClass: !this.currentPersonnel.licenseClass,
      licenseExpiry: !this.currentPersonnel.licenseExpiry
    };

    if (Object.values(this.errors).some(Boolean)) {
      this.addToast('Vui lòng nhập đầy đủ thông tin bắt buộc.', 'error');
      return;
    }

    if (this.isEditMode) {
      const index = this.allPersonnel.findIndex(p => p.id === this.currentPersonnel.id);
      if (index !== -1) this.allPersonnel[index] = this.currentPersonnel;
      this.addToast('Đã cập nhật nhân sự thành công.', 'success');
    } else {
      this.currentPersonnel.id = Math.max(0, ...this.allPersonnel.map(p => p.id)) + 1;
      this.allPersonnel.push(this.currentPersonnel);
      this.addToast('Đã thêm nhân sự mới thành công.', 'success');
    }
    this.filterPersonnel();
    this.closeModal();
  }

  onImageUpload(event: any, field: string) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.currentPersonnel[field] = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(field: string) {
    this.currentPersonnel[field] = null;
  }

  isLicenseExpiringSoon(p: Personnel): boolean {
    if (p.status === 'Đã khóa') return false;

    const expiry = this.parseDate(p.licenseExpiry);
    if (!expiry) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  }

  getDisplayStatus(p: Personnel): string {
    return this.isLicenseExpiringSoon(p) ? 'Sắp hết hạn' : p.status;
  }

  private parseDate(value: string): Date | null {
    if (!value) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const parts = value.split('/');
    if (parts.length !== 3) return null;

    const [day, month, year] = parts.map(Number);
    if (!day || !month || !year) return null;

    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private toDateInput(value: string): string {
    const parsed = this.parseDate(value);
    if (!parsed) return value;

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  toggleLock(p: Personnel) {
    const action = p.status === 'Đã khóa' ? 'mở khóa' : 'khóa';
    if (confirm(`Bạn có chắc chắn muốn ${action} nhân sự ${p.name}?`)) {
      p.status = p.status === 'Đã khóa' ? 'Đang làm việc' : 'Đã khóa';
      this.filterPersonnel();
      this.addToast(p.status === 'Đã khóa' ? 'Đã khóa nhân sự.' : 'Đã mở khóa nhân sự.', 'success');
    }
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
