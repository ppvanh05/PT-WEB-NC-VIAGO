import { inject, ChangeDetectorRef } from '@angular/core';
import { AdminAccountsService } from '../../../../core/services/admin-accounts.service';
import { accountAvatar } from '../../../../shared/utils/account-avatar';
import { AdminTabs } from '../../../../shared/components/admin-tabs/admin-tabs';
import { AdminPageHeader } from '../../../../shared/components/admin-page-header/admin-page-header';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-customer-account-management',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPageHeader, AdminTabs],
  templateUrl: './customer-account-management.html',
  styleUrl: './customer-account-management.css',
})
export class CustomerAccountManagement implements OnInit {
  private readonly backend = inject(AdminAccountsService);
  private readonly cd = inject(ChangeDetectorRef);
  error = '';
  saving = false;
  loading = true;
  memberTierOptions: string[] = [];
  activeTab = 'all';
  currentPage = 1;
  pageSize = 10;

  async ngOnInit() {
    try {
      const [options, customers] = await Promise.all([
        this.backend.customerOptions(),
        this.backend.customers(),
      ]);
      this.memberTierOptions = options.memberTiers.map((t) => t.tenhang);
      this.customers = customers;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Không tải được khách hàng.';
    } finally {
      this.loading = false;
      this.cd.markForCheck();
    }
  }

  get activeCount(): number {
    return this.customers.filter((c) => c.status === 'Đang hoạt động').length;
  }

  get lockedCount(): number {
    return this.customers.filter((c) => c.status === 'Đã khóa').length;
  }

  // Filters State
  searchQuery = '';
  searchGender = 'all';
  appliedSearchQuery = '';
  appliedSearchGender = 'all';

  // Edit Modal State
  selectedCustomer: any = null;
  showEditModal = false;
  editSubTab = 'profile'; // 'profile' | 'history' | 'logs'

  // Create Modal State
  showCreateModal = false;
  newCustomer: any = {
    code: '',
    name: '',
    phone: '',
    email: '',
    gender: 'Nam',
    birthDate: '',
    initials: '',
    status: 'Đang hoạt động',
    tickets: '0-vé',
    date: '',
    bookings: [],
    logs: [],
    memberTier: 'Không có',
    occupation: '',
  };

  // Lock Confirmation Modal State
  showLockConfirmModal = false;
  lockReason = '';

  customers: any[] = [];

