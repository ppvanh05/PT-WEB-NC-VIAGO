import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminContentApi } from '../../../../core/services/content-api.service';
import { Card } from '../../../../shared/components/card/card';
import { Button } from '../../../../shared/components/button/button';
import { Badge, BadgeVariant } from '../../../../shared/components/badge/badge';
import { Input as SharedInput } from '../../../../shared/components/input/input';
import { Select } from '../../../../shared/components/input/select/select';
import { Textarea } from '../../../../shared/components/input/textarea/textarea';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import {
  ContentDraft,
  ContentKind,
  ContentRow,
  DISCOUNT_TYPES,
  ManagedComment,
  NEWS_STATUSES,
  NEWS_TYPES,
  POLICY_STATUSES,
  POLICY_TYPES,
  PROMOTION_STATUSES,
  PageResult,
  PromotionOptions,
  PromotionUsage,
} from './content.models';

@Component({
  selector: 'app-content-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Button,
    Badge,
    SharedInput,
    Select,
    Textarea,
    Pagination,
    DatePickerComponent,
    ModalComponent,
  ],
  templateUrl: './content-manager.html',
  styleUrl: './content-manager.css',
})
export class ContentManager implements OnInit {
  @Input({ required: true }) kind: ContentKind = 'news';
  private readonly api = inject(AdminContentApi);
  private readonly abort = new AbortController();
  private readonly destroy = inject(DestroyRef);
  readonly rows = signal<ContentRow[]>([]);
  readonly statistics = signal<Record<string, number>>({});
  readonly options = signal<PromotionOptions>({ memberTiers: [], routes: [] });
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly saving = signal(false);
  readonly editorLoading = signal(false);
  readonly editorError = signal('');
  readonly editorReady = signal(true);
  readonly editorOpen = signal(false);
  readonly showPreview = signal(false);
  readonly total = signal(0);
  readonly pages = signal(0);
  search = '';
  statusFilter = 'all';
  typeFilter = 'all';
  page = 1;
  editing: ContentRow | null = null;
  draft: ContentDraft = this.blankDraft();
  statusAction: { row: ContentRow; status: string; label: string } | null = null;
  readonly detailRows = signal<(ManagedComment | PromotionUsage)[]>([]);
  readonly detailTotal = signal(0);
  readonly detailBusy = signal(false);
  readonly detailError = signal('');
  detailTarget: ContentRow | null = null;
  detailPage = 1;
  commentStatus = 'HienThi';
  private version = 0;
  private detailVersion = 0;
  private editorVersion = 0;
  readonly discountTypes = DISCOUNT_TYPES;
  readonly services = [
    { value: 'DatVe', label: 'Đặt vé' },
    { value: 'ThueXe', label: 'Thuê xe' },
    { value: 'TatCa', label: 'Tất cả dịch vụ' },
  ];
  readonly routeScopes = [
    { value: 'all', label: 'Tất cả tuyến' },
    { value: 'specific', label: 'Chỉ tuyến được chọn' },
    { value: 'exclude', label: 'Loại trừ tuyến được chọn' },
  ];
  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  readonly reasons = [
    { value: 'complaint', label: 'Hỗ trợ khiếu nại' },
    { value: 'delay_cancel', label: 'Chuyến trễ hoặc hủy' },
    { value: 'system_error', label: 'Sự cố hệ thống' },
    { value: 'custom_compensation', label: 'Hỗ trợ khác' },
  ];
  constructor() {
    this.destroy.onDestroy(() => this.abort.abort());
  }
  ngOnInit() {
    void this.load();
    if (this.kind === 'promotions') void this.loadOptions();
  }
  get title() {
    return {
      news: 'Quản lý tin tức',
      policies: 'Quản lý chính sách',
      promotions: 'Quản lý khuyến mãi',
    }[this.kind];
  }
  get singular() {
    return { news: 'bài viết', policies: 'chính sách', promotions: 'khuyến mãi' }[this.kind];
  }
  get types() {
    return this.kind === 'news'
      ? NEWS_TYPES
      : this.kind === 'policies'
        ? POLICY_TYPES
        : DISCOUNT_TYPES;
  }
  get filterTypes() {
    return [{ value: 'all', label: 'Tất cả loại' }, ...this.types];
  }
  get statuses() {
    return this.kind === 'news'
      ? NEWS_STATUSES
      : this.kind === 'policies'
        ? POLICY_STATUSES
        : PROMOTION_STATUSES;
  }
  get filterStatuses() {
    return [{ value: 'all', label: 'Tất cả trạng thái' }, ...this.statuses];
  }
  get editStatuses() {
    return this.kind === 'promotions'
      ? PROMOTION_STATUSES.filter((s) => ['running', 'paused', 'locked'].includes(s.value))
      : this.statuses;
  }
  get metrics() {
    return this.kind === 'news'
      ? [
          { key: 'total', label: 'Tổng bài viết' },
          { key: 'visible', label: 'Đang hiển thị' },
          { key: 'scheduled', label: 'Hẹn đăng' },
          { key: 'draft', label: 'Bản nháp' },
          { key: 'hidden', label: 'Đã ẩn' },
        ]
      : this.kind === 'policies'
        ? [
            { key: 'total', label: 'Tổng chính sách' },
            { key: 'active', label: 'Đang áp dụng' },
            { key: 'locked', label: 'Đã khóa' },
          ]
        : [
            { key: 'total', label: 'Tổng khuyến mãi' },
            { key: 'running', label: 'Đang chạy' },
            { key: 'upcoming', label: 'Sắp diễn ra' },
            { key: 'confirmedUsageCount', label: 'Lượt sử dụng xác nhận' },
          ];
  }
  id(row: ContentRow) {
    return row.id || row.maCS || '';
  }
  name(row: ContentRow) {
    return row.tieuDe || row.tenChinhSach || row.name || '';
  }
  type(row: ContentRow) {
    return (
      row.loai ||
      row.loaiChinhSach ||
      DISCOUNT_TYPES.find((t) => t.value === row.discountType)?.label ||
      ''
    );
  }
  status(row: ContentRow) {
    return row.trangThai || PROMOTION_STATUSES.find((s) => s.value === row.status)?.label || '';
  }
  badge(row: ContentRow): BadgeVariant {
    const s = row.trangThaiCode || row.status;
    return ['DangHienThi', 'DangApDung', 'running'].includes(s || '')
      ? 'success'
      : ['DaAn', 'DaKhoa', 'locked', 'expired'].includes(s || '')
        ? 'neutral'
        : 'warning';
  }
  date(row: ContentRow) {
    return row.capNhatCuoi || row.ngayApDung || row.startDate || row.ngayDang || '';
  }
  private async request<T>(path: string, method = 'GET', body?: unknown) {
    return this.api.request<T>(this.kind + path, method, body, this.abort.signal);
  }
  async load(reset = false) {
    if (reset) this.page = 1;
    const version = ++this.version;
    this.loading.set(true);
    this.error.set('');
    const query = new URLSearchParams({ page: String(this.page), pageSize: '20', sort: 'newest' });
    if (this.search.trim()) query.set('search', this.search.trim());
    if (this.statusFilter !== 'all')
      query.set(this.kind === 'promotions' ? 'status' : 'trangThai', this.statusFilter);
    if (this.typeFilter !== 'all')
      query.set(
        this.kind === 'news' ? 'loai' : this.kind === 'policies' ? 'loaiChinhSach' : 'discountType',
        this.typeFilter,
      );
    try {
      const [list, stats] = await Promise.all([
        this.request<PageResult<ContentRow>>('?' + query),
        this.request<Record<string, number>>('/statistics'),
      ]);
      if (version !== this.version || this.abort.signal.aborted) return;
      if (this.page > Math.max(1, list.pagination.totalPages)) {
        this.page = Math.max(1, list.pagination.totalPages);
        await this.load();
        return;
      }
      this.rows.set(list.data);
      this.total.set(list.pagination.total);
      this.pages.set(list.pagination.totalPages);
      this.statistics.set(stats);
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
  async loadOptions() {
    try {
      this.options.set(await this.request<PromotionOptions>('/options'));
    } catch (e) {
      if (!this.abort.signal.aborted) this.error.set(this.message(e));
    }
  }
  setPage(page: number) {
    if (!this.loading()) {
      this.page = page;
      void this.load();
    }
  }
  private blankDraft(): ContentDraft {
    return {
      title: '',
      category: '',
      status: '',
      content: '',
      summary: '',
      image: '',
      author: '',
      tags: '',
      featured: false,
      scheduleDate: '',
      scheduleTime: '',
      effectiveDate: '',
      rules: [],
      code: '',
      discountType: 'fixed',
      value: '',
      maximum: '',
      minimum: '0',
      serviceScope: 'DatVe',
      start: '',
      end: '',
      maxUsage: '',
      perUser: '',
      limitSubject: 'KhachHang',
      tiers: [],
      routesType: 'all',
      routes: [],
      days: [],
      months: [],
      firstOrder: false,
      birthdayOnly: false,
      referral: false,
      followEmail: false,
      priority: 'normal',
      assigned: false,
      customerContact: '',
      assignmentReason: 'custom_compensation',
      assignmentNote: '',
      giftName: '',
      giftDescription: '',
    };
  }
  async openEditor(row?: ContentRow) {
    const version = ++this.editorVersion;
    this.editorReady.set(!row);
    this.editing = row || null;
    this.draft = this.blankDraft();
    this.draft.status =
      this.kind === 'news' ? 'BanNhap' : this.kind === 'policies' ? 'DangApDung' : 'running';
    this.editorError.set('');
    this.showPreview.set(false);
    this.editorOpen.set(true);
    if (!row) return;
    this.editorLoading.set(true);
    try {
      const r = await this.request<ContentRow>('/' + encodeURIComponent(this.id(row)));
      if (this.abort.signal.aborted || version !== this.editorVersion || !this.editorOpen()) return;
      this.editing = r;
      this.editorReady.set(true);
      Object.assign(this.draft, {
        title: this.name(r),
        category: r.loaiCode || r.loaiChinhSachCode || '',
        status:
          r.trangThaiCode ||
          (r.statusCode === 'NgungHoatDong'
            ? 'locked'
            : r.statusCode === 'TamDung'
              ? 'paused'
              : 'running'),
        content: r.noiDung || r.noiDungChinhSach || '',
        summary: r.moTa || r.description || '',
        image: r.image || '',
        author: r.nguoiDang || '',
        tags: (r.tags || []).join(', '),
        featured: !!r.noiBat,
        effectiveDate: r.ngayApDung || '',
        rules: (r.mocThoiGianHuyVe || []).map((x) => ({
          hours: String(x.truocGio),
          fee: String(x.phiHuy),
        })),
        code: r.code || '',
        discountType: r.discountType || 'fixed',
        value: String(r.discountValue ?? ''),
        maximum: r.maxDiscount == null ? '' : String(r.maxDiscount),
        minimum: String(r.minOrderValue ?? 0),
        serviceScope: r.serviceScope || 'DatVe',
        start: r.startDate || '',
        end: r.endDate || '',
        maxUsage: r.maxUsage == null ? '' : String(r.maxUsage),
        perUser: r.limitPerUser == null ? '' : String(r.limitPerUser),
        limitSubject: r.limitSubject || 'KhachHang',
        tiers: [...(r.memberTierIds || [])].filter((t) => t !== 'Tất cả'),
        routesType: r.routesType || 'all',
        routes: [...(r.selectedRoutes || [])],
        days: [...(r.daysOfWeek || [])],
        months: [...(r.birthdayMonths || [])],
        firstOrder: !!r.firstOrderOnly,
        birthdayOnly: !!r.birthdayMonthOnly,
        referral: !!r.referralRequired,
        followEmail: !!r.emailFollowRequired,
        priority: r.priority || 'normal',
        assigned: !!r.assignedCustomer,
        customerContact: r.assignedCustomer?.emailOrPhone || '',
        assignmentReason: r.assignedCustomer?.reason || 'custom_compensation',
        assignmentNote: r.assignedCustomer?.note || '',
      });
      if (r.henDangLuc) {
        const local = new Date(new Date(r.henDangLuc).getTime() + 7 * 3600000).toISOString();
        this.draft.scheduleDate = local.slice(0, 10);
        this.draft.scheduleTime = local.slice(11, 16);
      }
      if (r.benefitConfig) {
        this.draft.giftName =
          typeof r.benefitConfig['title'] === 'string' ? r.benefitConfig['title'] : '';
        this.draft.giftDescription =
          typeof r.benefitConfig['description'] === 'string' ? r.benefitConfig['description'] : '';
      }
    } catch (e) {
      if (!this.abort.signal.aborted && version === this.editorVersion)
        this.editorError.set(this.message(e));
    } finally {
      if (!this.abort.signal.aborted && version === this.editorVersion)
        this.editorLoading.set(false);
    }
  }
  closeEditor() {
    if (!this.saving()) {
      this.editorVersion++;
      this.editorOpen.set(false);
      this.editorLoading.set(false);
    }
  }
  toggleChoice(field: 'tiers' | 'routes' | 'days' | 'months', value: string, selected: boolean) {
    const set = new Set(this.draft[field]);
    selected ? set.add(value) : set.delete(value);
    this.draft[field] = [...set];
  }
  removeRule(index: number) {
    this.draft.rules.splice(index, 1);
  }
  private numeric(value: string, label: string, optional = false) {
    if (!value.trim() && optional) return null;
    if (!value.trim() || !Number.isFinite(Number(value)))
      throw new Error('Vui lòng nhập ' + label + ' hợp lệ.');
    return Number(value);
  }
  private payload(): Record<string, unknown> {
    const d = this.draft;
    if (!d.title.trim()) throw new Error('Vui lòng nhập tên ' + this.singular + '.');
    if (this.kind === 'news') {
      const body: Record<string, unknown> = {
        tieuDe: d.title.trim(),
        loai: d.category,
        moTa: d.summary.trim(),
        image: d.image.trim(),
        noiDung: d.content,
        trangThai: d.status,
        noiBat: d.featured,
        tags: d.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (d.author.trim()) body['nguoiDang'] = d.author.trim();
      if (d.status === 'LichHenDang') {
        if (!d.scheduleDate || !/^\d{2}:\d{2}$/.test(d.scheduleTime))
          throw new Error('Chọn ngày và giờ hẹn đăng hợp lệ.');
        body['henDangLuc'] = new Date(
          d.scheduleDate + 'T' + d.scheduleTime + ':00+07:00',
        ).toISOString();
      }
      return body;
    }
    if (this.kind === 'policies') {
      return {
        tenChinhSach: d.title.trim(),
        loaiChinhSach: d.category,
        noiDungChinhSach: d.content,
        ngayApDung: d.effectiveDate,
        ...(!this.editing ? { trangThai: d.status } : {}),
        mocThoiGianHuyVe:
          d.category === 'HoanHuy'
            ? d.rules.map((r) => ({
                truocGio: this.numeric(r.hours, 'số giờ'),
                phiHuy: this.numeric(r.fee, 'phí hủy'),
              }))
            : [],
      };
    }
    return {
      code: d.code.trim(),
      name: d.title.trim(),
      description: d.summary.trim(),
      discountType: d.discountType,
      discountValue: this.numeric(d.value, 'giá trị ưu đãi'),
      maxDiscount: this.numeric(d.maximum, 'mức giảm tối đa', true),
      minOrderValue: this.numeric(d.minimum, 'giá trị đơn tối thiểu'),
      serviceScope: d.serviceScope,
      startDate: d.start,
      endDate: d.end,
      status: d.status,
      memberTiers: d.tiers.length ? d.tiers : ['Tất cả'],
      routesType: d.routesType,
      selectedRoutes: d.routesType === 'all' ? [] : d.routes,
      daysOfWeek: d.days,
      birthdayMonthOnly: d.birthdayOnly,
      birthdayMonths: d.months,
      firstOrderOnly: d.firstOrder,
      referralRequired: d.referral,
      emailFollowRequired: d.followEmail,
      priority: d.priority,
      maxUsage: this.numeric(d.maxUsage, 'giới hạn tổng', true),
      limitPerUser: this.numeric(d.perUser, 'giới hạn mỗi khách', true),
      limitSubject: d.limitSubject,
      assignedCustomer: d.assigned
        ? {
            emailOrPhone: d.customerContact.trim(),
            reason: d.assignmentReason,
            note: d.assignmentNote.trim(),
          }
        : null,
      benefitConfig:
        d.discountType === 'gift'
          ? {
              ...(this.editing?.benefitConfig || {}),
              title: d.giftName.trim(),
              description: d.giftDescription.trim(),
            }
          : null,
    };
  }
  async save() {
    if (this.saving() || this.editorLoading() || !this.editorReady()) return;
    this.editorError.set('');
    this.saving.set(true);
    try {
      const body = this.payload();
      await this.request(
        this.editing ? '/' + encodeURIComponent(this.id(this.editing)) : '',
        this.editing ? 'PATCH' : 'POST',
        body,
      );
      if (!this.abort.signal.aborted) {
        this.editorOpen.set(false);
        this.notice.set('Đã lưu ' + this.singular + ' vào hệ thống.');
        await this.load();
      }
    } catch (e) {
      if (!this.abort.signal.aborted) this.editorError.set(this.message(e));
    } finally {
      if (!this.abort.signal.aborted) this.saving.set(false);
    }
  }
  requestStatus(row: ContentRow, status: string) {
    this.statusAction = {
      row,
      status,
      label: this.statuses.find((s) => s.value === status)?.label || status,
    };
    this.editorError.set('');
  }
  async confirmStatus() {
    const action = this.statusAction;
    if (!action || this.saving()) return;
    this.saving.set(true);
    this.editorError.set('');
    try {
      await this.request(
        '/' + encodeURIComponent(this.id(action.row)) + '/status',
        'PATCH',
        this.kind === 'promotions' ? { status: action.status } : { trangThai: action.status },
      );
      this.statusAction = null;
      this.notice.set('Đã cập nhật trạng thái.');
      await this.load();
    } catch (e) {
      if (!this.abort.signal.aborted) this.editorError.set(this.message(e));
    } finally {
      if (!this.abort.signal.aborted) this.saving.set(false);
    }
  }
  async openDetails(row: ContentRow) {
    this.detailTarget = row;
    this.detailPage = 1;
    this.commentStatus = 'HienThi';
    await this.loadDetails();
  }
  async loadDetails() {
    if (!this.detailTarget) return;
    const version = ++this.detailVersion,
      id = this.id(this.detailTarget);
    this.detailBusy.set(true);
    this.detailError.set('');
    try {
      const suffix = this.kind === 'news' ? '/comments' : '/usages';
      const params = new URLSearchParams({ page: String(this.detailPage), pageSize: '20' });
      if (this.kind === 'news') params.set('trangThai', this.commentStatus);
      const response = await this.request<PageResult<ManagedComment | PromotionUsage>>(
        '/' + encodeURIComponent(id) + suffix + '?' + params,
      );
      if (version === this.detailVersion && !this.abort.signal.aborted) {
        this.detailRows.set(response.data);
        this.detailTotal.set(response.pagination.total);
      }
    } catch (e) {
      if (version === this.detailVersion && !this.abort.signal.aborted)
        this.detailError.set(this.message(e));
    } finally {
      if (version === this.detailVersion && !this.abort.signal.aborted) this.detailBusy.set(false);
    }
  }
  closeDetails() {
    this.detailVersion++;
    this.detailTarget = null;
    this.detailRows.set([]);
  }
  comment(row: ManagedComment | PromotionUsage) {
    return row as ManagedComment;
  }
  usage(row: ManagedComment | PromotionUsage) {
    return row as PromotionUsage;
  }
  async moderate(row: ManagedComment | PromotionUsage) {
    if (!this.detailTarget || this.detailBusy()) return;
    this.detailBusy.set(true);
    try {
      await this.request(
        '/' +
          encodeURIComponent(this.id(this.detailTarget)) +
          '/comments/' +
          encodeURIComponent(row.id) +
          '/status',
        'PATCH',
        { trangThai: this.comment(row).trangThaiCode === 'HienThi' ? 'DaAn' : 'HienThi' },
      );
      await this.loadDetails();
      await this.load();
    } catch (e) {
      if (!this.abort.signal.aborted) this.detailError.set(this.message(e));
    } finally {
      if (!this.abort.signal.aborted) this.detailBusy.set(false);
    }
  }
  private message(error: unknown) {
    return error instanceof Error ? error.message : 'Chưa tải được dữ liệu. Vui lòng thử lại.';
  }
}
