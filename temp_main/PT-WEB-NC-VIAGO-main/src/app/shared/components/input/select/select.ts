import { Component, input, output } from '@angular/core';

export interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-select',
  imports: [],
  templateUrl: './select.html',
  styleUrl: './select.css',
})
export class Select {
  label = input('');
  placeholder = input('Chọn một tùy chọn');

  options = input<SelectOption[]>([]);
  value = input('');

  error = input('');
  helperText = input('');

  disabled = input(false);
  required = input(false);

  id = input('');
  name = input('');

  valueChange = output<string>();

  onChange(event: Event): void {
    const element = event.target as HTMLSelectElement;
    this.valueChange.emit(element.value);
  }
}