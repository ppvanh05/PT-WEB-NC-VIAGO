import { By } from '@angular/platform-browser';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker';
import { TestBed } from '@angular/core/testing';
import { AdminProfile, AdminProfileData } from './profile';

describe('Admin profile', () => {
  it.each(['NewPass456', 'NewPass456é', 'NewPass456 '])('rejects password without a special character: %s', async password => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    component.onPasswordInput('next', password);
    expect(component.passwordErrors.next).toBeTruthy();
    component.passwordDraft.current = 'OldPass123!';
    component.passwordDraft.confirm = password;
    component.changePassword();
    expect(component.passwordSucceeded).toBe(false);
  });
  it('uses shared modal guards for direct clicks and drags', async () => {
    const fixture = await setup();
    const modal = fixture.debugElement.query(By.directive(ModalComponent)).componentInstance as ModalComponent;
    const backdrop = fixture.nativeElement.querySelector('.modal-backdrop');
    const event = (x: number) => ({ currentTarget: backdrop, target: backdrop, clientX: x, clientY: 10, button: 0 } as unknown as PointerEvent);
    modal.onPointerDown(event(10)); modal.onPointerMove(event(50)); modal.onBackdropClick(event(10));
    expect(fixture.componentInstance.profileOpen).toBe(true);
    modal.onPointerDown(event(10)); modal.onBackdropClick(event(10));
    expect(fixture.componentInstance.profileOpen).toBe(false);
  });
  const original: AdminProfileData = {
    familyName: 'Nguyễn An', givenName: 'Ninh', displayName: 'Quản trị viên',
    email: 'admin@viago.vn', phone: '0901234567', gender: 'Nam',
    birthday: '1985-03-15', address: 'TP. Hồ Chí Minh', notes: '', avatarUrl: '',
  };
  async function setup() {
    await TestBed.configureTestingModule({ imports: [AdminProfile] }).compileComponents();
    const fixture = TestBed.createComponent(AdminProfile);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.open(original);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('discards edits on cancel and restores the saved profile on reopen', async () => {
    const fixture = await setup();
    const saved = vi.spyOn(fixture.componentInstance.saved, 'emit');
    fixture.componentInstance.draft.displayName = 'Changed';
    fixture.componentInstance.close();
    expect(original.displayName).toBe('Quản trị viên');
    expect(saved).not.toHaveBeenCalled();
    fixture.componentInstance.open(original);
    expect(fixture.componentInstance.draft.displayName).toBe('Quản trị viên');
  });
  it('opens the birth date calendar as an overlay and closes after selection', async () => {
    const fixture = await setup();
    fixture.nativeElement.querySelector('.date-picker-input').click(); fixture.detectChanges(); await fixture.whenStable();
    const calendar = fixture.nativeElement.querySelector('.profile-body .date-picker-popover');
    expect(calendar).not.toBeNull();
    expect(calendar.classList.contains('date-picker-popover--inline')).toBe(false);
    calendar.querySelector('[data-date-picker-day="1985-03-16"]').click(); fixture.detectChanges(); await fixture.whenStable();
    expect(fixture.componentInstance.draft.birthday).toBe('1985-03-16');
    expect(fixture.nativeElement.querySelector('.date-picker-popover')).toBeNull();
  });
  it('keeps the calendar within the modal and opens upward near the bottom edge', async () => {
    const fixture = await setup();
    fixture.nativeElement.querySelector('.date-picker-input').click(); fixture.detectChanges(); await fixture.whenStable();
    const panel = fixture.nativeElement.querySelector('.modal-panel') as HTMLElement;
    const control = fixture.nativeElement.querySelector('.date-picker-control') as HTMLElement;
    const calendar = fixture.nativeElement.querySelector('.date-picker-popover') as HTMLElement;
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({ left: 100, right: 900, top: 40, bottom: 740 } as DOMRect);
    vi.spyOn(control, 'getBoundingClientRect').mockReturnValue({ left: 700, right: 920, top: 650, bottom: 690 } as DOMRect);
    Object.defineProperty(calendar, 'scrollHeight', { configurable: true, value: 340 });
    const picker = fixture.debugElement.query(By.directive(DatePickerComponent)).componentInstance as DatePickerComponent;
    picker.onResize();
    expect(parseFloat(calendar.style.left) + parseFloat(calendar.style.width)).toBeLessThanOrEqual(884);
    expect(parseFloat(calendar.style.top) + parseFloat(calendar.style.maxHeight)).toBeLessThanOrEqual(650);
    expect(parseFloat(calendar.style.maxHeight)).toBeGreaterThan(0);
  });

  it('blocks invalid email and saves a corrected profile', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    const saved = vi.spyOn(component.saved, 'emit');
    component.draft.email = 'admin@viago';
    component.save();
    expect(saved).not.toHaveBeenCalled();
    component.draft.email = 'admin@viago.vn';
    component.draft.displayName = 'Nguyễn An Ninh';
    component.save();
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Nguyễn An Ninh' }));
  });

  it('rejects a non-image upload', async () => {
    const fixture = await setup();
    fixture.componentInstance.onFileSelected({ target: {
      files: [new File(['text'], 'file.txt', { type: 'text/plain' })], value: 'file.txt',
    } } as unknown as Event);
    expect(fixture.componentInstance.avatarError).toContain('JPG');
    expect(fixture.componentInstance.draft.avatarUrl).toBe('');
  });
  it.each([
    ['familyName', '   '], ['givenName', 'Ninh123'], ['displayName', '   '],
    ['birthday', '2099-01-01'], ['birthday', '2025-02-30'], ['phone', '0123456789'],
    ['email', 'admin@-viago.vn'], ['gender', 'invalid'],
  ])('blocks invalid %s: %s', async (field, value) => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    const saved = vi.spyOn(component.saved, 'emit');
    component.draft[field as keyof AdminProfileData] = value;
    component.save();
    expect(saved).not.toHaveBeenCalled();
    expect(component.fieldErrors[field as keyof AdminProfileData]).toBeTruthy();
  });

  it('normalizes international phone numbers and trims names', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    const saved = vi.spyOn(component.saved, 'emit');
    component.draft.phone = '+84 901 234 567';
    component.draft.familyName = ' Nguyễn An ';
    component.save();
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ phone: '0901234567', familyName: 'Nguyễn An' }));
  });

  it('opens password dialog from profile without losing profile edits and clears passwords on cancel', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    component.draft.displayName = 'Tên chưa lưu';
    fixture.nativeElement.querySelector('.change-password button').click();
    expect(component.passwordOpen).toBe(true);
    component.passwordDraft.current = 'OldPass123!';
    component.closePassword();
    expect(component.passwordDraft.current).toBe('');
    expect(component.draft.displayName).toBe('Tên chưa lưu');
  });

  it('shows inline errors while typing and rechecks confirmation when the new password changes', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    expect(component.passwordErrors).toEqual({});
    component.openPassword(); fixture.detectChanges(); await fixture.whenStable();
    const type = async (key: string, value: string) => {
      const input = fixture.nativeElement.querySelector('#password-' + key) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
    };
    await type('next', 'weak');
    expect(fixture.nativeElement.querySelector('#password-next-error')?.textContent).toContain('8 ký tự');
    await type('next', 'NewPass456!');
    expect(fixture.nativeElement.querySelector('#password-next-error')).toBeNull();
    await type('confirm', 'NewPass45');
    expect(fixture.nativeElement.querySelector('#password-confirm-error')?.textContent).toContain('chưa khớp');
    await type('confirm', 'NewPass456!');
    expect(fixture.nativeElement.querySelector('#password-confirm-error')).toBeNull();
    await type('next', 'OtherPass789!');
    expect(fixture.nativeElement.querySelector('#password-confirm-error')?.textContent).toContain('chưa khớp');
    await type('confirm', 'OtherPass789!');
    expect(fixture.nativeElement.querySelector('#password-confirm-error')).toBeNull();
    expect(component.passwordNotice).toBe('');
  });

  it('validates password rules and displays simulated success with cleared fields', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    component.passwordDraft = { current: 'OldPass123!', next: 'weak', confirm: 'different' };
    component.changePassword();
    expect(component.passwordErrors.next).toBeTruthy();
    expect(component.passwordErrors.confirm).toBeTruthy();
    component.passwordDraft = { current: 'OldPass123!', next: 'OldPass123!', confirm: 'OldPass123!' };
    component.changePassword();
    expect(component.passwordErrors.next).toContain('khác');
    component.passwordDraft = { current: 'OldPass123!', next: 'NewPass456!', confirm: 'NewPass456!' };
    component.changePassword();
    expect(component.passwordErrors).toEqual({});
    expect(component.passwordNotice).toContain('Đổi mật khẩu thành công!');
    expect(component.passwordDraft).toEqual({ current: '', next: '', confirm: '' });
    expect(component.passwordTouched).toEqual({ current: false, next: false, confirm: false });
  });
  it('handles an actual click on the password submit button', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;
    component.openPassword(); fixture.detectChanges(); await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('.password-dialog button[type=submit]') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(component.passwordErrors.current).toBeTruthy();
    for (const [key, value] of Object.entries({ current: 'OldPass123!', next: 'NewPass456!', confirm: 'NewPass456!' })) {
      const input = fixture.nativeElement.querySelector('#password-' + key) as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
    }
    button.click();
    fixture.detectChanges();
    expect(component.passwordErrors).toEqual({});
    expect(fixture.nativeElement.querySelector('.password-notice')).toBeNull();
    expect(fixture.nativeElement.querySelector('.password-dialog header')).toBeNull();
    expect(fixture.nativeElement.querySelector('.password-success h3')?.textContent).toContain('Đổi mật khẩu thành công');
    expect(fixture.nativeElement.querySelector('#password-next')).toBeNull();
    component.onPasswordInput('next', '');
    component.onPasswordBlur('confirm');
    expect(component.passwordSucceeded).toBe(true);
    expect(component.passwordErrors).toEqual({});
  });
});