  get filteredCustomers() {
    let list = this.customers;

    // Filter by Tab
    if (this.activeTab === 'active') {
      list = list.filter((c) => c.status === 'Đang hoạt động');
    } else if (this.activeTab === 'locked') {
      list = list.filter((c) => c.status === 'Đã khóa');
    }

    // Filter by Search Query (applied)
    if (this.appliedSearchQuery.trim()) {
      const q = this.appliedSearchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q),
      );
    }

    // Filter by Gender (applied)
    if (this.appliedSearchGender !== 'all') {
      list = list.filter((c) => c.gender === this.appliedSearchGender);
    }

    return list;
  }

  // Pagination Getter Properties
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCustomers.length / this.pageSize));
  }

  get validCurrentPage(): number {
    return Math.min(Math.max(this.currentPage, 1), this.totalPages);
  }

  get paginatedCustomers(): any[] {
    const start = (this.validCurrentPage - 1) * this.pageSize;
    return this.filteredCustomers.slice(start, start + this.pageSize);
  }

  get startIndex(): number {
    if (this.filteredCustomers.length === 0) return 0;
    return (this.validCurrentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.validCurrentPage * this.pageSize, this.filteredCustomers.length);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getPaginationItems(): number[] {
    const groupStart = Math.floor((this.validCurrentPage - 1) / 3) * 3 + 1;
    const groupEnd = Math.min(groupStart + 2, this.totalPages);
    return Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i);
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.currentPage = 1;
  }

  // Trigger search action
  applyFilter() {
    this.appliedSearchQuery = this.searchQuery;
    this.appliedSearchGender = this.searchGender;
    this.currentPage = 1;
  }

  clearSearchQuery() {
    this.searchQuery = '';
    this.applyFilter();
  }

  clearAllFilters() {
    this.searchQuery = '';
    this.searchGender = 'all';
    this.applyFilter();
  }

  // Generate next customer code sequentially
  generateNextCustomerCode(): string {
    let maxNum = 100000;
    this.customers.forEach((c) => {
      const num = parseInt(c.code.replace('KH', ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    });
    return 'KH' + (maxNum + 1);
  }

  // Open Edit Modal
  openEditModal(customer: any) {
    this.selectedCustomer = JSON.parse(JSON.stringify(customer));
    this.showEditModal = true;
    this.editSubTab = 'profile';
    this.error = '';
    void this.backend
      .history(customer.code)
      .then((rows) => {
        if (this.selectedCustomer?.code === customer.code) this.selectedCustomer.bookings = rows;
        this.cd.markForCheck();
      })
      .catch((e) => {
        this.error = e.message;
        this.cd.markForCheck();
      });
  }

  // Close Edit Modal
  closeEditModal() {
    this.showEditModal = false;
    this.selectedCustomer = null;
  }

  async setEditSubTab(tab: string) {
    this.editSubTab = tab;
    this.error = '';
    if (tab !== 'logs' || !this.selectedCustomer) return;
    const id = this.selectedCustomer.code;
    try {
      const rows = await this.backend.logs('customers', id);
      if (this.selectedCustomer?.code === id) this.selectedCustomer.logs = rows;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Khong tai duoc nhat ky.';
    } finally {
      this.cd.markForCheck();
    }
  }
  async changeAvatar(event: Event) {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0],
      customer = this.selectedCustomer;
    input.value = '';
    if (!file || !customer || this.saving) return;
    try {
      const avatar = await accountAvatar(file);
      if (this.selectedCustomer === customer) customer.avatar = avatar;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Không tải được ảnh.';
    } finally {
      this.cd.markForCheck();
    }
  }

  toggleCustomerStatus() {
    if (!this.selectedCustomer || this.saving) return;
    if (this.selectedCustomer.status === 'Đang hoạt động') this.openLockConfirmModal();
    else void this.setStatus(false);
  }
  async setStatus(lock: boolean) {
    if (!this.selectedCustomer || this.saving) return;
    this.saving = true;
    this.error = '';
    try {
      const row = await this.backend.customerStatus(
        this.selectedCustomer.code,
        lock,
        lock ? this.lockReason.trim() : 'Mở khóa từ trang quản trị',
      );
      this.customers = this.customers.map((c) => (c.code === row.code ? row : c));
      this.selectedCustomer = row;
      this.showLockConfirmModal = false;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Không lưu được trạng thái.';
    } finally {
      this.saving = false;
      this.cd.markForCheck();
    }
  }
  async saveCustomerChanges() {
    if (!this.selectedCustomer || this.saving) return;
    this.saving = true;
    this.error = '';
    try {
      const row = await this.backend.saveCustomer(this.selectedCustomer, false);
      this.customers = this.customers.map((c) => (c.code === row.code ? row : c));
      this.closeEditModal();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Không lưu được khách hàng.';
    } finally {
      this.saving = false;
      this.cd.markForCheck();
    }
  }

  // Lock Confirmation Methods
  openLockConfirmModal() {
    this.lockReason = '';
    this.showLockConfirmModal = true;
  }

  closeLockConfirmModal() {
    this.showLockConfirmModal = false;
  }

  confirmLockCustomer() {
    if (this.lockReason.trim().length < 3) {
      this.error = 'Nhập lý do khóa ít nhất 3 ký tự.';
      return;
    }
    void this.setStatus(true);
  }

  // Create Modal Actions
  openCreateModal() {
    const nextCode = 'Server tự cấp';
    this.newCustomer = {
      code: nextCode,
      name: '',
      phone: '',
      email: '',
      gender: 'Nam',
      birthDate: '',
      initials: '',
      status: 'Đang hoạt động',
      tickets: '0-vé',
      date: new Date().toLocaleDateString('vi-VN'),
      bookings: [],
      logs: [],
    };
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  async createCustomer() {
    if (this.saving) return;
    this.saving = true;
    this.error = '';
    try {
      const row = await this.backend.saveCustomer(this.newCustomer, true);
      this.customers = [row, ...this.customers];
      this.closeCreateModal();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Không tạo được khách hàng.';
    } finally {
      this.saving = false;
      this.cd.markForCheck();
    }
  }

  getMemberTier(item: any): string {
    return item.memberTier || 'Không có';
  }
}
