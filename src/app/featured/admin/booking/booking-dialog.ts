import { AfterViewInit, Directive, ElementRef, HostListener, OnDestroy } from '@angular/core';

@Directive({ selector: '[bookingDialog]', standalone: true })
export class BookingDialog implements AfterViewInit, OnDestroy {
  private previousFocus = document.activeElement as HTMLElement | null;
  constructor(private element: ElementRef<HTMLElement>) {}
  ngAfterViewInit() {
    this.element.nativeElement.tabIndex = -1;
    this.element.nativeElement.focus({ preventScroll: true });
  }
  @HostListener('document:keydown', ['$event'])
  trapFocus(event: Event) {
    const key = event as KeyboardEvent;
    if (key.key !== 'Tab') return;
    const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'));
    if (dialogs.at(-1) !== this.element.nativeElement) return;
    const controls = Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex="0"]'))
      .filter(control => !control.matches(':disabled') && control.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (!first) { key.preventDefault(); this.element.nativeElement.focus(); return; }
    if (key.shiftKey && (document.activeElement === first || document.activeElement === this.element.nativeElement)) {
      key.preventDefault(); last?.focus();
    } else if (!key.shiftKey && document.activeElement === last) {
      key.preventDefault(); first.focus();
    }
  }
  ngOnDestroy() { if (this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true }); }
}
