import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Badge } from './badge/badge';
import { PasswordChecklist } from './password-checklist/password-checklist';
import { QrCode } from './qr-code/qr-code';
import { Textarea } from './input/textarea/textarea';
import { VoucherCard, type VoucherItem } from './voucher-card/voucher-card';

/** Dựng một thành phần dùng chung rồi gán các thuộc tính đầu vào. */
function build<T>(type: Type<T>, inputs: Record<string, unknown> = {}) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [type] });
  const fixture = TestBed.createComponent(type);
  Object.assign(fixture.componentInstance as object, inputs);
  return { part: fixture.componentInstance, fixture };
}

const voucher = (over: Partial<VoucherItem> = {}): VoucherItem => ({
  id: 'KM001',
  code: 'HE2026',
  title: 'Giảm 10% hè 2026',
  description: 'Áp dụng cho tuyến TP.HCM - Đà Lạt',
  value: 10,
  type: 'percentage',
  expiryDate: '2026-08-31',
  ...over,
});

const click = () => {
  let stopped = false;
  return { event: { stopPropagation: () => { stopped = true; } } as unknown as Event, wasStopped: () => stopped };
};

describe('Shared voucher card', () => {
  it('names the action after where the voucher is shown', () => {
    expect(build(VoucherCard, { voucher: voucher(), context: 'home' }).part.computedActionText).toBe('Lưu');
    expect(build(VoucherCard, { voucher: voucher(), context: 'home', isClaimed: true }).part.computedActionText).toBe('Đã lưu');
    expect(build(VoucherCard, { voucher: voucher(), context: 'wallet' }).part.computedActionText).toBe('Dùng ngay');
    expect(build(VoucherCard, { voucher: voucher(), context: 'checkout' }).part.computedActionText).toBe('Áp dụng');
    expect(build(VoucherCard, { voucher: voucher(), actionText: 'Chọn mã này' }).part.computedActionText).toBe('Chọn mã này');
  });

  it('says a voucher is out of date or out of reach instead of offering it', () => {
    const expired = build(VoucherCard, { voucher: voucher({ isExpired: true }) }).part;
    expect(expired.effectiveDisabled).toBe(true);
    expect(expired.computedActionText).toBe('Hết hạn');
    const unusable = build(VoucherCard, { voucher: voucher({ isDisabled: true }) }).part;
    expect(unusable.computedActionText).toBe('Không khả dụng');
    const switchedOff = build(VoucherCard, { voucher: voucher(), isDisabled: true }).part;
    expect(switchedOff.effectiveDisabled).toBe(true);
  });

  it('counts a voucher as saved whether the card or the voucher says so', () => {
    expect(build(VoucherCard, { voucher: voucher({ isClaimed: true }) }).part.effectiveClaimed).toBe(true);
    expect(build(VoucherCard, { voucher: voucher(), isClaimed: true }).part.effectiveClaimed).toBe(true);
    expect(build(VoucherCard, { voucher: voucher() }).part.effectiveClaimed).toBe(false);
  });

  it('picks a voucher by tapping the card only while paying', () => {
    const atCheckout = build(VoucherCard, { voucher: voucher(), context: 'checkout' }).part;
    const picked: VoucherItem[] = [];
    atCheckout.onSelect.subscribe(value => picked.push(value));
    atCheckout.handleCardClick(click().event);
    expect(picked).toHaveLength(1);
    const atHome = build(VoucherCard, { voucher: voucher(), context: 'home' }).part;
    const none: VoucherItem[] = [];
    atHome.onSelect.subscribe(value => none.push(value));
    atHome.handleCardClick(click().event);
    expect(none).toEqual([]);
  });

  it('never acts on a voucher that cannot be used', () => {
    const { part } = build(VoucherCard, { voucher: voucher({ isExpired: true }), context: 'checkout' });
    const acts: VoucherItem[] = [];
    part.onSelect.subscribe(value => acts.push(value));
    part.onAction.subscribe(value => acts.push(value));
    part.handleCardClick(click().event);
    part.handleActionClick(click().event);
    expect(acts).toEqual([]);
  });

  it('keeps the tap on the button from also tapping the card', () => {
    const { part } = build(VoucherCard, { voucher: voucher(), context: 'checkout' });
    const acted: VoucherItem[] = [];
    part.onAction.subscribe(value => acted.push(value));
    const tap = click();
    part.handleActionClick(tap.event);
    expect(tap.wasStopped()).toBe(true);
    expect(acted).toHaveLength(1);
  });
});

