import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminContentApi } from '../../../core/services/content-api.service';
import { Card } from '../../../shared/components/card/card';
import { Button } from '../../../shared/components/button/button';
import { Input } from '../../../shared/components/input/input';
import { Select, SelectOption } from '../../../shared/components/input/select/select';
import { Textarea } from '../../../shared/components/input/textarea/textarea';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { Badge } from '../../../shared/components/badge/badge';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker';
import { SidebarStateService } from '../../../core/services/sidebar-state.service';

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  workType: string;
  salary: string;
  deadline: string;
  description: string;
  requirements: string;
  benefits: string;
  workHours: string;
  workEnvironment: string;
  howToApply: string;
  email: string;
  hotline: string;
  status: string;
  updatedAt: string;
  acceptingApplications: boolean;
  applications: number;
}
const blank = (): Job => ({
  id: '',
  title: '',
  department: '',
  location: '',
  workType: 'ToanThoiGian',
  salary: '',
  deadline: '',
  description: '',
  requirements: '',
  benefits: '',
  workHours: '',
  workEnvironment: '',
  howToApply: '',
  email: '',
  hotline: '',
  status: 'TamDung',
  updatedAt: '',
  acceptingApplications: false,
  applications: 0,
});
@Component({
  selector: 'app-admin-jobs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    Card,
    Button,
    Input,
    Select,
    Textarea,
    Pagination,
    Badge,
    ModalComponent,
    DatePickerComponent,
  ],
  templateUrl: './jobs.html',
  styleUrls: ['../../../shared/styles/intake-management.css', './jobs.css'],
})
export class AdminJobs implements OnInit {
  private readonly api = inject(AdminContentApi);
  private readonly destroy = inject(DestroyRef);
  private readonly sidebar = inject(SidebarStateService);
  readonly sidebarCollapsed = this.sidebar.isCollapsed;
  toggleNavigation() {
    this.sidebar.toggle();
  }
  closeNavigation() {
    this.sidebar.collapse();
  }
  private readonly abort = new AbortController();
  private searchTimer?: ReturnType<typeof setTimeout>;
  lastItem() {
    return Math.min(this.page * 20, this.total());
  }
  searchChanged(value: string) {
    this.search = value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.load(true), 300);
  }
  clearFilters() {
    clearTimeout(this.searchTimer);
    this.search = '';
    this.status = '';
    void this.load(true);
  }
  readonly rows = signal<Job[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly detailLoading = signal(false);
  readonly editorOpen = signal(false);
  readonly editorReady = signal(false);
  readonly error = signal('');
  readonly editorError = signal('');
  readonly notice = signal('');
  readonly total = signal(0);
  page = 1;
  search = '';
  status = '';
  form = blank();
  private listVersion = 0;
  private editorVersion = 0;
  readonly statuses: SelectOption[] = [
    { value: 'DangTuyen', label: 'Đang tuyển' },
    { value: 'TamDung', label: 'Tạm dừng' },
    { value: 'DaDong', label: 'Đã đóng' },
  ];
  readonly statusFilters: SelectOption[] = [
    { value: 'all', label: 'Tất cả trạng thái' },
    ...this.statuses,
  ];
  readonly workTypes: SelectOption[] = [
    { value: 'ToanThoiGian', label: 'Toàn thời gian' },
    { value: 'BanThoiGian', label: 'Bán thời gian' },
    { value: 'ThoiVu', label: 'Thời vụ' },
    { value: 'ThucTap', label: 'Thực tập' },
  ];
  constructor() {
    this.destroy.onDestroy(() => {
      this.abort.abort();
      clearTimeout(this.searchTimer);
    });
  }
  ngOnInit() {
    if (typeof matchMedia === 'function' && matchMedia('(max-width: 767px)').matches)
      this.sidebar.collapse();
    void this.load();
  }
  label(status: string) {
    return this.statuses.find((s) => s.value === status)?.label || status;
  }
  typeLabel(type: string) {
    return this.workTypes.find((s) => s.value === type)?.label || type;
  }
  async load(reset = false) {
    clearTimeout(this.searchTimer);
    if (reset) this.page = 1;
    const version = ++this.listVersion;
    this.loading.set(true);
    this.error.set('');
    const query = new URLSearchParams({ page: String(this.page), pageSize: '20' });
    if (this.search.trim()) query.set('search', this.search.trim());
    if (this.status) query.set('status', this.status);
    try {
      const result = await this.api.request<{
        data: Job[];
        pagination: { total: number; totalPages: number };
      }>('jobs?' + query, 'GET', undefined, this.abort.signal);
      if (version !== this.listVersion || this.abort.signal.aborted) return;
      if (this.page > Math.max(1, result.pagination.totalPages)) {
        this.page = Math.max(1, result.pagination.totalPages);
        await this.load();
        return;
      }
      this.rows.set(result.data);
      this.total.set(result.pagination.total);
    } catch (e) {
      if (version === this.listVersion && !this.abort.signal.aborted) {
        this.error.set(this.message(e));
        this.rows.set([]);
      }
    } finally {
      if (version === this.listVersion) this.loading.set(false);
    }
  }
  filter(value: string) {
    this.status = value === 'all' ? '' : value;
    void this.load(true);
  }
  setPage(page: number) {
    if (!this.loading()) {
      this.page = page;
      void this.load();
    }
  }
  async open(row?: Job) {
    if (this.saving()) return;
    const version = ++this.editorVersion;
    this.form = blank();
    this.editorError.set('');
    this.editorOpen.set(true);
    this.editorReady.set(!row);
    this.detailLoading.set(!!row);
    if (!row) return;
    try {
      const data = await this.api.request<Job>(
        'jobs/' + encodeURIComponent(row.id),
        'GET',
        undefined,
        this.abort.signal,
      );
      if (version === this.editorVersion && !this.abort.signal.aborted) {
        this.form = {
          ...blank(),
          ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ''])),
        } as Job;
        this.editorReady.set(true);
      }
    } catch (e) {
      if (version === this.editorVersion) this.editorError.set(this.message(e));
    } finally {
      if (version === this.editorVersion) this.detailLoading.set(false);
    }
  }
  close() {
    if (!this.saving()) {
      this.editorVersion++;
      this.editorOpen.set(false);
    }
  }
  async save() {
    if (this.saving() || this.detailLoading() || !this.editorOpen() || !this.editorReady()) return;
    const f = this.form;
    if (
      ![f.title, f.department, f.location, f.deadline, f.description, f.requirements].every((v) =>
        v.trim(),
      )
    ) {
      this.editorError.set('Vui lòng điền các trường bắt buộc.');
      return;
    }
    if (f.id && !f.updatedAt) return;
    this.saving.set(true);
    this.editorError.set('');
    const body: Record<string, string> = {};
    for (const key of [
      'title',
      'department',
      'location',
      'workType',
      'salary',
      'deadline',
      'description',
      'requirements',
      'benefits',
      'workHours',
      'workEnvironment',
      'howToApply',
      'email',
      'hotline',
      'status',
    ] as const) {
      if (f[key]) body[key] = f[key].trim();
    }
    if (f.id) body['expectedUpdatedAt'] = f.updatedAt;
    try {
      const saved = await this.api.request<Job>(
        f.id ? 'jobs/' + encodeURIComponent(f.id) : 'jobs',
        f.id ? 'PATCH' : 'POST',
        body,
        this.abort.signal,
      );
      if (this.abort.signal.aborted) return;
      this.editorOpen.set(false);
      this.notice.set(
        saved.acceptingApplications
          ? `Đã lưu ${saved.id}. Customer có thể xem và nộp hồ sơ ngay khi tải danh sách tuyển dụng.`
          : `Đã lưu ${saved.id}. Tin chưa nhận hồ sơ vì đang tạm dừng, đã đóng hoặc hết hạn.`,
      );
      await this.load();
    } catch (e) {
      if (!this.abort.signal.aborted) this.editorError.set(this.message(e));
    } finally {
      this.saving.set(false);
    }
  }
  private message(e: unknown) {
    return e instanceof Error ? e.message : 'Không thực hiện được yêu cầu.';
  }
}
