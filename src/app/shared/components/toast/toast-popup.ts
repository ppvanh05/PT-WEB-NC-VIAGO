import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Toast } from './toast';

@Component({
  selector: 'app-toast-popup',
  imports: [Toast],
  template: `<div class="notice-popup" [class.notice-popup--leaving]="leaving"><app-toast variant="info" [message]="message" (closed)="dismiss()" /></div>`,
  styleUrl: './toast-popup.css',
})
export class ToastPopup implements OnInit, OnDestroy {
  @Input() message = '';
  @Output() readonly closed = new EventEmitter<void>();
  leaving = false;
  private readonly cd = inject(ChangeDetectorRef);
  private timer?: ReturnType<typeof setTimeout>;
  private exitTimer?: ReturnType<typeof setTimeout>;
  ngOnInit(): void { this.timer = setTimeout(() => this.dismiss(), 4000); }
  dismiss(): void {
    if (this.leaving) return;
    clearTimeout(this.timer);
    this.leaving = true;
    this.cd.markForCheck();
    this.exitTimer = setTimeout(() => this.closed.emit(), 220);
  }
  ngOnDestroy(): void { clearTimeout(this.timer); clearTimeout(this.exitTimer); }
}
