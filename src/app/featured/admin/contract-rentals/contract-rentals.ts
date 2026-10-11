import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type RequestStatus = 'Chờ xử lý' | 'Đã báo giá' | 'Đã hủy';
type QuoteStatus = 'Chờ phản hồi' | 'Đã chấp nhận' | 'Đã từ chối' | 'Hết hiệu lực';
type ContractStatus = 'Chờ thực hiện' | 'Đang thực hiện' | 'Hoàn thành' | 'Đã hủy';

type MainTab = 'request' | 'quote' | 'contract';
type QuoteSubTab = 'standard' | 'customer';
type DrawerType = 'request' | 'quote' | 'contract' | null;
type PageKey = 'request' | 'standard' | 'customer' | 'contract';

interface RequestItem {
  code: string;
  customer: string;
  phone: string;
  vehicleType: string;
  guests: number;
  vehicles: number;
  departure: string;
  status: RequestStatus;
  email: string;
  pickup: string;
  destination: string;
  note: string;
}

interface StandardPriceItem {
  id: number;
  vehicleType: string;
  seats: string;
  inland: string;
  intercity: string;
  daily: string;
  extra: string;
  status: 'Đang áp dụng' | 'Ngưng áp dụng';
}

interface CustomerQuoteItem {
  code: string;
  requestCode: string;
  customer: string;
  phone: string;
  vehicleType: string;
  vehicles: number;
  price: string;
  sent: string;
  status: QuoteStatus;
  guests: number;
  pickup: string;
  destination: string;
  basePrice: string;
  fees: string;
  discount: string;
  total: string;
}

interface ContractItem {
  code: string;
  quoteCode: string;
  created: string;
  customer: string;
  phone: string;
  email: string;
  vehicleType: string;
  vehicles: number;
  guests: number;
  departure: string;
  amount: string;
  status: ContractStatus;
  pickup: string;
  destination: string;
  price: string;
  fees: string;
  discount: string;
  total: string;
  terms: string[];
  history: string[];
}

@Component({
  selector: 'app-contract-rentals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contract-rentals.html',
  styleUrls: ['./contract-rentals.css'],
})
export class ContractRentalsComponent {
  // Tabs State
  activeMainTab: MainTab = 'request';
  activeQuoteSubTab: QuoteSubTab = 'standard';
  pageSize = 10;
  currentPages: Record<PageKey, number> = {
    request: 1,
    standard: 1,
    customer: 1,
    contract: 1
  };

  // Filters State
  requestSearch = '';
  requestTypeFilter = 'Tất cả loại xe';
  requestStatusFilter = 'Tất cả trạng thái';
  requestDateFilter = '';

  standardPriceSearch = '';
  standardPriceStatus = 'Tất cả';

  customerQuoteSearch = '';
  customerQuoteStatus = 'Tất cả';

  contractSearch = '';
  contractStatus = 'Tất cả';
  contractDateFilter = '';

  // Drawer State
  activeDrawer: DrawerType = null;
  selectedItem: any = null;

