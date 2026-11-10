import { AdminAccountsService } from '../../../../core/services/admin-accounts.service';
import { roleLabel } from '../../../../core/services/accounts-api.service';
import { AdminTabs } from '../../../../shared/components/admin-tabs/admin-tabs';
import { AdminPageHeader } from '../../../../shared/components/admin-page-header/admin-page-header';
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../../shared/components/button/button';
import { Input, InputType } from '../../../../shared/components/input/input';
import { Select } from '../../../../shared/components/input/select/select';
import { Textarea } from '../../../../shared/components/input/textarea/textarea';
import { Badge } from '../../../../shared/components/badge/badge';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { Toast } from '../../../../shared/components/toast/toast';
import { ToastPopup } from '../../../../shared/components/toast/toast-popup';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker';
import { AuditMetadata } from '../../../../core/services/audit-event';

export interface Employee {
  code: string;
  username: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  email: string;
  gender: string;
  birthDate: string;
  startDate: string;
  date: string;
  initials: string;
  status: string;
  defaultRole: string;
  roles: string;
  permissions: string[];
  address: string;
  notes: string;
  contractType: string;
  avatarUrl: string;
  logs: ({
    title: string;
    time: string;
    desc: string;
    code: string;
    ip: string;
  } & Partial<AuditMetadata>)[];
  lockInfo?: { date: string; reason: string } | null;
}

@Component({
  selector: 'app-staff-account-management',
  imports: [
    FormsModule,
    Button,
    Input,
    Select,
    Textarea,
    Badge,
    Pagination,
    Toast,
    ModalComponent,
    DatePickerComponent,
    ToastPopup,
    AdminPageHeader,
    AdminTabs,
  ],
  templateUrl: './staff-account-management.html',
  styleUrl: './staff-account-management.css',
})
export class StaffAccountManagement implements OnInit {
  private readonly cd = inject(ChangeDetectorRef);
  private readonly backend = inject(AdminAccountsService);
  saving = false;
  loading = true;
  loadError = '';
  readonly today = new Date().toLocaleDateString('sv-SE');
  roles: string[] = [];
  get roleOptions() {
    return this.roles.map((value) => ({ label: value, value }));
  }
  get filterRoleOptions() {
    return [{ label: 'Tất cả chức vụ', value: 'all' }, ...this.roleOptions];
  }
  readonly genderOptions = ['Nam', 'Nữ', 'Khác'].map((value) => ({ label: value, value }));
  readonly contractOptions = [
    'Hợp đồng không xác định thời hạn',
    'Hợp đồng xác định thời hạn 1 năm',
    'Hợp đồng thử việc',
  ].map((value) => ({ label: value, value }));
  permissionModules: { key: string; title: string; desc: string; expanded: boolean }[] = [];
  readonly logPageSize = 10;
  logPage = 1;
  get validLogPage(): number {
    return Math.min(
      Math.max(1, this.logPage),
      Math.max(1, Math.ceil((this.draft?.logs.length || 0) / this.logPageSize)),
    );
  }
  get paginatedEmployeeLogs() {
    return (this.draft?.logs || []).slice(
      (this.validLogPage - 1) * this.logPageSize,
      this.validLogPage * this.logPageSize,
    );
  }
  readonly fields: {
    key: 'username' | 'lastName' | 'firstName' | 'name' | 'phone' | 'email' | 'address';
    label: string;
    type: InputType;
    max: number;
    tab: string;
  }[] = [
    { key: 'username', label: 'Tên truy cập', type: 'text', max: 50, tab: 'profile' },
    { key: 'lastName', label: 'Họ và tên đệm', type: 'text', max: 100, tab: 'profile' },
    { key: 'firstName', label: 'Tên', type: 'text', max: 50, tab: 'profile' },
    { key: 'name', label: 'Tên hiển thị', type: 'text', max: 150, tab: 'profile' },
    { key: 'phone', label: 'Số điện thoại liên hệ', type: 'tel', max: 20, tab: 'contact' },
    { key: 'email', label: 'Email', type: 'email', max: 254, tab: 'contact' },
    { key: 'address', label: 'Địa chỉ thường trú', type: 'text', max: 300, tab: 'contact' },
  ];
  employees: Employee[] = [];
  draft: Employee | null = null;
  creating = false;
  tab = 'profile';
  activeTab = 'all';
  currentPage = 1;
  searchQuery = '';
  searchRole = 'all';
  appliedQuery = '';
  appliedRole = 'all';
  permissionQuery = '';
  touched: Record<string, boolean> = {};
  submitted = false;
  password = '';
  showPassword = false;
  feedback = '';
  feedbackError = false;
  modalError = '';
  lockOpen = false;
  lockReason = '';
  successOpen = false;
  successMessage = '';
  avatarError = '';
  readingAvatar = false;
  private avatarVersion = 0;

