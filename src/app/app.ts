import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { Card } from './shared/components/card/card';
import { Badge } from './shared/components/badge/badge';
import { CustomerNavbar } from './core/layout/customer-navbar/customer-navbar';

@Component({
  imports: [CustomerLayout],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('viago-frontend');
  title = signal('VIAGO');
  readonly router = inject(Router);

  onAuthModalOpen() {
    alert('Kích hoạt Modal Đăng nhập / Đăng ký!');
  }

  onSecurityModalOpen() {
    alert('Kích hoạt Modal Bảo mật tài khoản!');
  }
}
