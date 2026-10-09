import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Bộ validator dùng chung cho toàn hệ thống (viết một lần, dùng lại nhiều trang).
 * Quy tắc theo tong_hop_loi_review.md - mục "QUY TẮC DÙNG CHUNG".
 */

// =========================================================================
// SỐ ĐIỆN THOẠI VIỆT NAM: bắt đầu bằng 0, đúng 10 chữ số (không dùng +84)
// =========================================================================
export const VN_PHONE_LENGTH = 10;
export const VN_PHONE_REGEX = /^0(3|5|7|8|9)\d{8}$/;

export function vnPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    return VN_PHONE_REGEX.test(value) ? null : { vnPhone: true };
  };
}

// =========================================================================
// CĂN CƯỚC CÔNG DÂN: đúng 12 chữ số
// =========================================================================
export const CCCD_REGEX = /^\d{12}$/;

export function cccdValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    return CCCD_REGEX.test(value) ? null : { cccd: true };
  };
}

// =========================================================================
// EMAIL: đúng định dạng + tên miền hợp lệ (chặn abc@gmaill.com)
// =========================================================================
const EMAIL_FORMAT_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

const POPULAR_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'yahoo.com.vn', 'outlook.com', 'hotmail.com',
  'icloud.com', 'live.com', 'msn.com', 'proton.me', 'protonmail.com',
  'zoho.com', 'aol.com', 'mail.com', 'gmx.com', 'yandex.com',
];

const VALID_TLDS = [
  'com', 'net', 'org', 'edu', 'gov', 'info', 'biz', 'io', 'co', 'me', 'app', 'dev',
  'vn', 'us', 'uk', 'jp', 'kr', 'cn', 'sg', 'au', 'de', 'fr', 'ca', 'in', 'tech', 'ai',
];

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

/** Trả về tên miền gợi ý nếu người dùng gõ nhầm (vd: gmaill.com -> gmail.com). */
export function suggestEmailDomain(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain || POPULAR_EMAIL_DOMAINS.includes(domain)) return null;
  const match = POPULAR_EMAIL_DOMAINS.find(d => levenshtein(domain, d) <= 2);
  return match || null;
}

export function isValidEmail(email: string): boolean {
  const value = email.trim();
  if (!EMAIL_FORMAT_REGEX.test(value)) return false;
  const domain = value.split('@')[1].toLowerCase();
  const tld = domain.split('.').pop() || '';
  if (!VALID_TLDS.includes(tld)) return false;
  return !suggestEmailDomain(value);
}

export function emailDomainValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    if (!EMAIL_FORMAT_REGEX.test(value)) return { emailFormat: true };
    const suggestion = suggestEmailDomain(value);
    if (suggestion) return { emailDomain: { suggestion } };
    const tld = value.split('@')[1].toLowerCase().split('.').pop() || '';
    if (!VALID_TLDS.includes(tld)) return { emailDomain: { suggestion: null } };
    return null;
  };
}

// =========================================================================
// MẬT KHẨU: >= 8 ký tự, >= 1 chữ in hoa, >= 1 ký tự đặc biệt, không khoảng trắng
// =========================================================================
export interface PasswordRule {
  key: 'minLength' | 'uppercase' | 'special' | 'noSpace';
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'minLength', label: 'Tối thiểu 8 ký tự', test: v => v.length >= 8 },
  { key: 'uppercase', label: 'Có ít nhất 1 chữ in hoa', test: v => /\p{Lu}/u.test(v) },
  { key: 'special', label: 'Có ít nhất 1 ký tự đặc biệt', test: v => /[^\p{L}\p{N}\s]/u.test(v) },
  { key: 'noSpace', label: 'Không chứa khoảng trắng', test: v => v.length > 0 && !/\s/.test(v) },
];

export function isStrongPassword(value: string): boolean {
  return PASSWORD_RULES.every(rule => rule.test(value));
}

export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '');
    if (!value) return null;
    const failed = PASSWORD_RULES.filter(rule => !rule.test(value)).map(rule => rule.key);
    return failed.length ? { weakPassword: failed } : null;
  };
}

/** Xác nhận mật khẩu: so khớp với control anh em `passwordField` trong cùng FormGroup. */
export function matchPasswordValidator(passwordField = 'password'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const confirm = String(control.value ?? '');
    const password = String(control.parent?.get(passwordField)?.value ?? '');
    if (!confirm) return null;
    return confirm === password ? null : { passwordMismatch: true };
  };
}

