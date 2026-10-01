import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

@Component({
  imports: [],
  selector: 'app-toast',
  styleUrl: './toast.css',
  templateUrl: './toast.html',
})
export class Toast implements OnInit, OnDestroy {
  @Input() variant: ToastVariant = 'info';
  @Input() title = '';
  @Input() message = '';
  @Input() dismissible = true;
  @Input() duration = 0;

  @Output() readonly closed = new EventEmitter<void>();

  protected visible = true;
  private dismissTimer?: ReturnType<typeof setTimeout>;

  protected readonly defaultTitles: Record<ToastVariant, string> = {
    success: 'Thành công',
    error: 'Lỗi',
    warning: 'Cảnh báo',
    info: 'Thông tin',
  };

  ngOnInit(): void {
    if (this.duration > 0) {
      this.dismissTimer = setTimeout(() => this.close(), this.duration);
    }
  }

  ngOnDestroy(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }
  }

  protected close(): void {
    if (!this.visible) return;

    this.visible = false;
    this.closed.emit();
  }
}
