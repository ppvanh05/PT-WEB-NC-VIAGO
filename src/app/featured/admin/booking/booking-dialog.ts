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

export function printBookingReceipts(completed: () => void): boolean {
  const receipts = document.querySelectorAll('.ticket-receipt');
  if (!receipts.length) return false;
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;';
  frame.title = 'In vé'; document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) { frame.remove(); return false; }
  const rootStyle = getComputedStyle(document.documentElement);
  const tokens = Array.from(rootStyle).filter(name => name.startsWith('--')).map(name => name + ':' + rootStyle.getPropertyValue(name)).join(';');
  doc.open(); doc.write('<!doctype html><html lang="vi"><head><title>Vé VIAGO</title><style>:root{' + tokens + '}body{font:14px Inter,Arial,sans-serif;color:#0f172a}.ticket-receipt{max-width:80mm;margin:0 auto;break-after:page;padding:12px;box-sizing:border-box}.ticket-receipt:last-child{break-after:auto}img{max-width:100%}@page{margin:10mm}</style></head><body>' + Array.from(receipts).map(v => v.outerHTML).join('') + '</body></html>'); doc.close();
  frame.contentWindow.onafterprint = () => { completed(); frame.remove(); };
  Promise.all(Array.from(doc.images).map(img => img.decode().catch(() => undefined))).then(() => {
    frame.contentWindow?.focus(); frame.contentWindow?.print();
  });
  return true;
}
