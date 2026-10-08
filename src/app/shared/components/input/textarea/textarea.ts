import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-textarea',
  imports: [],
  templateUrl: './textarea.html',
  styleUrl: './textarea.css',
})
export class Textarea {
  label = input('');
  placeholder = input('');

  value = input('');
  rows = input(4);

  error = input('');
  helperText = input('');

  disabled = input(false);
  readonly = input(false);
  required = input(false);

  id = input('');
  name = input('');
  maxlength = input<number | null>(null);

  valueChange = output<string>();

  onInput(event: Event): void {
    const element = event.target as HTMLTextAreaElement;
    this.valueChange.emit(element.value);
  }
}