  // Mock Data
  requests: RequestItem[] = [
    {
      code: 'YC001', customer: 'Nguyễn Minh Anh', phone: '0901234567', vehicleType: 'Limousine 9 chỗ', 
      guests: 7, vehicles: 1, departure: '25/06/2026', status: 'Chờ xử lý', 
      email: 'minhanh@example.com', pickup: 'Sân bay Nội Bài', destination: 'Hà Nội', 
      note: 'Ưu tiên xe có nước uống và wifi.'
    },
    {
      code: 'YC002', customer: 'Trần Quốc Bảo', phone: '0912345678', vehicleType: 'Giường nằm 34 chỗ', 
      guests: 30, vehicles: 1, departure: '28/06/2026', status: 'Đã báo giá', 
      email: 'quocbao@example.com', pickup: 'Bến xe Giáp Bát', destination: 'Thanh Hóa', 
      note: 'Hành trình có 1 đêm nghỉ, cần chỗ ngủ thoải mái.'
    },
    {
      code: 'YC003', customer: 'Lê Thu Hà', phone: '0933456789', vehicleType: 'Cabin đôi cao cấp', 
      guests: 20, vehicles: 1, departure: '02/07/2026', status: 'Chờ xử lý', 
      email: 'lethuha@example.com', pickup: 'Ga Hà Nội', destination: 'Hạ Long', 
      note: 'Yêu cầu cabin riêng, trưa có ăn nhẹ trên xe.'
    },
    {
      code: 'YC004', customer: 'Phạm Gia Hưng', phone: '0944567890', vehicleType: 'Giường nằm 40 chỗ', 
      guests: 75, vehicles: 2, departure: '05/07/2026', status: 'Đã báo giá', 
      email: 'giahung@example.com', pickup: 'Khách sạn Melia', destination: 'Ninh Bình', 
      note: 'Lịch trình tham quan cố định, vui lòng có hướng dẫn viên.'
    },
    {
      code: 'YC005', customer: 'Võ Thanh Tâm', phone: '0965678901', vehicleType: 'Limousine 9 chỗ', 
      guests: 15, vehicles: 2, departure: '08/07/2026', status: 'Đã hủy', 
      email: 'thanhtam@example.com', pickup: 'Nội thành Hà Nội', destination: 'Sân bay Nội Bài', 
      note: 'Hủy do thay đổi lịch bay.'
    },
    {
      code: 'YC006', customer: 'Đặng Hoài Nam', phone: '0976789012', vehicleType: 'Cabin đôi cao cấp', 
      guests: 42, vehicles: 2, departure: '12/07/2026', status: 'Chờ xử lý', 
      email: 'hoanam@example.com', pickup: 'Bến xe Mỹ Đình', destination: 'Sapa', 
      note: 'Đi theo đoàn, cần lịch trình linh hoạt.'
    }
  ];

  standardPrices: StandardPriceItem[] = [
    { id: 1, vehicleType: 'Limousine 9 chỗ', seats: '9', inland: '1.200.000đ', intercity: '2.500.000đ', daily: '4.000.000đ', extra: 'Cầu đường, ngoài giờ', status: 'Đang áp dụng' },
    { id: 2, vehicleType: 'Giường nằm 34 chỗ', seats: '34', inland: '2.500.000đ', intercity: '5.500.000đ', daily: '8.000.000đ', extra: 'Cầu đường, lưu đêm', status: 'Đang áp dụng' },
    { id: 3, vehicleType: 'Giường nằm 40 chỗ', seats: '40', inland: '3.000.000đ', intercity: '6.500.000đ', daily: '9.000.000đ', extra: 'Cầu đường, lưu đêm', status: 'Đang áp dụng' },
    { id: 4, vehicleType: 'Cabin đôi cao cấp', seats: '22', inland: '4.500.000đ', intercity: '8.000.000đ', daily: '12.000.000đ', extra: 'Cầu đường, phụ phí lễ/tết', status: 'Đang áp dụng' }
  ];

