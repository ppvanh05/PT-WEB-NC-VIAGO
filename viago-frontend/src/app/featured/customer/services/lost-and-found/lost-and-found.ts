import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { AuthService } from '../../../../core/services/auth.service';
import { BookingService } from '../../home/booking.service';
import { vietnamDate } from '../../home/booking.models';
import { PhoneInputDirective } from '../../../../shared/utils/input-guards';
import { VN_PHONE_REGEX } from '../../../../shared/utils/form-validators';

type ClaimField = 'bookingCode' | 'phone' | 'description';

interface MockOrderTicket {
  id: string;   // Mã vé
  seat: string;
  route?: string; // Đơn khứ hồi: mỗi chiều có tuyến/ngày riêng
  date?: string;
}

interface MockOrder {
  route: string;
  date: string; // yyyy-mm-dd
  fullName: string;
  phone: string; // SĐT người đặt
  email: string;
  tickets: MockOrderTicket[];
  owner?: string;
}

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
  imports: [CommonModule, FormsModule, Pagination, PhoneInputDirective],
  templateUrl: './lost-and-found.html',
  styleUrl: './lost-and-found.css',
})
export class LostAndFound implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly bookingService = inject(BookingService);

  // Items logic
  allItems: LostItem[] = [
    { id: '1', name: 'Điện thoại iPhone 14 Pro Max 256GB', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=80', foundDate: '21/10/2026', route: 'Đà Lạt - TP.HCM', storage: 'VP Đà Nẵng', status: 'stored' },
    { id: '2', name: 'Balo The North Face Surge', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&auto=format&fit=crop&q=80', foundDate: '22/10/2026', route: 'TP.HCM - Nha Trang', storage: 'VP Mỹ Đình', status: 'stored' },
    { id: '3', name: 'Apple Watch Series 8', image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=300&auto=format&fit=crop&q=80', foundDate: '23/10/2026', route: 'Nha Trang - TP.HCM', storage: 'VP Quảng Ngãi', status: 'processing' },
    { id: '4', name: 'Túi xách tay nữ Charles & Keith', image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=300&auto=format&fit=crop&q=80', foundDate: '20/10/2026', route: 'Cần Thơ - TP.HCM', storage: 'VP Gia Lâm', status: 'stored' },
    { id: '5', name: 'Kính râm Ray-Ban Aviator', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300&auto=format&fit=crop&q=80', foundDate: '26/10/2026', route: 'TP.HCM - Vũng Tàu', storage: 'VP Lê Hồng Phong', status: 'stored' },
    { id: '6', name: 'Laptop Dell XPS 13 (2022)', image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=300&auto=format&fit=crop&q=80', foundDate: '19/10/2026', route: 'Vũng Tàu - TP.HCM', storage: 'VP Huế', status: 'stored' },
    { id: '7', name: 'Ví da thật Pedro màu nâu', image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=300&auto=format&fit=crop&q=80', foundDate: '28/10/2026', route: 'TP.HCM - Đà Lạt', storage: 'VP Bến Xe Miền Đông', status: 'stored' },
    { id: '8', name: 'Tai nghe AirPods Pro 2', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format&fit=crop&q=80', foundDate: '29/10/2026', route: 'TP.HCM - Cần Thơ', storage: 'VP Bến Xe Miền Tây', status: 'returned' },
    { id: '9', name: 'Vali kéo nhựa size 20 màu bạc', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&auto=format&fit=crop&q=80', foundDate: '15/10/2026', route: 'Đà Nẵng - Nha Trang', storage: 'VP Đà Nẵng', status: 'stored' },
    { id: '10', name: 'Áo khoác gió Canifa xám', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=300&auto=format&fit=crop&q=80', foundDate: '18/10/2026', route: 'Nha Trang - Đà Lạt', storage: 'VP Vũng Tàu', status: 'processing' }
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
    { value: 'processing', label: 'Đang xử lý' }
  ];

  currentPage = 1;
  pageSize = 8;
  totalPages = 1;

  get pagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // Report Form Logic
  reportForm = {
    bookingCode: '',   // Mã đơn hoặc mã vé khách nhập
    maDonHang: '',     // DO_THAT_LAC.MaDonHang
    maVe: '',          // DO_THAT_LAC.MaVe
    description: '',
    route: '',
    date: '',
    seat: '',
    fullName: '',
    phone: '',
    email: '',
    image: null as File | null
  };

  // Mock đơn hàng (mỗi đơn 1 chuyến, có thể nhiều vé) để tự động điền theo mã đơn / mã vé
  mockOrders: { [orderId: string]: MockOrder } = {
    'DH10000001': { route: 'TP.HCM - Đà Lạt', date: '2026-10-25', fullName: 'Nguyễn Văn Anh', phone: '0987654321', email: 'vananh.nguyen@email.com',
      tickets: [{ id: 'VE00001', seat: 'A01' }, { id: 'VE00002', seat: 'A02' }] },
    'DH10000002': { route: 'Nha Trang - TP.HCM', date: '2026-10-28', fullName: 'Trần Thị Ngọc Bích', phone: '0912345678', email: 'ngocbich.tran@email.com',
      tickets: [{ id: 'VE00003', seat: 'B05' }] },
    'DH10000003': { route: 'Cần Thơ - TP.HCM', date: '2026-10-15', fullName: 'Lê Hoàng Long', phone: '0909123456', email: 'long.lehoang@email.com',
      tickets: [{ id: 'VE00004', seat: 'Phòng 02' }, { id: 'VE00005', seat: 'Phòng 03' }, { id: 'VE00006', seat: 'Phòng 04' }] },
  };

  /** Các vé trong đơn đang chọn (dùng để chọn ghế khi đơn có nhiều vé). */
  orderTickets: MockOrderTicket[] = [];
  bookingCodeError = '';

  /** Chuyến đi của tôi (chỉ khi đã đăng nhập). */
  myTrips: { orderId: string; route: string; date: string }[] = [];
  selectedTripId = '';

  showToast = false;
  toastMessage = '';
  isClaimModalOpen = false;
  selectedClaimItem: LostItem | null = null;

  ngOnInit() {
    // Generate 37 more items to total 47 items
    const bases = this.allItems.slice();
    for (let i = 11; i <= 47; i++) {
      const base = bases[i % bases.length];
      this.allItems.push({
        ...base,
        id: i.toString(),
        name: `${base.name} #${i}`,
      });
    }

    this.loadBookedOrders();

    // Đã đăng nhập: cho chọn nhanh từ "Chuyến đi của tôi" và điền sẵn thông tin liên hệ
    const user = this.authService.currentUser();
    if (user) {
      const entries = Object.entries(this.mockOrders);
      const own = entries.filter(([, o]) => o.owner && (o.owner === user.id || o.phone === user.phoneNumber));
      const samples = entries.filter(([, o]) => !o.owner);
      this.myTrips = [...own, ...samples].map(([orderId, o]) => ({ orderId, route: o.route, date: o.date }));
      this.applyUserContact();
      this.claimForm.phone = user.phoneNumber || '';
    }

    this.filterItems();
  }

  /** Đơn đã thanh toán từ luồng đặt vé: mã đơn = order.id, mã vé = {mã đơn}-{chiều}-{thứ tự ghế}. */
  private loadBookedOrders() {
    try {
      const trips = this.bookingService.catalog();
      for (const order of this.bookingService.state().orders) {
        if (order.status !== 'paid') continue;
        const tickets: MockOrderTicket[] = [];
        order.legs.forEach((leg, li) => {
          const trip = trips.find(t => t.id === leg.tripId);
          if (!trip) return;
          const route = `${trip.from} - ${trip.to}`;
          const date = vietnamDate(Date.parse(trip.departureAt));
          if (!this.routes.includes(route)) this.routes.push(route);
          leg.seats.forEach((seat, si) => tickets.push({ id: `${order.id}-${li + 1}-${si + 1}`.toUpperCase(), seat, route, date }));
        });
        if (!tickets.length) continue;
        this.mockOrders[order.id.toUpperCase()] = {
          route: tickets[0].route!, date: tickets[0].date!,
          fullName: order.passenger.name, phone: order.passenger.phone, email: order.passenger.email,
          tickets, owner: order.owner,
        };
      }
    } catch {
      // Không đọc được dữ liệu đặt vé -> chỉ dùng dữ liệu mẫu
    }
  }

  /** Tra mã đơn hoặc mã vé -> đơn hàng (và vé cụ thể nếu nhập mã vé). */
  resolveBookingCode(raw: string): { orderId: string; order: MockOrder; ticket?: MockOrderTicket } | null {
    const code = raw.trim().toUpperCase();
    if (!code) return null;
    if (this.mockOrders[code]) return { orderId: code, order: this.mockOrders[code] };
    for (const [orderId, order] of Object.entries(this.mockOrders)) {
      const ticket = order.tickets.find(t => t.id.toUpperCase() === code);
      if (ticket) return { orderId, order, ticket };
    }
    return null;
  }

  private applyUserContact() {
    const user = this.authService.currentUser();
    if (!user) return;
    this.reportForm.fullName = user.name || this.reportForm.fullName;
    this.reportForm.phone = user.phoneNumber || this.reportForm.phone;
    this.reportForm.email = user.email || this.reportForm.email;
  }

  filterItems() {
    this.filteredItems = this.allItems.filter(item => {
      // Hide returned items from customers
      if (item.status === 'returned') return false;
      
      const matchSearch = item.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchRoute = this.selectedRoute === 'Tất cả các tuyến' || item.route === this.selectedRoute;
      const matchStatus = this.selectedStatus === 'Tất cả trạng thái' || item.status === this.selectedStatus;
      // If a ticket code is entered, simulate filtering by checking if the ticket exists
      // and if the item's route matches the ticket's route.
      let matchTicket = true;
      if (this.searchTicketCode.trim()) {
        const found = this.resolveBookingCode(this.searchTicketCode);
        if (found) {
          matchTicket = item.route === found.order.route;
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

  onBookingCodeChange() {
    this.bookingCodeError = '';
    this.orderTickets = [];
    this.reportForm.maDonHang = '';
    this.reportForm.maVe = '';
    if (!this.reportForm.bookingCode.trim()) return;

    const found = this.resolveBookingCode(this.reportForm.bookingCode);
    if (!found) {
      this.bookingCodeError = 'Không tìm thấy mã này.';
      return;
    }

    const { orderId, order, ticket } = found;
    this.reportForm.bookingCode = this.reportForm.bookingCode.trim().toUpperCase();
    this.reportForm.maDonHang = orderId;
    this.reportForm.route = order.route;
    this.reportForm.date = order.date;
    this.reportForm.fullName = order.fullName;
    this.reportForm.phone = order.phone;
    this.reportForm.email = order.email;

    if (ticket) {
      // Nhập mã vé -> xác định đúng 1 ghế
      this.applyTicket(ticket);
    } else if (order.tickets.length === 1) {
      this.applyTicket(order.tickets[0]);
    } else {
      // Đơn nhiều vé -> cho khách chọn ghế
      this.orderTickets = order.tickets;
      this.reportForm.seat = '';
    }

    if (this.selectedTripId) this.applyUserContact();
  }

  onSelectMyTrip(orderId: string) {
    this.reportForm.bookingCode = orderId;
    this.onBookingCodeChange();
  }

  onSelectOrderTicket(ticketId: string) {
    const ticket = this.orderTickets.find(t => t.id === ticketId);
    if (ticket) this.applyTicket(ticket);
    else this.reportForm.seat = '';
  }

  private applyTicket(ticket: MockOrderTicket) {
    this.reportForm.maVe = ticket.id;
    this.reportForm.seat = ticket.seat;
    if (ticket.route) this.reportForm.route = ticket.route;
    if (ticket.date) this.reportForm.date = ticket.date;
  }

  openDatePicker(event: Event) {
    try {
      (event.target as any).showPicker();
    } catch (e) {
      // Fallback for older browsers
    }
  }

  submitReport() {
    if (this.reportForm.bookingCode.trim() && !this.reportForm.maDonHang) {
      alert('Mã đơn hoặc mã vé không hợp lệ. Vui lòng kiểm tra lại hoặc để trống ô này.');
      return;
    }

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
      bookingCode: '',
      maDonHang: '',
      maVe: '',
      description: '',
      route: '',
      date: '',
      seat: '',
      fullName: '',
      phone: '',
      email: '',
      image: null
    };
    this.orderTickets = [];
    this.bookingCodeError = '';
    this.selectedTripId = '';
    this.applyUserContact();
  }

  openClaimModal(item: LostItem) {
    this.selectedClaimItem = item;
    this.isClaimModalOpen = true;
  }

  closeClaimModal() {
    this.isClaimModalOpen = false;
    this.selectedClaimItem = null;
    this.claimForm = {
      bookingCode: '',
      phone: this.authService.currentUser()?.phoneNumber || '',
      description: ''
    };
    this.claimErrors = { bookingCode: '', phone: '', description: '' };
    this.claimTouched = { bookingCode: false, phone: false, description: false };
  }

  // YEU_CAU_NHAN_DO: mã đơn hoặc mã vé (bắt buộc 1 trong 2) + SĐT người đặt + đặc điểm nhận dạng
  claimForm = {
    bookingCode: '',
    phone: '',
    description: ''
  };

  // Lỗi inline dưới từng ô (không dùng alert/toast cho lỗi của một ô)
  claimErrors = { bookingCode: '', phone: '', description: '' };
  private claimTouched = { bookingCode: false, phone: false, description: false };

  private claimFieldError(field: ClaimField): string {
    const value = this.claimForm[field].trim();
    if (field === 'bookingCode') {
      if (!value) return 'Vui lòng nhập mã đơn hoặc mã vé';
      return this.resolveBookingCode(value) ? '' : 'Không tìm thấy mã này';
    }
    if (field === 'phone') {
      if (!value) return 'Vui lòng nhập số điện thoại';
      if (!VN_PHONE_REGEX.test(value)) return 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0)';
      const found = this.resolveBookingCode(this.claimForm.bookingCode);
      if (found && found.order.phone !== value) return 'Không khớp với SĐT người đặt của mã này';
      return '';
    }
    return value ? '' : 'Vui lòng nhập đặc điểm nhận dạng';
  }

  /** Rời ô -> kiểm tra lần đầu. */
  onClaimBlur(field: ClaimField) {
    this.claimTouched[field] = true;
    this.claimErrors[field] = this.claimFieldError(field);
  }

  /** Ô đã từng kiểm tra -> kiểm tra liên tục khi gõ, đúng thì lỗi biến mất ngay. */
  onClaimInput(field: ClaimField) {
    if (this.claimTouched[field] || this.claimErrors[field]) {
      this.claimErrors[field] = this.claimFieldError(field);
    }
    // Đổi mã thì SĐT cần đối chiếu lại với người đặt của mã mới
    if (field === 'bookingCode' && this.claimTouched.phone) {
      this.claimErrors.phone = this.claimFieldError('phone');
    }
  }

  submitClaim() {
    const fields: ClaimField[] = ['bookingCode', 'phone', 'description'];
    fields.forEach(f => {
      this.claimTouched[f] = true;
      this.claimErrors[f] = this.claimFieldError(f);
    });
    const firstInvalid = fields.find(f => this.claimErrors[f]);
    if (firstInvalid) {
      // Focus và cuộn tới ô sai đầu tiên, chặn gửi yêu cầu
      setTimeout(() => {
        const el = document.getElementById(`claim-${firstInvalid}`);
        el?.focus();
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
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
