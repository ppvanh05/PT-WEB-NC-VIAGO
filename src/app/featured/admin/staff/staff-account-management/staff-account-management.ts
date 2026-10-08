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
import { STAFF_SEED, PERMISSION_MODULES } from './staff-seed';
import { adminAudit, AuditMetadata } from '../../../../core/services/audit-event';

export interface Employee {
  code: string; username: string; firstName: string; lastName: string; name: string;
  phone: string; email: string; gender: string; birthDate: string; startDate: string;
  date: string; initials: string; status: string; defaultRole: string; roles: string;
  permissions: string[]; address: string; notes: string; contractType: string;
  avatarUrl: string; logs: ({ title: string; time: string; desc: string; code: string; ip: string } & Partial<AuditMetadata>)[];
  lockInfo?: { date: string; reason: string } | null;
}

@Component({
  selector: 'app-staff-account-management',
  imports: [FormsModule, Button, Input, Select, Textarea, Badge, Pagination, Toast, ModalComponent, DatePickerComponent, ToastPopup],
  templateUrl: './staff-account-management.html', styleUrl: './staff-account-management.css',
})
export class StaffAccountManagement implements OnInit {
  private readonly cd = inject(ChangeDetectorRef);
  readonly storageKey = 'viago_admin_staff_accounts_v1';
  readonly today = new Date().toLocaleDateString('sv-SE');
  readonly roles = ['Quản trị viên', 'Ban quản lý', 'Nhân viên điều phối', 'Nhân viên bán vé', 'Nhân viên CSKH'];
  readonly roleOptions = this.roles.map(value => ({ label: value, value }));
  readonly filterRoleOptions = [{ label: 'Tất cả chức vụ', value: 'all' }, ...this.roleOptions];
  readonly genderOptions = ['Nam', 'Nữ', 'Khác'].map(value => ({ label: value, value }));
  readonly contractOptions = ['Hợp đồng không xác định thời hạn', 'Hợp đồng xác định thời hạn 1 năm', 'Hợp đồng thử việc'].map(value => ({ label: value, value }));
  readonly permissionModules = PERMISSION_MODULES;
  readonly logPageSize = 10;
  logPage = 1;
  get validLogPage(): number { return Math.min(Math.max(1, this.logPage), Math.max(1, Math.ceil((this.draft?.logs.length || 0) / this.logPageSize))); }
  get paginatedEmployeeLogs() { return (this.draft?.logs || []).slice((this.validLogPage - 1) * this.logPageSize, this.validLogPage * this.logPageSize); }
  readonly fields: { key: 'username' | 'lastName' | 'firstName' | 'name' | 'phone' | 'email' | 'address'; label: string; type: InputType; max: number; tab: string }[] = [
    { key: 'username', label: 'Tên truy cập', type: 'text', max: 50, tab: 'profile' },
    { key: 'lastName', label: 'Họ và tên đệm', type: 'text', max: 100, tab: 'profile' },
    { key: 'firstName', label: 'Tên', type: 'text', max: 50, tab: 'profile' },
    { key: 'name', label: 'Tên hiển thị', type: 'text', max: 150, tab: 'profile' },
    { key: 'phone', label: 'Số điện thoại liên hệ', type: 'tel', max: 20, tab: 'contact' },
    { key: 'email', label: 'Email', type: 'email', max: 254, tab: 'contact' },
    { key: 'address', label: 'Địa chỉ thường trú', type: 'text', max: 300, tab: 'contact' },
  ];
  employees: Employee[] = STAFF_SEED.map(e => this.normalize(e));
  draft: Employee | null = null;
  creating = false; tab = 'profile'; activeTab = 'all'; currentPage = 1;
  searchQuery = ''; searchRole = 'all'; appliedQuery = ''; appliedRole = 'all'; permissionQuery = '';
  touched: Record<string, boolean> = {}; submitted = false;
  password = ''; showPassword = false;
  feedback = ''; feedbackError = false; modalError = '';
  lockOpen = false; lockReason = ''; successOpen = false; successMessage = '';
  avatarError = ''; readingAvatar = false; private avatarVersion = 0;

