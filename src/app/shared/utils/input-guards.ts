import { Directive, ElementRef, HostBinding, HostListener, Input, inject } from '@angular/core';

/**
 * Chặn bàn phím ngay khi gõ (input prevent), không phải báo lỗi đỏ.
 * - [appDigitsOnly]: chỉ nhận chữ số, giới hạn `maxDigits` (vd CCCD 12 số, OTP 6 số).
 * - [appPhoneInput]: SĐT Việt Nam - chỉ chữ số, tối đa 10 số, bắt buộc bắt đầu bằng 0.
 */
@Directive({
  selector: 'input[appDigitsOnly]',
  standalone: true,
})
export class DigitsOnlyDirective {
  @Input() maxDigits = 0;
  /** Ký tự đầu bắt buộc (vd '0' cho SĐT). */
  @Input() requiredPrefix = '';

  protected readonly el = inject(ElementRef<HTMLInputElement>);

  @HostBinding('attr.inputmode') inputMode = 'numeric';
  @HostBinding('attr.autocomplete') autocompleteAttr = 'off';

  @HostBinding('attr.maxlength') get maxLengthAttr(): number | null {
    return this.maxDigits > 0 ? this.maxDigits : null;
  }

  private nextValue(input: HTMLInputElement, insert: string): string {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    return input.value.slice(0, start) + insert + input.value.slice(end);
  }

  private isAllowed(value: string): boolean {
    if (!/^\d*$/.test(value)) return false;
    if (this.maxDigits > 0 && value.length > this.maxDigits) return false;
    if (this.requiredPrefix && value.length > 0 && !value.startsWith(this.requiredPrefix.slice(0, value.length))) return false;
    return true;
  }

  @HostListener('beforeinput', ['$event'])
  onBeforeInput(event: InputEvent): void {
    if (!event.inputType?.startsWith('insert') || event.inputType === 'insertFromPaste') return;
    const data = event.data ?? '';
    if (!data) return;
    if (!this.isAllowed(this.nextValue(this.el.nativeElement, data))) {
      event.preventDefault();
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const input = this.el.nativeElement;
    let digits = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '');
    if (!digits) return;
    let next = this.nextValue(input, digits);
    if (this.requiredPrefix && !next.startsWith(this.requiredPrefix)) return;
    if (this.maxDigits > 0) next = next.slice(0, this.maxDigits);
    input.value = next;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /** Lưới an toàn cho trình duyệt / bộ gõ không phát sinh beforeinput. */
  @HostListener('input')
  onInput(): void {
    const input = this.el.nativeElement;
    let clean = input.value.replace(/\D/g, '');
    if (this.maxDigits > 0) clean = clean.slice(0, this.maxDigits);
    if (this.requiredPrefix && clean && !clean.startsWith(this.requiredPrefix)) clean = '';
    if (clean !== input.value) {
      input.value = clean;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

@Directive({
  selector: 'input[appPhoneInput]',
  standalone: true,
})
export class PhoneInputDirective extends DigitsOnlyDirective {
  override maxDigits = 10;
  override requiredPrefix = '0';

  @HostBinding('attr.type') typeAttr = 'tel';
}

/**
 * Bảo mật ô mật khẩu: không autofill, không gợi ý mật khẩu đã lưu.
 * Trình duyệt bỏ qua autocomplete="off" cho ô password, nên ô được để readonly
 * cho đến khi người dùng chủ động focus vào (trình duyệt sẽ không tự điền).
 */
@Directive({
  selector: 'input[appNoAutofill]',
  standalone: true,
})
export class NoAutofillDirective {
  private readonly el = inject(ElementRef<HTMLInputElement>);

  @HostBinding('attr.autocomplete') autocompleteAttr = 'new-password';
  @HostBinding('attr.autocorrect') autocorrect = 'off';
  @HostBinding('attr.autocapitalize') autocapitalize = 'off';
  @HostBinding('attr.spellcheck') spellcheck = 'false';
  @HostBinding('attr.data-lpignore') lastPassIgnore = 'true';
  @HostBinding('attr.data-1p-ignore') onePassIgnore = 'true';
  @HostBinding('attr.readonly') readonlyAttr: string | null = 'readonly';

  @HostListener('focus')
  onFocus(): void {
    this.readonlyAttr = null;
    this.el.nativeElement.removeAttribute('readonly');
  }

  @HostListener('blur')
  onBlur(): void {
    // Giữ readonly trở lại khi ô trống để trình duyệt không chèn mật khẩu đã lưu.
    if (!this.el.nativeElement.value) {
      this.readonlyAttr = 'readonly';
    }
  }
}
