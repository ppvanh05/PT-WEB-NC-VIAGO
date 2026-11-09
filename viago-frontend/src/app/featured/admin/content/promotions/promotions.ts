import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Voucher {
  stt: number;
  code: string;
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed' | 'gift';
  discountValue: number; // percentage or fixed amount
  maxDiscount?: number; // max discount amount for percentage
  minOrderValue: number; // minimum order value to apply
  memberTiers: string[]; // ['Silver', 'Gold', 'Diamond'] etc. or ['All']
  firstOrderOnly: boolean;
  birthdayMonthOnly: boolean;
  birthdayMonths?: string[];
  assignedCustomer?: {
    emailOrPhone: string;
    reason: 'complaint' | 'delay_cancel' | 'system_error' | 'custom_compensation';
    note: string;
    used: boolean;
  };
  routesType: 'all' | 'specific' | 'exclude';
  selectedRoutes?: string[];
  startDate: string;
  endDate: string;
  daysOfWeek?: string[]; // ['Mon', 'Tue', ...]
  referralRequired: boolean;
  emailFollowRequired: boolean;
  priority: 'high' | 'normal';
  status: 'running' | 'upcoming' | 'paused' | 'expired';
  usageCount: number;
  maxUsage?: number; // limit total uses
  limitPerUser: number;
  revenueGenerated: number;
}

export interface MemberTierRule {
  tierName: string;
  spendCondition: string;
  ticketCondition: string;
  logic: string;
  privileges: {
    title: string;
    description: string;
    icon: string;
  }[];
}

@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promotions.html',
  styleUrls: ['./promotions.css']
})
export class PromotionsComponent implements OnInit {
  memberTiers: MemberTierRule[] = [
    {
      tierName: 'Hạng Bạc',
      spendCondition: 'Trên 1.000.000đ đến 5.000.000đ',
      ticketCondition: 'Từ 4 đến 14 vé',
      logic: 'Đạt mốc khi tổng chi tiêu vượt 1 triệu. Nhóm khách thân thiết trung cấp.',
      privileges: [
        { title: 'Mã giảm giá độc quyền', description: 'Nhận mã giảm giá đến 10% gửi tự động vào Ví voucher trong các dịp lễ lớn.', icon: '🎫' },
        { title: 'Ưu tiên check-in', description: 'Được hỗ trợ làm thủ tục nhanh tại quầy vé của VIAGO trong khung giờ thường.', icon: '⚡' },
        { title: 'Quà tặng sinh nhật', description: 'Tự động nhận mã giảm giá 20% (tối đa 50.000đ) thả thẳng vào Ví trong tuần sinh nhật.', icon: '🎂' },
        { title: 'CSKH 24/7 tiêu chuẩn', description: 'Tổng đài chăm sóc khách hàng phục vụ 24/7, xử lý đổi trả vé quy trình chuẩn.', icon: '📞' }
      ]
    },
    {
      tierName: 'Hạng Vàng',
      spendCondition: 'Trên 5.000.000đ đến 15.000.000đ',
      ticketCondition: 'Từ 15 đến 29 vé',
      logic: 'Đạt mốc khi tổng chi tiêu vượt 5 triệu. Nhóm khách VIP, tần suất đi lại cao.',
      privileges: [
        { title: 'Ưu đãi Limousine VIP', description: 'Nhận mã giảm giá 20% thượng hạng áp dụng riêng cho các dòng xe Limousine VIP.', icon: '👑' },
        { title: 'Hàng chờ VIP riêng biệt', description: 'Phục vụ tại quầy VIP riêng biệt và miễn phí 100% phí chọn trước chỗ ngồi phía trước.', icon: '🛫' },
        { title: 'Quà sinh nhật VIP', description: 'Tự động nhận mã giảm giá lớn (tối đa 100.000đ) thả vào Ví kèm chúc mừng riêng biệt.', icon: '🎁' },
        { title: 'Đường dây nóng VIP', description: 'Tổng đài kết nối nhánh VIP phản hồi dưới 30s, đổi trả vé miễn phí trước 12 tiếng.', icon: '☎️' }
      ]
    },
    {
      tierName: 'Hạng Kim cương',
      spendCondition: 'Trên 15.000.000đ',
      ticketCondition: 'Từ 30 vé trở lên',
      logic: 'Nhóm siêu VIP (VVIP), thường xuyên đặt vé khứ hồi hoặc đặt vé đoàn/gia đình.',
      privileges: [
        { title: 'Mã giảm giá tối thượng', description: 'Siêu mã giảm giá lên đến 30% toàn hệ thống tự động thả vào Ví voucher.', icon: '💎' },
        { title: 'Di chuyển thượng lưu', description: 'Sử dụng Phòng chờ thương gia (free đồ ăn/nước uống) & xe trung chuyển tận nhà < 5km.', icon: '🚗' },
        { title: 'Quà sinh nhật VVIP', description: 'Combo voucher sinh nhật 200.000đ và một hộp quà vật lý gửi chuyển phát nhanh tận nhà.', icon: '💝' },
        { title: 'Trợ lý cá nhân 24/7', description: 'Kết nối Trợ lý cá nhân qua hotline VIP, hoàn hủy vé miễn phí trước giờ chạy 2 tiếng.', icon: '👤' }
      ]
    }
  ];

