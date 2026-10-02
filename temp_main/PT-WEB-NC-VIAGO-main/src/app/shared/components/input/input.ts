import { Component, input, output } from '@angular/core';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel';

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

  valueChange = output<string>();

  onInput(event: Event): void {
    const element = event.target as HTMLInputElement;
    this.valueChange.emit(element.value);
  }
}