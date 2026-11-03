import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, OnChanges, AfterViewChecked, OnDestroy } from '@angular/core';

export type ModalSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'app-modal', standalone: true, imports: [CommonModule],
  templateUrl: './modal.html', styleUrl: './modal.css',
})
export class ModalComponent implements OnChanges, AfterViewChecked, OnDestroy {
  @ViewChild('panel') private panel?: ElementRef<HTMLElement>;
  private static stack: ModalComponent[] = [];
  private static originalOverflow = '';
  private previousFocus?: HTMLElement;
  private focusPending = false;
  private backdropPress: { x: number; y: number } | null = null;
  private moved = false;
  ngOnChanges(): void {
    const registered = ModalComponent.stack.includes(this);
    if (this.open && !registered) {
      this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
      if (!ModalComponent.stack.length) { ModalComponent.originalOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
      ModalComponent.stack.push(this); this.focusPending = true;
    } else if (!this.open && registered) this.release();
  }
  ngAfterViewChecked(): void { if (this.focusPending && this.panel) { this.focusPending = false; (this.focusable()[0] || this.panel.nativeElement).focus(); } }
  ngOnDestroy(): void { this.release(); }
  private release(): void {
    const index = ModalComponent.stack.indexOf(this), wasTop = ModalComponent.stack.at(-1) === this;
    if (index < 0) return; ModalComponent.stack.splice(index, 1); this.focusPending = false; this.cancelPress();
    if (!ModalComponent.stack.length) document.body.style.overflow = ModalComponent.originalOverflow;
    if (wasTop && this.previousFocus?.isConnected) this.previousFocus.focus();
  }
  private focusable(): HTMLElement[] { return Array.from(this.panel?.nativeElement.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') || []); }
  onKeyDown(event: KeyboardEvent): void {
    if (ModalComponent.stack.at(-1) !== this) return;
    if (event.key === 'Escape') {
      if (this.panel?.nativeElement.querySelector('.date-picker-popover')) return;
      event.preventDefault(); event.stopPropagation(); this.onEscape();
    }
    if (event.key !== 'Tab') return;
    const items = this.focusable(), first = items[0], last = items.at(-1);
    if (!first) { event.preventDefault(); this.panel?.nativeElement.focus(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === this.panel?.nativeElement)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  onBackdropPointerDown(event: PointerEvent): void { this.backdropPress = event.target === event.currentTarget && event.button === 0 ? { x: event.clientX, y: event.clientY } : null; this.moved = false; }
  onBackdropPointerMove(event: PointerEvent): void { if (this.backdropPress && Math.hypot(event.clientX - this.backdropPress.x, event.clientY - this.backdropPress.y) > 4) this.moved = true; }
  onBackdropPointerUp(event: PointerEvent): void { if (this.backdropPress && !this.moved && event.target === event.currentTarget && Math.hypot(event.clientX - this.backdropPress.x, event.clientY - this.backdropPress.y) <= 4) this.onBackdropClick(); this.cancelPress(); }
  cancelPress(): void { this.backdropPress = null; this.moved = false; }
  onPointerDown(event: PointerEvent): void { this.onBackdropPointerDown(event); }
  onPointerMove(event: PointerEvent): void { this.onBackdropPointerMove(event); }
  @Input() open = false;
  @Input() size: ModalSize = 'medium';
  @Input() fixedLayout = false;
  @Input() fitContent = false;
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

  onBackdropClick(event?: MouseEvent): void {
    if (event && (!this.backdropPress || this.moved || event.target !== event.currentTarget || Math.hypot(event.clientX - this.backdropPress.x, event.clientY - this.backdropPress.y) > 4)) { this.cancelPress(); return; }
    if (this.closeOnBackdrop && !this.loading) this.closed.emit();
    this.cancelPress();
  }
  onEscape(): void { if (this.closeOnEscape && !this.loading) this.closed.emit(); }
  confirm(): void { if (!this.loading && !this.disableConfirm) this.confirmed.emit(); }
  cancel(): void { if (!this.loading) { this.cancelled.emit(); this.closed.emit(); } }
}