  vouchers: Voucher[] = [
    {
      stt: 1,
      code: 'WELCOME50',
      name: 'Chào mừng khách mới - Welcome Gift',
      description: 'Giảm cho lần đặt vé đầu tiên trên ứng dụng VIAGO.',
      discountType: 'fixed',
      discountValue: 50000,
      minOrderValue: 0,
      memberTiers: ['Tất cả'],
      firstOrderOnly: true,
      birthdayMonthOnly: false,
      routesType: 'all',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      referralRequired: false,
      emailFollowRequired: false,
      priority: 'normal',
      status: 'running',
      usageCount: 1450,
      limitPerUser: 1,
      revenueGenerated: 290000000
    },
    {
      stt: 2,
      code: 'EARLYBIRD15',
      name: 'Đặt sớm - Early Bird 15%',
      description: 'Đặt trước ít nhất 7 ngày so với ngày khởi hành.',
      discountType: 'percentage',
      discountValue: 15,
      maxDiscount: 45000,
      minOrderValue: 150000,
      memberTiers: ['Bạc', 'Vàng', 'Kim cương'],
      firstOrderOnly: false,
      birthdayMonthOnly: false,
      routesType: 'all',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      referralRequired: false,
      emailFollowRequired: false,
      priority: 'normal',
      status: 'running',
      usageCount: 890,
      limitPerUser: 2,
      revenueGenerated: 178000000
    },
    {
      stt: 3,
      code: 'BDAY20',
      name: 'Mừng sinh nhật - Birthday Surprise',
      description: 'Ưu đãi trong tháng sinh nhật, không giới hạn tuyến.',
      discountType: 'percentage',
      discountValue: 20,
      maxDiscount: 50000,
      minOrderValue: 100000,
      memberTiers: ['Bạc', 'Vàng', 'Kim cương'],
      firstOrderOnly: false,
      birthdayMonthOnly: true,
      routesType: 'all',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      referralRequired: false,
      emailFollowRequired: false,
      priority: 'high',
      status: 'running',
      usageCount: 520,
      limitPerUser: 1,
      revenueGenerated: 104000000
    },
    {
      stt: 4,
      code: 'SUMMER30',
      name: 'Hè rực rỡ - Summer Special',
      description: 'Áp dụng cho các tuyến du lịch: Đà Lạt, Nha Trang, Vũng Tàu...',
      discountType: 'fixed',
      discountValue: 30000,
      minOrderValue: 120000,
      memberTiers: ['Bạc', 'Vàng', 'Kim cương'],
      firstOrderOnly: false,
      birthdayMonthOnly: false,
      routesType: 'specific',
      selectedRoutes: ['TP.HCM ↔ Đà Lạt', 'TP.HCM ↔ Nha Trang', 'TP.HCM ↔ Vũng Tàu'],
      startDate: '2026-05-15',
      endDate: '2026-08-31',
      referralRequired: false,
      emailFollowRequired: false,
      priority: 'normal',
      status: 'running',
      usageCount: 2130,
      limitPerUser: 3,
      revenueGenerated: 426000000
    },
    {
      stt: 5,
      code: 'GOLDVIP20',
      name: 'Đặc quyền Gold - VIP Exclusive',
      description: 'Ưu đãi dành riêng cho hội viên Vàng đặt tuyến Limousine VIP.',
      discountType: 'percentage',
      discountValue: 20,
      maxDiscount: 80000,
      minOrderValue: 200000,
      memberTiers: ['Vàng'],
      firstOrderOnly: false,
      birthdayMonthOnly: false,
      routesType: 'all',
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      referralRequired: false,
      emailFollowRequired: false,
      priority: 'high',
      status: 'running',
      usageCount: 310,
      limitPerUser: 5,
      revenueGenerated: 93000000
    },
    {
      stt: 6,
      code: 'FREEHUY',
      name: 'Miễn phí hoàn hủy - Free Cancel',
      description: 'Hoàn tiền 100% không mất phí khi hủy trước 24 giờ.',
      discountType: 'gift',
      discountValue: 0,
      minOrderValue: 0,
      memberTiers: ['Bạc', 'Vàng', 'Kim cương'],
      firstOrderOnly: false,
      birthdayMonthOnly: false,
      routesType: 'all',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      referralRequired: false,
      emailFollowRequired: false,
      priority: 'normal',
      status: 'expired',
      usageCount: 420,
      limitPerUser: 1,
      revenueGenerated: 84000000
    },
    {
      stt: 7,
      code: 'TETNHAMTY25',
      name: 'Tết Nguyên Đán 2027 - Tet Special',
      description: 'Đặt sớm các chuyến xe Tết có quà tặng kèm.',
      discountType: 'percentage',
      discountValue: 25,
      maxDiscount: 100000,
      minOrderValue: 250000,
      memberTiers: ['Bạc', 'Vàng', 'Kim cương'],
      firstOrderOnly: false,
      birthdayMonthOnly: false,
      routesType: 'all',
      startDate: '2027-01-01',
      endDate: '2027-02-15',
      referralRequired: false,
      emailFollowRequired: false,
      priority: 'high',
      status: 'upcoming',
      usageCount: 0,
      limitPerUser: 1,
      revenueGenerated: 0
    },
    {
      stt: 8,
      code: 'GROUPTRIP',
      name: 'Đi nhóm - Group Booking Deal',
      description: 'Đặt từ 4 vé trở lên trên cùng một chuyến.',
      discountType: 'fixed',
      discountValue: 40000,
      minOrderValue: 500000,
      memberTiers: ['Bạc', 'Vàng', 'Kim cương'],
      firstOrderOnly: false,
      birthdayMonthOnly: false,
      routesType: 'all',
      startDate: '2026-07-01',
      endDate: '2026-10-31',
      referralRequired: false,
      emailFollowRequired: false,
      priority: 'normal',
      status: 'upcoming',
      usageCount: 0,
      limitPerUser: 10,
      revenueGenerated: 0
    },
    {
      stt: 9,
      code: 'MIDWEEK10',
      name: 'Ngày giữa tuần - Midweek Boost',
      description: 'Kích cầu đi lại các chuyến xuất phát từ Thứ 2 đến Thứ 5.',
      discountType: 'percentage',
      discountValue: 10,
      maxDiscount: 25000,
      minOrderValue: 100000,
      memberTiers: ['Bạc', 'Vàng', 'Kim cương'],
      firstOrderOnly: false,
      birthdayMonthOnly: false,
      routesType: 'all',
      startDate: '2026-06-01',
      endDate: '2026-07-31',
      referralRequired: false,
      emailFollowRequired: false,
      priority: 'normal',
      status: 'paused',
      usageCount: 220,
      limitPerUser: 4,
      revenueGenerated: 44000000
    },
    {
      stt: 10,
      code: 'APPONLY70',
      name: 'Chỉ trên App - App Exclusive',
      description: 'Ưu đãi dành riêng khi đặt qua ứng dụng VIAGO Mobile.',
      discountType: 'fixed',
      discountValue: 70000,
      minOrderValue: 180000,
      memberTiers: ['Bạc', 'Vàng', 'Kim cương'],
      firstOrderOnly: false,
      birthdayMonthOnly: false,
      routesType: 'all',
      startDate: '2026-05-01',
      endDate: '2026-06-15',
      referralRequired: false,
      emailFollowRequired: false,
      priority: 'normal',
      status: 'expired',
      usageCount: 1650,
      limitPerUser: 1,
      revenueGenerated: 330000000
    },
    {
      stt: 11,
      code: 'SILVER10',
      name: 'Ưu đãi Silver - Silver Reward',
      description: 'Nhận giảm giá 10% trên toàn bộ các tuyến xe thường.',
      discountType: 'percentage',
      discountValue: 10,
      maxDiscount: 30000,
      minOrderValue: 100000,
      memberTiers: ['Bạc'],
      firstOrderOnly: false,
      birthdayMonthOnly: false,
      routesType: 'exclude',
      selectedRoutes: ['TP.HCM ↔ Đà Lạt (Limousine)'],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      referralRequired: false,
      emailFollowRequired: false,
      priority: 'normal',
      status: 'running',
      usageCount: 640,
      limitPerUser: 10,
      revenueGenerated: 128000000
    },
    {
      stt: 12,
      code: 'DIAMOND150',
      name: 'Đặc quyền Kim Cương - Elite King',
      description: 'Mã tối thượng tri ân riêng cho khách siêu VIP có chi tiêu trên 15M.',
      discountType: 'percentage',
      discountValue: 25,
      maxDiscount: 150000,
      minOrderValue: 300000,
      memberTiers: ['Kim cương'],
      firstOrderOnly: false,
      birthdayMonthOnly: false,
      routesType: 'all',
      startDate: '2026-06-01',
      endDate: '2026-12-31',
      referralRequired: false,
      emailFollowRequired: false,
      priority: 'high',
      status: 'running',
      usageCount: 180,
      limitPerUser: 99,
      revenueGenerated: 54000000
    },
    {
      stt: 13,
      code: 'OCTOBERFEST',
      name: 'Lễ hội tháng 10 - October Promo',
      description: 'Giảm giá cực sốc chào mừng tháng 10.',
      discountType: 'percentage',
      discountValue: 15,
      maxDiscount: 40000,
      minOrderValue: 200000,
      memberTiers: ['Tất cả'],
      firstOrderOnly: false,
      birthdayMonthOnly: false,
      routesType: 'all',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      referralRequired: false,
      emailFollowRequired: false,
      priority: 'normal',
      status: 'running',
      usageCount: 150,
      limitPerUser: 2,
      revenueGenerated: 15000000
    },
    {
      stt: 14,
      code: 'NOVDEAL20',
      name: 'Khuyến mãi tháng 11 - Hello November',
      description: 'Săn deal sớm cho tháng 11 sắp tới.',
      discountType: 'fixed',
      discountValue: 20000,
      minOrderValue: 100000,
      memberTiers: ['Bạc', 'Vàng', 'Kim cương'],
      firstOrderOnly: false,
      birthdayMonthOnly: false,
      routesType: 'all',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      referralRequired: false,
      emailFollowRequired: false,
      priority: 'high',
      status: 'upcoming',
      usageCount: 0,
      limitPerUser: 1,
      revenueGenerated: 0
    }
  ];

