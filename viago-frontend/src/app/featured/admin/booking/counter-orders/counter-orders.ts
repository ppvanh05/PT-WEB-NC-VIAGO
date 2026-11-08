import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminContentApi } from '../../../../core/services/content-api.service';
import { Card } from '../../../../shared/components/card/card';
import { Button } from '../../../../shared/components/button/button';
import { Badge } from '../../../../shared/components/badge/badge';
import { Input } from '../../../../shared/components/input/input';
import { Select } from '../../../../shared/components/input/select/select';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { ModalComponent } from '../../../../shared/components/modal/modal';
interface CounterOrder {
  id: string;
  name: string;
  phone: string;
  from: string;
  to: string;
  departureAt: string;
  expiresAt: string;
  total: number;
  seatCount: number;
  status: string;
}
@Component({
  selector: 'app-counter-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Button,
    Badge,
    Input,
    Select,
    Pagination,
    ModalComponent,
  ],
  templateUrl: './counter-orders.html',
  styleUrl: './counter-orders.css',
})
export class CounterOrders implements OnInit {
  private readonly api = inject(AdminContentApi);
  private readonly destroy = inject(DestroyRef);
  private readonly abort = new AbortController();
  readonly rows = signal<CounterOrder[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly selected = signal<CounterOrder | null>(null);
  readonly total = signal(0);
  readonly statuses = [
    { value: 'pending', label: 'Chờ thu tiền' },
    { value: 'all', label: 'Tất cả đơn' },
  ];
  search = '';
  status = 'pending';
  page = 1;
  acknowledged = false;
  private version = 0;
  constructor() {
    this.destroy.onDestroy(() => this.abort.abort());
  }
  ngOnInit() {
    void this.load();
  }
  label(status: string) {
    return (
      (
        {
          ChoThanhToanTrucTiep: 'Chờ thu tiền',
          DaThanhToan: 'Đã thanh toán',
          DaHuy: 'Đã hủy',
          HetHanThanhToan: 'Hết hạn',
        } as Record<string, string>
      )[status] || status
    );
  }
  canCollect(row: CounterOrder) {
    return row.status === 'ChoThanhToanTrucTiep' && Date.parse(row.expiresAt) > Date.now();
  }
  async load(reset = false) {
    if (reset) this.page = 1;
    const version = ++this.version;
    this.loading.set(true);
    this.error.set('');
    try {
      const q = new URLSearchParams({
        page: String(this.page),
        pageSize: '10',
        status: this.status,
      });
      if (this.search.trim()) q.set('search', this.search.trim());
      const result = await this.api.request<{
        data: CounterOrder[];
        pagination: { total: number; totalPages: number };
      }>('counter-orders?' + q, 'GET', undefined, this.abort.signal);
      if (version !== this.version || this.abort.signal.aborted) return;
      if (this.page > Math.max(1, result.pagination.totalPages)) {
        this.page = Math.max(1, result.pagination.totalPages);
        await this.load();
        return;
      }
      this.rows.set(result.data);
      this.total.set(result.pagination.total);
    } catch (e) {
      if (!this.abort.signal.aborted && version === this.version) {
        this.error.set(e instanceof Error ? e.message : 'Không tải được đơn khách đặt.');
        this.rows.set([]);
      }
    } finally {
      if (version === this.version) this.loading.set(false);
    }
  }
  open(row: CounterOrder) {
    if (!this.canCollect(row) || this.saving()) return;
    this.acknowledged = false;
    this.error.set('');
    this.selected.set(row);
  }
  close() {
    if (!this.saving()) this.selected.set(null);
  }
  async confirm() {
    const row = this.selected();
    if (!row || !this.acknowledged || !this.canCollect(row) || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const result = await this.api.request<{ status: string }>(
        'counter-orders/' + encodeURIComponent(row.id) + '/confirm',
        'POST',
        {},
        this.abort.signal,
      );
      if (result.status !== 'paid') throw new Error('Đơn chưa được xác nhận thu tiền.');
      this.selected.set(null);
      this.notice.set('Đã ghi nhận thu tiền và xuất vé cho đơn ' + row.id + '.');
      await this.load();
    } catch (e) {
      if (!this.abort.signal.aborted)
        this.error.set(e instanceof Error ? e.message : 'Chưa xác nhận được thu tiền.');
    } finally {
      this.saving.set(false);
    }
  }
}
