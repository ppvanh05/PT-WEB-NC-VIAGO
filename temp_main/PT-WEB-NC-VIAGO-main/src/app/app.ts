import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { Card } from './shared/components/card/card';
import { Badge } from './shared/components/badge/badge';

@Component({
  imports: [Card, Badge],
import { CustomerNavbar } from './core/layout/customer-navbar/customer-navbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    CustomerNavbar
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  title = signal('VIAGO');

  onAuthModalOpen() {
    alert('Kích hoạt Modal Đăng nhập / Đăng ký!');
  }

  onSecurityModalOpen() {
    alert('Kích hoạt Modal Bảo mật tài khoản!');
  }
}