describe('Shared badge', () => {
  it('builds the class list out of the look asked for', () => {
    const { part } = build(Badge, { variant: 'success', size: 'lg', appearance: 'solid', rounded: 'md' });
    expect(part.badgeClasses).toMatchObject({
      'viago-badge': true,
      'viago-badge--success': true,
      'viago-badge--lg': true,
      'viago-badge--solid': true,
      'viago-badge--rounded-md': true,
    });
  });

  it('marks the dot and the remove button only when they are asked for', () => {
    const plain = build(Badge, {}).part;
    expect(plain.badgeClasses['viago-badge--has-dot']).toBe(false);
    expect(plain.badgeClasses['viago-badge--removable']).toBe(false);
    const full = build(Badge, { dot: true, removable: true }).part;
    expect(full.badgeClasses['viago-badge--has-dot']).toBe(true);
    expect(full.badgeClasses['viago-badge--removable']).toBe(true);
  });

  it('adds the extra classes a screen passes in, ignoring stray spaces', () => {
    const { part } = build(Badge, { customClass: '  trang-thai  dam  ' });
    expect(part.badgeClasses['trang-thai']).toBe(true);
    expect(part.badgeClasses['dam']).toBe(true);
    expect(part.badgeClasses['']).toBeUndefined();
  });

  it('defaults to a soft neutral badge', () => {
    const { part } = build(Badge);
    expect(part.badgeClasses).toMatchObject({
      'viago-badge--neutral': true,
      'viago-badge--md': true,
      'viago-badge--soft': true,
      'viago-badge--rounded-full': true,
    });
  });
});

describe('Shared password checklist', () => {
  it('ticks each rule the password already meets', () => {
    const { part } = build(PasswordChecklist, { value: 'matkhau' });
    const passed = () => [0, 1, 2, 3].map(index => (part as unknown as { passed(i: number): boolean })['passed'](index));
    // Đủ 8 ký tự nhưng chưa có in hoa và ký tự đặc biệt.
    expect(passed()).toEqual([false, false, false, true]);
    Object.assign(part, { value: 'Matkhau@2026' });
    expect(passed()).toEqual([true, true, true, true]);
  });

  it('counts a password with a space as failing that rule', () => {
    const { part } = build(PasswordChecklist, { value: 'Mat khau@2026' });
    const noSpace = (part as unknown as { passed(i: number): boolean })['passed'](3);
    expect(noSpace).toBe(false);
  });

  it('shows nothing as met for an empty or missing password', () => {
    const { part } = build(PasswordChecklist, { value: null });
    const passed = [0, 1, 2, 3].map(index => (part as unknown as { passed(i: number): boolean })['passed'](index));
    expect(passed).toEqual([false, false, false, false]);
  });
});

describe('Shared text area', () => {
  it('passes on what was typed without keeping a copy of its own', () => {
    const { part } = build(Textarea);
    const typed: string[] = [];
    part.valueChange.subscribe(value => typed.push(value));
    const element = document.createElement('textarea');
    element.value = 'Ghi chú cho chuyến đi';
    part.onInput({ target: element } as unknown as Event);
    expect(typed).toEqual(['Ghi chú cho chuyến đi']);
  });

  it('opens with four rows and no limit on length', () => {
    const { part } = build(Textarea);
    expect(part.rows()).toBe(4);
    expect(part.maxlength()).toBeNull();
    expect(part.disabled()).toBe(false);
    expect(part.required()).toBe(false);
  });
});

describe('Shared QR code', () => {
  it('draws a QR image for the code it is given', async () => {
    const { part } = build(QrCode, { value: 'VE001' });
    await part.ngOnChanges();
    expect(part.url.startsWith('data:image/png;base64,')).toBe(true);
    expect(part.error).toBe(false);
  });

  it('draws nothing at all when there is no code yet', async () => {
    const { part } = build(QrCode, { value: '' });
    await part.ngOnChanges();
    expect(part.url).toBe('');
    expect(part.error).toBe(false);
  });

  it('keeps only the newest code when it changes twice in a row', async () => {
    const { part } = build(QrCode, { value: 'VE001' });
    const first = part.ngOnChanges();
    Object.assign(part, { value: 'VE002' });
    const second = part.ngOnChanges();
    await Promise.all([first, second]);
    const newest = await build(QrCode, { value: 'VE002' }).part;
    await newest.ngOnChanges();
    expect(part.url).toBe(newest.url);
  });

  it('says so instead of showing a broken picture when the code cannot be drawn', async () => {
    const { part } = build(QrCode, { value: 'x'.repeat(10000) });
    await part.ngOnChanges();
    expect(part.url).toBe('');
    expect(part.error).toBe(true);
  });
});
