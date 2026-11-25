import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DigitsOnlyDirective, NoAutofillDirective, PhoneInputDirective } from './input-guards';

@Component({
  standalone: true,
  imports: [DigitsOnlyDirective, PhoneInputDirective, NoAutofillDirective],
  template: `
    <input id="cccd" appDigitsOnly [maxDigits]="12" />
    <input id="phone" appPhoneInput />
    <input id="matkhau" type="password" appNoAutofill />
  `,
})
class HostForm {}

function build() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostForm] });
  const fixture = TestBed.createComponent(HostForm);
  fixture.detectChanges();
  const field = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
  return { fixture, field };
}

/** Giả lập gõ một ký tự vào ô đang đặt con trỏ ở cuối. */
function type(input: HTMLInputElement, data: string) {
  let prevented = false;
  const event = new InputEvent('beforeinput', { data, inputType: 'insertText', bubbles: true, cancelable: true });
  event.preventDefault = () => { prevented = true; };
  input.setSelectionRange(input.value.length, input.value.length);
  input.dispatchEvent(event);
  if (!prevented) input.value += data;
  return prevented;
}

function paste(input: HTMLInputElement, text: string) {
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
  input.dispatchEvent(event);
}

describe('Shared input guards', () => {
  it('marks a digits-only box as numeric and caps how many digits it takes', () => {
    const { field } = build();
    const cccd = field('cccd');
    expect(cccd.getAttribute('inputmode')).toBe('numeric');
    expect(cccd.getAttribute('autocomplete')).toBe('off');
    expect(cccd.getAttribute('maxlength')).toBe('12');
  });

  it('refuses anything but digits as it is typed', () => {
    const { field } = build();
    const cccd = field('cccd');
    expect(type(cccd, '0')).toBe(false);
    expect(type(cccd, 'a')).toBe(true);
    expect(type(cccd, '-')).toBe(true);
    expect(type(cccd, ' ')).toBe(true);
    expect(cccd.value).toBe('0');
  });

  it('stops typing once the box is full', () => {
    const { field } = build();
    const cccd = field('cccd');
    cccd.value = '123456789012';
    expect(type(cccd, '3')).toBe(true);
    expect(cccd.value).toBe('123456789012');
  });

  it('keeps only the digits out of whatever is pasted in', () => {
    const { field } = build();
    const cccd = field('cccd');
    paste(cccd, ' 079 123-456 789 ');
    expect(cccd.value).toBe('079123456789');
    cccd.value = '';
    // Dán quá số chữ số cho phép thì cắt bớt phần dư.
    paste(cccd, '0791234567890000');
    expect(cccd.value).toBe('079123456789');
    cccd.value = '';
    paste(cccd, 'không có số nào');
    expect(cccd.value).toBe('');
  });

  it('cleans up a value a keyboard app slipped past the guard', () => {
    const { field } = build();
    const cccd = field('cccd');
    cccd.value = '07a9b1-2345678901';
    cccd.dispatchEvent(new Event('input', { bubbles: true }));
    expect(cccd.value).toBe('079123456789');
  });

  it('treats a phone box as a telephone field of ten digits', () => {
    const { field } = build();
    const phone = field('phone');
    expect(phone.getAttribute('type')).toBe('tel');
    expect(phone.getAttribute('maxlength')).toBe('10');
    expect(phone.getAttribute('inputmode')).toBe('numeric');
  });

  it('insists a phone number starts with a zero', () => {
    const { field } = build();
    const phone = field('phone');
    expect(type(phone, '9')).toBe(true);
    expect(phone.value).toBe('');
    expect(type(phone, '0')).toBe(false);
    expect(type(phone, '9')).toBe(false);
    expect(phone.value).toBe('09');
  });

  it('turns away a pasted number that is not a Vietnamese one', () => {
    const { field } = build();
    const phone = field('phone');
    paste(phone, '+84 912 345 678');
    // 84912345678 không bắt đầu bằng 0 nên không nhận.
    expect(phone.value).toBe('');
    paste(phone, '0912 345 678');
    expect(phone.value).toBe('0912345678');
  });

  it('drops a value that does not start with a zero when it arrives another way', () => {
    const { field } = build();
    const phone = field('phone');
    phone.value = '912345678';
    phone.dispatchEvent(new Event('input', { bubbles: true }));
    expect(phone.value).toBe('');
  });

  it('keeps a password box read-only until the customer taps it', () => {
    const { field } = build();
    const matkhau = field('matkhau');
    expect(matkhau.getAttribute('autocomplete')).toBe('new-password');
    expect(matkhau.getAttribute('spellcheck')).toBe('false');
    expect(matkhau.getAttribute('data-lpignore')).toBe('true');
    expect(matkhau.hasAttribute('readonly')).toBe(true);
    matkhau.dispatchEvent(new Event('focus'));
    expect(matkhau.hasAttribute('readonly')).toBe(false);
  });

  it('locks an empty password box again when the customer leaves it', () => {
    const { fixture, field } = build();
    const matkhau = field('matkhau');
    matkhau.dispatchEvent(new Event('focus'));
    matkhau.value = 'Matkhau@2026';
    matkhau.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    // Đã nhập mật khẩu thì không khóa lại, tránh mất chữ đang nhập.
    expect(matkhau.hasAttribute('readonly')).toBe(false);
    matkhau.value = '';
    matkhau.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(matkhau.hasAttribute('readonly')).toBe(true);
  });
});
