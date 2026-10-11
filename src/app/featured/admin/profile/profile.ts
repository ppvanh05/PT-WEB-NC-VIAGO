import { Button } from '../../../shared/components/button/button';
import { Input } from '../../../shared/components/input/input';
import { Select } from '../../../shared/components/input/select/select';
import { Textarea } from '../../../shared/components/input/textarea/textarea';
import { Badge } from '../../../shared/components/badge/badge';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker';
import { Component, ChangeDetectorRef, inject, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface AdminProfileData {
  familyName: string;
  givenName: string;
  displayName: string;
  phone: string;
  email: string;
  gender: string;
  birthday: string;
  address: string;
  notes: string;
  avatarUrl: string;
}

@Component({
  selector: 'app-admin-profile',
  imports: [FormsModule, Button, Input, Select, Textarea, Badge, ModalComponent, DatePickerComponent],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class AdminProfile {
  private readonly changeDetector = inject(ChangeDetectorRef);
  profileOpen = false;
  passwordOpen = false;
  profileTouched: Partial<Record<keyof AdminProfileData, boolean>> = {};
  readonly genderOptions = ['Nam', 'N\u1eef', 'Kh\u00e1c'].map(value => ({label: value, value}));
  updateProfileField(field: keyof AdminProfileData, value: string): void {
    this.draft[field] = value; this.profileTouched[field] = true; this.fieldErrors = this.validateProfile();
    if (field === 'displayName') this.displayNameChanged.emit(this.fieldErrors.displayName ? '' : value.trim());
  }
  profileFieldError(field: keyof AdminProfileData): string { return this.profileTouched[field] ? this.fieldErrors[field] || '' : ''; }
  @Output() readonly saved = new EventEmitter<AdminProfileData>();
  @Output() readonly passwordChanged = new EventEmitter<void>();
  @Output() readonly displayNameChanged = new EventEmitter<string>();
  @Output() readonly dismissed = new EventEmitter<void>();
  draft: AdminProfileData = {
    familyName: '', givenName: '', displayName: '', phone: '', email: '',
    gender: '', birthday: '', address: '', notes: '', avatarUrl: '',
  };
  avatarError = '';
  readingAvatar = false;
  fieldErrors: Partial<Record<keyof AdminProfileData, string>> = {};
  passwordDraft = { current: '', next: '', confirm: '' };
  passwordVisible = { current: false, next: false, confirm: false };
  passwordErrors: Partial<Record<'current' | 'next' | 'confirm', string>> = {};
  passwordTouched = { current: false, next: false, confirm: false };
  passwordNotice = '';
  passwordSucceeded = false;
  readonly passwordFields = [
    { key: 'current' as const, label: 'Mật khẩu hiện tại', autocomplete: 'current-password' },
    { key: 'next' as const, label: 'Mật khẩu mới', autocomplete: 'new-password' },
    { key: 'confirm' as const, label: 'Xác nhận mật khẩu mới', autocomplete: 'new-password' },
  ];
  private selectionVersion = 0;
  readonly today = new Date().toLocaleDateString('sv-SE');
  get profileErrors() {
    const labels: Record<string, string> = { familyName: 'Họ và tên đệm', givenName: 'Tên', displayName: 'Tên hiển thị', phone: 'Số điện thoại', email: 'Email', birthday: 'Ngày sinh', gender: 'Giới tính', address: 'Địa chỉ', notes: 'Ghi chú' };
    return Object.entries(this.fieldErrors).map(([field, message]) => ({ field, label: labels[field], message }));
  }

  open(profile: AdminProfileData): void {
    this.selectionVersion++;
    this.draft = { ...profile };
    this.avatarError = '';
    this.fieldErrors = {};
    this.readingAvatar = false;
    this.profileTouched = {};
    this.profileOpen = true; this.changeDetector.markForCheck();
  }

  close(): void {
    this.selectionVersion++;
    this.profileOpen = false; this.closePassword(); this.changeDetector.markForCheck();
    this.dismissed.emit();
  }

  save(): void {
    for (const key of ['familyName', 'givenName', 'displayName', 'phone', 'email', 'address', 'notes'] as const) {
      this.draft[key] = this.draft[key].trim();
    }
    this.draft.phone = this.draft.phone.replace(/[\s.-]/g, '').replace(/^\+84/, '0');
    this.fieldErrors = this.validateProfile();
    if (Object.keys(this.fieldErrors).length || this.readingAvatar) {
      for (const key of Object.keys(this.draft) as (keyof AdminProfileData)[]) this.profileTouched[key] = true;
      return;
    }
    this.close();
    this.saved.emit({ ...this.draft });
  }

  validateProfile(): Partial<Record<keyof AdminProfileData, string>> {
    const errors: Partial<Record<keyof AdminProfileData, string>> = {};
    for (const key of ['familyName', 'givenName'] as const) {
      if (!/^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u.test(this.draft[key].trim()) || this.draft[key].length > (key === 'givenName' ? 50 : 100)) {
        errors[key] = 'Nhập tên hợp lệ, gồm chữ, khoảng trắng, dấu nối hoặc dấu nháy.';
      }
    }
    if (!this.draft.displayName.trim() || this.draft.displayName.length > 100 || /[\p{Cc}<>]/u.test(this.draft.displayName)) errors.displayName = 'Tên hiển thị cần 1–100 ký tự, không chứa ký tự điều khiển hoặc < >.';
    if (!/^0[35789]\d{8}$/.test(this.draft.phone.replace(/[\s.-]/g, '').replace(/^\+84/, '0'))) errors.phone = 'Nhập số di động Việt Nam hợp lệ (10 số hoặc +84).';
    if (!/^[^\s@]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/.test(this.draft.email) || this.draft.email.length > 254) errors.email = 'Nhập email hợp lệ, ví dụ admin@viago.vn.';
    const local = this.draft.email.split('@')[0];
    if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || this.draft.email.includes('..') || /[^a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]/.test(local)) errors.email = 'Email kh\u00f4ng h\u1ee3p l\u1ec7.';
    if (!['', 'Nam', 'Nữ', 'Khác'].includes(this.draft.gender)) errors.gender = 'Vui lòng chọn giới tính trong danh sách.';
    if (this.draft.birthday) {
      const date = new Date(this.draft.birthday + 'T00:00:00Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(this.draft.birthday) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== this.draft.birthday || this.draft.birthday > this.today || this.draft.birthday < '1900-01-01') errors.birthday = 'Ngày sinh phải hợp lệ, từ năm 1900 và không ở tương lai.';
    }
    if (this.draft.address.length > 300) errors.address = 'Địa chỉ tối đa 300 ký tự.';
    if (this.draft.notes.length > 1000) errors.notes = 'Ghi chú tối đa 1.000 ký tự.';
    return errors;
  }

  openPassword(): void {
    this.passwordSucceeded = false;
    this.passwordDraft = { current: '', next: '', confirm: '' };
    this.passwordVisible = { current: false, next: false, confirm: false };
    this.passwordErrors = {};
    this.passwordTouched = { current: false, next: false, confirm: false };
    this.passwordNotice = '';
    this.passwordOpen = true; this.changeDetector.markForCheck();
  }

  closePassword(): void {
    const succeeded = this.passwordSucceeded;
    this.passwordSucceeded = false;
    this.passwordOpen = false; this.changeDetector.markForCheck();
    this.passwordDraft = { current: '', next: '', confirm: '' };
    this.passwordVisible = { current: false, next: false, confirm: false };
    this.passwordTouched = { current: false, next: false, confirm: false };
    this.passwordErrors = {};
    this.passwordNotice = '';
    if (succeeded) this.passwordChanged.emit();
  }

  onPasswordInput(field: 'current' | 'next' | 'confirm', value: string): void {
    if (this.passwordSucceeded) return;
    this.passwordDraft[field] = value;
    this.passwordTouched[field] = true;
    this.passwordNotice = '';
    this.validatePasswords();
  }

  onPasswordBlur(field: 'current' | 'next' | 'confirm'): void {
    if (this.passwordSucceeded) return;
    this.passwordTouched[field] = true;
    this.validatePasswords();
  }

  validatePasswords(): void {
    const { current, next, confirm } = this.passwordDraft;
    this.passwordErrors = {};
    if (this.passwordTouched.current && (!current || current.length > 128)) this.passwordErrors.current = 'Nhập mật khẩu hiện tại.';
    if (this.passwordTouched.next) {
      if (!next) this.passwordErrors.next = 'Nhập mật khẩu mới.';
      else if (next.length < 8) this.passwordErrors.next = 'Cần ít nhất 8 ký tự.';
      else if (next.length > 128) this.passwordErrors.next = 'Mật khẩu quá dài.';
      else if (/\s/u.test(next)) this.passwordErrors.next = 'Không dùng khoảng trắng.';
      else if (!/[A-Z]/.test(next) || !/[a-z]/.test(next)) this.passwordErrors.next = 'Cần chữ hoa và chữ thường.';
      else if (!/\d/.test(next)) this.passwordErrors.next = 'Cần ít nhất 1 chữ số.';
      else if (!/[^\p{L}\p{N}\s]/u.test(next)) this.passwordErrors.next = 'Cần ít nhất 1 ký tự đặc biệt.';
      else if (next === current) this.passwordErrors.next = 'Phải khác mật khẩu hiện tại.';
    }
    if (this.passwordTouched.confirm) {
      if (!confirm) this.passwordErrors.confirm = 'Nhập lại mật khẩu mới.';
      else if (confirm !== next) this.passwordErrors.confirm = 'Mật khẩu chưa khớp.';
    }
  }

  changePassword(): void {
    if (this.passwordSucceeded) return;
    this.passwordNotice = '';
    this.passwordTouched = { current: true, next: true, confirm: true };
    this.validatePasswords();
    if (Object.keys(this.passwordErrors).length) return;
    this.passwordSucceeded = true;
    this.passwordDraft = { current: '', next: '', confirm: '' };
    this.passwordVisible = { current: false, next: false, confirm: false };
    this.passwordTouched = { current: false, next: false, confirm: false };
    this.passwordNotice = 'Đổi mật khẩu thành công!';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const version = ++this.selectionVersion;
    this.avatarError = '';
    this.readingAvatar = false;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.avatarError = 'Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.';
      return;
    }
    this.readingAvatar = true;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (version !== this.selectionVersion) return;
        this.draft.avatarUrl = reader.result as string;
        this.readingAvatar = false; this.changeDetector.markForCheck();
      };
      img.onerror = () => this.failAvatar(version);
      img.src = reader.result as string;
    };
    reader.onerror = () => this.failAvatar(version);
    reader.readAsDataURL(file);
  }

  private failAvatar(version: number): void {
    if (version !== this.selectionVersion) return;
    this.readingAvatar = false;
    this.avatarError = 'Không đọc được ảnh. Vui lòng chọn ảnh khác.';
    this.changeDetector.markForCheck();
  }
}
