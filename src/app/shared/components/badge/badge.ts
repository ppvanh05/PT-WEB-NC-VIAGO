import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Định nghĩa tất cả các loại giao diện (variant) mà Badge hỗ trợ.
 * - Các màu cơ bản: success, warning, danger, info, neutral
 * - Trạng thái đơn hàng: reviewed, canceled, completed, pending
 * - Trạng thái hoạt động: upcoming, paused, expired, running
 * - Phân loại tin bài: event, recruitment, guide, promotion, news
 */
export type BadgeVariant = 
  | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'
  | 'event' | 'recruitment'
  | 'reviewed' | 'canceled' | 'completed' | 'pending'
  | 'upcoming' | 'paused' | 'expired' | 'running'
  | 'guide' | 'promotion' | 'news';

export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeAppearance = 'soft' | 'solid' | 'outline' | 'dashed';
export type BadgeRounded = 'full' | 'md' | 'sm' | 'none';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badge.html',
  styleUrl: './badge.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Badge {
  /** Semantic variant: success, warning, danger, info, neutral */
  @Input() variant: BadgeVariant = 'neutral';

  /** Size: sm, md, lg */
  @Input() size: BadgeSize = 'md';

  /** Visual appearance style: soft, solid, outline */
  @Input() appearance: BadgeAppearance = 'soft';

  /** Border radius shape: full, md, sm, none */
  @Input() rounded: BadgeRounded = 'full';

  /** Show indicator dot on the left */
  @Input() dot: boolean = false;

  /** Label text for quick inline usage */
  @Input() label?: string;

  /** Icon class name (e.g. 'bi bi-check') */
  @Input() icon?: string;

  /** Show remove (X) button */
  @Input() removable: boolean = false;

  /** Additional custom CSS class */
  @Input() customClass: string = '';

  /** Emitted when remove button is clicked */
  @Output() remove = new EventEmitter<MouseEvent>();

  get badgeClasses(): { [key: string]: boolean } {
    const classes: { [key: string]: boolean } = {
      'viago-badge': true,
      [`viago-badge--${this.variant}`]: !!this.variant,
      [`viago-badge--${this.size}`]: !!this.size,
      [`viago-badge--${this.appearance}`]: !!this.appearance,
      [`viago-badge--rounded-${this.rounded}`]: !!this.rounded,
      'viago-badge--has-dot': this.dot,
      'viago-badge--removable': this.removable,
    };

    if (this.customClass) {
      this.customClass.split(' ').forEach((c) => {
        const trimmed = c.trim();
        if (trimmed) classes[trimmed] = true;
      });
    }

    return classes;
  }

  onRemoveClick(event: MouseEvent): void {
    event.stopPropagation();
    this.remove.emit(event);
  }
}
