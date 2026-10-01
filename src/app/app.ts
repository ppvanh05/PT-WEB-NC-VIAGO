import { Component, signal } from '@angular/core';
import { CustomerLayout } from './core/layout/customer-layout/customer-layout';

@Component({
  imports: [CustomerLayout],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('viago-frontend');
}
