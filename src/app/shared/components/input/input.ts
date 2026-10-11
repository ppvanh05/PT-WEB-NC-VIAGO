import { Component, input, output } from '@angular/core';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'date';

@Component({
  selector: 'app-input',
  imports: [],
  templateUrl: './input.html',
  styleUrl: './input.css',
})
export class Input {
  label = input('');
  placeholder = input('');
  type = input<InputType>('text');

  value = input('');
  error = input('');
  helperText = input('');

  disabled = input(false);
  readonly = input(false);
  required = input(false);

  name = input('');
  id = input('');
  maxlength = input<number | null>(null);
  min = input<string | null>(null);
  max = input<string | null>(null);
  autocomplete = input<string | null>(null);
  inputmode = input<string | null>(null);
  blurred = output<void>();

  valueChange = output<string>();

  onInput(event: Event): void {
    const element = event.target as HTMLInputElement;
    if (this.type() === 'tel' && this.inputmode() === 'numeric') element.value = element.value.replace(/^\+84/, '0').replace(/\D/g, '').slice(0, 10);
    this.valueChange.emit(element.value);
  }
}
