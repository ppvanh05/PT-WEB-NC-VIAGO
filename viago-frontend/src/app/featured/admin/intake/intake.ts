import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminSessionService } from '../../../core/services/admin-session.service';
import { Card } from '../../../shared/components/card/card';
import { Button } from '../../../shared/components/button/button';
import { Badge, BadgeVariant } from '../../../shared/components/badge/badge';
import { Input } from '../../../shared/components/input/input';
import { Select, SelectOption } from '../../../shared/components/input/select/select';
import { Textarea } from '../../../shared/components/input/textarea/textarea';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { SidebarStateService } from '../../../core/services/sidebar-state.service';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface Option {
  id: string;
  label: string;
}
interface HistoryItem {
  id: string;
  at: string;
  actor: string;
  note: string;
  before?: {
    status?: string;
    priority?: string;
    assignedStaffId?: string | null;
    evaluation?: string;
    interviewAt?: string | null;
    replyDraft?: string;
  };
  after?: {
    status?: string;
    priority?: string;
    assignedStaffId?: string | null;
    evaluation?: string;
    interviewAt?: string | null;
    replyDraft?: string;
  };
}
interface IntakeRecord {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  createdAt: string;
  subjectLabel?: string;
  message?: string;
  assignedTo?: string;
  assignedStaffId?: string;
  priority?: string;
  updatedAt?: string;
  version?: number;
  evaluation?: string;
  interviewAt?: string | null;
  replyDraft?: string;
  jobTitle?: string;
  department?: string;
  location?: string;
  dateOfBirth?: string;
  address?: string;
  education?: string;
  experience?: string;
  portfolio?: string;
  introduction?: string;
  hasCv?: boolean;
  history?: HistoryItem[];
}
interface ListResponse {
  data: IntakeRecord[];
  pagination: { page: number; total: number; totalPages: number };
  statistics: Record<string, number>;
}
@Component({
  selector: 'app-admin-intake',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Button,
    Badge,
    Input,
    Select,
    Textarea,
    Pagination,
    ModalComponent,
    DatePickerComponent,
  ],
  templateUrl: './intake.html',
  styleUrls: ['../../../shared/styles/intake-management.css', './intake.css'],
})
export class AdminIntake implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(AdminSessionService);
  private readonly destroy = inject(DestroyRef);
  private readonly sidebar = inject(SidebarStateService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly staff = signal<Option[]>([]);
  readonly cvPreview = signal<SafeResourceUrl | null>(null);
  private cvUrl = '';
  assignedStaffId = '';
  priority = 'BinhThuong';
  evaluation = '';
  interviewDate = '';
  interviewTime = '09:00';
  replyDraft = '';
  readonly prioritySelect: SelectOption[] = [
    { value: 'Thap', label: 'Thấp' },
    { value: 'BinhThuong', label: 'Bình thường' },
    { value: 'Cao', label: 'Cao' },
    { value: 'KhanCap', label: 'Khẩn cấp' },
  ];
  get staffSelect(): SelectOption[] {
    return [
      { value: 'unassigned', label: 'Chưa phân công' },
      ...this.staff().map((s) => ({ value: s.id, label: s.label })),
    ];
  }
  priorityLabel(value?: string) {
    return this.prioritySelect.find((p) => p.value === value)?.label || 'Bình thường';
  }
  staffLabel(value?: string | null) {
    return this.staff().find((s) => s.id === value)?.label || value || 'Chưa phân công';
  }
  priorityVariant(value?: string): BadgeVariant {
    return value === 'KhanCap' ? 'danger' : value === 'Cao' ? 'warning' : 'neutral';
  }
  get replyLink() {
    const row = this.selected();
    return row?.email && this.replyDraft.trim()
      ? `mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent(`[VIAGO - ${row.id}] ${this.applications ? 'Ứng tuyển: ' + row.jobTitle : row.subjectLabel}`)}&body=${encodeURIComponent(this.replyDraft)}`
      : null;
  }
  private resetPreview() {
    if (this.cvUrl) URL.revokeObjectURL(this.cvUrl);
    this.cvUrl = '';
    this.cvPreview.set(null);
  }
  private setEditor(row: IntakeRecord) {
    this.assignedStaffId = row.assignedStaffId || '';
    this.priority = row.priority || 'BinhThuong';
    this.evaluation = row.evaluation || '';
    this.replyDraft = row.replyDraft || '';
    const local = row.interviewAt
      ? new Date(new Date(row.interviewAt).getTime() + 7 * 3600000).toISOString()
      : '';
    this.interviewDate = local.slice(0, 10);
    this.interviewTime = local.slice(11, 16) || '09:00';
  }
  readonly sidebarCollapsed = this.sidebar.isCollapsed;
  private readonly compactViewport =
    typeof matchMedia === 'function' ? matchMedia('(max-width: 767px)') : null;
  private autoCollapsed = false;
  private readonly fitSidebar = () => {
    if (this.compactViewport?.matches && !this.sidebarCollapsed()) {
      this.autoCollapsed = true;
      this.sidebar.collapse();
    } else if (this.compactViewport && !this.compactViewport.matches && this.autoCollapsed) {
      this.autoCollapsed = false;
      this.sidebar.expand();
    }
  };
  readonly applications = this.route.snapshot.data['kind'] === 'applications';
  readonly title = this.applications ? 'Hồ sơ ứng tuyển' : 'Liên hệ khách hàng';
  private readonly base = this.applications ? '/api/admin/applications' : '/api/admin/contacts';
  readonly statuses: Option[] = this.applications
    ? [
        { id: 'Moi', label: 'Mới nhận' },
        { id: 'DaXem', label: 'Đã xem' },
        { id: 'MoiPhongVan', label: 'Mời phỏng vấn' },
        { id: 'TrungTuyen', label: 'Trúng tuyển' },
        { id: 'TuChoi', label: 'Từ chối' },
      ]
    : [
        { id: 'Moi', label: 'Mới nhận' },
        { id: 'DangXuLy', label: 'Đang xử lý' },
        { id: 'DaXuLy', label: 'Đã xử lý' },
      ];
  readonly rows = signal<IntakeRecord[]>([]);
  readonly statistics = signal<Record<string, number>>({});
  readonly options = signal<Option[]>([]);
  readonly selected = signal<IntakeRecord | null>(null);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly detailLoading = signal(false);
  readonly saving = signal(false);
  readonly downloading = signal(false);
  readonly error = signal('');
  readonly detailError = signal('');
  readonly notice = signal('');
  readonly total = signal(0);
  readonly totalPages = signal(0);
  search = '';
  status = '';
  option = '';
  page = 1;
  nextStatus = '';
  note = '';
  private version = 0;
  private detailVersion = 0;
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
    this.option = '';
    void this.load(true);
  }
  constructor() {
    this.destroy.onDestroy(() => {
      this.abort.abort();
      clearTimeout(this.searchTimer);
      this.resetPreview();
      this.compactViewport?.removeEventListener('change', this.fitSidebar);
    });
  }
  ngOnInit() {
    this.fitSidebar();
    this.compactViewport?.addEventListener('change', this.fitSidebar);
    void this.loadOptions();
    void this.load();
  }
  toggleNavigation() {
    this.sidebar.toggle();
  }
  closeNavigation() {
    this.sidebar.collapse();
  }
  label(status: string) {
    return this.statuses.find((s) => s.id === status)?.label || status;
  }
  get statusSelect(): SelectOption[] {
    return this.statuses.map((s) => ({ value: s.id, label: s.label }));
  }
  get statusFilterSelect(): SelectOption[] {
    return [{ value: 'all', label: 'Tất cả trạng thái' }, ...this.statusSelect];
  }
  get optionSelect(): SelectOption[] {
    return [
      { value: 'all', label: this.applications ? 'Tất cả vị trí' : 'Tất cả chủ đề' },
      ...this.options().map((o) => ({ value: o.id, label: o.label })),
    ];
  }
  badgeVariant(status: string): BadgeVariant {
    if (status === 'Moi') return 'warning';
    if (status === 'DaXuLy' || status === 'TrungTuyen') return 'success';
    if (status === 'TuChoi') return 'danger';
    return 'info';
  }
  count() {
    return Object.values(this.statistics()).reduce((a, b) => a + b, 0);
  }
  private async response(path: string, body?: object) {
    const res = await fetch(this.base + path, {
      method: body ? 'PATCH' : 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...this.session.headers(),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(20000)]),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status === 401) {
      this.session.invalidate();
      void this.router.navigate(['/admin/login'], { queryParams: { returnUrl: this.router.url } });
      throw new Error('Phiên đăng nhập đã hết hạn.');
    }
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(
        typeof data?.message === 'string' ? data.message : 'Không thực hiện được yêu cầu.',
      );
    }
    return res;
  }
  private async request<T>(path: string, body?: object): Promise<T> {
    const res = await this.response(path, body);
    if (!/json/i.test(res.headers.get('content-type') || ''))
      throw new Error('Chưa kết nối được dịch vụ quản trị.');
    return res.json() as Promise<T>;
  }
  private async loadOptions() {
    try {
      const result = await this.request<{ subjects?: Option[]; jobs?: Option[]; staff?: Option[] }>(
        '/options',
      );
      this.options.set(result.subjects || result.jobs || []);
      this.staff.set(result.staff || []);
    } catch (e) {
      if (!this.abort.signal.aborted) this.error.set(this.message(e));
    }
  }
  async load(reset = false) {
    clearTimeout(this.searchTimer);
    if (reset) this.page = 1;
    const version = ++this.version;
    this.loading.set(true);
    this.error.set('');
    const query = new URLSearchParams({ page: String(this.page), pageSize: '20' });
    if (this.search.trim()) query.set('search', this.search.trim());
    if (this.status) query.set('status', this.status);
    if (this.option) query.set(this.applications ? 'jobId' : 'subject', this.option);
    try {
      const data = await this.request<ListResponse>('?' + query);
      if (version !== this.version || this.abort.signal.aborted) return;
      if (this.page > Math.max(1, data.pagination.totalPages)) {
        this.page = Math.max(1, data.pagination.totalPages);
        await this.load();
        return;
      }
      this.rows.set(data.data);
      this.total.set(data.pagination.total);
      this.totalPages.set(data.pagination.totalPages);
      this.statistics.set(data.statistics);
      this.loaded.set(true);
    } catch (e) {
      if (version === this.version && !this.abort.signal.aborted) {
        this.rows.set([]);
        this.error.set(this.message(e));
      }
    } finally {
      if (version === this.version && !this.abort.signal.aborted) this.loading.set(false);
    }
  }
  changeFilter(field: 'status' | 'option', value: string) {
    this[field] = value === 'all' ? '' : value;
    void this.load(true);
  }
  setPage(page: number) {
    if (this.loading() || page < 1 || page > this.totalPages()) return;
    this.page = page;
    void this.load();
  }
  async open(row: IntakeRecord) {
    if (this.saving()) return;
    const version = ++this.detailVersion;
    this.selected.set(row);
    this.resetPreview();
    this.setEditor(row);
    this.nextStatus = row.status;
    this.note = '';
    this.detailLoading.set(true);
    this.detailError.set('');
    this.notice.set('');
    try {
      const detail = await this.request<IntakeRecord>('/' + encodeURIComponent(row.id));
      if (version === this.detailVersion && !this.abort.signal.aborted) {
        this.selected.set(detail);
        this.nextStatus = detail.status;
        this.setEditor(detail);
      }
    } catch (e) {
      if (version === this.detailVersion && !this.abort.signal.aborted)
        this.detailError.set(this.message(e));
    } finally {
      if (version === this.detailVersion && !this.abort.signal.aborted)
        this.detailLoading.set(false);
    }
  }
  close() {
    if (this.saving()) return;
    this.detailVersion++;
    this.selected.set(null);
    this.resetPreview();
    this.detailLoading.set(false);
  }
  async save() {
    const row = this.selected();
    if (!row || this.saving() || this.detailLoading() || this.detailError()) return;
    if (
      this.applications &&
      this.interviewDate &&
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(this.interviewTime)
    ) {
      this.notice.set('Giờ phỏng vấn phải có định dạng HH:mm, ví dụ 09:30.');
      return;
    }
    this.saving.set(true);
    this.detailError.set('');
    this.notice.set('');
    try {
      const detail = await this.request<IntakeRecord>(
        '/' + encodeURIComponent(row.id) + '/status',
        {
          status: this.nextStatus,
          expectedStatus: row.status,
          expectedVersion: row.version ?? 0,
          assignedStaffId: this.assignedStaffId,
          ...(this.applications
            ? {
                evaluation: this.evaluation,
                interviewAt: this.interviewDate
                  ? `${this.interviewDate}T${this.interviewTime}:00+07:00`
                  : null,
              }
            : { priority: this.priority, replyDraft: this.replyDraft }),
          ...(this.note.trim() ? { note: this.note.trim() } : {}),
        },
      );
      if (this.abort.signal.aborted) return;
      this.selected.set(detail);
      this.nextStatus = detail.status;
      this.setEditor(detail);
      this.note = '';
      this.notice.set('Đã lưu trạng thái và lịch sử xử lý.');
      await this.load();
    } catch (e) {
      if (!this.abort.signal.aborted) this.detailError.set(this.message(e));
    } finally {
      if (!this.abort.signal.aborted) this.saving.set(false);
    }
  }
  async downloadCv(preview = false) {
    const row = this.selected();
    if (!row || this.downloading()) return;
    this.downloading.set(true);
    this.notice.set('');
    try {
      const res = await this.response('/' + encodeURIComponent(row.id) + '/cv');
      const blob = await res.blob();
      if (this.selected()?.id !== row.id || this.abort.signal.aborted) return;
      const isPdf = preview && (await blob.slice(0, 4).text()) === '%PDF';
      if (this.selected()?.id !== row.id || this.abort.signal.aborted) return;
      if (isPdf) {
        this.resetPreview();
        this.cvUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        this.cvPreview.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.cvUrl));
        return;
      }
      if (preview) this.notice.set('CV Word được tải xuống để mở bằng ứng dụng trên máy.');
      const filename =
        /filename="([^"]+)"/i.exec(res.headers.get('content-disposition') || '')?.[1] || 'CV';
      const url = URL.createObjectURL(blob),
        link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      if (!this.abort.signal.aborted) this.notice.set(this.message(e));
    } finally {
      if (!this.abort.signal.aborted) this.downloading.set(false);
    }
  }
  private message(error: unknown) {
    return error instanceof Error ? error.message : 'Không tải được dữ liệu. Vui lòng thử lại.';
  }
}
