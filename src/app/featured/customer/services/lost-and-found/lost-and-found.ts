import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pagination } from '../../../../shared/components/pagination/pagination';

export interface LostItem {
  id: string;
  name: string;
  image: string;
  foundDate: string;
  route: string;
  storage: string;
  status: 'stored' | 'processing' | 'returned';
}

@Component({
  selector: 'app-lost-and-found',
  standalone: true,
  imports: [CommonModule, FormsModule, Pagination],
  templateUrl: './lost-and-found.html',
  styleUrl: './lost-and-found.css',
})
export class LostAndFound implements OnInit {
  // Items logic
  allItems: LostItem[] = [
    { id: '1', name: 'Điện thoại iPhone', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=80', foundDate: '21/10/2026', route: 'Đà Lạt - TP.HCM', storage: 'VP Đà Nẵng', status: 'stored' },
    { id: '2', name: 'Balo xám', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&auto=format&fit=crop&q=80', foundDate: '22/10/2026', route: 'TP.HCM - Nha Trang', storage: 'VP Mỹ Đình', status: 'stored' },
    { id: '3', name: 'Đồng hồ thông minh', image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=300&auto=format&fit=crop&q=80', foundDate: '23/10/2026', route: 'Nha Trang - TP.HCM', storage: 'VP Quảng Ngãi', status: 'stored' },
    { id: '4', name: 'Túi xách da nữ', image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=300&auto=format&fit=crop&q=80', foundDate: '25/10/2026', route: 'Cần Thơ - TP.HCM', storage: 'VP Gia Lâm', status: 'stored' },
    { id: '5', name: 'Kính mắt thời trang', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300&auto=format&fit=crop&q=80', foundDate: '26/10/2026', route: 'TP.HCM - Vũng Tàu', storage: 'VP Lê Hồng Phong', status: 'stored' },
    { id: '6', name: 'Laptop Dell', image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=300&auto=format&fit=crop&q=80', foundDate: '27/10/2026', route: 'Vũng Tàu - TP.HCM', storage: 'VP Huế', status: 'stored' },
    { id: '7', name: 'Ví da nam', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=300&auto=format&fit=crop&q=80', foundDate: '28/10/2026', route: 'TP.HCM - Đà Lạt', storage: 'VP Bến Xe Miền Đông', status: 'processing' },
    { id: '8', name: 'Tai nghe Bluetooth', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80', foundDate: '29/10/2026', route: 'TP.HCM - Cần Thơ', storage: 'VP Bến Xe Miền Tây', status: 'stored' }
  ];

  filteredItems: LostItem[] = [];
  paginatedItems: LostItem[] = [];
  
  searchQuery = '';
  selectedRoute = 'Tất cả các tuyến';
  selectedStatus = 'Tất cả trạng thái';
  searchTicketCode = '';

  routes = ['Tất cả các tuyến', 'TP.HCM - Đà Lạt', 'Đà Lạt - TP.HCM', 'TP.HCM - Nha Trang', 'Nha Trang - TP.HCM', 'Cần Thơ - TP.HCM', 'TP.HCM - Cần Thơ', 'TP.HCM - Vũng Tàu', 'Vũng Tàu - TP.HCM'];
  statuses = [
    { value: 'Tất cả trạng thái', label: 'Tất cả trạng thái' },
    { value: 'stored', label: 'Đang lưu trữ' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'returned', label: 'Đã trao trả' }
  ];

  currentPage = 1;
  pageSize = 6;
  totalPages = 1;

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // Report Form Logic
  reportForm = {
    ticketCode: '',
    description: '',
    route: '',
    date: '',
    seat: '',
    fullName: '',
    phone: '',
    email: '',
    image: null as File | null
  };

  // Mock data for ticket auto-fill
  mockTickets: { [key: string]: { route: string, date: string, seat: string, fullName: string, phone: string, email: string } } = {
    'VG123456': { route: 'TP.HCM - Đà Lạt', date: '2026-10-25', seat: 'A01', fullName: 'Nguyễn Văn A', phone: '0987654321', email: 'nguyenvana@gmail.com' },
    'VG654321': { route: 'Nha Trang - TP.HCM', date: '2026-10-28', seat: 'B05', fullName: 'Trần Thị B', phone: '0912345678', email: 'tranthib@gmail.com' },
  };

  showToast = false;
  toastMessage = '';
  isClaimModalOpen = false;
  selectedClaimItem: LostItem | null = null;

  ngOnInit() {
    this.filterItems();
  }

  filterItems() {
    this.filteredItems = this.allItems.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchRoute = this.selectedRoute === 'Tất cả các tuyến' || item.route === this.selectedRoute;
      const matchStatus = this.selectedStatus === 'Tất cả trạng thái' || item.status === this.selectedStatus;
      // If a ticket code is entered, simulate filtering by checking if the ticket exists
      // and if the item's route matches the ticket's route.
      let matchTicket = true;
      if (this.searchTicketCode.trim()) {
        const ticket = this.mockTickets[this.searchTicketCode.trim().toUpperCase()];
        if (ticket) {
          matchTicket = item.route === ticket.route;
        } else {
          matchTicket = false; // Invalid ticket code shows no items
        }
      }
      
      return matchSearch && matchRoute && matchStatus && matchTicket;
    });

    this.totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.pageSize));
    this.setPage(1);
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedRoute = 'Tất cả các tuyến';
    this.selectedStatus = 'Tất cả trạng thái';
    this.searchTicketCode = '';
    this.filterItems();
  }

  setPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedItems = this.filteredItems.slice(start, start + this.pageSize);
    
    // Requirement: Scroll to top of list when changing page
    const listElement = document.getElementById('items-list-top');
    if (listElement) {
      listElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onTicketCodeChange() {
    const code = this.reportForm.ticketCode.trim().toUpperCase();
    if (this.mockTickets[code]) {
      const ticket = this.mockTickets[code];
      this.reportForm.route = ticket.route;
      this.reportForm.date = ticket.date;
      this.reportForm.seat = ticket.seat;
      this.reportForm.fullName = ticket.fullName;
      this.reportForm.phone = ticket.phone;
      this.reportForm.email = ticket.email;
      this.triggerToast('Đã tự động điền thông tin từ mã vé!');
    }
  }

  submitReport() {
    if (!this.reportForm.description || !this.reportForm.route || !this.reportForm.date || !this.reportForm.fullName || !this.reportForm.phone) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    // Phone validation
    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
    if (!phoneRegex.test(this.reportForm.phone)) {
      alert('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (ví dụ: 0987654321).');
      return;
    }

    // Email validation (if provided)
    if (this.reportForm.email) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(this.reportForm.email)) {
        alert('Địa chỉ email không hợp lệ!');
        return;
      }
    }

    this.triggerToast('Gửi yêu cầu khai báo thành công! Chúng tôi sẽ liên hệ sớm nhất.');
    // Reset form
    this.reportForm = {
      ticketCode: '',
      description: '',
      route: '',
      date: '',
      seat: '',
      fullName: '',
      phone: '',
      email: '',
      image: null
    };
  }

  openClaimModal(item: LostItem) {
    this.selectedClaimItem = item;
    this.isClaimModalOpen = true;
  }

  closeClaimModal() {
    this.isClaimModalOpen = false;
    this.selectedClaimItem = null;
    this.claimForm = {
      ticketCode: '',
      description: ''
    };
  }

  claimForm = {
    ticketCode: '',
    description: ''
  };

  submitClaim() {
    if (!this.claimForm.ticketCode || !this.claimForm.description) {
      alert('Vui lòng điền mã vé và đặc điểm nhận dạng!');
      return;
    }
    this.triggerToast('Yêu cầu nhận lại tài sản đã được gửi. Bộ phận CSKH sẽ xác minh và liên hệ.');
    this.closeClaimModal();
  }

  triggerToast(msg: string) {
    this.toastMessage = msg;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  getStatusLabel(status: string): string {
    const s = this.statuses.find(x => x.value === status);
    return s ? s.label : status;
  }
}
