import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Card } from './shared/components/card/card';
import { Badge } from './shared/components/badge/badge';

@Component({
  imports: [Card, Badge],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('viago-frontend');
}
