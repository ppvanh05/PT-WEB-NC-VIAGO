import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-customer-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customer-navbar.html',
  styleUrl: './customer-navbar.css',
})
export class CustomerNavbar {
  activeTab: string = 'TRANG CHỦ';

  navItems = [
    { label: 'TRANG CHỦ', hasDropdown: false },
    { label: 'LỊCH TRÌNH', hasDropdown: false },
    { label: 'TRA CỨU VÉ', hasDropdown: false },
    { label: 'TIN TỨC', hasDropdown: false },
    { label: 'HÓA ĐƠN', hasDropdown: false },
    { label: 'ĐÁNH GIÁ', hasDropdown: false },
    { 
      label: 'DỊCH VỤ', 
      hasDropdown: true,
      dropdownItems: [
        'Thuê xe hợp đồng',
        'Tìm đồ thất lạc'
      ]
    },
    { 
      label: 'GIỚI THIỆU', 
      hasDropdown: true,
      dropdownItems: [
        'Về chúng tôi',
        'Chính sách nhà xe',
        'Hướng dẫn mua vé',
        'Câu hỏi thường gặp',
        'Điều khoản sử dụng',
        'Tuyển dụng',
        'Liên hệ'
      ]
    }
  ];

  setActiveTab(tabName: string, event: Event): void {
    event.preventDefault();
    this.activeTab = tabName;
  }
}
