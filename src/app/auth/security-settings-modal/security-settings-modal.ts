import { ChangeDetectorRef, Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal';
import { PasswordChecklist } from '../../shared/components/password-checklist/password-checklist';
import { NoAutofillDirective } from '../../shared/utils/input-guards';
import {
  focusFirstInvalidField,
  matchPasswordValidator,
  shouldShowMismatch,
  strongPasswordValidator,
} from '../../shared/utils/form-validators';

/** Mật khẩu mới không được trùng mật khẩu hiện tại. */
function notSameAsValidator(otherField: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '');
    const other = String(control.parent?.get(otherField)?.value ?? '');
    return value && other && value === other ? { samePassword: true } : null;
  };
}

/**
 * Bảo mật tài khoản - Đổi mật khẩu (3 bước: Nhập mật khẩu -> Xác thực OTP -> Thành công).
 * - Không autofill / không gợi ý / không hiển thị mật khẩu cũ dạng plain-text.
 * - Checklist mật khẩu mới + so khớp xác nhận khi blur hoặc đủ độ dài.
 */
@Component({
  selector: 'app-security-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ModalComponent, PasswordChecklist, NoAutofillDirective],
  templateUrl: './security-settings-modal.html',
  styleUrl: './security-settings-modal.css',
})
export class SecuritySettingsModal implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  @ViewChild('otpInput') otpInput?: ElementRef<HTMLInputElement>;

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly host = inject(ElementRef<HTMLElement>);

  step: 1 | 2 | 3 = 1;
  passwordForm!: FormGroup;
  submitted = false;
  loading = false;

  // Lỗi từ server gắn với ô "Mật khẩu hiện tại"
  currentPasswordServerError = '';

  // OTP
  otpString = '';
  otpTimer = 150;
  otpIntervalId: ReturnType<typeof setInterval> | null = null;
  otpErrorMessage = '';
  isOtpFocused = false;
  generatedOtp = '';

  get phoneNumber(): string {
    return this.authService.currentUser()?.phoneNumber || '';
  }

  get modalTitle(): string {
    if (this.step === 1) return 'Đổi mật khẩu';
    if (this.step === 2) return 'Nhập mã xác thực';
    return '';
  }

  ngOnInit(): void {
    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, strongPasswordValidator(), notSameAsValidator('currentPassword')]],
      confirmPassword: ['', [Validators.required, matchPasswordValidator('newPassword')]],
    });

    this.passwordForm.get('currentPassword')?.valueChanges.subscribe(() => {
      this.currentPasswordServerError = '';
      this.passwordForm.get('newPassword')?.updateValueAndValidity({ emitEvent: false });
    });
    this.passwordForm.get('newPassword')?.valueChanges.subscribe(() => {
      this.passwordForm.get('confirmPassword')?.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnDestroy(): void {
    this.stopOtpTimer();
    this.passwordForm?.reset();
  }

  showError(field: string): boolean {
    const control = this.passwordForm.get(field);
    return !!control && control.invalid && control.touched;
  }

  hasError(field: string, error: string): boolean {
    return !!this.passwordForm.get(field)?.hasError(error);
  }

  get showMismatch(): boolean {
    return shouldShowMismatch(this.passwordForm.get('confirmPassword'), this.passwordForm.get('newPassword')?.value);
  }

  requestClose(): void {
    // Xóa giá trị trước khi đóng để trình duyệt không đề nghị lưu mật khẩu
    this.passwordForm.reset();
    this.stopOtpTimer();
    this.close.emit();
  }

  async onPasswordSubmit(): Promise<void> {
    this.submitted = true;
    this.currentPasswordServerError = '';

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.cdr.detectChanges();
      focusFirstInvalidField(this.host.nativeElement);
      return;
    }

    const user = this.authService.currentUser();
    if (!user) return;

    const { currentPassword } = this.passwordForm.value;
    this.loading = true;
    const hashedCurrent = await this.authService.hashPassword(currentPassword);
    if (user.passwordHash !== hashedCurrent && user.password !== currentPassword) {
      this.loading = false;
      this.currentPasswordServerError = 'Mật khẩu hiện tại không chính xác.';
      this.passwordForm.get('currentPassword')?.reset('', { emitEvent: false });
      this.cdr.detectChanges();
      focusFirstInvalidField(this.host.nativeElement);
      return;
    }

    const result = await this.authService.sendOTP(user.phoneNumber, null, 'forgot');
    this.loading = false;
    if (result.success) {
      this.generatedOtp = result.otp || '';
      this.otpString = '';
      this.otpErrorMessage = '';
      this.step = 2;
      this.startOtpTimer();
      this.focusOtp();
    } else {
      this.currentPasswordServerError = result.message;
    }
    this.cdr.detectChanges();
  }

  async resendOtp(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    this.otpErrorMessage = '';
    const result = await this.authService.sendOTP(user.phoneNumber, null, 'forgot');
    if (result.success) {
      this.otpString = '';
      this.generatedOtp = result.otp || '';
      this.startOtpTimer();
      this.focusOtp();
      this.toastService.showSuccess('Mã xác thực mới đã được gửi.');
    } else {
      this.otpErrorMessage = result.message;
    }
  }

  onOtpInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = target.value.replace(/\D/g, '').slice(0, 6);
    target.value = val;
    this.otpString = val;
    if (val) this.otpErrorMessage = '';
    if (val.length === 6) this.verifyOtp();
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const digits = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    this.otpString = digits;
    if (this.otpInput) this.otpInput.nativeElement.value = digits;
    this.cdr.detectChanges();
    if (digits.length === 6) this.verifyOtp();
  }

  async verifyOtp(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    this.otpErrorMessage = '';
    if (this.otpString.length < 6) {
      this.otpErrorMessage = 'Vui lòng nhập đầy đủ 6 chữ số mã xác thực.';
      this.focusOtp();
      return;
    }

    const verifyResult = await this.authService.verifyOTP(user.phoneNumber, this.otpString);
    if (!verifyResult.success) {
      this.otpErrorMessage = verifyResult.message;
      this.cdr.detectChanges();
      return;
    }

    const resetResult = await this.authService.resetPassword(user.phoneNumber, this.passwordForm.value.newPassword);
    if (resetResult.success) {
      this.step = 3;
      this.stopOtpTimer();
      this.passwordForm.reset();
      this.cdr.detectChanges();
      setTimeout(() => this.close.emit(), 2000);
    } else {
      this.otpErrorMessage = resetResult.message;
    }
  }

  backToPasswordForm(): void {
    this.step = 1;
    this.stopOtpTimer();
    this.otpString = '';
    this.otpErrorMessage = '';
  }

  private focusOtp(): void {
    setTimeout(() => {
      if (this.otpInput) {
        this.otpInput.nativeElement.value = this.otpString;
        this.otpInput.nativeElement.focus();
      }
    }, 50);
  }

  private startOtpTimer(): void {
    this.stopOtpTimer();
    this.otpTimer = 150;
    this.otpIntervalId = setInterval(() => {
      if (this.otpTimer > 0) {
        this.otpTimer--;
      } else {
        this.stopOtpTimer();
        this.otpErrorMessage = 'Mã xác thực đã hết hạn. Vui lòng yêu cầu gửi lại mã.';
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  private stopOtpTimer(): void {
    if (this.otpIntervalId) {
      clearInterval(this.otpIntervalId);
      this.otpIntervalId = null;
    }
  }

  getFormattedTime(): string {
    const minutes = Math.floor(this.otpTimer / 60);
    const seconds = this.otpTimer % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}

export { SecuritySettingsModal as SecuritySettingsModalComponent };