  ngOnInit(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data: unknown = JSON.parse(stored);
        if (!Array.isArray(data) || !data.every(e => e && ['code', 'name', 'username', 'phone', 'email', 'defaultRole'].every(key => typeof e[key] === 'string'))) throw new Error();
        this.employees = data.map(e => this.normalize(e));
      }
    } catch { this.feedback = 'Không thể đọc dữ liệu tài khoản đã lưu.'; this.feedbackError = true; }
  }

  private normalize(e: Partial<Employee>): Employee {
    const parts = (e.name || '').trim().split(/\s+/);
    return { code: '', username: '', name: '', phone: '', email: '', gender: 'Nam', birthDate: '', date: '', initials: 'NV', status: 'Đang hoạt động', defaultRole: this.roles[3], roles: '', address: '', notes: '', avatarUrl: '', contractType: this.contractOptions[0].value,
      ...e, firstName: e.firstName ?? parts.at(-1) ?? '', lastName: e.lastName ?? parts.slice(0, -1).join(' '),
      startDate: e.startDate ?? this.toISO(e.date || ''), permissions: Array.isArray(e.permissions) ? [...e.permissions] : [], logs: Array.isArray(e.logs) ? [...e.logs] : [] };
  }
  private toISO(date: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(date);
    return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
  }
  formatDate(date: string): string { return this.validDate(date) ? date.split('-').reverse().join('/') : '—'; }
  validDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return y >= 1900 && date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }
  get activeCount(): number { return this.employees.filter(e => e.status === 'Đang hoạt động').length; }
  get lockedCount(): number { return this.employees.length - this.activeCount; }
  get filteredEmployees(): Employee[] {
    const q = this.appliedQuery.toLocaleLowerCase('vi').trim();
    return this.employees.filter(e => (this.activeTab === 'all' || e.status === (this.activeTab === 'active' ? 'Đang hoạt động' : 'Đã khóa')) && (this.appliedRole === 'all' || e.defaultRole === this.appliedRole) && [e.code, e.username, e.name, e.phone, e.email].some(v => v.toLocaleLowerCase('vi').includes(q)));
  }
  get validCurrentPage(): number { return Math.min(this.currentPage, Math.max(1, Math.ceil(this.filteredEmployees.length / 10))); }
  get paginatedEmployees(): Employee[] { return this.filteredEmployees.slice((this.validCurrentPage - 1) * 10, this.validCurrentPage * 10); }
  applyFilter(): void { this.appliedQuery = this.searchQuery; this.appliedRole = this.searchRole; this.currentPage = 1; }
  clearFilters(): void { this.searchQuery = ''; this.searchRole = 'all'; this.applyFilter(); }
  setTab(tab: string): void { this.activeTab = tab; this.currentPage = 1; }
  open(employee?: Employee): void {
    this.logPage = 1;
    this.feedback = ''; this.feedbackError = false;
    this.creating = !employee;
    this.draft = employee ? structuredClone(employee) : this.normalize({ startDate: this.today, permissions: ['datve', 'baocao'] });
    this.tab = 'profile'; this.touched = {}; this.submitted = false; this.password = ''; this.showPassword = false;
    this.modalError = ''; this.avatarError = ''; this.readingAvatar = false; this.avatarVersion++; this.permissionQuery = '';
    this.cd.markForCheck();
  }
  close(): void { if (this.feedback && !this.feedbackError) { this.successMessage = this.feedback; this.successOpen = true; this.feedback = ''; } this.draft = null; this.lockOpen = false; this.avatarVersion++; this.readingAvatar = false; this.password = ''; this.cd.markForCheck(); }
  update(key: string, value: string): void {
    if (!this.draft) return;
    const field = this.fields.find(f => f.key === key);
    if (field) this.draft[field.key] = value;
    if (key === 'firstName' || key === 'lastName') this.draft.name = `${this.draft.lastName.trim()} ${this.draft.firstName.trim()}`.trim();
    this.touched[key] = true;
  }
  error(key: string): string {
    const e = this.draft; if (!e) return '';
    const value = key === 'password' ? this.password : String(e[key as keyof Employee] || '').trim();
    if (['username', 'lastName', 'firstName', 'name', 'phone', 'email', 'birthDate', 'startDate', 'defaultRole'].includes(key) && !value) return 'Vui lòng nhập đầy đủ thông tin.';
    if (key === 'email') {
      const [local, domain, extra] = value.split('@');
      if (extra !== undefined || value.length > 254 || !local || local.length > 64 || !/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..') || !domain || !/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(domain) || domain.split('.').some(l => l.length > 63) || !/^[A-Za-z]{2,}$/.test(domain.split('.').at(-1)!)) return 'Email không đúng định dạng.';
      if (this.employees.some(other => other.code !== e.code && other.email.toLowerCase() === value.toLowerCase())) return 'Email đã được sử dụng bởi tài khoản khác.';
    }
    if (key === 'username' && (!/^[A-Za-z0-9_.-]{3,50}$/.test(value))) return 'Tên truy cập từ 3–50 ký tự, gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.';
    if (key === 'username' && this.employees.some(other => other.code !== e.code && other.username.toLowerCase() === value.toLowerCase())) return 'Tên truy cập đã tồn tại.';
    if (key === 'phone' && !/^(?:0|\+84)[35789]\d{8}$/.test(value)) return 'Số điện thoại Việt Nam không hợp lệ.';
    if (['firstName', 'lastName', 'name'].includes(key) && (!/^[\p{L}\p{M}\s'.-]+$/u.test(value) || value.length > (key === 'firstName' ? 50 : key === 'name' ? 150 : 100))) return 'Họ tên chỉ gồm chữ, khoảng trắng và dấu phân cách hợp lệ.';
    if (key === 'birthDate' || key === 'startDate') {
      if (!this.validDate(value)) return 'Ngày không hợp lệ. Vui lòng chọn ngày trên lịch.';
      if (key === 'birthDate' && value >= this.today) return 'Ngày sinh phải trước ngày hiện tại.';
      if (key === 'startDate' && this.validDate(e.birthDate) && value <= e.birthDate) return 'Ngày bắt đầu làm việc phải sau ngày sinh.';
    }
    if (key === 'defaultRole' && !this.roles.includes(value)) return 'Chức vụ không hợp lệ.';
    if (key === 'password' && (this.creating || value) && (value.length < 8 || value.length > 128 || /\s/.test(value) || !/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9\s]/.test(value))) return 'Mật khẩu cần 8–128 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt; không có khoảng trắng.';
    if (key === 'address' && value.length > 300) return 'Địa chỉ tối đa 300 ký tự.';
    if (key === 'notes' && value.length > 1000) return 'Ghi chú tối đa 1.000 ký tự.';
    return '';
  }
  visibleError(key: string): string { return this.submitted || this.touched[key] ? this.error(key) : ''; }
  save(): void {
    if (!this.draft || this.readingAvatar) return;
    this.submitted = true;
    const keys = [...this.fields.map(f => f.key), 'birthDate', 'startDate', 'password', 'defaultRole', 'notes'];
    const invalid = keys.find(key => this.error(key));
    if (invalid) { this.tab = ['phone', 'email', 'address', 'startDate'].includes(invalid) ? 'contact' : 'profile'; return; }
    const e = structuredClone(this.draft);
    for (const f of this.fields) e[f.key] = e[f.key].trim();
    if (this.creating) {
      const prefixes = ['QTV', 'BQL', 'NVDP', 'NVBV', 'CSKH'];
      const prefix = prefixes[this.roles.indexOf(e.defaultRole)];
      const max = Math.max(100000, ...this.employees.filter(v => v.code.startsWith(prefix)).map(v => Number(v.code.slice(prefix.length))).filter(Number.isFinite));
      e.code = prefix + (max + 1);
    }
    e.date = this.formatDate(e.startDate); e.initials = e.name.split(/\s+/).slice(-2).map(v => v[0]).join('').toUpperCase();
    e.permissions = [...new Set(e.permissions)].filter(key => this.permissionModules.some(m => m.key === key));
    e.roles = `${e.defaultRole.toUpperCase()} (${e.permissions.length} QUYỀN)`;
    e.logs.unshift(this.log(this.creating ? 'Tạo tài khoản nhân viên' : 'Cập nhật thông tin nhân viên', this.creating ? 'CREATE_STAFF' : 'UPDATE_STAFF', e));
    // Credentials are held only for this form; never persist plaintext passwords.
    const next = this.creating ? [e, ...this.employees] : this.employees.map(v => v.code === e.code ? e : v);
    if (!this.persist(next)) return;
    this.successMessage = this.creating ? 'Tạo tài khoản nhân viên thành công!' : 'Lưu thông tin nhân viên thành công!';
    this.close(); this.successOpen = true;
  }
  private persist(next: Employee[]): boolean {
    try { localStorage.setItem(this.storageKey, JSON.stringify(next)); this.employees = next; return true; }
    catch { this.modalError = 'Không thể lưu dữ liệu. Vui lòng kiểm tra dung lượng lưu trữ và thử lại.'; return false; }
  }
  private log(desc: string, action: string, employee: Employee, changes?: AuditMetadata['changes']): Employee['logs'][number] {
    return { title: 'Quản lý tài khoản', desc: `${desc} – ${employee.name} (${employee.code})`, time: new Date().toLocaleString('vi-VN'), code: 'VIAGO_LOG_' + crypto.randomUUID(), ip: '—', ...adminAudit(action, { code: employee.code, name: employee.name, type: 'Nhân viên' }, changes) };
  }
  changeStatus(): void {
    if (!this.draft) return;
    if (this.draft.status === 'Đang hoạt động') { this.lockReason = ''; this.lockOpen = true; return; }
    this.commitStatus(false);
  }
  commitStatus(lock: boolean): void {
    if (!this.draft) return;
    if (lock && this.lockReason.trim().length > 500) { this.modalError = 'Lý do khóa tối đa 500 ký tự.'; return; }
    const source = this.employees.find(e => e.code === this.draft!.code); if (!source) return;
    const next = structuredClone(source); next.status = lock ? 'Đã khóa' : 'Đang hoạt động';
    next.lockInfo = lock ? { date: new Date().toLocaleString('vi-VN'), reason: this.lockReason.trim() || 'Không có lý do cụ thể' } : null;
    next.logs.unshift(this.log(lock ? 'Khóa tài khoản: ' + next.lockInfo!.reason : 'Mở khóa tài khoản', lock ? 'LOCK_STAFF' : 'UNLOCK_STAFF', next, [{ field: 'Trạng thái', before: source.status, after: next.status }]));
    if (!this.persist(this.employees.map(e => e.code === next.code ? next : e))) return;
    this.draft.status = next.status; this.draft.lockInfo = next.lockInfo; this.draft.logs = structuredClone(next.logs);
    this.lockOpen = false; this.modalError = ''; this.feedbackError = false; this.feedback = lock ? 'Khóa tài khoản thành công.' : 'Mở khóa tài khoản thành công.';
  }
  get visiblePermissions() { const q = this.permissionQuery.trim().toLowerCase(); return this.permissionModules.filter(m => (m.title + m.desc).toLowerCase().includes(q)); }
  togglePermission(key: string): void { if (!this.draft) return; this.draft.permissions = this.draft.permissions.includes(key) ? this.draft.permissions.filter(v => v !== key) : [...this.draft.permissions, key]; }
  get allChecked(): boolean { return !!this.visiblePermissions.length && this.visiblePermissions.every(m => this.draft?.permissions.includes(m.key)); }
  toggleAll(): void { if (!this.draft) return; const keys = this.visiblePermissions.map(m => m.key); this.draft.permissions = this.allChecked ? this.draft.permissions.filter(k => !keys.includes(k)) : [...new Set([...this.draft.permissions, ...keys])]; }
  applyRole(role: string): void {
    if (!this.draft) return;
    const templates: string[][] = [this.permissionModules.map(m => m.key), ['baocao'], ['dieuphoi', 'baocao', 'nhatky'], ['datve', 'baocao'], ['khachhang', 'tukhoacam', 'danhgiaphanhoi', 'dothatlac', 'baocao']];
    this.draft.defaultRole = role; this.draft.permissions = [...templates[this.roles.indexOf(role)]];
  }
  removeAvatar(): void { if (this.draft) this.draft.avatarUrl = ''; this.avatarVersion++; this.readingAvatar = false; this.avatarError = ''; }
  upload(event: Event): void {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = '';
    if (!file || !this.draft) return;
    const version = ++this.avatarVersion, draft = this.draft;
    this.avatarError = ''; this.readingAvatar = false;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { this.avatarError = 'Chọn ảnh JPG, PNG hoặc WebP không quá 5 MB.'; return; }
    this.readingAvatar = true;
    const reader = new FileReader();
    const done = (url?: string) => { if (version !== this.avatarVersion || this.draft !== draft) return; this.readingAvatar = false; if (url) draft.avatarUrl = url; else this.avatarError = 'Không thể đọc ảnh. Vui lòng chọn tệp ảnh khác.'; this.cd.markForCheck(); };
    reader.onerror = () => done(); reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        if (version !== this.avatarVersion || this.draft !== draft) return;
        try {
          if (!image.naturalWidth || !image.naturalHeight) { done(); return; }
          const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext('2d'); if (!context) { done(); return; }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          done(canvas.toDataURL('image/webp', .85));
        } catch { done(); }
      };
      image.onerror = () => done(); image.src = String(reader.result);
    }; reader.readAsDataURL(file);
  }
}
