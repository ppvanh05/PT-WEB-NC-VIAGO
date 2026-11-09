import { Component, Input } from '@angular/core';
import { PASSWORD_RULES } from '../../utils/form-validators';

/**
 * Checklist điều kiện mật khẩu hiển thị ngay dưới ô nhập.
 * Dòng chưa đạt màu xám (○), đạt điều kiện chuyển xanh (✓) theo thời gian thực.
 */
@Component({
  selector: 'app-password-checklist',
  standalone: true,
  imports: [],
  templateUrl: './password-checklist.html',
  styleUrl: './password-checklist.css',
})
export class PasswordChecklist {
  @Input() value: string | null = '';
  /** Đánh dấu các dòng chưa đạt màu đỏ (sau khi người dùng bấm Lưu/Submit). */
  @Input() highlightFailed = false;

  protected readonly rules = PASSWORD_RULES;

  protected passed(index: number): boolean {
    return this.rules[index].test(this.value ?? '');
  }
}