  customerQuotes: CustomerQuoteItem[] = [
    { 
      code: 'BG001', requestCode: 'YC002', customer: 'Trần Quốc Bảo', phone: '0912345678', vehicleType: 'Giường nằm 34 chỗ', 
      vehicles: 1, price: '6.200.000đ', sent: '22/06/2026', status: 'Chờ phản hồi', guests: 30, 
      pickup: 'Bến xe Giáp Bát', destination: 'Thanh Hóa', basePrice: '5.500.000đ', fees: '700.000đ', discount: '0đ', total: '6.200.000đ'
    },
    { 
      code: 'BG002', requestCode: 'YC004', customer: 'Phạm Gia Hưng', phone: '0944567890', vehicleType: 'Giường nằm 40 chỗ', 
      vehicles: 2, price: '13.800.000đ', sent: '23/06/2026', status: 'Đã chấp nhận', guests: 75, 
      pickup: 'Khách sạn Melia', destination: 'Ninh Bình', basePrice: '13.000.000đ', fees: '800.000đ', discount: '0đ', total: '13.800.000đ'
    },
    { 
      code: 'BG003', requestCode: 'YC005', customer: 'Võ Thanh Tâm', phone: '0965678901', vehicleType: 'Limousine 9 chỗ', 
      vehicles: 2, price: '5.300.000đ', sent: '20/06/2026', status: 'Đã từ chối', guests: 15, 
      pickup: 'Nội thành Hà Nội', destination: 'Sân bay Nội Bài', basePrice: '5.000.000đ', fees: '300.000đ', discount: '0đ', total: '5.300.000đ'
    },
    { 
      code: 'BG004', requestCode: 'YC003', customer: 'Lê Thu Hà', phone: '0933456789', vehicleType: 'Cabin đôi cao cấp', 
      vehicles: 1, price: '8.800.000đ', sent: '24/06/2026', status: 'Chờ phản hồi', guests: 20, 
      pickup: 'Ga Hà Nội', destination: 'Hạ Long', basePrice: '8.500.000đ', fees: '300.000đ', discount: '0đ', total: '8.800.000đ'
    }
  ];

  contracts: ContractItem[] = [
    { 
      code: 'HD001', quoteCode: 'BG002', created: '24/06/2026', customer: 'Phạm Gia Hưng', phone: '0944567890', 
      email: 'giahung@example.com', vehicleType: 'Giường nằm 40 chỗ', vehicles: 2, guests: 75, 
      departure: '05/07/2026', amount: '13.800.000đ', status: 'Chờ thực hiện', 
      pickup: 'Khách sạn Melia', destination: 'Ninh Bình', price: '13.000.000đ', fees: '800.000đ', discount: '0đ', total: '13.800.000đ',
      terms: ['Có tài xế đi kèm', 'Giá có thể thay đổi nếu phát sinh lộ trình', 'Khách cần xác nhận trước ngày khởi hành', 'Hợp đồng có thể bị hủy theo chính sách hủy'],
      history: ['Khách gửi yêu cầu', 'Nhân viên gửi báo giá', 'Khách xác nhận', 'Tạo hợp đồng']
    },
    { 
      code: 'HD002', quoteCode: 'BG005', created: '26/06/2026', customer: 'Nguyễn Hoàng Phúc', phone: '0988881234', 
      email: 'hoangphuc@example.com', vehicleType: 'Limousine 9 chỗ', vehicles: 1, guests: 7, 
      departure: '26/06/2026', amount: '2.800.000đ', status: 'Đang thực hiện', 
      pickup: 'Sân bay Nội Bài', destination: 'Hà Nội', price: '2.500.000đ', fees: '300.000đ', discount: '0đ', total: '2.800.000đ',
      terms: ['Có tài xế đi kèm', 'Giá có thể thay đổi nếu phát sinh lộ trình', 'Khách cần xác nhận trước ngày khởi hành', 'Hợp đồng có thể bị hủy theo chính sách hủy'],
      history: ['Khách gửi yêu cầu', 'Nhân viên gửi báo giá', 'Khách xác nhận', 'Tạo hợp đồng']
    },
    { 
      code: 'HD003', quoteCode: 'BG004', created: '18/06/2026', customer: 'Mai Thanh Trúc', phone: '0977774567', 
      email: 'maitruc@example.com', vehicleType: 'Cabin đôi cao cấp', vehicles: 1, guests: 20, 
      departure: '18/06/2026', amount: '9.200.000đ', status: 'Hoàn thành', 
      pickup: 'Ga Hà Nội', destination: 'Hạ Long', price: '9.000.000đ', fees: '200.000đ', discount: '0đ', total: '9.200.000đ',
      terms: ['Có tài xế đi kèm', 'Giá có thể thay đổi nếu phát sinh lộ trình', 'Khách cần xác nhận trước ngày khởi hành', 'Hợp đồng có thể bị hủy theo chính sách hủy'],
      history: ['Khách gửi yêu cầu', 'Nhân viên gửi báo giá', 'Khách xác nhận', 'Tạo hợp đồng']
    },
    { 
      code: 'HD004', quoteCode: 'BG003', created: '20/06/2026', customer: 'Đỗ Quốc Huy', phone: '0966667890', 
      email: 'quochuy@example.com', vehicleType: 'Giường nằm 34 chỗ', vehicles: 1, guests: 30, 
      departure: '20/06/2026', amount: '5.900.000đ', status: 'Đã hủy', 
      pickup: 'Bến xe Giáp Bát', destination: 'Hà Nội', price: '5.500.000đ', fees: '400.000đ', discount: '0đ', total: '5.900.000đ',
      terms: ['Có tài xế đi kèm', 'Giá có thể thay đổi nếu phát sinh lộ trình', 'Khách cần xác nhận trước ngày khởi hành', 'Hợp đồng có thể bị hủy theo chính sách hủy'],
      history: ['Khách gửi yêu cầu', 'Nhân viên gửi báo giá', 'Khách xác nhận', 'Tạo hợp đồng']
    }
  ];

