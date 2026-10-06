import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ModalSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'app-modal', standalone: true, imports: [CommonModule],
  templateUrl: './modal.html', styleUrl: './modal.css',
})
export class ModalComponent {
  @Input() open = false;
  @Input() size: ModalSize = 'medium';
  @Input() title = '';
  @Input() description = '';
  @Input() confirmMode = false;
  @Input() danger = false;
  @Input() loading = false;
  @Input() closeOnBackdrop = true;
  @Input() closeOnEscape = true;
  @Input() showCloseButton = true;
  @Input() confirmText = 'Xác nhận';
  @Input() cancelText = 'Hủy';
  @Input() disableConfirm = false;

  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onBackdropClick(): void { if (this.closeOnBackdrop && !this.loading) this.closed.emit(); }
  onEscape(): void { if (this.closeOnEscape && !this.loading) this.closed.emit(); }
  confirm(): void { if (!this.loading && !this.disableConfirm) this.confirmed.emit(); }
  cancel(): void { if (!this.loading) { this.cancelled.emit(); this.closed.emit(); } }
}
