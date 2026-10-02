import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Badge } from '../badge/badge';

export type CardType = 'default' | 'info' | 'booking' | 'stat';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type CardRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl';
export type CardShadow = 'none' | 'sm' | 'md' | 'lg';
export type StatTrendDirection = 'up' | 'down' | 'neutral';
export type StatIconVariant = 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, Badge],
  templateUrl: './card.html',
  styleUrl: './card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {
  /** Type of the card layout */
  @Input() type: CardType = 'default';

  /** Internal padding size (16px to 40px) */
  @Input() padding: CardPadding = 'md';

  /** Border radius size (8px to 24px) */
  @Input() radius: CardRadius = 'lg';

  /** Box shadow size */
  @Input() shadow: CardShadow = 'md';

  /** Show border or not */
  @Input() bordered: boolean = false;

  /** Height 100% flag */
  @Input() fullHeight: boolean = false;

  /** Disabled state */
  @Input() disabled: boolean = false;

  /** Additional custom CSS class */
  @Input() customClass: string = '';

  // --- Common Inputs ---
  @Input() title?: string;
  @Input() description?: string;
  @Input() image?: string;
  @Input() icon?: string;

  // --- Info Type Inputs ---
  @Input() infoDetail?: string;
  @Input() infoSubDetail?: string;
  @Input() infoAlign: 'left' | 'center' = 'left';

  // --- Booking Type Inputs ---
  @Input() bookingOverlay: boolean = false;
  @Input() bookingBadge?: string;
  @Input() bookingDistance?: string;
  @Input() bookingDuration?: string;
  @Input() bookingPriceLabel?: string;
  @Input() bookingPrice?: string;
  @Input() bookingButtonText: string = 'Đặt vé ngay';
  @Input() bookingTags: string[] = [];

  // --- Stat Type Inputs (Backward Compatibility) ---
  @Input() value?: string | number;
  @Input() trend?: string | number;
  @Input() trendDirection?: StatTrendDirection;
  @Input() trendLabel?: string;
  @Input() iconVariant: StatIconVariant = 'primary';

  @Output() cardClick = new EventEmitter<MouseEvent>();
  @Output() actionClick = new EventEmitter<MouseEvent>();

  get isInteractive(): boolean {
    return !!this.cardClick.observers.length;
  }

  get computedTrendDirection(): StatTrendDirection {
    if (this.trendDirection) return this.trendDirection;
    if (this.trend !== undefined && this.trend !== null) {
      const str = String(this.trend).trim();
      if (str.startsWith('+')) return 'up';
      if (str.startsWith('-')) return 'down';
    }
    return 'neutral';
  }

  get cardClasses(): { [key: string]: boolean } {
    const classes: { [key: string]: boolean } = {
      'viago-card': true,
      [`viago-card--type-${this.type}`]: !!this.type,
      [`viago-card--padding-${this.padding}`]: !!this.padding,
      [`viago-card--radius-${this.radius}`]: !!this.radius,
      [`viago-card--shadow-${this.shadow}`]: !!this.shadow,
      'viago-card--bordered': this.bordered,
      'viago-card--full-height': this.fullHeight,
      'viago-card--disabled': this.disabled,
      'viago-card--clickable': this.isInteractive && !this.disabled,
      'viago-card--overlay': this.type === 'booking' && this.bookingOverlay,
    };

    if (this.customClass) {
      this.customClass.split(' ').forEach((c) => {
        const trimmed = c.trim();
        if (trimmed) classes[trimmed] = true;
      });
    }

    return classes;
  }

  onCardClick(event: MouseEvent): void {
    if (this.disabled) return;
    if (this.isInteractive) {
      this.cardClick.emit(event);
    }
  }

  onActionClick(event: MouseEvent): void {
    event.stopPropagation();
    this.actionClick.emit(event);
  }
}
