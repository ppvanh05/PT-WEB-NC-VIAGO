import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-customer-account-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-account-management.html',
  styleUrl: './customer-account-management.css',
})
export class CustomerAccountManagement implements OnInit {
  activeTab = 'all';
  currentPage = 1;
  pageSize = 10;

  ngOnInit() {
    this.customers.forEach((c: any) => {
      if (c.memberTier === undefined) {
        c.memberTier = this.getInitialMemberTier(c.tickets);
      }
      if (c.occupation === undefined) {
        c.occupation = this.getInitialOccupation(c.code);
      }
    });
  }

  getInitialMemberTier(ticketsStr: string): string {
    if (!ticketsStr) return 'Không có';
    const num = parseInt(ticketsStr.replace(/[^0-9]/g, ''), 10) || 0;
    if (num >= 30) return 'Kim cương';
    if (num >= 15) return 'Vàng';
    if (num >= 4) return 'Bạc';
    return 'Không có';
  }

  getInitialOccupation(code: string): string {
    if (code === 'KH100133') return 'Kỹ sư';
    if (code === 'KH100132') return 'Nhân viên văn phòng';
    if (code === 'KH100129') return 'Kinh doanh tự do';
    return '';
  }

  get activeCount(): number {
    return this.customers.filter(c => c.status === 'Đang hoạt động').length;
  }

  get lockedCount(): number {
    return this.customers.filter(c => c.status === 'Đã khóa').length;
  }

  // Filters State
  searchQuery = '';
  searchGender = 'all';
  appliedSearchQuery = '';
  appliedSearchGender = 'all';

  // Edit Modal State
  selectedCustomer: any = null;
  showEditModal = false;
  editSubTab = 'profile'; // 'profile' | 'history' | 'logs'

  // Create Modal State
  showCreateModal = false;
  newCustomer: any = {
    code: '',
    name: '',
    phone: '',
    email: '',
    gender: 'Nam',
    birthDate: '',
    initials: '',
    status: 'Đang hoạt động',
    tickets: '0-vé',
    date: '',
    bookings: [],
    logs: [],
    memberTier: 'Không có',
    occupation: ''
  };

  // Lock Confirmation Modal State
  showLockConfirmModal = false;
  lockReason = '';

