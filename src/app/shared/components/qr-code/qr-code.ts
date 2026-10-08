import { ChangeDetectorRef, Component, inject, Input, OnChanges, OnDestroy } from '@angular/core';
import QRCode from 'qrcode';

@Component({
  selector: 'app-qr-code',
  template: `@if (url) { <img [src]="url" [alt]="label" [style.width.px]="size" /> @if (logo) { <span class="qr-logo"><img [src]="logo" [alt]="logoLabel" /></span> } } @else if (error) { <small role="alert">Không tạo được mã QR. Vui lòng dùng mã vé.</small> }`,
  styles: [`:host { display: inline-block; position: relative; max-width: 100%; } img { display: block; width: 180px; max-width: 100%; height: auto; border: 1px solid var(--color-border); border-radius: var(--radius-md); } .qr-logo { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: grid; place-items: center; width: 32px; height: 32px; padding: 3px; box-sizing: border-box; background: var(--color-surface); border-radius: var(--radius-sm); } .qr-logo img { width: 100%; height: 100%; object-fit: contain; border: 0; border-radius: 0; } small { color: var(--color-danger-500); }`],
})
export class QrCode implements OnChanges, OnDestroy {
  @Input() size = 180;
  @Input() value = '';
  @Input() label = 'Mã QR';
  @Input() logo = '';
  @Input() logoLabel = '';
  url = ''; error = false;
  private generation = 0;
  private readonly cd = inject(ChangeDetectorRef);
  async ngOnChanges(): Promise<void> {
    const generation = ++this.generation; this.error = false; this.url = '';
    if (!this.value) return;
    try { const url = await QRCode.toDataURL(this.value, { width: 240, margin: 4, errorCorrectionLevel: this.logo ? 'H' : 'M' }); if (generation === this.generation) this.url = url; }
    catch { if (generation === this.generation) this.error = true; }
    if (generation === this.generation) this.cd.markForCheck();
  }
  ngOnDestroy(): void { this.generation++; }
}
