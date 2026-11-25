import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { SecuritySettingsModal } from './security-settings-modal';

function build(changePassword: (current: string, next: string) => Promise<{ success: boolean; message: string }> =
  async () => ({ success: true, message: '' })) {
  const calls: Array<[string, string]> = [];
  // Khi biểu mẫu sai, component cuộn tới ô lỗi đầu tiên; môi trường test không có
  // scrollIntoView nên phải cung cấp bản rỗng.
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [SecuritySettingsModal],
    providers: [
      {
        provide: AuthService,
        useValue: {
          currentUser: () => ({ id: 'KH001', phone: '0912345678' }),
          changePassword: (current: string, next: string) => {
            calls.push([current, next]);
            return changePassword(current, next);
          },
          requestOtp: async () => ({ ok: true }),
          // Nhập đủ 6 số là component tự gọi xác thực, nên bản giả phải có hàm này.
          verifyOTP: async () => ({ success: false, message: '' }),
        },
      },
      { provide: ToastService, useValue: { showError: () => {}, showSuccess: () => {} } },
    ],
  });
  const fixture = TestBed.createComponent(SecuritySettingsModal);
  fixture.detectChanges();
  return { page: fixture.componentInstance, calls };
}

const fill = (page: SecuritySettingsModal, current: string, next: string, confirm = next) => {
  page.passwordForm.setValue({ currentPassword: current, newPassword: next, confirmPassword: confirm });
};

describe('Customer change password modal', () => {
  it('requires a strong new password', () => {
    const { page } = build();
    const next = page.passwordForm.get('newPassword')!;
    for (const weak of ['', '123456', 'matkhau', 'Matkhau2026']) {
      next.setValue(weak);
      expect(next.valid, weak).toBe(false);
    }
    next.setValue('Matkhau@2026');
    expect(next.valid).toBe(true);
  });

  it('refuses a new password identical to the current one', () => {
    const { page } = build();
    fill(page, 'Matkhau@2026', 'Matkhau@2026');
    expect(page.passwordForm.get('newPassword')!.valid).toBe(false);
    fill(page, 'Matkhau@2026', 'Matkhau@2027');
    expect(page.passwordForm.get('newPassword')!.valid).toBe(true);
  });

  it('flags a confirmation that does not match the new password', () => {
    const { page } = build();
    fill(page, 'Matkhau@2026', 'Matkhau@2027', 'Matkhau@2028');
    page.passwordForm.get('confirmPassword')!.markAsTouched();
    expect(page.showMismatch).toBe(true);
    fill(page, 'Matkhau@2026', 'Matkhau@2027');
    expect(page.showMismatch).toBe(false);
  });

  it('shows a field error only after that field has been touched', () => {
    const { page } = build();
    expect(page.showError('currentPassword')).toBe(false);
    page.passwordForm.get('currentPassword')!.markAsTouched();
    expect(page.showError('currentPassword')).toBe(true);
  });

  it('does not call the API while the form is still invalid', async () => {
    const { page, calls } = build();
    fill(page, '', '123', '456');
    await page.onPasswordSubmit();
    expect(calls).toHaveLength(0);
    expect(page.submitted).toBe(true);
  });

  it('sends the current and the new password, then shows the success step', async () => {
    const { page, calls } = build();
    fill(page, 'Matkhau@2026', 'Matkhau@2027');
    await page.onPasswordSubmit();
    expect(calls).toEqual([['Matkhau@2026', 'Matkhau@2027']]);
    expect(page.step).toBe(3);
    // Xóa sạch ô nhập sau khi đổi xong để trình duyệt không giữ lại mật khẩu.
    expect(page.passwordForm.get('newPassword')!.value).toBeFalsy();
  });

  it('keeps the customer on the form and shows the server message when the current password is wrong', async () => {
    const { page } = build(async () => ({ success: false, message: 'Mật khẩu hiện tại không đúng' }));
    fill(page, 'Sairồi@2026', 'Matkhau@2027');
    await page.onPasswordSubmit();
    expect(page.step).not.toBe(3);
    expect(page.currentPasswordServerError).toBe('Mật khẩu hiện tại không đúng');
  });

  it('clears what was typed when the modal is closed', () => {
    const { page } = build();
    let closed = 0;
    page.close.subscribe(() => closed++);
    fill(page, 'Matkhau@2026', 'Matkhau@2027');
    page.requestClose();
    expect(page.passwordForm.get('currentPassword')!.value).toBeFalsy();
    expect(closed).toBe(1);
  });

  it('keeps only six digits of an OTP, typed or pasted', () => {
    const { page } = build();
    const input = document.createElement('input');
    input.value = '9a8b7c6d5e4f3g';
    page.onOtpInput({ target: input } as unknown as Event);
    expect(page.otpString).toBe('987654');
    page.onOtpPaste({
      preventDefault: () => {},
      clipboardData: { getData: () => '11 22-33 44' },
    } as unknown as ClipboardEvent);
    expect(page.otpString).toBe('112233');
  });
});