  newVoucher: Partial<Voucher> = {
    code: '',
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscount: 50000,
    minOrderValue: 150000,
    memberTiers: ['Tất cả'],
    firstOrderOnly: false,
    birthdayMonthOnly: false,
    birthdayMonths: [],
    routesType: 'all',
    startDate: '2026-06-27',
    endDate: '2026-12-31',
    referralRequired: false,
    emailFollowRequired: false,
    priority: 'normal',
    status: 'running',
    usageCount: 0,
    limitPerUser: 1,
    revenueGenerated: 0
  };

  assignMode = false;
  showForm = false;
  targetType: 'all' | 'tier' | 'birthday' | 'first_order' | 'assigned' = 'all';
  assignedCustomerEmail = '';
  assignedReason: 'complaint' | 'delay_cancel' | 'system_error' | 'custom_compensation' = 'complaint';
  assignedNote = '';

  searchText = '';
  filterStatus = 'all';
  filterTier = 'all';

  selectedVoucherForStats: Voucher | null = null;
  showStatsModal = false;
  voucherPendingDelete: Voucher | null = null;
  formFeedbackMessage = '';
  formFeedbackType: 'error' | 'success' = 'success';
  minAllowedDate: string = '';

  get mostUsedVoucher(): string {
    if (!this.vouchers || this.vouchers.length === 0) return 'Không có';
    const sorted = [...this.vouchers].sort((a, b) => b.usageCount - a.usageCount);
    return `${sorted[0].code} (${sorted[0].usageCount} lượt)`;
  }
  
