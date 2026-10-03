import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { CustomerNavbar } from './core/layout/customer-navbar/customer-navbar';
import { CustomerFooter } from './core/layout/customer-footer/customer-footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    CustomerNavbar,
    CustomerFooter
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
