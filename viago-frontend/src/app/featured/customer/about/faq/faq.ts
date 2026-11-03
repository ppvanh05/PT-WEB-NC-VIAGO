import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface FaqItem {
  id: number;
  categoryId: string;
  question: string;
  answer: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './faq.html',
  styleUrls: ['../../customer-pages.css', './faq.css', '../../customer-page-theme.css']
})
export class Faq {
  searchQuery: string = '';
  selectedSearchCategory: string | null = null;
  activeSection: string = 'booking';
  openIndex: number | null = null;

  categories: Category[] = [
    { id: 'booking', name: 'Đặt vé', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg>' },
    { id: 'payment', name: 'Thanh toán', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>' },
    { id: 'refund', name: 'Hủy vé & Hoàn tiền', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>' },
    { id: 'info', name: 'Thông tin chuyến đi', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' },
    { id: 'member', name: 'Tài khoản thành viên', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
    { id: 'support', name: 'Hỗ trợ khách hàng', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' }
  ];

  faqs: FaqItem[] = [
    {
      id: 1,
      categoryId: 'booking',
      question: 'Làm thế nào để đặt vé trực tuyến?',
      answer: 'Khách hàng có thể tìm kiếm chuyến xe, lựa chọn ghế ngồi, nhập thông tin hành khách và thanh toán trực tiếp trên website hoặc ứng dụng của nhà xe. Quy trình đơn giản chỉ mất khoảng 3 phút với giao diện thân thiện và minh bạch giá cả.'
    },
    {
      id: 2,
      categoryId: 'payment',
      question: 'Tôi có thể thanh toán bằng những phương thức nào?',
      answer: 'Hệ thống hỗ trợ thanh toán qua mã QR, thẻ ATM nội địa NAPAS, ví điện tử (Momo, ZaloPay, ShopeePay) và các phương thức thanh toán trực tuyến được tích hợp qua cổng Payoo hoặc VNPay.'
    },
    {
      id: 3,
      categoryId: 'refund',
      question: 'Tôi có thể hủy vé sau khi thanh toán không?',
      answer: 'Có. Khách hàng được phép hủy vé nếu đáp ứng các điều kiện về thời gian hủy theo quy định của từng tuyến xe. Thông thường, việc hủy vé phải được thực hiện ít nhất 24 giờ trước giờ khởi hành để được nhận hoàn tiền tối đa.'
    },
    {
      id: 4,
      categoryId: 'refund',
      question: 'Tiền hoàn vé sẽ được nhận trong bao lâu?',
      answer: 'Khoản hoàn tiền sẽ được chuyển về đúng tài khoản thanh toán ban đầu. Thời gian xử lý tùy thuộc vào ngân hàng hoặc đơn vị thanh toán (thường là từ 3-7 ngày làm việc đối với thẻ nội địa và tối đa 30 ngày với thẻ quốc tế).'
    },
    {
      id: 5,
      categoryId: 'info',
      question: 'Tôi có thể thay đổi điểm đón hoặc điểm trả không?',
      answer: 'Có. Khách hàng có thể chỉnh sửa điểm đón và điểm trả trong thời gian cho phép trước giờ khởi hành (thường là trước 4 tiếng). Vui lòng vào mục "Quản lý vé" hoặc liên hệ tổng đài để nhân viên hỗ trợ cập nhật lộ trình mới.'
    },
    {
      id: 6,
      categoryId: 'member',
      question: 'Nếu tôi quên mật khẩu thì phải làm sao?',
      answer: 'Sử dụng chức năng "Quên mật khẩu" trên màn hình đăng nhập để nhận mã xác thực (OTP) qua Số điện thoại hoặc Email đã đăng ký để tạo mật khẩu mới. Đảm bảo bạn có quyền truy cập vào thiết bị nhận mã OTP.'
    },
    {
      id: 7,
      categoryId: 'support',
      question: 'Làm thế nào để liên hệ hỗ trợ?',
      answer: 'Khách hàng có thể liên hệ qua hotline 1900 1234, email support@viago.vn hoặc gửi yêu cầu trực tiếp thông qua mục Hỗ trợ khách hàng trên website. Chúng tôi cam kết phản hồi các yêu cầu khẩn cấp trong vòng 15 phút.'
    }
  ];

  filteredFaqs: FaqItem[] = [];

  constructor() {
    this.updateFilteredFaqs();
  }

  scrollToSection(sectionId: string) {
    this.activeSection = sectionId;
    this.searchQuery = '';
    this.selectedSearchCategory = null;
    this.updateFilteredFaqs();
    
    // Use setTimeout to ensure the DOM is updated if filtering changed
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  }

  getFaqsByCategory(categoryId: string): FaqItem[] {
    if (this.selectedSearchCategory && this.selectedSearchCategory !== categoryId) {
      return [];
    }
    if (this.searchQuery && !this.selectedSearchCategory) {
      return this.faqs.filter(f => 
        f.categoryId === categoryId && 
        (f.question.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
         f.answer.toLowerCase().includes(this.searchQuery.toLowerCase()))
      );
    }
    return this.faqs.filter(f => f.categoryId === categoryId);
  }

  toggleAccordion(index: number, categoryId: string) {
    const globalIndex = this.getGlobalIndex(index, categoryId);
    this.openIndex = this.openIndex === globalIndex ? null : globalIndex;
  }

  getGlobalIndex(index: number, categoryId: string): number {
    // This is a simple way to create a unique ID for accordion state
    let count = 0;
    for (const cat of this.categories) {
      if (cat.id === categoryId) break;
      count += this.getFaqsByCategory(cat.id).length;
    }
    return count + index;
  }

  isAccordionOpen(index: number, categoryId: string): boolean {
    return this.openIndex === this.getGlobalIndex(index, categoryId);
  }

  onSearch() {
    this.selectedSearchCategory = null;
    this.updateFilteredFaqs();
  }

  updateFilteredFaqs() {
    if (this.selectedSearchCategory) {
      this.filteredFaqs = this.faqs.filter(item => item.categoryId === this.selectedSearchCategory);
      return;
    }
    if (!this.searchQuery) {
      this.filteredFaqs = [...this.faqs];
      return;
    }
    const query = this.searchQuery.toLowerCase();
    this.filteredFaqs = this.faqs.filter(item =>
      item.question.toLowerCase().includes(query) ||
      item.answer.toLowerCase().includes(query)
    );
  }

  setSearch(text: string, categoryId: string) {
    this.searchQuery = text;
    this.selectedSearchCategory = categoryId;
    this.updateFilteredFaqs();
  }
}