  customers = [
    {
      code: 'KH100133',
      name: 'Nguyễn Văn Minh',
      initials: 'VM',
      phone: '0976262546',
      email: 'minh.nv@gmail.com',
      date: '18/06/2026',
      tickets: '6 vé',
      status: 'Đang hoạt động',
      gender: 'Nam',
      birthDate: '1990-05-12',
      bookings: [
        { code: 'VE100026', route: 'Diêu Trì - Bến xe Miền Đông', seat: 'XE100002_GHE_5B', date: '24/06/2026', price: '220,000 đ', status: 'Đã hủy' }
      ],
      logs: [
        { type: 'create', title: 'Đặt và thanh toán vé', time: '2026-06-18 14:15', desc: 'Tạo mới đơn hàng DH1000020 gồm 1 vé và ghi nhận thanh toán thành công.', ip: '127.0.0.1', code: 'VIAGO_LOG_1781763101901_LH989J' }
      ]
    },
    {
      code: 'KH100125',
      name: 'Phạm Hoàng Huy',
      initials: 'HH',
      phone: '0971234567',
      email: 'huy.ph@gmail.com',
      date: '25/05/2026',
      tickets: '5 vé',
      status: 'Đang hoạt động',
      gender: 'Nam',
      birthDate: '1991-03-14',
      memberTier: 'Bạc',
      occupation: 'Kỹ sư IT',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100124',
      name: 'Vũ Thị Hương',
      initials: 'VH',
      phone: '0961234567',
      email: 'huong.vt@yahoo.com',
      date: '24/05/2026',
      tickets: '15 vé',
      status: 'Đang hoạt động',
      gender: 'Nữ',
      birthDate: '1994-07-22',
      memberTier: 'Vàng',
      occupation: 'Kế toán',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100123',
      name: 'Nguyễn Tiến Dũng',
      initials: 'TD',
      phone: '0951234567',
      email: 'dung.nt@gmail.com',
      date: '23/05/2026',
      tickets: '31 vé',
      status: 'Đang hoạt động',
      gender: 'Nam',
      birthDate: '1989-11-02',
      memberTier: 'Kim cương',
      occupation: 'Giám đốc',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100122',
      name: 'Trần Thu Thủy',
      initials: 'TT',
      phone: '0941234567',
      email: 'thuy.tt@gmail.com',
      date: '22/05/2026',
      tickets: '0 vé',
      status: 'Đang hoạt động',
      gender: 'Nữ',
      birthDate: '1996-05-30',
      memberTier: 'Không có',
      occupation: 'Sinh viên',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100121',
      name: 'Lê Anh Tuấn',
      initials: 'AT',
      phone: '0931234567',
      email: 'tuan.la@gmail.com',
      date: '21/05/2026',
      tickets: '2 vé',
      status: 'Đang hoạt động',
      gender: 'Nam',
      birthDate: '1992-09-18',
      memberTier: 'Không có',
      occupation: 'Nhân viên kinh doanh',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100120',
      name: 'Hoàng Quốc Việt',
      initials: 'QV',
      phone: '0921234567',
      email: 'viet.hq@outlook.com',
      date: '20/05/2026',
      tickets: '8 vé',
      status: 'Đang hoạt động',
      gender: 'Nam',
      birthDate: '1987-12-25',
      memberTier: 'Bạc',
      occupation: 'Bác sĩ',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100119',
      name: 'Bùi Thị Hà',
      initials: 'TH',
      phone: '0911234567',
      email: 'ha.bt@gmail.com',
      date: '19/05/2026',
      tickets: '22 vé',
      status: 'Đang hoạt động',
      gender: 'Nữ',
      birthDate: '1993-01-10',
      memberTier: 'Vàng',
      occupation: 'Giáo viên',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100118',
      name: 'Phan Huy Khánh',
      initials: 'HK',
      phone: '0901234567',
      email: 'khanh.ph@gmail.com',
      date: '18/05/2026',
      tickets: '45 vé',
      status: 'Đang hoạt động',
      gender: 'Nam',
      birthDate: '1985-04-05',
      memberTier: 'Kim cương',
      occupation: 'Trưởng phòng',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100117',
      name: 'Vũ Hồng Ngọc',
      initials: 'HN',
      phone: '0891234567',
      email: 'ngoc.vh@gmail.com',
      date: '17/05/2026',
      tickets: '3 vé',
      status: 'Đang hoạt động',
      gender: 'Nữ',
      birthDate: '1998-08-12',
      memberTier: 'Không có',
      occupation: 'Học sinh',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100116',
      name: 'Nguyễn Hải Đăng',
      initials: 'HD',
      phone: '0881234567',
      email: 'dang.nh@gmail.com',
      date: '16/05/2026',
      tickets: '12 vé',
      status: 'Đang hoạt động',
      gender: 'Nam',
      birthDate: '1990-02-28',
      memberTier: 'Bạc',
      occupation: 'Kiến trúc sư',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100115',
      name: 'Đặng Kim Chi',
      initials: 'KC',
      phone: '0871234567',
      email: 'chi.dk@gmail.com',
      date: '15/05/2026',
      tickets: '0 vé',
      status: 'Đang hoạt động',
      gender: 'Nữ',
      birthDate: '1995-06-15',
      memberTier: 'Không có',
      occupation: 'Nhân viên bán hàng',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100114',
      name: 'Trần Lâm Viên',
      initials: 'LV',
      phone: '0861234567',
      email: 'vien.tl@gmail.com',
      date: '14/05/2026',
      tickets: '16 vé',
      status: 'Đang hoạt động',
      gender: 'Nam',
      birthDate: '1992-10-10',
      memberTier: 'Vàng',
      occupation: 'Nhà báo',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100113',
      name: 'Lý Quốc Bảo',
      initials: 'QB',
      phone: '0851234567',
      email: 'bao.lq@gmail.com',
      date: '13/05/2026',
      tickets: '35 vé',
      status: 'Đang hoạt động',
      gender: 'Nam',
      birthDate: '1988-03-24',
      memberTier: 'Kim cương',
      occupation: 'Luật sư',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100132',
      name: 'Nguyễn Mỹ Mỹ',
      initials: 'MM',
      phone: '0900234567',
      email: 'mymy.nguyen@yahoo.com',
      date: '31/05/2026',
      tickets: '18-vé',
      status: 'Đang hoạt động',
      gender: 'Nữ',
      birthDate: '1995-10-20',
      bookings: [
        { code: 'VE100025', route: 'Đà Nẵng - Quy Nhơn', seat: 'XE100003_GHE_12A', date: '02/06/2026', price: '180,000 đ', status: 'Thành công' }
      ],
      logs: [
        { type: 'create', title: 'Đăng nhập hệ thống', time: '2026-05-31 08:30', desc: 'Thiết bị di động Android, đăng nhập từ ứng dụng khách hàng.', ip: '14.161.12.44', code: 'VIAGO_LOG_1781765434551_ASDFD2' }
      ]
    },
    {
      code: 'KH100131',
      name: 'Trần Văn Dài',
      initials: 'VD',
      phone: '0908768066',
      email: 'dai.tran@gmail.com',
      date: '31/05/2026',
      tickets: '0-vé',
      status: 'Đang hoạt động',
      gender: 'Nam',
      birthDate: '1988-12-05',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100130',
      name: 'Nguyễn Văn Tùng',
      initials: 'VT',
      phone: '0908765434',
      email: 'tung.nv@gmail.com',
      date: '31/05/2026',
      tickets: '0-vé',
      status: 'Đang hoạt động',
      gender: 'Nam',
      birthDate: '1993-07-15',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100069',
      name: 'Đỗ Văn Nam',
      initials: 'VN',
      phone: '0907475177',
      email: 'nam.dv@gmail.com',
      date: '31/05/2026',
      tickets: '0-vé',
      status: 'Đã khóa',
      gender: 'Nam',
      birthDate: '1995-08-15',
      bookings: [],
      logs: [
        {
          type: 'lock',
          title: 'Quản lý tài khoản',
          time: '2026-05-31 13:05',
          desc: 'Khóa tài khoản khách hàng. Lý do: Khách hàng spam đặt vé ảo liên tục',
          ip: '127.0.0.1',
          code: 'VIAGO_LOG_1780207514478_R9Y6JF'
        },
        {
          type: 'edit',
          title: 'Cập nhật thông tin cá nhân',
          time: '2026-05-31 13:04',
          desc: 'Cập nhật thông tin khách hàng Đỗ Văn Nam. Chi tiết: SoDienThoai: 0907234428 -> 0907475177',
          ip: '127.0.0.1',
          code: 'VIAGO_LOG_1780207477016_MV4ASM'
        },
        {
          type: 'create',
          title: 'Tạo mới',
          time: '2026-05-31 13:04',
          desc: 'Tạo mới tài khoản khách hàng: Đỗ Văn Nam',
          ip: '127.0.0.1',
          code: 'VIAGO_LOG_1780207463023_3ERFTL'
        }
      ],
      lockInfo: {
        date: '2026-05-31 13:05',
        reason: 'Khách hàng spam đặt vé ảo liên tục'
      }
    },
    {
      code: 'KH100067',
      name: 'Lê Hoàng Nam',
      initials: 'HN',
      phone: '0907234428',
      email: 'nam.lh@gmail.com',
      date: '31/05/2026',
      tickets: '0-vé',
      status: 'Đã khóa',
      gender: 'Nam',
      birthDate: '1992-03-25',
      bookings: [],
      logs: [
        {
          type: 'lock',
          title: 'Quản lý tài khoản',
          time: '2026-05-31 12:00',
          desc: 'Khóa tài khoản khách hàng. Lý do: Nghi vấn vi phạm điều khoản sử dụng',
          ip: '127.0.0.1',
          code: 'VIAGO_LOG_1780207464190_LK982A'
        }
      ],
      lockInfo: {
        date: '2026-05-31 12:00',
        reason: 'Nghi vấn vi phạm điều khoản sử dụng'
      }
    },
    {
      code: 'KH100057',
      name: 'Phan Văn Khoa',
      initials: 'VK',
      phone: '0945408913',
      email: 'khoa.pv@outlook.com',
      date: '30/05/2026',
      tickets: '0-vé',
      status: 'Đã khóa',
      gender: 'Nam',
      birthDate: '1994-09-18',
      bookings: [],
      logs: [
        {
          type: 'lock',
          title: 'Quản lý tài khoản',
          time: '2026-05-30 15:45',
          desc: 'Khóa tài khoản khách hàng. Lý do: Spam thanh toán không thành công liên tục',
          ip: '127.0.0.1',
          code: 'VIAGO_LOG_1780207399881_PL9281'
        }
      ],
      lockInfo: {
        date: '2026-05-30 15:45',
        reason: 'Spam thanh toán không thành công liên tục'
      }
    },
    {
      code: 'KH100056',
      name: 'Phan Văn Linh',
      initials: 'VL',
      phone: '0945384192',
      email: 'linh.pv@gmail.com',
      date: '30/05/2026',
      tickets: '0-vé',
      status: 'Đã khóa',
      gender: 'Nam',
      birthDate: '1991-11-22',
      bookings: [],
      logs: [
        {
          type: 'lock',
          title: 'Quản lý tài khoản',
          time: '2026-05-30 15:40',
          desc: 'Khóa tài khoản khách hàng. Lý do: Spam thanh toán không thành công liên tục',
          ip: '127.0.0.1',
          code: 'VIAGO_LOG_1780207399880_PL9280'
        }
      ],
      lockInfo: {
        date: '2026-05-30 15:40',
        reason: 'Spam thanh toán không thành công liên tục'
      }
    },
    {
      code: 'KH100055',
      name: 'Hoàng Ngọc Phương',
      initials: 'NP',
      phone: '0945382586',
      email: 'phuong.hn@gmail.com',
      date: '30/05/2026',
      tickets: '0-vé',
      status: 'Đã khóa',
      gender: 'Nữ',
      birthDate: '1996-01-30',
      bookings: [],
      logs: [
        {
          type: 'lock',
          title: 'Quản lý tài khoản',
          time: '2026-05-30 15:35',
          desc: 'Khóa tài khoản khách hàng. Lý do: Spam thanh toán không thành công liên tục',
          ip: '127.0.0.1',
          code: 'VIAGO_LOG_1780207399879_PL9279'
        }
      ],
      lockInfo: {
        date: '2026-05-30 15:35',
        reason: 'Spam thanh toán không thành công liên tục'
      }
    },
    {
      code: 'KH100129',
      name: 'Đinh Thị Tùy Chọn',
      initials: 'TC',
      phone: '0912345678',
      email: 'tuychon.dt@gmail.com',
      date: '28/05/2026',
      tickets: '32-vé',
      status: 'Đang hoạt động',
      gender: 'Nữ',
      birthDate: '1985-02-14',
      bookings: [
        { code: 'VE100021', route: 'Hà Nội - Hải Phòng', seat: 'XE100004_GHE_1B', date: '30/05/2026', price: '120,000 đ', status: 'Thành công' },
        { code: 'VE100022', route: 'Hải Phòng - Hà Nội', seat: 'XE100004_GHE_2B', date: '01/06/2026', price: '120,000 đ', status: 'Thành công' },
        { code: 'VE100023', route: 'Hà Nội - Quảng Ninh', seat: 'XE100005_GHE_4A', date: '05/06/2026', price: '150,000 đ', status: 'Thành công' }
      ],
      logs: [
        { type: 'create', title: 'Đặt vé xe thành công', time: '2026-05-28 10:12', desc: 'Thực hiện đặt 2 vé khứ hồi Hà Nội - Hải Phòng.', ip: '113.190.22.81', code: 'VIAGO_LOG_1781763101901_LH989J' }
      ]
    },
    {
      code: 'KH100128',
      name: 'Phạm Thanh Sơn',
      initials: 'TS',
      phone: '0987654321',
      email: 'son.pt@gmail.com',
      date: '27/05/2026',
      tickets: '2-vé',
      status: 'Đang hoạt động',
      gender: 'Nam',
      birthDate: '1987-04-18',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100127',
      name: 'Trần Thị Mai',
      initials: 'TM',
      phone: '0934567890',
      email: 'mai.tt@yahoo.com',
      date: '26/05/2026',
      tickets: '1-vé',
      status: 'Đang hoạt động',
      gender: 'Nữ',
      birthDate: '1993-09-08',
      bookings: [],
      logs: []
    },
    {
      code: 'KH100126',
      name: 'Nguyễn Thị Kiểm',
      initials: 'TK',
      phone: '0908739484',
      email: 'kiem.nt@gmail.com',
      date: '31/05/2026',
      tickets: '0-vé',
      status: 'Đang hoạt động',
      gender: 'Nữ',
      birthDate: '1980-05-31',
      bookings: [],
      logs: []
    }
  ];