  async ngOnInit(): Promise<void> {
    try {
      const [options, employees] = await Promise.all([
        this.backend.options(),
        this.backend.employees(),
      ]);
      this.roles = options.roles.map((r) => roleLabel(r.tenvaitro));
      this.permissionModules = options.permissions.map((p) => ({
        key: p.maquyen,
        title: p.tenquyen,
        desc: p.mota || p.nhomchucnang,
        expanded: false,
      }));
      this.employees = employees.map((e) => this.normalize(e));
    } catch (error) {
      this.feedback = error instanceof Error ? error.message : 'Không tải được nhân viên.';
      this.loadError = this.feedback;
      this.feedbackError = true;
    } finally {
      this.loading = false;
      this.cd.markForCheck();
    }
  }
  private normalize(e: Partial<Employee>): Employee {
    const parts = (e.name || '').trim().split(/\s+/);
    return {
      code: '',
      username: '',
      name: '',
      phone: '',
      email: '',
      gender: 'Nam',
      birthDate: '',
      date: '',
      initials: 'NV',
      status: 'Đang hoạt động',
      defaultRole: this.roles[0],
      roles: '',
      address: '',
      notes: '',
      avatarUrl: '',
      contractType: this.contractOptions[0].value,
      ...e,
      firstName: e.firstName ?? parts.at(-1) ?? '',
      lastName: e.lastName ?? parts.slice(0, -1).join(' '),
      startDate: e.startDate ?? this.toISO(e.date || ''),
      permissions: Array.isArray(e.permissions) ? [...e.permissions] : [],
      logs: Array.isArray(e.logs) ? [...e.logs] : [],
    };
  }
  private toISO(date: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date);
    return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
  }
  formatDate(date: string): string {
    return this.validDate(date) ? date.split('-').reverse().join('/') : '—';
  }
  validDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return (
      y >= 1900 && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
    );
  }
  get activeCount(): number {
    return this.employees.filter((e) => e.status === 'Đang hoạt động').length;
  }
  get lockedCount(): number {
    return this.employees.length - this.activeCount;
  }
  get filteredEmployees(): Employee[] {
    const q = this.appliedQuery.toLocaleLowerCase('vi').trim();
    return this.employees.filter(
      (e) =>
        (this.activeTab === 'all' ||
          e.status === (this.activeTab === 'active' ? 'Đang hoạt động' : 'Đã khóa')) &&
        (this.appliedRole === 'all' || e.defaultRole === this.appliedRole) &&
        [e.code, e.username, e.name, e.phone, e.email].some((v) =>
          v.toLocaleLowerCase('vi').includes(q),
        ),
    );
  }
  get validCurrentPage(): number {
    return Math.min(this.currentPage, Math.max(1, Math.ceil(this.filteredEmployees.length / 10)));
  }
  get paginatedEmployees(): Employee[] {
    return this.filteredEmployees.slice(
      (this.validCurrentPage - 1) * 10,
      this.validCurrentPage * 10,
    );
  }
  applyFilter(): void {
    this.appliedQuery = this.searchQuery;
    this.appliedRole = this.searchRole;
    this.currentPage = 1;
  }
  clearFilters(): void {
    this.searchQuery = '';
    this.searchRole = 'all';
    this.applyFilter();
  }
  setTab(tab: string): void {
    this.activeTab = tab;
    this.currentPage = 1;
  }
  open(employee?: Employee): void {
    this.logPage = 1;
    this.feedback = '';
    this.feedbackError = false;
    this.creating = !employee;
    this.draft = employee
      ? structuredClone(employee)
      : this.normalize({ startDate: this.today, permissions: [] });
    this.tab = 'profile';
    this.touched = {};
    this.submitted = false;
    this.password = '';
    this.showPassword = false;
    this.modalError = '';
    this.avatarError = '';
    this.readingAvatar = false;
    this.avatarVersion++;
    this.permissionQuery = '';
    if (employee)
      void this.backend
        .logs('employees', employee.code)
        .then((logs) => {
          if (this.draft?.code === employee.code) this.draft.logs = logs;
          this.cd.markForCheck();
        })
        .catch((error) => {
          this.modalError = error.message;
          this.cd.markForCheck();
        });
    this.cd.markForCheck();
  }
  close(): void {
    if (this.feedback && !this.feedbackError) {
      this.successMessage = this.feedback;
      this.successOpen = true;
      this.feedback = '';
    }
    this.draft = null;
    this.lockOpen = false;
    this.avatarVersion++;
    this.readingAvatar = false;
    this.password = '';
    this.cd.markForCheck();
  }
  update(key: string, value: string): void {
    if (!this.draft) return;
    const field = this.fields.find((f) => f.key === key);
    if (field) this.draft[field.key] = value;
    if (key === 'firstName' || key === 'lastName')
      this.draft.name = `${this.draft.lastName.trim()} ${this.draft.firstName.trim()}`.trim();
    this.touched[key] = true;
  }
  error(key: string): string {
    const e = this.draft;
    if (!e) return '';
    const value =
      key === 'password' ? this.password : String(e[key as keyof Employee] || '').trim();
    if (
      [
        'username',
        'lastName',
        'firstName',
        'name',
        'phone',
        'email',
        'birthDate',
        'startDate',
        'defaultRole',
      ].includes(key) &&
      !value
    )
      return 'Vui lòng nhập đầy đủ thông tin.';
    if (key === 'email') {
      const [local, domain, extra] = value.split('@');
      if (
        extra !== undefined ||
        value.length > 254 ||
        !local ||
        local.length > 64 ||
        !/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local) ||
        local.startsWith('.') ||
        local.endsWith('.') ||
        local.includes('..') ||
        !domain ||
        !/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(
          domain,
        ) ||
        domain.split('.').some((l) => l.length > 63) ||
        !/^[A-Za-z]{2,}$/.test(domain.split('.').at(-1)!)
      )
        return 'Email không đúng định dạng.';
      if (
        this.employees.some(
          (other) => other.code !== e.code && other.email.toLowerCase() === value.toLowerCase(),
        )
      )
        return 'Email đã được sử dụng bởi tài khoản khác.';
    }
    if (key === 'username' && !/^[A-Za-z0-9_.-]{3,50}$/.test(value))
      return 'Tên truy cập từ 3–50 ký tự, gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.';
    if (
      key === 'username' &&
      this.employees.some(
        (other) => other.code !== e.code && other.username.toLowerCase() === value.toLowerCase(),
      )
    )
      return 'Tên truy cập đã tồn tại.';
    if (key === 'phone' && !/^(?:0|\+84)[35789]\d{8}$/.test(value))
      return 'Số điện thoại Việt Nam không hợp lệ.';
    if (
      ['firstName', 'lastName', 'name'].includes(key) &&
      (!/^[\p{L}\p{M}\s'.-]+$/u.test(value) ||
        value.length > (key === 'firstName' ? 50 : key === 'name' ? 150 : 100))
    )
      return 'Họ tên chỉ gồm chữ, khoảng trắng và dấu phân cách hợp lệ.';
    if (key === 'birthDate' || key === 'startDate') {
      if (!this.validDate(value)) return 'Ngày không hợp lệ. Vui lòng chọn ngày trên lịch.';
      if (key === 'birthDate' && value >= this.today) return 'Ngày sinh phải trước ngày hiện tại.';
      if (key === 'startDate' && this.validDate(e.birthDate) && value <= e.birthDate)
        return 'Ngày bắt đầu làm việc phải sau ngày sinh.';
    }
    if (key === 'defaultRole' && !this.roles.includes(value)) return 'Chức vụ không hợp lệ.';
    if (
      key === 'password' &&
      (this.creating || value) &&
      (value.length < 8 ||
        value.length > 128 ||
        /\s/.test(value) ||
        !/[A-Z]/.test(value) ||
        !/[a-z]/.test(value) ||
        !/\d/.test(value) ||
        !/[^A-Za-z0-9\s]/.test(value))
    )
      return 'Mật khẩu cần 8–128 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt; không có khoảng trắng.';
    if (key === 'address' && value.length > 300) return 'Địa chỉ tối đa 300 ký tự.';
    if (key === 'notes' && value.length > 1000) return 'Ghi chú tối đa 1.000 ký tự.';
    return '';
  }
  visibleError(key: string): string {
    return this.submitted || this.touched[key] ? this.error(key) : '';
  }
  async save(): Promise<void> {
    if (!this.draft || this.readingAvatar || this.saving) return;
    this.submitted = true;
    const invalid = [
      ...this.fields.map((f) => f.key),
      'birthDate',
      'startDate',
      'password',
      'defaultRole',
      'notes',
    ].find((key) => this.error(key));
    if (invalid) {
      this.tab = ['phone', 'email', 'address', 'startDate'].includes(invalid)
        ? 'contact'
        : 'profile';
      return;
    }
    this.saving = true;
    this.modalError = '';
    try {
      const created = this.creating;
      const result = this.normalize(
        await this.backend.saveEmployee(this.draft, this.password, created),
      );
      this.employees = created
        ? [result, ...this.employees]
        : this.employees.map((e) => (e.code === result.code ? result : e));
      this.successMessage = created ? 'Đã tạo nhân viên trên hệ thống.' : 'Đã lưu thay đổi.';
      this.close();
      this.successOpen = true;
    } catch (error) {
      this.modalError = error instanceof Error ? error.message : 'Lưu thất bại.';
    } finally {
      this.saving = false;
      this.cd.markForCheck();
    }
  }
  changeStatus(): void {
    if (!this.draft || this.saving) return;
    if (this.draft.status === 'Đang hoạt động') {
      this.lockReason = '';
      this.lockOpen = true;
    } else void this.commitStatus(false);
  }
  async commitStatus(lock: boolean): Promise<void> {
    if (!this.draft || this.saving) return;
    this.saving = true;
    this.modalError = '';
    try {
      const result = this.normalize(
        await this.backend.employeeStatus(
          this.draft.code,
          lock,
          lock ? this.lockReason.trim() : 'Mở khóa từ trang quản trị',
        ),
      );
      this.employees = this.employees.map((e) => (e.code === result.code ? result : e));
      this.draft = result;
      this.lockOpen = false;
      this.feedback = lock ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.';
      this.feedbackError = false;
    } catch (error) {
      this.modalError = error instanceof Error ? error.message : 'Thay đổi trạng thái thất bại.';
    } finally {
      this.saving = false;
      this.cd.markForCheck();
    }
  }
  get visiblePermissions() {
    const q = this.permissionQuery.trim().toLowerCase();
    return this.permissionModules.filter((m) => (m.title + m.desc).toLowerCase().includes(q));
  }
  togglePermission(key: string): void {
    if (!this.draft) return;
    this.draft.permissions = this.draft.permissions.includes(key)
      ? this.draft.permissions.filter((v) => v !== key)
      : [...this.draft.permissions, key];
  }
  get allChecked(): boolean {
    return (
      !!this.visiblePermissions.length &&
      this.visiblePermissions.every((m) => this.draft?.permissions.includes(m.key))
    );
  }
  toggleAll(): void {
    if (!this.draft) return;
    const keys = this.visiblePermissions.map((m) => m.key);
    this.draft.permissions = this.allChecked
      ? this.draft.permissions.filter((k) => !keys.includes(k))
      : [...new Set([...this.draft.permissions, ...keys])];
  }
  applyRole(role: string): void {
    if (!this.draft) return;
    this.draft.defaultRole = role;
  }
  removeAvatar(): void {
    if (this.draft) this.draft.avatarUrl = '';
    this.avatarVersion++;
    this.readingAvatar = false;
    this.avatarError = '';
  }
  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.draft) return;
    const version = ++this.avatarVersion,
      draft = this.draft;
    this.avatarError = '';
    this.readingAvatar = false;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      this.avatarError = 'Chọn ảnh JPG, PNG hoặc WebP không quá 5 MB.';
      return;
    }
    this.readingAvatar = true;
    const reader = new FileReader();
    const done = (url?: string) => {
      if (version !== this.avatarVersion || this.draft !== draft) return;
      this.readingAvatar = false;
      if (url) draft.avatarUrl = url;
      else this.avatarError = 'Không thể đọc ảnh. Vui lòng chọn tệp ảnh khác.';
      this.cd.markForCheck();
    };
    reader.onerror = () => done();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        if (version !== this.avatarVersion || this.draft !== draft) return;
        try {
          if (!image.naturalWidth || !image.naturalHeight) {
            done();
            return;
          }
          const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext('2d');
          if (!context) {
            done();
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          done(canvas.toDataURL('image/webp', 0.85));
        } catch {
          done();
        }
      };
      image.onerror = () => done();
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }
}