  // Stats
  get pendingRequestCount() { return this.requests.filter(r => r.status === 'Chờ xử lý').length; }
  get pendingQuoteCount() { return this.customerQuotes.filter(q => q.status === 'Chờ phản hồi').length; }
  get activeContractCount() { return this.contracts.filter(c => c.status === 'Đang thực hiện').length; }

  // Filter Logic
  get filteredRequests() {
    const s = this.requestSearch.toLowerCase();
    return this.requests.filter(r => 
      (r.code.toLowerCase().includes(s) || r.customer.toLowerCase().includes(s) || r.phone.includes(s)) &&
      (this.requestTypeFilter === 'Tất cả loại xe' || r.vehicleType === this.requestTypeFilter) &&
      (this.requestStatusFilter === 'Tất cả trạng thái' || r.status === this.requestStatusFilter) &&
      (!this.requestDateFilter || r.departure === this.requestDateFilter)
    );
  }

  get filteredStandardPrices() {
    const s = this.standardPriceSearch.toLowerCase();
    return this.standardPrices.filter(p => 
      p.vehicleType.toLowerCase().includes(s) &&
      (this.standardPriceStatus === 'Tất cả' || p.status === this.standardPriceStatus)
    );
  }

  get filteredCustomerQuotes() {
    const s = this.customerQuoteSearch.toLowerCase();
    return this.customerQuotes.filter(q => 
      (q.code.toLowerCase().includes(s) || q.requestCode.toLowerCase().includes(s) || q.customer.toLowerCase().includes(s)) &&
      (this.customerQuoteStatus === 'Tất cả' || q.status === this.customerQuoteStatus)
    );
  }

  get filteredContracts() {
    const s = this.contractSearch.toLowerCase();
    return this.contracts.filter(c => 
      (c.code.toLowerCase().includes(s) || c.customer.toLowerCase().includes(s) || c.phone.includes(s)) &&
      (this.contractStatus === 'Tất cả' || c.status === this.contractStatus) &&
      (!this.contractDateFilter || c.departure === this.contractDateFilter)
    );
  }

  get paginatedRequests() {
    return this.paginateItems(this.filteredRequests);
  }

  get paginatedStandardPrices() {
    return this.paginateItems(this.filteredStandardPrices);
  }

  get paginatedCustomerQuotes() {
    return this.paginateItems(this.filteredCustomerQuotes);
  }

  get paginatedContracts() {
    return this.paginateItems(this.filteredContracts);
  }