/**
 * Lỗi "không khớp" chỉ hiển thị khi người dùng đã rời ô (blur)
 * hoặc đã gõ đủ độ dài bằng ô Mật khẩu gốc.
 */
export function shouldShowMismatch(confirmControl: AbstractControl | null, passwordValue: string): boolean {
  if (!confirmControl || !confirmControl.hasError('passwordMismatch')) return false;
  const value = String(confirmControl.value ?? '');
  return confirmControl.touched || value.length >= (passwordValue || '').length;
}

// =========================================================================
// HỌ TÊN / BẮT BUỘC: chặn chuỗi toàn khoảng trắng
// =========================================================================
export function requiredTrimmedValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined) return { required: true };
    return String(value).trim().length === 0 ? { required: true } : null;
  };
}

/** Họ tên: chỉ gồm chữ cái (có dấu tiếng Việt) và khoảng trắng, 2 - 50 ký tự. */
export const PERSON_NAME_MAX_LENGTH = 50;

export function personNameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    if (!/^[\p{L}\s]+$/u.test(value)) return { personName: true };
    if (value.length < 2) return { minlength: true };
    if (value.length > PERSON_NAME_MAX_LENGTH) return { maxlength: true };
    return null;
  };
}

// =========================================================================
// NGÀY THÁNG: định dạng dd/mm/yyyy, chặn ngày không tồn tại & ngày tương lai
// =========================================================================
/** Nhận 'yyyy-mm-dd' hoặc 'dd/mm/yyyy'. Trả về null nếu ngày không tồn tại (vd 31/02). */
export function parseDateValue(value: string | null | undefined): Date | null {
  if (!value) return null;
  const text = String(value).trim();
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  const vn = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (iso) {
    [y, m, d] = [+iso[1], +iso[2], +iso[3]];
  } else if (vn) {
    [d, m, y] = [+vn[1], +vn[2], +vn[3]];
  } else {
    return null;
  }
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Hiển thị đồng bộ dd/mm/yyyy cho mọi giá trị ngày. */
export function formatDateVN(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : parseDateValue(value);
  if (!date || isNaN(date.getTime())) return String(value);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function birthDateValidator(minYear = 1900): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    const date = parseDateValue(value);
    if (!date) return { invalidDate: true };
    if (date.getFullYear() < minYear) return { invalidDate: true };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date.getTime() > today.getTime()) return { futureDate: true };
    return null;
  };
}

// =========================================================================
// UX HỖ TRỢ: Focus + cuộn tới ô lỗi đầu tiên, cuộn về đầu trang/danh sách
// =========================================================================
/** Bước 4 của luồng validation: focus và cuộn tới ô sai đầu tiên trong form. */
export function focusFirstInvalidField(root: HTMLElement | null | undefined): void {
  if (!root || typeof window === 'undefined') return;
  setTimeout(() => {
    const invalid = root.querySelector<HTMLElement>(
      'input.ng-invalid, select.ng-invalid, textarea.ng-invalid, app-date-picker.ng-invalid, [data-invalid="true"]'
    );
    if (!invalid) return;
    const focusTarget = invalid.matches('input, select, textarea, button')
      ? invalid
      : invalid.querySelector<HTMLElement>('input, select, textarea, button') || invalid;
    invalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    focusTarget.focus({ preventScroll: true });
  });
}

/** Cuộn về đầu trang hoặc đầu một khối danh sách (khi chuyển trang / chuyển tab / phân trang). */
export function scrollToTop(target?: HTMLElement | null, offset = 120): void {
  if (typeof window === 'undefined') return;
  if (target) {
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/** Chuẩn hóa chuỗi để tìm kiếm gần đúng: bỏ dấu tiếng Việt, viết thường, gộp khoảng trắng. */
export function normalizeSearchText(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tìm kiếm theo một phần từ khóa (substring) trên nhiều trường, không phân biệt dấu/hoa thường. */
export function matchesKeyword(keyword: string, ...fields: (string | null | undefined)[]): boolean {
  const query = normalizeSearchText(keyword);
  if (!query) return true;
  const haystack = normalizeSearchText(fields.filter(Boolean).join(' '));
  if (haystack.includes(query)) return true;
  // Gần đúng: mọi từ trong từ khóa đều xuất hiện (không cần đúng thứ tự)
  return query.split(' ').every(word => haystack.includes(word));
}