  availableTiers = ['Tất cả', 'Bạc', 'Vàng', 'Kim cương'];

  routesList = [
    'TP.HCM ↔ Cần Thơ',
    'TP.HCM ↔ Vũng Tàu',
    'TP.HCM ↔ Đà Lạt',
    'Đà Lạt ↔ Nha Trang',
    'TP.HCM ↔ Nha Trang',
    'Cần Thơ ↔ Rạch Giá',
    'Đà Lạt ↔ Buôn Ma Thuột',
    'TP.HCM ↔ Phan Thiết'
  ];

  monthOptions = [
    { value: '01', label: 'Tháng 1' },
    { value: '02', label: 'Tháng 2' },
    { value: '03', label: 'Tháng 3' },
    { value: '04', label: 'Tháng 4' },
    { value: '05', label: 'Tháng 5' },
    { value: '06', label: 'Tháng 6' },
    { value: '07', label: 'Tháng 7' },
    { value: '08', label: 'Tháng 8' },
    { value: '09', label: 'Tháng 9' },
    { value: '10', label: 'Tháng 10' },
    { value: '11', label: 'Tháng 11' },
    { value: '12', label: 'Tháng 12' }
  ];

  mockCustomerUsage = [
    { emailOrPhone: 'nguyen.an@gmail.com', name: 'Nguyễn Văn An', time: '2026-06-25 14:32', tickets: 2, orderVal: 360000, savedVal: 50000 },
    { emailOrPhone: '0901234567', name: 'Trần Thị Mai', time: '2026-06-24 09:15', tickets: 1, orderVal: 180000, savedVal: 36000 },
    { emailOrPhone: 'hoang.nam@outlook.com', name: 'Lê Hoàng Nam', time: '2026-06-23 18:40', tickets: 4, orderVal: 720000, savedVal: 50000 },
    { emailOrPhone: '0988776655', name: 'Phạm Minh Đức', time: '2026-06-22 11:22', tickets: 2, orderVal: 400000, savedVal: 40000 }
  ];

