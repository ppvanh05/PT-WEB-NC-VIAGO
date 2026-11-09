import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface VehicleImage {
  url: string;
  caption: string;
}

export interface DriverProfile {
  id: number;
  name: string;
  avatar: string;
  experience: string;
  rating: number;
  tripsCount: number;
  specialty: string;
}

export interface VehicleDetail {
  id: number;
  name: string;
  category: string;
  passengers: string;
  pricePerDay: number;
  priceFormatted: string;
  images: VehicleImage[];
  selectedImageIndex: number;
  rating: number;
  reviewsCount: number;
  amenities: string[];
  description: string;
  engine: string;
  fuel: string;
  year: number;
  transmission: string;
  depositRequired: string;
}

export interface PromoCode {
  code: string;
  desc: string;
  discountText: string;
}

export interface BookingOrder {
  orderId: string;
  vehicleName: string;
  vehicleCategory: string;
  vehicleImage: string;
  rentalType: 'driver' | 'self';
  driverName: string;
  fullName: string;
  phone: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  pickupLocation: string;
  pricePerDay: string;
  totalPrice: string;
  appliedPromo: string;
  note: string;
  submittedAt: string;
  // Step statuses: 'done' | 'active' | 'pending'
  steps: BookingStep[];
}

export interface BookingStep {
  key: 'submitted' | 'approved' | 'contract' | 'confirmed';
  label: string;
  desc: string;
  time: string | null;
  status: 'done' | 'active' | 'pending';
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class Services {
  // Navigation State: 'list' | 'detail' | 'order'
  viewState: 'list' | 'detail' | 'order' = 'list';
  activeVehicle: VehicleDetail | null = null;
  activeDetailTab: 'overview' | 'conditions' | 'drivers' | 'policy' | 'promo' = 'overview';

  // Current booking order (after submit)
  currentOrder: BookingOrder | null = null;

  // Booking Form State
  bookingForm = {
    rentalType: 'driver' as 'driver' | 'self',
    fullName: '',
    phone: '',
    startDate: '2026-10-12',
    endDate: '2026-10-13',
    pickupLocation: 'TP. Hồ Chí Minh',
    selectedDriverId: 1,
    appliedPromo: '',
    note: ''
  };

  // Promos List
  promosList: PromoCode[] = [
    { code: 'VIAGOWELCOME', desc: 'Giảm ngay 10% cho khách hàng thuê xe lần đầu tại VIAGO', discountText: 'Giảm 10%' },
    { code: 'WEEKENDVIP', desc: 'Giảm 150.000đ cho chuyến đi cuối tuần từ 2 ngày trở lên', discountText: 'Giảm 150K' },
    { code: 'SUMMERTRIP', desc: 'Ưu đãi giảm 300.000đ cho hợp đồng thuê xe từ 3 ngày', discountText: 'Giảm 300K' }
  ];

  // Drivers List
  driversList: DriverProfile[] = [
    {
      id: 1,
      name: 'Nguyễn Văn Hùng',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      experience: '12 năm kinh nghiệm',
      rating: 4.9,
      tripsCount: 450,
      specialty: 'Chuyên tuyến Sài Gòn ↔ Vũng Tàu, Cần Thơ, Miền Tây'
    },
    {
      id: 2,
      name: 'Trần Quốc Tuấn',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
      experience: '9 năm kinh nghiệm',
      rating: 5.0,
      tripsCount: 320,
      specialty: 'Chuyên tuyến Sài Gòn ↔ Đà Lạt, Nha Trang, Phan Thiết'
    },
    {
      id: 3,
      name: 'Lê Minh Hoàng',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
      experience: '15 năm kinh nghiệm',
      rating: 4.9,
      tripsCount: 580,
      specialty: 'Chuyên đưa đón hội nghị VIP, khách quốc tế (Giao tiếp Tiếng Anh)'
    }
  ];

  // Exact 3 Vehicles requested by User
  vehiclesList: VehicleDetail[] = [
    {
      id: 1,
      name: 'Limousine 9 chỗ',
      category: 'Ghế VIP',
      passengers: 'Tối đa 9 khách',
      pricePerDay: 1200000,
      priceFormatted: '1.200.000đ',
      selectedImageIndex: 0,
      images: [
        { url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1000&auto=format&fit=crop&q=80', caption: 'Ngoại thất Limousine 9 chỗ' },
        { url: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=1000&auto=format&fit=crop&q=80', caption: 'Hàng ghế VIP da ngả lưng 180 độ' },
        { url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1000&auto=format&fit=crop&q=80', caption: 'Khoang nội thất sang trọng' },
        { url: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=1000&auto=format&fit=crop&q=80', caption: 'Khoang hành lý rộng rãi' }
      ],
      rating: 4.9,
      reviewsCount: 152,
      amenities: [
        'Ghế da VIP bọc da Ý ngả lưng 180 độ',
        'Wifi 5G tốc độ cao không giới hạn',
        'Cổng sạc USB & Type-C từng vị trí ghế',
        'Tivi LED 21 inch & Hệ thống âm thanh Sony 8 loa',
        'Tủ lạnh mini 18 lít phục vụ nước lạnh',
        'Cửa lùa tự động chống kẹt an toàn',
        'Đèn bầu trời sao trang hoàng sang trọng'
      ],
      description: 'Dòng xe Limousine 9 chỗ cao cấp phù hợp cho các chuyến đi đón khách VIP, doanh nhân công tác, hoặc du lịch gia đình nhỏ cần sự riêng tư và tiện nghi 5 sao.',
      engine: '2.2L Diesel Turbo',
      fuel: 'Dầu Diesel',
      year: 2025,
      transmission: 'Tự động 8 cấp',
      depositRequired: '15.000.000đ hoặc 01 Xe máy kèm Cavet gốc'
    },
    {
      id: 2,
      name: 'Giường nằm 34 chỗ',
      category: 'Giường đơn',
      passengers: 'Tối đa 34 khách',
      pricePerDay: 3500000,
      priceFormatted: '3.500.000đ',
      selectedImageIndex: 0,
      images: [
        { url: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=1000&auto=format&fit=crop&q=80', caption: 'Ngoại thất xe giường nằm 34 chỗ' },
        { url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1000&auto=format&fit=crop&q=80', caption: 'Khoang giường nằm 34 chỗ bọc da' },
        { url: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=1000&auto=format&fit=crop&q=80', caption: 'Rèm che cá nhân kín đáo' },
        { url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1000&auto=format&fit=crop&q=80', caption: 'Khoang hành lý dưới bụng xe cực đại' }
      ],
      rating: 4.8,
      reviewsCount: 218,
      amenities: [
        '34 Giường đơn bọc da cao cấp êm ái',
        'Điều hòa hai chiều riêng biệt từng vị trí',
        'Màn hình LCD giải trí cá nhân',
        'Chăn gối tiệt trùng mềm mại',
        'Khăn lạnh & Nước tinh khiết miễn phí',
        'Khoang hành lý bụng xe chứa 34 vali lớn',
        'Hệ thống giảm xóc bọt khí nén tiêu chuẩn Châu Âu'
      ],
      description: 'Xe giường nằm 34 chỗ thế hệ mới mang lại giấc ngủ êm ái cho các chuyến du lịch liên tỉnh, team building công ty hoặc tour lữ hành đường dài.',
      engine: 'Hino 380HP Turbocharged',
      fuel: 'Dầu Diesel',
      year: 2025,
      transmission: 'Số sàn 6 cấp',
      depositRequired: '20.000.000đ hoặc hợp đồng doanh nghiệp'
    },
    {
      id: 3,
      name: 'Cabin 22 phòng',
      category: 'Cabin cao cấp',
      passengers: 'Tối đa 22 khách',
      pricePerDay: 4500000,
      priceFormatted: '4.500.000đ',
      selectedImageIndex: 0,
      images: [
        { url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1000&auto=format&fit=crop&q=80', caption: 'Ngoại thất Chuyên cơ mặt đất Cabin 22 phòng' },
        { url: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=1000&auto=format&fit=crop&q=80', caption: 'Phòng Cabin riêng biệt với rèm kéo riêng tư' },
        { url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1000&auto=format&fit=crop&q=80', caption: 'Nhà vệ sinh WC hiện đại sạch sẽ trên xe' },
        { url: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=1000&auto=format&fit=crop&q=80', caption: 'Màn hình cảm ứng & ghế massage tự động' }
      ],
      rating: 5.0,
      reviewsCount: 310,
      amenities: [
        '22 Phòng Cabin biệt lập có rèm kéo riêng tư',
        'Nhà vệ sinh WC tự động làm sạch tiệt trùng trên xe',
        'Ghế giường nằm tích hợp chế độ Massage tự động',
        'Màn hình cảm ứng giải trí Android & Tai nghe riêng',
        'Đèn viền LED bầu trời sao lãng mạn',
        'Cổng sạc không dây & Ổ cắm điện 220V',
        'Phục vụ nước suối, trà, khăn lạnh miễn phí'
      ],
      description: 'Chuyên cơ mặt đất Cabin 22 phòng đẳng cấp nhất VIAGO, thiết kế riêng tư biệt lập như phòng khách sạn 5 sao di động.',
      engine: 'Hyundai Universe 420HP Euro 5',
      fuel: 'Dầu Diesel',
      year: 2026,
      transmission: 'Số sàn 6 cấp',
      depositRequired: '25.000.000đ hoặc bảo lãnh doanh nghiệp'
    }
  ];

  // 6 Compact Informational Cards
  serviceInfoList = [
    { id: 1, title: 'Du lịch', subtitle: 'Nghỉ dưỡng, tham quan' },
    { id: 2, title: 'Công tác', subtitle: 'Lịch trình linh hoạt' },
    { id: 3, title: 'Sân bay', subtitle: 'Đón tiễn đúng giờ' },
    { id: 4, title: 'Đám cưới', subtitle: 'Xe đoàn trang trọng' },
    { id: 5, title: 'Sự kiện', subtitle: 'Phục vụ theo đoàn' },
    { id: 6, title: 'Team Building', subtitle: 'Di chuyển nhóm lớn' }
  ];

  // ─── NAVIGATION ACTIONS ──────────────────────────────────────────────────

  selectVehicle(vehicle: VehicleDetail): void {
    this.activeVehicle = { ...vehicle, selectedImageIndex: 0 };
    this.activeDetailTab = 'overview';
    this.viewState = 'detail';
    this.scrollToTop();
  }

  backToList(): void {
    this.activeVehicle = null;
    this.viewState = 'list';
    this.scrollToTop();
  }

  goToHome(): void {
    this.activeVehicle = null;
    this.currentOrder = null;
    this.viewState = 'list';
    this.scrollToTop();
  }

  viewAnotherVehicle(): void {
    this.currentOrder = null;
    this.viewState = 'list';
    this.scrollToTop();
  }

  selectDetailImage(index: number): void {
    if (this.activeVehicle) {
      this.activeVehicle.selectedImageIndex = index;
    }
  }

  applyPromoCode(code: string): void {
    this.bookingForm.appliedPromo = code;
  }

  // ─── BOOKING SUBMIT ──────────────────────────────────────────────────────

  submitBookingForm(): void {
    if (!this.activeVehicle) return;
    const veh = this.activeVehicle;

    // Calculate total days
    const start = new Date(this.bookingForm.startDate);
    const end = new Date(this.bookingForm.endDate);
    const diffMs = end.getTime() - start.getTime();
    const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Find selected driver name
    const selectedDriver = this.driversList.find(d => d.id === this.bookingForm.selectedDriverId);
    const driverName = this.bookingForm.rentalType === 'driver' && selectedDriver
      ? selectedDriver.name
      : 'Tự lái';

    // Compute total price
    const totalPrice = (veh.pricePerDay * totalDays).toLocaleString('vi-VN') + 'đ';

    // Build order ID
    const orderId = 'VG' + Date.now().toString().slice(-8).toUpperCase();

    // Timestamp
    const now = new Date();
    const submittedAt = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}, ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()}`;

    // Build steps (Shopee-style)
    this.currentOrder = {
      orderId,
      vehicleName: veh.name,
      vehicleCategory: veh.category,
      vehicleImage: veh.images[0].url,
      rentalType: this.bookingForm.rentalType,
      driverName,
      fullName: this.bookingForm.fullName,
      phone: this.bookingForm.phone,
      startDate: this.bookingForm.startDate,
      endDate: this.bookingForm.endDate,
      totalDays,
      pickupLocation: this.bookingForm.pickupLocation,
      pricePerDay: veh.priceFormatted,
      totalPrice,
      appliedPromo: this.bookingForm.appliedPromo,
      note: this.bookingForm.note,
      submittedAt,
      steps: [
        {
          key: 'submitted',
          label: 'Yêu cầu đã gửi',
          desc: 'Yêu cầu thuê xe của bạn đã được tiếp nhận thành công. VIAGO đang xem xét.',
          time: submittedAt,
          status: 'done'
        },
        {
          key: 'approved',
          label: 'Nhà xe đang duyệt',
          desc: 'Đội ngũ VIAGO đang kiểm tra lịch trình và xác nhận tính khả dụng của xe.',
          time: null,
          status: 'active'
        },
        {
          key: 'contract',
          label: 'Ký kết hợp đồng',
          desc: 'Nhân viên VIAGO sẽ liên hệ qua số điện thoại của bạn để thống nhất hợp đồng và thanh toán.',
          time: null,
          status: 'pending'
        },
        {
          key: 'confirmed',
          label: 'Thuê xe thành công',
          desc: `Chuyến đi đã được xác nhận. Xe sẽ phục vụ từ ngày ${this.bookingForm.startDate} đến ${this.bookingForm.endDate}.`,
          time: null,
          status: 'pending'
        }
      ]
    };

    this.viewState = 'order';
    this.scrollToTop();
  }

  // Format date from YYYY-MM-DD to DD/MM/YYYY
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
