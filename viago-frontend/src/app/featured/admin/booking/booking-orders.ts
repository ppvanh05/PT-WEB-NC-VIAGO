import { CommonModule } from '@angular/common';
import { Badge } from '../../../shared/components/badge/badge';
import { orderStatusVariant } from './order-status-style';
import { Component, Input, OnDestroy, OnInit, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../shared/components/button/button';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { AdminBookingOrder, AdminBookingOrderRow, BookingOrdersApi } from './booking-orders-api';

@Component({
  selector: 'app-admin-booking-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, Button, ModalComponent, Badge],
  templateUrl: './booking-orders.html',
  styleUrl: './booking-orders.css',
})
export class AdminBookingOrders implements OnInit, OnDestroy {
  @Input() embedded = false;
  private readonly api = inject(BookingOrdersApi);
  readonly updated = output<void>();
  readonly rows = signal<AdminBookingOrderRow[]>([]);
  readonly selected = signal<AdminBookingOrder | null>(null);
  readonly detailId = signal<string | null>(null);
  readonly detailLoading = signal(false);
  readonly preview = signal<{ id: string; name: string; phone: string; total: number; from?: string; to?: string } | null>(null);
  private detailAbort?: AbortController;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly cancelExpanded = signal(false);
  readonly copyFeedback = signal('');
  readonly totalPages = signal(1);
  page = 1;
  acknowledged = false;
  cancelReason = '';
  private confirmKey = crypto.randomUUID();
  private timer?: ReturnType<typeof setInterval>;
  private polling = false;
  private destroyed = false;
  private selectionVersion = 0;
  ngOnInit() {
    if (!this.embedded) void this.load();
    this.timer = setInterval(() => {
      void this.poll();
    }, 4000);
  }
  ngOnDestroy() {
    this.destroyed = true;
    this.detailAbort?.abort();
    if (this.timer) clearInterval(this.timer);
  }
  label(status: string) {
    return (
      (
        {
          pending: 'Chờ thanh toán',
          paid: 'Chờ khởi hành',
          cancelled: 'Đã hủy',
          expired: 'Hết hạn',
          ChoThanhToanOnline: 'Chờ chuyển khoản',
          ChoThanhToanTrucTiep: 'Chờ thu tiền mặt',
          DaThanhToan: 'Chờ khởi hành',
          DaHuy: 'Đã hủy',
          HetHanThanhToan: 'Hết hạn',
        } as Record<string, string>
      )[status] ?? status
    );
  }
  orderLabel(order: AdminBookingOrder) {
    return order.status === 'paid' && order.journeyStatus === 'completed' ? 'Đã hoàn thành' : this.label(order.status);
  }
  orderVariant(order: AdminBookingOrder) { return orderStatusVariant(this.orderLabel(order)); }
  bankName(id: string) {
    return ({ '970448': 'OCB', '970407': 'Techcombank', '970422': 'MB Bank', '970436': 'Vietcombank' } as Record<string, string>)[id] ?? id;
  }
  async load(page = this.page) {
    if (this.embedded) return;
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.api.list(page);
      if (!this.destroyed) {
        this.page = page;
        this.rows.set(result.data);
        this.totalPages.set(result.pagination.totalPages);
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Không tải được đơn đặt vé.');
    } finally {
      this.loading.set(false);
    }
  }
  async open(value: string | AdminBookingOrder, preview?: { id: string; name: string; phone: string; total: number; from?: string; to?: string }) {
    if (this.saving()) return;
    this.detailAbort?.abort();
    const abort = new AbortController(); this.detailAbort = abort;
    this.detailId.set(typeof value === 'string' ? value : value.id);
    this.preview.set(preview ?? null);
    this.selected.set(typeof value === 'string' ? null : value);
    this.detailLoading.set(typeof value === 'string');
    this.copyFeedback.set('');
    this.cancelExpanded.set(false);
    const version = ++this.selectionVersion;
    this.error.set('');
    this.acknowledged = false;
    this.cancelReason = '';
    this.confirmKey = crypto.randomUUID();
    try {
      const order = typeof value === 'string' ? await this.api.get(value, abort.signal) : value;
      if (!this.destroyed && version === this.selectionVersion) this.selected.set(order);
    } catch (e) {
      if (!this.destroyed && version === this.selectionVersion && !abort.signal.aborted) this.error.set(e instanceof Error ? e.message : 'Không tải được đơn.');
    } finally {
      if (!this.destroyed && version === this.selectionVersion) this.detailLoading.set(false);
    }
  }
  close() {
    if (!this.saving()) {
      ++this.selectionVersion;
      this.detailAbort?.abort();
      this.detailId.set(null); this.detailLoading.set(false); this.preview.set(null);
      this.selected.set(null);
    }
  }
  async copyPaymentValue(value: string, field: 'account' | 'content') {
    const orderId = this.selected()?.id;
    try {
      await navigator.clipboard.writeText(value);
      if (!this.destroyed && this.selected()?.id === orderId) this.copyFeedback.set(field === 'account' ? 'Đã sao chép số tài khoản.' : 'Đã sao chép nội dung chuyển khoản.');
    } catch {
      if (!this.destroyed && this.selected()?.id === orderId) this.copyFeedback.set('Chưa sao chép được. Bạn có thể chọn thông tin để sao chép thủ công.');
    }
  }
  seatNames(order: AdminBookingOrder) {
    return order.legs
      .flatMap((leg) =>
        leg.seats.map((id) => leg.trip?.seatDetails.find((seat) => seat.id === id)?.label ?? id),
      )
      .join(', ');
  }
  pointName(order: AdminBookingOrder, kind: 'pickup' | 'dropoff') {
    const leg = order.legs[0];
    return (
      leg?.trip?.[kind].find(
        (point) => point.id === (kind === 'pickup' ? leg.pickupId : leg.dropoffId),
      )?.name ?? ''
    );
  }
  private async poll() {
    const order = this.selected();
    if (!order || order.status !== 'pending' || this.polling || this.saving()) return;
    this.polling = true;
    const version = this.selectionVersion;
    try {
      const result = await this.api.get(order.id);
      if (!this.destroyed && version === this.selectionVersion) {
        this.selected.set(result);
        this.error.set('');
        if (result.status !== order.status) {
          this.updated.emit();
          void this.load();
        }
      }
    } catch (e) {
      if (version === this.selectionVersion)
        this.error.set(e instanceof Error ? e.message : 'Chưa cập nhật được thanh toán.');
    } finally {
      this.polling = false;
    }
  }
  async confirm() {
    const order = this.selected();
    if (
      !order ||
      order.status !== 'pending' ||
      order.method !== 'counter' ||
      !this.acknowledged ||
      this.saving()
    )
      return;
    this.saving.set(true);
    this.error.set('');
    try {
      this.selected.set(await this.api.confirm(order.id, order.total, this.confirmKey));
      this.updated.emit();
      void this.load();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Chưa xác nhận được thu tiền.');
    } finally {
      this.saving.set(false);
    }
  }
  async cancel() {
    const order = this.selected();
    if (!order || order.status !== 'pending' || !this.cancelReason.trim() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      this.selected.set(await this.api.cancel(order.id, this.cancelReason.trim()));
      this.updated.emit();
      void this.load();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Chưa hủy được đơn.');
    } finally {
      this.saving.set(false);
    }
  }
}