  get currentPage(): number {
    return this.currentPages[this.activePageKey];
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.activeTotalItems / this.pageSize));
  }

  get activeTotalItems(): number {
    return this.getActiveFilteredItems().length;
  }

  get visibleStart(): number {
    return this.activeTotalItems > 0 ? (this.currentPage - 1) * this.pageSize + 1 : 0;
  }

  get visibleEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.activeTotalItems);
  }

  get activeListLabel(): string {
    if (this.activeMainTab === 'request') return 'yêu cầu';
    if (this.activeMainTab === 'quote' && this.activeQuoteSubTab === 'standard') return 'bảng giá';
    if (this.activeMainTab === 'quote') return 'báo giá';
    return 'hợp đồng';
  }

  getPaginationItems(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 6) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 3) return [1, 2, 3, 4, '...', total - 2, total - 1, total];
    if (current >= total - 2) return [1, 2, 3, '...', total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  }

  setPage(page: number | string) {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
      this.currentPages[this.activePageKey] = page;
    }
  }

  resetActivePagination() {
    this.currentPages[this.activePageKey] = 1;
  }

  // Actions
  setTab(tab: MainTab) {
    this.activeMainTab = tab;
    this.resetActivePagination();
    this.closeDrawer();
  }

  setSubTab(tab: QuoteSubTab) {
    this.activeQuoteSubTab = tab;
    this.resetActivePagination();
  }

  viewDetail(item: any, type: DrawerType) {
    this.selectedItem = item;
    this.activeDrawer = type;
  }

  closeDrawer() {
    this.activeDrawer = null;
    this.selectedItem = null;
  }

  isTableEmpty(): boolean {
    if (this.activeMainTab === 'request') return this.filteredRequests.length === 0;
    if (this.activeMainTab === 'quote') {
      return this.activeQuoteSubTab === 'standard' ? this.filteredStandardPrices.length === 0 : this.filteredCustomerQuotes.length === 0;
    }
    return this.filteredContracts.length === 0;
  }

  refreshFilters() {
    this.requestSearch = '';
    this.requestTypeFilter = 'Tất cả loại xe';
    this.requestStatusFilter = 'Tất cả trạng thái';
    this.requestDateFilter = '';
    this.standardPriceSearch = '';
    this.standardPriceStatus = 'Tất cả';
    this.customerQuoteSearch = '';
    this.customerQuoteStatus = 'Tất cả';
    this.contractSearch = '';
    this.contractStatus = 'Tất cả';
    this.contractDateFilter = '';
    this.currentPages = {
      request: 1,
      standard: 1,
      customer: 1,
      contract: 1
    };
  }

  openCreateAction() {
    if (this.activeMainTab === 'request') {
      const request = this.filteredRequests[0] || this.requests[0];
      if (request) {
        this.viewDetail(request, 'request');
      }
      return;
    }

    if (this.activeMainTab === 'quote') {
      if (this.activeQuoteSubTab === 'standard') {
        this.activeQuoteSubTab = 'customer';
      }

      const quote = this.filteredCustomerQuotes[0] || this.customerQuotes[0];
      if (quote) {
        this.viewDetail(quote, 'quote');
      }
      return;
    }

    const contract = this.filteredContracts[0] || this.contracts[0];
    if (contract) {
      this.viewDetail(contract, 'contract');
      return;
    }

    console.log('Mở modal thêm mới cho tab:', this.activeMainTab);
    // Logic mở modal sẽ được bổ sung sau
  }

  createQuoteFromRequest(request: RequestItem) {
    if (!request) return;
    
    // 1. Update request status
    request.status = 'Đã báo giá';
    
    // 2. Generate new quote
    const newQuoteCode = 'BG' + Math.floor(100 + Math.random() * 900);
    const basePriceNum = request.vehicleType.includes('Limousine') ? 2500000 : 5500000;
    const feesNum = 300000;
    const totalNum = basePriceNum * request.vehicles + feesNum;
    
    const newQuote: CustomerQuoteItem = {
      code: newQuoteCode,
      requestCode: request.code,
      customer: request.customer,
      phone: request.phone,
      vehicleType: request.vehicleType,
      vehicles: request.vehicles,
      price: totalNum.toLocaleString('vi-VN') + 'đ',
      sent: new Date().toLocaleDateString('vi-VN'),
      status: 'Chờ phản hồi',
      guests: request.guests,
      pickup: request.pickup,
      destination: request.destination,
      basePrice: (basePriceNum * request.vehicles).toLocaleString('vi-VN') + 'đ',
      fees: feesNum.toLocaleString('vi-VN') + 'đ',
      discount: '0đ',
      total: totalNum.toLocaleString('vi-VN') + 'đ'
    };
    
    this.customerQuotes.unshift(newQuote);
    
    // 3. Switch tab and open quote detail
    this.setTab('quote');
    this.setSubTab('customer');
    this.viewDetail(newQuote, 'quote');
  }

  convertQuoteToContract(quote: CustomerQuoteItem) {
    if (!quote) return;
    
    // 1. Update quote status
    quote.status = 'Đã chấp nhận';
    
    // 2. Generate new contract
    const newContractCode = 'HD' + Math.floor(100 + Math.random() * 900);
    const newContract: ContractItem = {
      code: newContractCode,
      quoteCode: quote.code,
      created: new Date().toLocaleDateString('vi-VN'),
      customer: quote.customer,
      phone: quote.phone,
      email: quote.customer.toLowerCase().replace(/\s+/g, '') + '@example.com',
      vehicleType: quote.vehicleType,
      vehicles: quote.vehicles,
      guests: quote.guests,
      departure: new Date(Date.now() + 3*24*60*60*1000).toLocaleDateString('vi-VN'),
      amount: quote.total,
      status: 'Chờ thực hiện',
      pickup: quote.pickup,
      destination: quote.destination,
      price: quote.basePrice,
      fees: quote.fees,
      discount: quote.discount,
      total: quote.total,
      terms: [
        'Có tài xế đi kèm',
        'Giá có thể thay đổi nếu phát sinh lộ trình',
        'Khách cần xác nhận trước ngày khởi hành',
        'Hợp đồng có thể bị hủy theo chính sách hủy'
      ],
      history: [
        'Khách gửi yêu cầu',
        'Nhân viên gửi báo giá',
        'Khách xác nhận',
        'Tạo hợp đồng'
      ]
    };
    
    this.contracts.unshift(newContract);
    
    // 3. Switch tab and open contract detail
    this.setTab('contract');
    this.viewDetail(newContract, 'contract');
  }

  updateContractStatus(contract: ContractItem) {
    if (!contract) return;
    
    if (contract.status === 'Chờ thực hiện') {
      contract.status = 'Đang thực hiện';
      contract.history.push('Bắt đầu thực hiện chuyến đi');
    } else if (contract.status === 'Đang thực hiện') {
      contract.status = 'Hoàn thành';
      contract.history.push('Hoàn thành chuyến đi, tất toán hợp đồng');
    }
  }

  private get activePageKey(): PageKey {
    if (this.activeMainTab === 'quote') {
      return this.activeQuoteSubTab === 'standard' ? 'standard' : 'customer';
    }
    return this.activeMainTab;
  }

  private getActiveFilteredItems(): unknown[] {
    if (this.activeMainTab === 'request') return this.filteredRequests;
    if (this.activeMainTab === 'quote') {
      return this.activeQuoteSubTab === 'standard' ? this.filteredStandardPrices : this.filteredCustomerQuotes;
    }
    return this.filteredContracts;
  }

  private paginateItems<T>(items: T[]): T[] {
    const totalPages = Math.max(1, Math.ceil(items.length / this.pageSize));
    const key = this.activePageKey;
    const safePage = Math.min(Math.max(this.currentPages[key], 1), totalPages);
    this.currentPages[key] = safePage;

    const startIndex = (safePage - 1) * this.pageSize;
    return items.slice(startIndex, startIndex + this.pageSize);
  }
}
