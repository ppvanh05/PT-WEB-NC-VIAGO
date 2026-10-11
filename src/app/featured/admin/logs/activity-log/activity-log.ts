import { Component, OnInit, HostListener, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../../shared/components/button/button';
import { Input } from '../../../../shared/components/input/input';
import { Select } from '../../../../shared/components/input/select/select';
import { Badge } from '../../../../shared/components/badge/badge';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { ModalComponent } from '../../../../shared/components/modal/modal';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker';
import { Toast } from '../../../../shared/components/toast/toast';
import { ActivityLogService, SystemLog } from '../../../../core/services/activity-log.service';

@Component({ selector: 'app-activity-log', imports: [FormsModule, Button, Input, Select, Badge, Pagination, ModalComponent, DatePickerComponent, Toast], templateUrl: './activity-log.html', styleUrl: './activity-log.css' })
export class ActivityLog implements OnInit, OnDestroy {
  private readonly source = inject(ActivityLogService);
  private readonly cd = inject(ChangeDetectorRef);
  logs: SystemLog[] = []; filteredLogs: SystemLog[] = [];
  searchQuery = ''; selectedRole = 'all'; selectedAction = 'all'; selectedStatus = 'all'; startDate = ''; endDate = '';
  currentPage = 1; pageSize = 10; selectedLog: SystemLog | null = null;
  error = ''; dateError = ''; notice = '';
  exporting = false; noticeKind: 'info' | 'error' = 'info'; noticeLeaving = false;
  private noticeTimer?: ReturnType<typeof setTimeout>;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private destroyed = false;
  ngOnDestroy(): void { this.destroyed = true; this.clearNotice(); }
  clearNotice(): void { clearTimeout(this.noticeTimer); clearTimeout(this.hideTimer); this.notice = ''; this.noticeLeaving = false; }
  private notify(message: string, kind: 'info' | 'error' = 'info'): void {
    if (this.destroyed) return;
    this.clearNotice(); this.notice = message; this.noticeKind = kind; this.cd.markForCheck();
    this.noticeTimer = setTimeout(() => {
      this.noticeLeaving = true; this.cd.markForCheck();
      this.hideTimer = setTimeout(() => { this.clearNotice(); this.cd.markForCheck(); }, 220);
    }, 4000);
  }
  readonly statusOptions = [{ label: 'Tất cả trạng thái', value: 'all' }, ...['Thành công', 'Thất bại'].map(value => ({ label: value, value }))];
  readonly pageSizeOptions = [10, 20, 50, 100].map(n => ({ label: `${n} / trang`, value: String(n) }));
  ngOnInit(): void { this.refresh(); }
  @HostListener('window:storage') onStorage(): void { this.refresh(); }
  refresh(): void { this.logs = this.source.load(); this.error = this.source.readError; this.applyFilters(); this.cd.markForCheck(); }
  get roleOptions() { return [{ label: 'Tất cả vai trò', value: 'all' }, ...[...new Set(this.logs.map(l => l.actor.role))].sort().map(value => ({ label: value, value }))]; }
  get actionOptions() { return [{ label: 'Tất cả thao tác', value: 'all' }, ...[...new Set(this.logs.map(l => l.action))].sort().map(value => ({ label: value, value }))]; }
  private day(timestamp: string): string { return timestamp ? new Date(timestamp).toLocaleDateString('sv-SE') : ''; }
  private get todayLogs(): SystemLog[] { const today = new Date().toLocaleDateString('sv-SE'); return this.logs.filter(l => this.day(l.timestamp) === today); }
  get stats() { const today = this.todayLogs; return [{ label: 'Nhật ký hôm nay', count: today.length }, { label: 'Đăng nhập thành công hôm nay', count: today.filter(l => l.action === 'Đăng nhập' && l.status === 'Thành công').length }, { label: 'Thao tác thất bại hôm nay', count: today.filter(l => l.status === 'Thất bại').length }, { label: 'Tài khoản tạo / đăng ký hôm nay', count: today.filter(l => /^(Tạo|Đăng ký) tài khoản/.test(l.action) && l.status === 'Thành công').length }]; }
  applyFilters(): void {
    this.dateError = this.startDate && this.endDate && this.startDate > this.endDate ? 'Ngày kết thúc phải từ ngày bắt đầu trở đi.' : '';
    if (this.dateError) return;
    const q = this.searchQuery.trim().toLocaleLowerCase('vi');
    this.currentPage = 1;
    this.filteredLogs = this.logs.filter(l => [l.id, l.actor.name, l.actor.username, l.actor.code, l.details, l.target.code, l.target.name, l.action, l.ip].some(v => v.toLocaleLowerCase('vi').includes(q)) && (this.selectedRole === 'all' || l.actor.role === this.selectedRole) && (this.selectedAction === 'all' || l.action === this.selectedAction) && (this.selectedStatus === 'all' || l.status === this.selectedStatus) && (!this.startDate || this.day(l.timestamp) >= this.startDate) && (!this.endDate || (!!l.timestamp && this.day(l.timestamp) <= this.endDate)));
  }
  reset(): void { this.searchQuery = ''; this.selectedRole = 'all'; this.selectedAction = 'all'; this.selectedStatus = 'all'; this.startDate = ''; this.endDate = ''; this.applyFilters(); }
  get validCurrentPage(): number { return Math.min(Math.max(1, this.currentPage), Math.max(1, Math.ceil(this.filteredLogs.length / this.pageSize))); }
  get paginatedLogs(): SystemLog[] { return this.filteredLogs.slice((this.validCurrentPage - 1) * this.pageSize, this.validCurrentPage * this.pageSize); }
  setPageSize(value: string): void { const size = Number(value); if ([10, 20, 50, 100].includes(size)) { this.pageSize = size; this.currentPage = 1; } }
  formatTime(timestamp: string): string { return timestamp ? new Date(timestamp).toLocaleString('vi-VN') : 'Chưa ghi nhận'; }
  open(log: SystemLog): void { this.selectedLog = log; this.cd.markForCheck(); }
  csvContent(): string {
    const cell = (value: string) => '"' + (/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replace(/"/g, '""') + '"';
    const rows = [['Mã nhật ký', 'Người thực hiện', 'Tài khoản', 'Vai trò', 'Thao tác', 'Trạng thái', 'Thời gian', 'Địa chỉ IP', 'Tài khoản được tác động', 'Chi tiết'], ...this.filteredLogs.map(l => [l.id, l.actor.name, l.actor.username, l.actor.role, l.action, l.status, this.formatTime(l.timestamp), l.ip, `${l.target.name} (${l.target.code})`, l.details])];
    return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
  }
  async exportCsv(): Promise<void> {
    if (this.exporting) return;
    this.clearNotice();
    if (!this.filteredLogs.length || this.dateError) { this.notify(this.dateError || 'Không có nhật ký phù hợp để xuất.'); return; }
    const blob = new Blob([this.csvContent()], { type: 'text/csv;charset=utf-8' });
    const filename = `nhat_ky_${new Date().toLocaleDateString('sv-SE')}.csv`;
    const picker = (window as Window & { showSaveFilePicker?: (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<{ createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void>; abort(): Promise<void> }> }> }).showSaveFilePicker;
    this.exporting = true;
    try {
      if (picker) {
        const handle = await picker.call(window, { suggestedName: filename, types: [{ description: 'CSV', accept: { 'text/csv': ['.csv'] } }] });
        const stream = await handle.createWritable();
        try { await stream.write(blob); await stream.close(); }
        catch (error) { try { await stream.abort(); } catch { /* Preserve the original save error. */ } throw error; }
        this.notify('Xuất nhật ký thành công.');
      } else {
        // Downloads through an anchor have no browser event confirming that Save completed.
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      if (!(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError')) this.notify('Không thể lưu tệp nhật ký. Vui lòng thử lại.', 'error');
    } finally { this.exporting = false; if (!this.destroyed) this.cd.markForCheck(); }
  }
}
