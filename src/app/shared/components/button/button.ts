import { Component, input, output } from '@angular/core';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.css',
  host: { '[class.viago-button-host--full-width]': 'fullWidth()' },
})
export class Button {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');

  type = input<'button' | 'submit' | 'reset'>('button');

  disabled = input(false);
  loading = input(false);
  iconOnly = input(false);
  fullWidth = input(false);

  ariaLabel = input<string | undefined>(undefined);

  clicked = output<MouseEvent>();

  onClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) {
      return;
    }

    this.clicked.emit(event);
  }
}
