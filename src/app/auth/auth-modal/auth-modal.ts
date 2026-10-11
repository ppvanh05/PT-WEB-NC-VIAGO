import { Component, EventEmitter, Output, ViewChildren, QueryList, ElementRef, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { getAuth, RecaptchaVerifier } from 'firebase/auth';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { DatePickerComponent } from '../../shared/components/date-picker/date-picker';
import { PasswordChecklist } from '../../shared/components/password-checklist/password-checklist';
import { NoAutofillDirective, PhoneInputDirective } from '../../shared/utils/input-guards';
import {
  birthDateValidator,
  emailDomainValidator,
  focusFirstInvalidField,
  matchPasswordValidator,
  personNameValidator,
  requiredTrimmedValidator,
  shouldShowMismatch,
  strongPasswordValidator,
  todayIso,
  vnPhoneValidator,
} from '../../shared/utils/form-validators';

type AuthStep = 'login' | 'forgot' | 'forgot-otp' | 'forgot-reset' | 'register-phone' | 'register-otp' | 'register-password' | 'register-profile' | 'success-status';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePickerComponent, PasswordChecklist, PhoneInputDirective, NoAutofillDirective],
  templateUrl: './auth-modal.html',
  styleUrl: './auth-modal.css'
})
export class AuthModal implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;

  private readonly host = inject(ElementRef<HTMLElement>);

  currentStep: AuthStep = 'login';
  successTitle = '';
  successSub = '';
  readonly today = todayIso();

  // Forms
  loginForm!: FormGroup;
  forgotForm!: FormGroup;
  resetForm!: FormGroup;
  registerPhoneForm!: FormGroup;
  registerPasswordForm!: FormGroup;
  profileForm!: FormGroup;

  // Firebase invisible recaptcha
  private recaptchaVerifier: RecaptchaVerifier | null = null;

  // Lỗi chung của form Đăng nhập (không chỉ rõ sai ô nào)
  loginErrorMessage = '';
  // Lỗi từ server gắn với một ô cụ thể (SĐT đã tồn tại, OTP sai...)
  phoneServerError = '';
  otpErrorMessage = '';
  avatarError = '';
  formErrorMessage = '';
  submitted = false;

  // OTP State
  otpString = '';
  generatedOtp = '';
  isOtpFocused = false;
  otpTimer = 180;
  otpIntervalId: any = null;
  resetPhoneNumber = '';

  // Registration State
  registerPhoneNumber = '';
  registerPassword = '';
  profileCompleteness = 0;
  avatarPreview: string | ArrayBuffer | null = null;
  selectedAvatarFile = '';

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initForms();
  }

  ngOnDestroy(): void {
    this.stopOtpTimer();
    this.destroyRecaptcha();
  }

  private initForms(): void {
    this.loginForm = this.fb.group({
      phoneNumber: ['', [Validators.required, vnPhoneValidator()]],
      password: ['', [Validators.required]]
    });

    this.forgotForm = this.fb.group({
      phoneNumber: ['', [Validators.required, vnPhoneValidator()]]
    });

    this.resetForm = this.fb.group({
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', [Validators.required, matchPasswordValidator('password')]]
    });

    this.registerPhoneForm = this.fb.group({
      phoneNumber: ['', [Validators.required, vnPhoneValidator()]]
    });

    this.registerPasswordForm = this.fb.group({
      password: ['', [Validators.required, strongPasswordValidator()]],
      confirmPassword: ['', [Validators.required, matchPasswordValidator('password')]]
    });

    this.profileForm = this.fb.group({
      name: ['', [requiredTrimmedValidator(), personNameValidator()]],
      email: ['', [emailDomainValidator()]],
      gender: [''],
      birthday: ['', [birthDateValidator()]],
      occupation: ['']
    });

    // Mật khẩu gốc đổi -> kiểm tra lại ô xác nhận
    [this.resetForm, this.registerPasswordForm].forEach(form => {
      form.get('password')?.valueChanges.subscribe(() => form.get('confirmPassword')?.updateValueAndValidity({ emitEvent: false }));
    });

    // Lỗi server gắn với ô SĐT biến mất ngay khi người dùng sửa lại
    this.registerPhoneForm.get('phoneNumber')?.valueChanges.subscribe(() => this.phoneServerError = '');
    this.forgotForm.get('phoneNumber')?.valueChanges.subscribe(() => this.phoneServerError = '');
    this.loginForm.valueChanges.subscribe(() => this.loginErrorMessage = '');

    this.profileForm.valueChanges.subscribe(() => this.calculateProfileCompleteness());
  }

  // --- HIỂN THỊ LỖI INLINE (luồng 4 bước) ---

  /** Bước 1: đang gõ lần đầu không báo lỗi; Bước 2-3: sau khi blur thì kiểm tra liên tục. */
  showError(form: FormGroup, field: string): boolean {
    const control = form.get(field);
    return !!control && control.invalid && control.touched;
  }

  hasError(form: FormGroup, field: string, error: string): boolean {
    return !!form.get(field)?.hasError(error);
  }

  showMismatch(form: FormGroup): boolean {
    return shouldShowMismatch(form.get('confirmPassword'), form.get('password')?.value);
  }

  /** Bước 4: submit -> hiện lỗi tất cả ô, focus + cuộn tới ô sai đầu tiên, chặn gửi request. */
  private validateBeforeSubmit(form: FormGroup): boolean {
    this.submitted = true;
    if (form.invalid) {
      form.markAllAsTouched();
      this.cdr.detectChanges();
      focusFirstInvalidField(this.host.nativeElement);
      return false;
    }
    return true;
  }

  // --- ACTIONS ---

  setStep(step: AuthStep): void {
    this.currentStep = step;
    this.loginErrorMessage = '';
    this.phoneServerError = '';
    this.otpErrorMessage = '';
    this.formErrorMessage = '';
    this.avatarError = '';
    this.submitted = false;

    if (step === 'login') {
      this.loginForm.reset();
    } else if (step === 'forgot') {
      this.forgotForm.reset();
    } else if (step === 'forgot-reset') {
      this.resetForm.reset();
    } else if (step === 'register-phone') {
      this.registerPhoneForm.reset();
    } else if (step === 'forgot-otp' || step === 'register-otp') {
      this.otpString = '';
      this.startOtpTimer();
      this.focusOtpInput(150);
    } else if (step === 'register-password') {
      this.registerPasswordForm.reset();
    } else if (step === 'register-profile') {
      this.profileForm.reset({ name: '', email: '', gender: '', birthday: '', occupation: '' });
      this.avatarPreview = null;
      this.selectedAvatarFile = '';
      this.profileCompleteness = 20;
    }

    this.cdr.detectChanges();
  }

  showSuccessStatus(title: string, sub: string, delayMs: number = 1800): void {
    this.successTitle = title;
    this.successSub = sub;
    this.currentStep = 'success-status';
    this.cdr.detectChanges();
    setTimeout(() => this.close.emit(), delayMs);
  }

  handleClose(): void {
    if (this.currentStep === 'success-status') return;
    if (this.currentStep === 'register-profile') {
      this.skipProfile();
    } else {
      this.close.emit();
    }
  }

  // Submit Login
  async onLoginSubmit(): Promise<void> {
    this.loginErrorMessage = '';
    if (!this.validateBeforeSubmit(this.loginForm)) return;

    const { phoneNumber, password } = this.loginForm.value;
    const result = await this.authService.login(phoneNumber, password);
    if (result.success) {
      this.close.emit();
    } else {
      this.loginErrorMessage = result.message;
      this.loginForm.get('password')?.reset('', { emitEvent: false });
      this.cdr.detectChanges();
    }
  }

  // --- REGISTRATION FLOW WIZARD ---

  // Step 1: Submit Phone Number for Registration
  async onRegisterPhoneSubmit(): Promise<void> {
    if (!this.validateBeforeSubmit(this.registerPhoneForm)) return;

    this.phoneServerError = '';
    const { phoneNumber } = this.registerPhoneForm.value;
    this.registerPhoneNumber = phoneNumber;

    if (this.authService.isFirebaseMode) {
      this.initRecaptcha();
    }

    const result = await this.authService.sendOTP(phoneNumber, this.recaptchaVerifier, 'register');
    if (result.success) {
      this.generatedOtp = result.otp || '';
      this.setStep('register-otp');
    } else {
      this.phoneServerError = result.message;
      this.cdr.detectChanges();
      focusFirstInvalidField(this.host.nativeElement);
      this.destroyRecaptcha();
    }
  }

  // Step 2: Verify Registration OTP
  async onRegisterOtpSubmit(): Promise<void> {
    if (!this.validateOtpLength()) return;

    const result = await this.authService.verifyOTP(this.registerPhoneNumber, this.otpString);
    if (result.success) {
      this.stopOtpTimer();
      this.setStep('register-password');
    } else {
      this.otpErrorMessage = result.message;
      this.cdr.detectChanges();
      this.focusOtpInput(0);
    }
  }

  // Step 3: Setup Password
  async onRegisterPasswordSubmit(): Promise<void> {
    if (!this.validateBeforeSubmit(this.registerPasswordForm)) return;

    this.formErrorMessage = '';
    const { password } = this.registerPasswordForm.value;

    if (this.authService.isFirebaseMode) {
      const linkResult = await this.authService.linkEmailAndPassword(this.registerPhoneNumber, password);
      if (!linkResult.success) {
        this.formErrorMessage = linkResult.message;
        this.cdr.detectChanges();
        return;
      }
    }

    this.registerPassword = await this.authService.hashPassword(password);
    this.setStep('register-profile');
  }

  // Step 4: Profile Image Selection
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.avatarError = '';
    if (!file) return;

    if (!/^image\/(jpeg|png|jpg)$/.test(file.type)) {
      this.avatarError = 'Chỉ hỗ trợ ảnh định dạng .JPG, .PNG.';
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.avatarError = 'Kích thước ảnh tối đa là 5MB.';
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = reader.result;
      this.selectedAvatarFile = file.name;
      this.calculateProfileCompleteness();
    };
    reader.readAsDataURL(file);
  }

  // Step 4: Calculate completeness of user profile
  private calculateProfileCompleteness(): void {
    let score = 20; // SĐT luôn có sẵn (20%)
    const { name, email, gender, birthday, occupation } = this.profileForm.value;

    if (name && String(name).trim() !== '') score += 20;
    if (email && String(email).trim() !== '' && this.profileForm.get('email')?.valid) score += 15;
    if (this.avatarPreview) score += 10;
    if (gender) score += 10;
    if (birthday && this.profileForm.get('birthday')?.valid) score += 15;
    if (occupation) score += 10;

    this.profileCompleteness = score;
    this.cdr.detectChanges();
  }

  // Step 4: Submit Profile Setup
  async onProfileSubmit(): Promise<void> {
    if (!this.validateBeforeSubmit(this.profileForm)) return;

    this.formErrorMessage = '';
    const { name, email, gender, birthday, occupation } = this.profileForm.value;

    const result = await this.authService.registerProfile(String(name).trim(), this.registerPhoneNumber, this.registerPassword, {
      email: String(email || '').trim(),
      gender,
      birthday,
      occupation,
      avatar: (this.avatarPreview as string) || '/assets/customer/user.png'
    });

    if (result.success) {
      this.toastService.showSuccess('Cập nhật hồ sơ thành công!');
      this.close.emit();
      this.router.navigate(['/customer']);
    } else {
      this.formErrorMessage = result.message;
      this.cdr.detectChanges();
    }
  }

  // Step 4: Skip Profile Setup (ĐỂ SAU)
  async skipProfile(): Promise<void> {
    this.formErrorMessage = '';
    const result = await this.authService.registerProfile('', this.registerPhoneNumber, this.registerPassword, {});

    if (result.success) {
      this.showSuccessStatus('Đăng ký tài khoản thành công', 'Đang tự động đăng nhập...');
    } else {
      this.formErrorMessage = result.message;
      this.cdr.detectChanges();
    }
  }

  // --- PASSWORD RECOVERY FLOW (FORGOT PASSWORD) ---

  async onForgotSubmit(): Promise<void> {
    if (!this.validateBeforeSubmit(this.forgotForm)) return;

    this.phoneServerError = '';
    const { phoneNumber } = this.forgotForm.value;
    this.resetPhoneNumber = phoneNumber;

    if (this.authService.isFirebaseMode) {
      this.initRecaptcha();
    }

    const result = await this.authService.sendOTP(phoneNumber, this.recaptchaVerifier, 'forgot');
    if (result.success) {
      this.generatedOtp = result.otp || '';
      this.setStep('forgot-otp');
    } else {
      this.phoneServerError = result.message;
      this.cdr.detectChanges();
      focusFirstInvalidField(this.host.nativeElement);
      this.destroyRecaptcha();
    }
  }

  async onForgotOtpSubmit(): Promise<void> {
    if (!this.validateOtpLength()) return;

    const result = await this.authService.verifyOTP(this.resetPhoneNumber, this.otpString);
    if (result.success) {
      this.stopOtpTimer();
      this.setStep('forgot-reset');
    } else {
      this.otpErrorMessage = result.message;
      this.cdr.detectChanges();
      this.focusOtpInput(0);
    }
  }

  async resendForgotOtp(): Promise<void> {
    await this.resendOtp(this.resetPhoneNumber, 'forgot');
  }

  async resendRegisterOtp(): Promise<void> {
    await this.resendOtp(this.registerPhoneNumber, 'register');
  }

  private async resendOtp(phoneNumber: string, type: 'register' | 'forgot'): Promise<void> {
    this.otpErrorMessage = '';

    if (this.authService.isFirebaseMode) {
      this.initRecaptcha();
    }

    const result = await this.authService.sendOTP(phoneNumber, this.recaptchaVerifier, type);
    if (result.success) {
      this.generatedOtp = result.otp || '';
      this.otpString = '';
      this.startOtpTimer();
      this.focusOtpInput(50);
      this.toastService.showSuccess('Mã xác thực mới đã được gửi.');
    } else {
      this.otpErrorMessage = result.message;
      this.cdr.detectChanges();
    }
  }

  // Submit Password Reset (With AUTO LOGIN)
  async onResetSubmit(): Promise<void> {
    if (!this.validateBeforeSubmit(this.resetForm)) return;

    this.formErrorMessage = '';
    const { password } = this.resetForm.value;

    const result = await this.authService.resetPassword(this.resetPhoneNumber, password);

    if (result.success) {
      this.showSuccessStatus('Đặt lại mật khẩu thành công', 'Đang tự động đăng nhập...');
      this.destroyRecaptcha();
      // Đồng bộ phiên đăng nhập ngay sau khi khôi phục mật khẩu
      setTimeout(async () => {
        await this.authService.login(this.resetPhoneNumber, password);
      }, 500);
    } else {
      this.formErrorMessage = result.message;
      this.cdr.detectChanges();
    }
  }

  // --- RECAPTCHA UTILITIES ---

  private initRecaptcha(): void {
    if (typeof window === 'undefined') return;
    if (this.recaptchaVerifier) return;

    try {
      const auth = getAuth();
      this.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
    } catch (e) {
      console.error('[VIAGO AUTH] Lỗi tạo RecaptchaVerifier:', e);
    }
  }

  private destroyRecaptcha(): void {
    if (this.recaptchaVerifier) {
      try {
        this.recaptchaVerifier.clear();
      } catch (e) {}
      this.recaptchaVerifier = null;
    }
  }

  // --- OTP INTERACTION ---

  private validateOtpLength(): boolean {
    this.otpErrorMessage = '';
    if (this.otpString.length < 6) {
      this.otpErrorMessage = 'Vui lòng nhập đầy đủ 6 chữ số mã xác thực.';
      this.focusOtpInput(0);
      return false;
    }
    return true;
  }

  private focusOtpInput(delay: number): void {
    setTimeout(() => {
      const inputEl = this.otpInputs?.first?.nativeElement as HTMLInputElement | undefined;
      if (inputEl) {
        inputEl.value = this.otpString;
        inputEl.focus();
      }
    }, delay);
  }

  onOtpInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = target.value.replace(/[^0-9]/g, '').substring(0, 6);
    this.otpString = val;
    target.value = val;
    if (this.otpErrorMessage && val.length > 0) {
      this.otpErrorMessage = '';
    }
    this.cdr.detectChanges();
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text');
    if (!pastedData) return;

    const digits = pastedData.replace(/[^0-9]/g, '').substring(0, 6);
    this.otpString = digits;
    const inputEl = this.otpInputs?.first?.nativeElement as HTMLInputElement | undefined;
    if (inputEl) inputEl.value = digits;
    this.cdr.detectChanges();
  }

  // --- TIMER UTILITIES ---

  private startOtpTimer(): void {
    this.stopOtpTimer();
    this.otpTimer = 180;
    this.otpIntervalId = setInterval(() => {
      if (this.otpTimer > 0) {
        this.otpTimer--;
      } else {
        this.stopOtpTimer();
        this.otpErrorMessage = 'Mã OTP đã hết hạn. Vui lòng nhấn Gửi lại mã.';
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
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

export { AuthModal as AuthModalComponent };