  ngOnInit() {
    const now = new Date();
    this.minAllowedDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().substring(0, 10);
    this.autoCalculateVoucherStatuses();
  }

  autoCalculateVoucherStatuses() {
    const todayStr = new Date().toISOString().substring(0, 10);
    this.vouchers.forEach(v => {
      // Keep manual statuses like 'draft', 'paused', or 'locked'
      if (v.status === 'paused' || (v as any).status === 'locked' || (v as any).status === 'draft') return;

      if (v.startDate > todayStr) {
        v.status = 'upcoming';
      } else if (v.startDate <= todayStr && v.endDate >= todayStr) {
        v.status = 'running';
      } else {
        v.status = 'expired';
      }
    });
  }

  get filteredVouchers(): Voucher[] {
    this.autoCalculateVoucherStatuses();
    const filtered = this.vouchers.filter(v => {
      const matchSearch = v.code.toLowerCase().includes(this.searchText.toLowerCase()) || 
                          v.name.toLowerCase().includes(this.searchText.toLowerCase()) || 
                          v.description.toLowerCase().includes(this.searchText.toLowerCase());
      
      const matchStatus = this.filterStatus === 'all' || 
                          (this.filterStatus === 'running' && v.status === 'running') ||
                          (this.filterStatus === 'upcoming' && v.status === 'upcoming') ||
                          (this.filterStatus === 'paused' && v.status === 'paused') ||
                          (this.filterStatus === 'expired' && v.status === 'expired') ||
                          (this.filterStatus === 'locked' && (v as any).status === 'locked');

      const matchTier = this.filterTier === 'all' || 
                        v.memberTiers.includes(this.filterTier) || 
                        v.memberTiers.includes('Tất cả');

      return matchSearch && matchStatus && matchTier;
    });

    const statusOrder: { [key: string]: number } = {
      'running': 1,
      'upcoming': 2,
      'paused': 3,
      'expired': 4,
      'locked': 5
    };

    return filtered.sort((a, b) => {
      const orderA = statusOrder[a.status] || 99;
      const orderB = statusOrder[b.status] || 99;
      return orderA - orderB;
    });
  }

  generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'VGO';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.newVoucher.code = code;
  }

  onTierCheckboxChange(tier: string, event: any) {
    if (!this.newVoucher.memberTiers) {
      this.newVoucher.memberTiers = [];
    }
    if (event.target.checked) {
      if (tier === 'Tất cả') {
        this.newVoucher.memberTiers = ['Tất cả'];
      } else {
        this.newVoucher.memberTiers = this.newVoucher.memberTiers.filter(t => t !== 'Tất cả');
        this.newVoucher.memberTiers.push(tier);
      }
    } else {
      this.newVoucher.memberTiers = this.newVoucher.memberTiers.filter(t => t !== tier);
      if (this.newVoucher.memberTiers.length === 0) {
        this.newVoucher.memberTiers = ['Tất cả'];
      }
    }
  }

  onBirthdayMonthChange(monthValue: string, event: any) {
    if (!this.newVoucher.birthdayMonths) {
      this.newVoucher.birthdayMonths = [];
    }

    if (event.target.checked) {
      if (!this.newVoucher.birthdayMonths.includes(monthValue)) {
        this.newVoucher.birthdayMonths.push(monthValue);
      }
    } else {
      this.newVoucher.birthdayMonths = this.newVoucher.birthdayMonths.filter(month => month !== monthValue);
    }
  }

  clearBirthdayMonths() {
    this.newVoucher.birthdayMonths = [];
  }

  saveVoucher() {
    const rawCode = (this.newVoucher.code || '').trim().replace(/\s+/g, '').toUpperCase();
    const rawName = (this.newVoucher.name || '').trim();

    if (!rawCode || !rawName) {
      this.showFormFeedback('Vui lòng nhập đầy đủ Mã voucher và Tên chương trình (không chỉ chứa khoảng trắng)!', 'error');
      return;
    }

    // Date check
    if (this.newVoucher.startDate && this.newVoucher.endDate && this.newVoucher.endDate < this.newVoucher.startDate) {
      this.showFormFeedback('Ngày kết thúc không thể trước ngày bắt đầu!', 'error');
      return;
    }
    
    const index = this.vouchers.findIndex(v => v.code === rawCode);
    
    if (index < 0 && this.newVoucher.startDate && this.newVoucher.startDate < this.minAllowedDate) {
      this.showFormFeedback('Không thể tạo khuyến mãi có ngày bắt đầu trong quá khứ!', 'error');
      return;
    }

    // Percentage check
    if (this.newVoucher.discountType === 'percentage') {
      const val = Number(this.newVoucher.discountValue);
      if (isNaN(val) || val < 1 || val > 100) {
        this.showFormFeedback('Mức giảm theo phần trăm phải nằm trong khoảng từ 1% đến 100%!', 'error');
        return;
      }
    }

    // Amount check
    if (Number(this.newVoucher.discountValue) < 0 || Number(this.newVoucher.minOrderValue) < 0) {
      this.showFormFeedback('Giá trị giảm vé và Đơn tối thiểu phải từ 0 trở lên!', 'error');
      return;
    }

    const voucherToSave: Voucher = {
      stt: index >= 0 ? this.vouchers[index].stt : this.vouchers.length + 1,
      code: rawCode,
      name: rawName,
      description: (this.newVoucher.description || '').trim(),
      discountType: this.newVoucher.discountType || 'percentage',
      discountValue: Number(this.newVoucher.discountValue) || 0,
      maxDiscount: this.newVoucher.maxDiscount ? Number(this.newVoucher.maxDiscount) : undefined,
      minOrderValue: Number(this.newVoucher.minOrderValue) || 0,
      memberTiers: this.newVoucher.memberTiers || ['Tất cả'],
      firstOrderOnly: !!this.newVoucher.firstOrderOnly,
      birthdayMonthOnly: !!this.newVoucher.birthdayMonthOnly,
      birthdayMonths: this.newVoucher.birthdayMonths || [],
      routesType: this.newVoucher.routesType || 'all',
      selectedRoutes: this.newVoucher.selectedRoutes || [],
      startDate: this.newVoucher.startDate || new Date().toISOString().substring(0, 10),
      endDate: this.newVoucher.endDate || '2026-12-31',
      referralRequired: !!this.newVoucher.referralRequired,
      emailFollowRequired: !!this.newVoucher.emailFollowRequired,
      priority: this.newVoucher.priority || 'normal',
      status: this.newVoucher.status || 'running',
      usageCount: index >= 0 ? this.vouchers[index].usageCount : 0,
      limitPerUser: Math.max(1, Number(this.newVoucher.limitPerUser) || 1),
      revenueGenerated: index >= 0 ? this.vouchers[index].revenueGenerated : 0
    };

    if (this.targetType === 'assigned') {
      this.assignMode = true;
      voucherToSave.firstOrderOnly = false;
      voucherToSave.birthdayMonthOnly = false;
      voucherToSave.memberTiers = ['Tất cả'];
      if (this.assignedCustomerEmail) {
        voucherToSave.assignedCustomer = {
          emailOrPhone: this.assignedCustomerEmail,
          reason: this.assignedReason,
          note: this.assignedNote,
          used: false
        };
      }
    } else {
      this.assignMode = false;
      delete voucherToSave.assignedCustomer;
      
      if (this.targetType === 'first_order') {
        voucherToSave.firstOrderOnly = true;
        voucherToSave.birthdayMonthOnly = false;
        voucherToSave.birthdayMonths = [];
        voucherToSave.memberTiers = ['Tất cả'];
      } else if (this.targetType === 'birthday') {
        voucherToSave.firstOrderOnly = false;
        voucherToSave.birthdayMonthOnly = true;
        voucherToSave.birthdayMonths = this.newVoucher.birthdayMonths || [];
        voucherToSave.memberTiers = ['Tất cả'];
      } else if (this.targetType === 'tier') {
        voucherToSave.firstOrderOnly = false;
        voucherToSave.birthdayMonthOnly = false;
        voucherToSave.birthdayMonths = [];
      } else {
        voucherToSave.firstOrderOnly = false;
        voucherToSave.birthdayMonthOnly = false;
        voucherToSave.birthdayMonths = [];
        voucherToSave.memberTiers = ['Tất cả'];
      }
    }

    if (index >= 0) {
      this.vouchers[index] = voucherToSave;
      this.showFormFeedback(`Đã cập nhật mã voucher ${voucherToSave.code} thành công!`, 'success');
    } else {
      this.vouchers.unshift(voucherToSave);
      this.showFormFeedback(`Đã tạo mã voucher ${voucherToSave.code} thành công!`, 'success');
    }

    this.selectedVoucherForStats = voucherToSave;
    this.showForm = false;
    this.resetForm();
  }

  resetForm() {
    this.formFeedbackMessage = '';
    
    const now = new Date();
    this.minAllowedDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().substring(0, 10);
    const defaultEnd = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    defaultEnd.setMonth(defaultEnd.getMonth() + 1);
    
    this.newVoucher = {
      code: '',
      name: '',
      description: '',
      discountType: 'percentage',
      discountValue: 10,
      maxDiscount: 50000,
      minOrderValue: 150000,
      memberTiers: ['Tất cả'],
      firstOrderOnly: false,
      birthdayMonthOnly: false,
      birthdayMonths: [],
      routesType: 'all',
      startDate: this.minAllowedDate,
      endDate: defaultEnd.toISOString().substring(0, 10),
      referralRequired: false,
      emailFollowRequired: false,
      priority: 'normal',
      status: 'running',
      usageCount: 0,
      limitPerUser: 1,
      revenueGenerated: 0
    };
    this.assignMode = false;
    this.targetType = 'all';
    this.assignedCustomerEmail = '';
    this.assignedReason = 'complaint';
    this.assignedNote = '';
  }

  closeVoucherForm() {
    this.showForm = false;
    this.resetForm();
  }

  openNewVoucher() {
    this.resetForm();
    this.showForm = true;
  }

  editVoucher(voucher: Voucher) {
    this.newVoucher = { ...voucher };
    if (voucher.assignedCustomer) {
      this.targetType = 'assigned';
      this.assignMode = true;
      this.assignedCustomerEmail = voucher.assignedCustomer.emailOrPhone;
      this.assignedReason = voucher.assignedCustomer.reason;
      this.assignedNote = voucher.assignedCustomer.note;
    } else {
      this.assignMode = false;
      this.assignedCustomerEmail = '';
      this.assignedReason = 'complaint';
      this.assignedNote = '';
      
      if (voucher.firstOrderOnly) {
        this.targetType = 'first_order';
      } else if (voucher.birthdayMonthOnly) {
        this.targetType = 'birthday';
      } else if (voucher.memberTiers && !voucher.memberTiers.includes('Tất cả')) {
        this.targetType = 'tier';
      } else {
        this.targetType = 'all';
      }
    }
    this.showForm = true;
    const element = document.getElementById('voucher-form-card');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  deleteVoucher(voucher: Voucher) {
    this.voucherPendingDelete = voucher;
  }

  deleteEditingVoucher() {
    if (!this.newVoucher.code) {
      return;
    }
    const voucher = this.vouchers.find(v => v.code === this.newVoucher.code);
    if (!voucher) {
      return;
    }
    this.showForm = false;
    this.deleteVoucher(voucher);
  }

  cancelDeleteVoucher() {
    this.voucherPendingDelete = null;
  }

  confirmDeleteVoucher() {
    if (!this.voucherPendingDelete) {
      return;
    }
    const voucher = this.voucherPendingDelete;
    this.vouchers = this.vouchers.filter(v => v.code !== voucher.code);
    if (this.selectedVoucherForStats?.code === voucher.code) {
      this.selectedVoucherForStats = this.vouchers.length > 0 ? this.vouchers[0] : null;
    }
    this.voucherPendingDelete = null;
  }

  viewStats(voucher: Voucher) {
    this.selectedVoucherForStats = voucher;
    this.showStatsModal = true;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(value)
      .replace('₫', 'đ');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'running': return 'badge-success';
      case 'upcoming': return 'badge-warning';
      case 'paused': return 'badge-secondary';
      case 'expired': return 'badge-danger';
      default: return 'badge-light';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'running': return 'Đang chạy';
      case 'upcoming': return 'Sắp diễn ra';
      case 'paused': return 'Tạm dừng';
      case 'expired': return 'Hết hạn';
      default: return 'Không xác định';
    }
  }

  get totalActiveVouchers(): number {
    return this.vouchers.filter(v => v.status === 'running').length;
  }

  get totalVoucherUsages(): number {
    return this.vouchers.reduce((acc, v) => acc + v.usageCount, 0);
  }

  get totalVoucherRevenue(): number {
    return this.vouchers.reduce((acc, v) => acc + v.revenueGenerated, 0);
  }

  private showFormFeedback(message: string, type: 'error' | 'success') {
    this.formFeedbackMessage = message;
    this.formFeedbackType = type;
  }

  getReasonLabel(reason: string): string {
    switch (reason) {
      case 'complaint': return 'Khiếu nại / sự cố';
      case 'delay_cancel': return 'Chuyến trễ / hủy';
      case 'system_error': return 'Lỗi hệ thống';
      case 'custom_compensation': return 'Bồi thường tùy chọn';
      default: return 'Khác';
    }
  }
}