  get filteredCustomers() {
    let list = this.customers;

    // Filter by Tab
    if (this.activeTab === 'active') {
      list = list.filter(c => c.status === 'Đang hoạt động');
    } else if (this.activeTab === 'locked') {
      list = list.filter(c => c.status === 'Đã khóa');
    }

    // Filter by Search Query (applied)
    if (this.appliedSearchQuery.trim()) {
      const q = this.appliedSearchQuery.toLowerCase().trim();
      list = list.filter(c =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }

    // Filter by Gender (applied)
    if (this.appliedSearchGender !== 'all') {
      list = list.filter(c => c.gender === this.appliedSearchGender);
    }

    return list;
  }

  // Pagination Getter Properties
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCustomers.length / this.pageSize));
  }

  get validCurrentPage(): number {
    return Math.min(Math.max(this.currentPage, 1), this.totalPages);
  }

  get paginatedCustomers(): any[] {
    const start = (this.validCurrentPage - 1) * this.pageSize;
    return this.filteredCustomers.slice(start, start + this.pageSize);
  }

  get startIndex(): number {
    if (this.filteredCustomers.length === 0) return 0;
    return (this.validCurrentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.validCurrentPage * this.pageSize, this.filteredCustomers.length);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getPaginationItems(): number[] {
    const groupStart = Math.floor((this.validCurrentPage - 1) / 3) * 3 + 1;
    const groupEnd = Math.min(groupStart + 2, this.totalPages);
    return Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i);
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.currentPage = 1;
  }

  // Trigger search action
  applyFilter() {
    this.appliedSearchQuery = this.searchQuery;
    this.appliedSearchGender = this.searchGender;
    this.currentPage = 1;
  }

  clearSearchQuery() {
    this.searchQuery = '';
    this.applyFilter();
  }

  clearAllFilters() {
    this.searchQuery = '';
    this.searchGender = 'all';
    this.applyFilter();
  }

  // Generate next customer code sequentially
  generateNextCustomerCode(): string {
    let maxNum = 100000;
    this.customers.forEach(c => {
      const num = parseInt(c.code.replace('KH', ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    });
    return 'KH' + (maxNum + 1);
  }

  // Open Edit Modal
  openEditModal(customer: any) {
    this.selectedCustomer = JSON.parse(JSON.stringify(customer));
    this.showEditModal = true;
    this.editSubTab = 'profile';
  }

  // Close Edit Modal
  closeEditModal() {
    this.showEditModal = false;
    this.selectedCustomer = null;
  }

  setEditSubTab(tab: string) {
    this.editSubTab = tab;
  }

  toggleCustomerStatus() {
    if (this.selectedCustomer) {
      if (this.selectedCustomer.status === 'Đang hoạt động') {
        // Open Confirmation Dialog instead of immediate locking
        this.openLockConfirmModal();
      } else {
        // Unlock immediately
        this.selectedCustomer.status = 'Đang hoạt động';
        this.selectedCustomer.lockInfo = null;

        // Add unlock log entry
        if (!this.selectedCustomer.logs) this.selectedCustomer.logs = [];
        this.selectedCustomer.logs.unshift({
          type: 'unlock',
          title: 'Quản lý tài khoản',
          time: new Date().toISOString().replace('T', ' ').substring(0, 16),
          desc: 'Mở khóa tài khoản khách hàng.',
          ip: '127.0.0.1',
          code: 'VIAGO_LOG_' + Date.now()
        });

        // Sync changes immediately
        const idx = this.customers.findIndex(c => c.code === this.selectedCustomer.code);
        if (idx !== -1) {
          (this.customers[idx] as any).status = 'Đang hoạt động';
          delete (this.customers[idx] as any).lockInfo;
          (this.customers[idx] as any).logs = JSON.parse(JSON.stringify(this.selectedCustomer.logs));
        }
      }
    }
  }

  saveCustomerChanges() {
    if (this.selectedCustomer) {
      const idx = this.customers.findIndex(c => c.code === this.selectedCustomer.code);
      if (idx !== -1) {
        this.customers[idx] = JSON.parse(JSON.stringify(this.selectedCustomer));
      }
      this.closeEditModal();
    }
  }

  // Lock Confirmation Methods
  openLockConfirmModal() {
    this.lockReason = '';
    this.showLockConfirmModal = true;
  }

  closeLockConfirmModal() {
    this.showLockConfirmModal = false;
  }

  confirmLockCustomer() {
    if (!this.lockReason.trim()) {
      alert('Vui lòng nhập chi tiết lý do khóa tài khoản!');
      return;
    }
    if (this.selectedCustomer) {
      this.selectedCustomer.status = 'Đã khóa';
      this.selectedCustomer.lockInfo = {
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        reason: this.lockReason.trim()
      };

      if (!this.selectedCustomer.logs) this.selectedCustomer.logs = [];
      this.selectedCustomer.logs.unshift({
        type: 'lock',
        title: 'Quản lý tài khoản',
        time: this.selectedCustomer.lockInfo.date,
        desc: 'Khóa tài khoản khách hàng. Lý do: ' + this.selectedCustomer.lockInfo.reason,
        ip: '127.0.0.1',
        code: 'VIAGO_LOG_' + Date.now()
      });

      // Sync immediately back to customers list
      const idx = this.customers.findIndex(c => c.code === this.selectedCustomer.code);
      if (idx !== -1) {
        (this.customers[idx] as any).status = 'Đã khóa';
        (this.customers[idx] as any).lockInfo = JSON.parse(JSON.stringify(this.selectedCustomer.lockInfo));
        (this.customers[idx] as any).logs = JSON.parse(JSON.stringify(this.selectedCustomer.logs));
      }

      this.closeLockConfirmModal();
    }
  }

  // Create Modal Actions
  openCreateModal() {
    const nextCode = this.generateNextCustomerCode();
    this.newCustomer = {
      code: nextCode,
      name: '',
      phone: '',
      email: '',
      gender: 'Nam',
      birthDate: '',
      initials: '',
      status: 'Đang hoạt động',
      tickets: '0-vé',
      date: new Date().toLocaleDateString('vi-VN'),
      bookings: [],
      logs: []
    };
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  createCustomer() {
    if (!this.newCustomer.name || !this.newCustomer.phone) {
      alert('Vui lòng điền đầy đủ Họ tên và Số điện thoại!');
      return;
    }
    // Generate Initials
    const nameParts = this.newCustomer.name.trim().split(' ');
    let initials = 'KH';
    if (nameParts.length > 0) {
      if (nameParts.length >= 2) {
        initials = (nameParts[nameParts.length - 2][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
      } else {
        initials = nameParts[0].substring(0, 2).toUpperCase();
      }
    }
    this.newCustomer.initials = initials;

    // Add Create log
    this.newCustomer.logs.push({
      type: 'create',
      title: 'Tạo mới',
      time: new Date().toISOString().replace('T', ' ').substring(0, 16),
      desc: 'Tạo mới tài khoản khách hàng: ' + this.newCustomer.name,
      ip: '127.0.0.1',
      code: 'VIAGO_LOG_' + Date.now()
    });

    // Add to beginning of array
    this.customers.unshift(JSON.parse(JSON.stringify(this.newCustomer)));
    this.closeCreateModal();
  }

  getMemberTier(item: any): string {
    return item.memberTier || 'Không có';
  }
}
