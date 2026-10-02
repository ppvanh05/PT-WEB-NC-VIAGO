import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface VoucherItem {
  id: string;
  code: string;
  title: string;
  description: string;
  value?: number;
  type?: 'percentage' | 'fixed';
  expiryDate: string;
  count?: number;
  badgeTarget?: string[];
  isClaimed?: boolean;
  isDisabled?: boolean;
  isExpired?: boolean;
}

@Component({
  selector: 'app-voucher-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voucher-card.html',
  styleUrl: './voucher-card.css',
})
export class VoucherCard {
  @Input() voucher!: VoucherItem;
  @Input() context: 'home' | 'wallet' | 'checkout' = 'home';
  @Input() isSelected: boolean = false;
  @Input() isDisabled: boolean = false;
  @Input() isClaimed: boolean = false;
  @Input() actionText?: string;

  @Output() onSelect = new EventEmitter<VoucherItem>();
  @Output() onAction = new EventEmitter<VoucherItem>();

  get effectiveDisabled(): boolean {
    return this.isDisabled || !!this.voucher?.isDisabled || !!this.voucher?.isExpired;
  }

  get effectiveClaimed(): boolean {
    return this.isClaimed || !!this.voucher?.isClaimed;
  }

  get computedActionText(): string {
    if (this.actionText) return this.actionText;
    if (this.effectiveDisabled) {
      return this.voucher?.isExpired ? 'Hết hạn' : 'Không khả dụng';
    }
    if (this.context === 'wallet') return 'Dùng ngay';
    if (this.context === 'home') {
      return this.effectiveClaimed ? 'Đã lưu' : 'Lưu';
    }
    return 'Áp dụng';
  }

  handleCardClick(event: Event): void {
    if (this.effectiveDisabled) return;
    if (this.context === 'checkout') {
      this.onSelect.emit(this.voucher);
    }
  }

  handleActionClick(event: Event): void {
    event.stopPropagation();
    if (this.effectiveDisabled) return;
    this.onAction.emit(this.voucher);
  }
}

export { VoucherCard as VoucherCardComponent };
