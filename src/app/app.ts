import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { CustomerNavbar } from './core/layout/customer-navbar/customer-navbar';
import { SearchableDropdownComponent } from './shared/components/searchable-dropdown/searchable-dropdown';
import { VoucherCardComponent, VoucherItem } from './shared/components/voucher-card/voucher-card';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterOutlet,
    CustomerNavbar,
    SearchableDropdownComponent,
    VoucherCardComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  title = signal('VIAGO Frontend Demo Showcase');

  // Cities list for Searchable Dropdown demo
  cities: string[] = [
    'TP.HCM',
    'Hà Nội',
    'Đà Nẵng',
    'Cần Thơ',
    'Đà Lạt',
    'Nha Trang',
    'Buôn Ma Thuột',
    'Phan Thiết',
    'Vũng Tàu',
    'Quy Nhơn'
  ];

  selectedCity1 = 'TP.HCM';
  selectedCity2 = '';
  disabledCity = 'Đà Nẵng';

  // Selected voucher code tracker
  selectedVoucherCode = 'SUMMER10';

  // Sample vouchers for Voucher Card demo
  demoVouchers: VoucherItem[] = [
    {
      id: 'v1',
      code: 'WELCOME50',
      title: 'GIẢM 50K',
      description: 'Giảm ngay 50.000đ cho hành trình đầu tiên',
      value: 50000,
      type: 'fixed',
      expiryDate: '31/12/2026',
      count: 1,
      isClaimed: false
    },
    {
      id: 'v2',
      code: 'SUMMER10',
      title: 'GIẢM 10%',
      description: 'Giảm 10% tối đa 30.000đ cho chuyến đi mùa hè',
      value: 10,
      type: 'percentage',
      expiryDate: '31/08/2026',
      count: 2,
      isClaimed: true
    },
    {
      id: 'v3',
      code: 'EXPIRED20',
      title: 'MÃ HẾT HẠN',
      description: 'Ưu đãi mừng sinh nhật đã hết thời hạn sử dụng',
      value: 20000,
      type: 'fixed',
      expiryDate: '01/01/2025',
      isExpired: true
    }
  ];

  onVoucherSelect(voucher: VoucherItem) {
    if (voucher.isExpired || voucher.isDisabled) return;
    this.selectedVoucherCode = voucher.code;
  }

  onVoucherAction(voucher: VoucherItem) {
    alert(`Bạn đã bấm nút Action cho voucher: ${voucher.code}`);
  }

  onAuthModalOpen() {
    alert('Kích hoạt Modal Đăng nhập / Đăng ký!');
  }

  onSecurityModalOpen() {
    alert('Kích hoạt Modal Bảo mật tài khoản!');
  }
}
