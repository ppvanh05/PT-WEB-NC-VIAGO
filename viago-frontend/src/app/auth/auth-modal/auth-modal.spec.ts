import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthModal } from './auth-modal';

function build() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [AuthModal],
    providers: [
      {
        provide: AuthService,
        useValue: {
          login: async () => ({ ok: false, message: '' }),
          requestOtp: async () => ({ ok: true }),
          verifyOtp: async () => ({ ok: true }),
          resetPassword: async () => ({ ok: true }),
          registerProfile: async () => ({ ok: true }),
          isLoggedIn: () => false,
        },
      },
      { provide: ToastService, useValue: { showError: () => {}, showSuccess: () => {} } },
      { provide: AuthModalService, useValue: { close: () => {}, open: () => {}, mode: () => 'login' } },
      { provide: Router, useValue: { navigate: () => Promise.resolve(true), navigateByUrl: () => Promise.resolve(true) } },
    ],
  });
  const fixture = TestBed.createComponent(AuthModal);
  fixture.detectChanges();
  return fixture.componentInstance;
}

describe('Customer authentication modal', () => {
  it('accepts a Vietnamese mobile number and rejects anything else', () => {
    const page = build();
    const phone = page.loginForm.get('phoneNumber')!;
    for (const good of ['0912345678', '0387654321']) {
      phone.setValue(good);
      expect(phone.valid, good).toBe(true);
    }
    for (const bad of ['', '123', '1912345678', '09123456789', 'không phải số']) {
      phone.setValue(bad);
      expect(phone.valid, bad).toBe(false);
    }
  });

  it('asks the same phone rules on the forgot-password and registration steps', () => {
    const page = build();
    for (const form of [page.forgotForm, page.registerPhoneForm]) {
      form.get('phoneNumber')!.setValue('0912345678');
      expect(form.valid).toBe(true);
      form.get('phoneNumber')!.setValue('12345');
      expect(form.valid).toBe(false);
    }
  });

  it('refuses a weak new password when resetting or registering', () => {
    const page = build();
    for (const form of [page.resetForm, page.registerPasswordForm]) {
      const password = form.get('password')!;
      password.setValue('123456');
      expect(password.valid).toBe(false);
      password.setValue('Matkhau@2026');
      expect(password.valid).toBe(true);
    }
  });

  it('flags a confirmation that does not match the new password', () => {
    const page = build();
    page.resetForm.get('password')!.setValue('Matkhau@2026');
    page.resetForm.get('confirmPassword')!.setValue('Matkhau@2025');
    page.resetForm.get('confirmPassword')!.markAsTouched();
    expect(page.resetForm.valid).toBe(false);
    expect(page.showMismatch(page.resetForm)).toBe(true);
    page.resetForm.get('confirmPassword')!.setValue('Matkhau@2026');
    expect(page.showMismatch(page.resetForm)).toBe(false);
  });

  it('shows a field error only after the customer has touched that field', () => {
    const page = build();
    const phone = page.loginForm.get('phoneNumber')!;
    phone.setValue('');
    expect(page.showError(page.loginForm, 'phoneNumber')).toBe(false);
    phone.markAsTouched();
    expect(page.showError(page.loginForm, 'phoneNumber')).toBe(true);
  });

  it('clears the previous error and empties the form when moving to another step', () => {
    const page = build();
    page.loginForm.get('phoneNumber')!.setValue('0912345678');
    page.loginErrorMessage = 'Sai mật khẩu';
    page.setStep('login');
    expect(page.loginErrorMessage).toBe('');
    expect(page.loginForm.get('phoneNumber')!.value).toBeFalsy();
    page.otpErrorMessage = 'Mã sai';
    page.setStep('forgot');
    expect(page.currentStep).toBe('forgot');
    expect(page.otpErrorMessage).toBe('');
  });

  it('keeps only the first six digits typed into the OTP box', () => {
    const page = build();
    const input = document.createElement('input');
    input.value = 'a1b2c3d4e5f6g7';
    page.onOtpInput({ target: input } as unknown as Event);
    expect(page.otpString).toBe('123456');
    expect(input.value).toBe('123456');
  });

  it('cleans a pasted OTP of spaces and dashes', () => {
    const page = build();
    page.onOtpPaste({
      preventDefault: () => {},
      clipboardData: { getData: () => ' 12-34 56 78' },
    } as unknown as ClipboardEvent);
    expect(page.otpString).toBe('123456');
  });

  it('counts the OTP validity down in minutes and seconds', () => {
    const page = build();
    page.otpTimer = 180;
    expect(page.getFormattedTime()).toBe('03:00');
    page.otpTimer = 65;
    expect(page.getFormattedTime()).toBe('01:05');
    page.otpTimer = 0;
    expect(page.getFormattedTime()).toBe('00:00');
  });

  it('refuses to close while the success screen is still showing', () => {
    const page = build();
    let closed = 0;
    page.close.subscribe(() => closed++);
    page.currentStep = 'success-status';
    page.handleClose();
    expect(closed).toBe(0);
    page.currentStep = 'login';
    page.handleClose();
    expect(closed).toBe(1);
  });
});
