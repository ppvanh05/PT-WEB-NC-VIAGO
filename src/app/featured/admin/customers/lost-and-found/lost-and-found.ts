import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../../core/services/toast.service';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker';

export interface LostItem {
  ma_do_that_lac: string;
  ma_ve: string;
  ma_khach_hang?: string | null;
  ten_khach_hang: string;
  so_dien_thoai: string;
  email: string;
  tuyen_xe: string;
  ngay_di_chuyen: string;
  ngay_bao_mat: string;
  vi_tri_ghe?: string | null;
  mo_ta_vat_pham: string;
  vi_tri_tim_thay?: string | null;
  thoi_gian_tim_thay?: string | null;
  hinh_anh?: string | null;
  hinh_anh_tim_thay?: string | null;
  ghi_chu?: string | null;
  trang_thai: 'Đang tìm kiếm' | 'Đã tìm thấy' | 'Đã trả khách' | 'Đóng yêu cầu';
  ngay_tao: string;
  ngay_cap_nhat: string;
}

export interface TicketInfo {
  ma_ve: string;
  ten_khach_hang: string;
  so_dien_thoai: string;
  email: string;
  tuyen_xe: string;
  ngay_di_chuyen: string;
  vi_tri_ghe: string;
}

const MOCK_TICKETS: Record<string, TicketInfo> = {
  'VE00001': {
    ma_ve: 'VE00001',
    ten_khach_hang: 'Nguyễn Văn Hùng',
    so_dien_thoai: '0912345678',
    email: 'hung.nv@example.com',
    tuyen_xe: 'TP.HCM → Cần Thơ',
    ngay_di_chuyen: '2026-07-01',
    vi_tri_ghe: 'Phòng A12'
  },
  'VE00002': {
    ma_ve: 'VE00002',
    ten_khach_hang: 'Trần Thị Lan',
    so_dien_thoai: '0987654321',
    email: 'lan.tt@example.com',
    tuyen_xe: 'TP.HCM → Đà Lạt',
    ngay_di_chuyen: '2026-06-30',
    vi_tri_ghe: 'Ghế số 12'
  },
  'VE00003': {
    ma_ve: 'VE00003',
    ten_khach_hang: 'Lê Minh Triết',
    so_dien_thoai: '0905123456',
    email: 'triet.lm@example.com',
    tuyen_xe: 'Đà Lạt → TP.HCM',
    ngay_di_chuyen: '2026-06-28',
    vi_tri_ghe: 'Ghế số 8'
  },
  'VE00004': {
    ma_ve: 'VE00004',
    ten_khach_hang: 'Phạm Thanh Thảo',
    so_dien_thoai: '0934567890',
    email: 'thao.pt@example.com',
    tuyen_xe: 'TP.HCM → Nha Trang',
    ngay_di_chuyen: '2026-07-02',
    vi_tri_ghe: 'Ghế số 2'
  },
  'VE00005': {
    ma_ve: 'VE00005',
    ten_khach_hang: 'Hoàng Anh Tuấn',
    so_dien_thoai: '0977112233',
    email: 'tuan.ha@example.com',
    tuyen_xe: 'Nha Trang → TP.HCM',
    ngay_di_chuyen: '2026-06-25',
    vi_tri_ghe: 'Ghế số 15'
  }
};

const MOCK_LOST_ITEMS: LostItem[] = [
  {
    ma_do_that_lac: "DTL00001",
    ma_ve: "VE00001",
    ma_khach_hang: "KH00084",
    ten_khach_hang: "Nguyễn Văn Hùng",
    so_dien_thoai: "0912345678",
    email: "hung.nv@example.com",
    tuyen_xe: "TP.HCM → Cần Thơ",
    ngay_di_chuyen: "2026-07-01",
    ngay_bao_mat: "2026-07-01",
    vi_tri_ghe: "Phòng A12",
    mo_ta_vat_pham: "Ví da nam màu đen, hiệu Tommy Hilfiger, bên trong có thẻ CCCD và bằng lái xe mang tên Nguyễn Văn Hùng",
    hinh_anh: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=300&q=80",
    hinh_anh_tim_thay: null,
    trang_thai: "Đang tìm kiếm",
    ngay_tao: "2026-07-01",
    ngay_cap_nhat: "11:00 2026-07-01",
    ghi_chu: "Khách báo rơi trên xe Limousine chạy tuyến TP.HCM - Cần Thơ."
  },
  {
    ma_do_that_lac: "DTL00002",
    ma_ve: "VE00002",
    ma_khach_hang: "KH00109",
    ten_khach_hang: "Trần Thị Lan",
    so_dien_thoai: "0987654321",
    email: "lan.tt@example.com",
    tuyen_xe: "TP.HCM → Đà Lạt",
    ngay_di_chuyen: "2026-06-30",
    ngay_bao_mat: "2026-06-30",
    vi_tri_ghe: "Ghế số 12",
    mo_ta_vat_pham: "Điện thoại iPhone 13 Pro màu xanh dương, ốp lưng nhựa dẻo trong suốt, màn hình có vết trầy nhẹ",
    hinh_anh: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=300&q=80",
    hinh_anh_tim_thay: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=300&q=80",
    vi_tri_tim_thay: "Dưới khe ghế số 12, gần cửa sổ máy lạnh",
    thoi_gian_tim_thay: "2026-07-01T08:00",
    trang_thai: "Đã tìm thấy",
    ngay_tao: "2026-06-30",
    ngay_cap_nhat: "08:00 2026-07-01",
    ghi_chu: "Tài xế đã nhặt được khi dọn vệ sinh xe cuối ngày."
  },
  {
    ma_do_that_lac: "DTL00003",
    ma_ve: "VE00003",
    ma_khach_hang: null,
    ten_khach_hang: "Lê Minh Triết",
    so_dien_thoai: "0905123456",
    email: "triet.lm@example.com",
    tuyen_xe: "Đà Lạt → TP.HCM",
    ngay_di_chuyen: "2026-06-28",
    ngay_bao_mat: "2026-06-28",
    vi_tri_ghe: "Ghế số 8",
    mo_ta_vat_pham: "Balo vải thô màu xám sẫm nhãn hiệu Coolbell, bên trong chứa sách giáo khoa và một bộ sạc laptop Asus",
    hinh_anh: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=300&q=80",
    hinh_anh_tim_thay: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=300&q=80",
    vi_tri_tim_thay: "Hộc đựng hành lý phía trên ghế ngồi hàng số 8",
    thoi_gian_tim_thay: "2026-06-28T09:30",
    trang_thai: "Đã trả khách",
    ngay_tao: "2026-06-28",
    ngay_cap_nhat: "14:00 2026-06-29",
    ghi_chu: "Đã bàn giao lại cho khách tại văn phòng nhà xe ViAGO."
  },
  {
    ma_do_that_lac: "DTL00004",
    ma_ve: "VE00004",
    ma_khach_hang: "KH00155",
    ten_khach_hang: "Phạm Thanh Thảo",
    so_dien_thoai: "0934567890",
    email: "thao.pt@example.com",
    tuyen_xe: "TP.HCM → Nha Trang",
    ngay_di_chuyen: "2026-07-02",
    ngay_bao_mat: "2026-07-02",
    vi_tri_ghe: "Ghế số 2",
    mo_ta_vat_pham: "Kính mắt thời trang gọng kim loại mạ vàng, tròng kính đóng nhạt, đựng trong bao da màu nâu hiệu Gentle Monster",
    hinh_anh: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=300&q=80",
    hinh_anh_tim_thay: null,
    trang_thai: "Đang tìm kiếm",
    ngay_tao: "2026-07-02",
    ngay_cap_nhat: "19:00 2026-07-02",
    ghi_chu: "Khách nghi để quên ở hộc đựng nước cạnh ghế ngồi số 2."
  },
  {
    ma_do_that_lac: "DTL00005",
    ma_ve: "VE00005",
    ma_khach_hang: null,
    ten_khach_hang: "Hoàng Anh Tuấn",
    so_dien_thoai: "0977112233",
    email: "tuan.ha@example.com",
    tuyen_xe: "Nha Trang → TP.HCM",
    ngay_di_chuyen: "2026-06-25",
    ngay_bao_mat: "2026-06-25",
    vi_tri_ghe: "Ghế số 15",
    mo_ta_vat_pham: "Tai nghe Airpods đựng trong kén sạc màu trắng có dán sticker màu cam",
    hinh_anh: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=300&q=80",
    hinh_anh_tim_thay: null,
    trang_thai: "Đóng yêu cầu",
    ngay_tao: "2026-06-25",
    ngay_cap_nhat: "10:00 2026-06-27",
    ghi_chu: "Khách hàng liên hệ lại thông báo đã tìm thấy tai nghe nằm sâu trong túi xách cá nhân tại nhà."
  },
  {
    ma_do_that_lac: "DTL00006",
    ma_ve: "VE00201",
    ma_khach_hang: "KH00201",
    ten_khach_hang: "Vũ Hoàng Giang",
    so_dien_thoai: "0911223344",
    email: "giang.vh@example.com",
    tuyen_xe: "TP.HCM → Vũng Tàu",
    ngay_di_chuyen: "2026-06-29",
    ngay_bao_mat: "2026-06-29",
    vi_tri_ghe: "Ghế số 6",
    mo_ta_vat_pham: "Đồng hồ thông minh Apple Watch Series 7 màu đen gọng nhôm dây cao su",
    hinh_anh: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=300&q=80",
    hinh_anh_tim_thay: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=300&q=80",
    vi_tri_tim_thay: "Cạnh hộc cửa xe bên lái phụ",
    thoi_gian_tim_thay: "2026-06-29T18:30",
    trang_thai: "Đã tìm thấy",
    ngay_tao: "2026-06-29",
    ngay_cap_nhat: "18:30 2026-06-29",
    ghi_chu: "Đã cất trữ tại tủ đồ thất lạc văn phòng Vũng Tàu."
  },
  {
    ma_do_that_lac: "DTL00007",
    ma_ve: "VE00310",
    ma_khach_hang: null,
    ten_khach_hang: "Bùi Thị Mai",
    so_dien_thoai: "0966778899",
    email: "mai.bt@example.com",
    tuyen_xe: "Đà Lạt → TP.HCM",
    ngay_di_chuyen: "2026-06-27",
    ngay_bao_mat: "2026-06-27",
    vi_tri_ghe: "Ghế số 14",
    mo_ta_vat_pham: "Túi xách da nữ màu hồng pastel nhãn hiệu Charles & Keith",
    hinh_anh: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=300&q=80",
    hinh_anh_tim_thay: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=300&q=80",
    vi_tri_tim_thay: "Gầm ghế ngồi số 14",
    thoi_gian_tim_thay: "2026-06-27T19:15",
    trang_thai: "Đã trả khách",
    ngay_tao: "2026-06-27",
    ngay_cap_nhat: "10:30 2026-06-28",
    ghi_chu: "Hành khách đã qua văn phòng Lê Hồng Phong ký biên bản và nhận lại túi."
  },
  {
    ma_do_that_lac: "DTL00008",
    ma_ve: "VE00412",
    ma_khach_hang: "KH00310",
    ten_khach_hang: "Đặng Văn Lâm",
    so_dien_thoai: "0944556677",
    email: "lam.dv@example.com",
    tuyen_xe: "TP.HCM → Nha Trang",
    ngay_di_chuyen: "2026-06-26",
    ngay_bao_mat: "2026-06-26",
    vi_tri_ghe: "Phòng B2",
    mo_ta_vat_pham: "Laptop Dell Vostro màu đen xám, có dán sticker trang trí ở mặt trước máy",
    hinh_anh: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=300&q=80",
    hinh_anh_tim_thay: null,
    trang_thai: "Đang tìm kiếm",
    ngay_tao: "2026-06-26",
    ngay_cap_nhat: "21:00 2026-06-26",
    ghi_chu: "Đang đối soát trích xuất camera hành trình chuyến xe đêm ngày 26."
  },
  {
    ma_do_that_lac: "DTL00009",
    ma_ve: "VE00520",
    ma_khach_hang: null,
    ten_khach_hang: "Cao Văn Sang",
    so_dien_thoai: "0978123456",
    email: "sang.cv@example.com",
    tuyen_xe: "Cần Thơ → TP.HCM",
    ngay_di_chuyen: "2026-07-03",
    ngay_bao_mat: "2026-07-03",
    vi_tri_ghe: "Ghế số 10",
    mo_ta_vat_pham: "Áo khoác gió hiệu Uniqlo màu xanh navy gấp gọn",
    hinh_anh: null,
    hinh_anh_tim_thay: null,
    trang_thai: "Đang tìm kiếm",
    ngay_tao: "2026-07-03",
    ngay_cap_nhat: "15:20 2026-07-03",
    ghi_chu: "Khách báo quên ở hộc đựng đồ phía trên."
  }
];

@Component({
  selector: 'app-lost-and-found',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent],
  templateUrl: './lost-and-found.html',
  styleUrl: './lost-and-found.css'
})
export class LostAndFound implements OnInit {
  items: LostItem[] = [];
  filteredItems: LostItem[] = [];

  // Filters
  searchText = '';
  filterTrangThai = 'Tất cả trạng thái';
  filterTuyenXe = 'Tất cả tuyến xe';
  filterSort = 'Mới nhất';

  // Routes List
  routesList = [
    'TP.HCM → Cần Thơ',
    'Cần Thơ → TP.HCM',
    'TP.HCM → Vũng Tàu',
    'Vũng Tàu → TP.HCM',
    'Đà Lạt → Buôn Ma Thuột',
    'Buôn Ma Thuột → Đà Lạt',
    'Đà Lạt → Nha Trang',
    'Nha Trang → Đà Lạt',
    'Cần Thơ → Rạch Giá',
    'Rạch Giá → Cần Thơ',
    'TP.HCM → Phan Thiết',
    'Phan Thiết → TP.HCM',
    'TP.HCM → Đà Lạt',
    'Đà Lạt → TP.HCM',
    'TP.HCM → Nha Trang',
    'Nha Trang → TP.HCM',
    'Nha Trang → Đà Nẵng',
    'Đà Nẵng → Nha Trang'
  ];

  // Modals
  showCreateModal = false;
  showEditModal = false;
  showSuccessModal = false;
  successMessageTitle = '';
  successMessageBody = '';
  private successTimer: any = null;

  // Forms
  newItem: Partial<LostItem> = {
    ma_ve: '',
    mo_ta_vat_pham: '',
    tuyen_xe: '',
    ngay_di_chuyen: new Date().toISOString().slice(0, 10),
    ngay_bao_mat: new Date().toISOString().slice(0, 10),
    vi_tri_ghe: '',
    ten_khach_hang: '',
    so_dien_thoai: '',
    email: '',
    hinh_anh: '',
    ghi_chu: ''
  };
  createFormSubmitted = false;
  phoneTouchedCreate = false;
  emailTouchedCreate = false;
  phoneErrorCreate = '';
  emailErrorCreate = '';

  editingItem: LostItem | null = null;
  editFormSubmitted = false;
  phoneTouchedEdit = false;
  emailTouchedEdit = false;
  phoneErrorEdit = '';
  emailErrorEdit = '';

  // Pagination: Exactly 9 items per page
  itemsPerPage = 9;
  currentPage = 1;

  toastService = inject(ToastService);
  cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.items = [...MOCK_LOST_ITEMS];
    this.filterData();
  }

  // --- DATE FORMATTER (dd/mm/yyyy standard) ---
  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const str = dateStr.trim();
    if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
      return str.slice(0, 10);
    }
    const parts = str.split(' ')[0].split('T')[0];
    if (parts.includes('-')) {
      const [year, month, day] = parts.split('-');
      if (year && month && day) {
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
    }
    return dateStr;
  }

  // --- DATETIME FORMATTER (HH:mm dd/mm/yyyy standard - Time before Date) ---
  formatDateTime(dateTimeStr: string | null | undefined): string {
    if (!dateTimeStr) return '';
    const str = dateTimeStr.trim();

    // Format "HH:mm YYYY-MM-DD" or "HH:mm DD/MM/YYYY"
    if (/^\d{2}:\d{2}\s/.test(str)) {
      const [t, d] = str.split(' ');
      return `${t} ${this.formatDate(d)}`;
    }

    // ISO string "YYYY-MM-DDTHH:mm"
    if (str.includes('T')) {
      const [d, t] = str.split('T');
      const formattedD = this.formatDate(d);
      const formattedT = t ? t.slice(0, 5) : '00:00';
      return `${formattedT} ${formattedD}`;
    }

    // String "YYYY-MM-DD HH:mm"
    if (str.includes(' ')) {
      const parts = str.split(' ');
      if (parts[0].includes('-')) {
        const formattedD = this.formatDate(parts[0]);
        const formattedT = parts[1] ? parts[1].slice(0, 5) : '00:00';
        return `${formattedT} ${formattedD}`;
      }
    }

    return `${this.formatDate(str)}`;
  }

  // --- VALIDATION HELPERS ---
  isValidPhone(phone: string): boolean {
    if (!phone) return false;
    return /^0\d{9}$/.test(phone.trim());
  }

  // Advanced Email Validation with Typo Detection
  isValidEmail(email: string): boolean {
    if (!email) return false;
    const emailTrim = email.trim().toLowerCase();
    const basicRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!basicRegex.test(emailTrim)) return false;

    const domain = emailTrim.split('@')[1];
    if (!domain || !domain.includes('.')) return false;

    const domainParts = domain.split('.');
    const domainName = domainParts[0];

    // Block Gmail domain typos (gmai, gmaill, gmaillll, gmail1, gmailll...)
    if (/^g+m+a+i+l+/.test(domainName) && domainName !== 'gmail') {
      return false;
    }
    // Block Hotmail domain typos
    if (/^h+o+t+m+a+i+l+/.test(domainName) && domainName !== 'hotmail') {
      return false;
    }
    // Block Yahoo domain typos
    if (/^y+a+h+o+/.test(domainName) && domainName !== 'yahoo') {
      return false;
    }
    // Block Outlook domain typos
    if (/^o+u+t+l+o+o+k+/.test(domainName) && domainName !== 'outlook') {
      return false;
    }

    return true;
  }

  // --- INTERACTIVE VALIDATION HANDLERS (CREATE FORM) ---
  onBlurPhoneCreate() {
    this.phoneTouchedCreate = true;
    this.validatePhoneCreate();
  }

  onInputPhoneCreate() {
    if (this.phoneTouchedCreate || this.createFormSubmitted) {
      this.validatePhoneCreate();
    }
  }

  validatePhoneCreate() {
    const val = this.newItem.so_dien_thoai?.trim();
    if (!val) {
      this.phoneErrorCreate = 'Vui lòng nhập số điện thoại';
    } else if (!this.isValidPhone(val)) {
      this.phoneErrorCreate = 'Số điện thoại không hợp lệ (gồm 10 chữ số bắt đầu bằng số 0)';
    } else {
      this.phoneErrorCreate = '';
    }
  }

  onBlurEmailCreate() {
    this.emailTouchedCreate = true;
    this.validateEmailCreate();
  }

  onInputEmailCreate() {
    if (this.emailTouchedCreate || this.createFormSubmitted) {
      this.validateEmailCreate();
    }
  }

  validateEmailCreate() {
    const val = this.newItem.email?.trim();
    if (!val) {
      this.emailErrorCreate = 'Vui lòng nhập địa chỉ email';
    } else if (!this.isValidEmail(val)) {
      this.emailErrorCreate = 'Email không đúng định dạng hoặc tên miền không hợp lệ (ví dụ: name@domain.com)';
    } else {
      this.emailErrorCreate = '';
    }
  }

  // --- INTERACTIVE VALIDATION HANDLERS (EDIT FORM) ---
  onBlurPhoneEdit() {
    this.phoneTouchedEdit = true;
    this.validatePhoneEdit();
  }

  onInputPhoneEdit() {
    if (this.phoneTouchedEdit || this.editFormSubmitted) {
      this.validatePhoneEdit();
    }
  }

  validatePhoneEdit() {
    const val = this.editingItem?.so_dien_thoai?.trim();
    if (!val) {
      this.phoneErrorEdit = 'Vui lòng nhập số điện thoại';
    } else if (!this.isValidPhone(val)) {
      this.phoneErrorEdit = 'Số điện thoại không hợp lệ (gồm 10 chữ số bắt đầu bằng số 0)';
    } else {
      this.phoneErrorEdit = '';
    }
  }

  onBlurEmailEdit() {
    this.emailTouchedEdit = true;
    this.validateEmailEdit();
  }

  onInputEmailEdit() {
    if (this.emailTouchedEdit || this.editFormSubmitted) {
      this.validateEmailEdit();
    }
  }

  validateEmailEdit() {
    const val = this.editingItem?.email?.trim();
    if (!val) {
      this.emailErrorEdit = 'Vui lòng nhập địa chỉ email';
    } else if (!this.isValidEmail(val)) {
      this.emailErrorEdit = 'Email không đúng định dạng hoặc tên miền không hợp lệ (ví dụ: name@domain.com)';
    } else {
      this.emailErrorEdit = '';
    }
  }

  // Focus and scroll to first error field
  focusFirstError(formType: 'create' | 'edit') {
    setTimeout(() => {
      const prefix = formType === 'create' ? 'create' : 'edit';
      const fieldIds = [
        `${prefix}-ma-ve`,
        `${prefix}-mo-ta`,
        `${prefix}-tuyen-xe`,
        `${prefix}-ngay-di`,
        `${prefix}-ngay-bao-mat`,
        `${prefix}-ten-khach`,
        `${prefix}-phone`,
        `${prefix}-email`,
        `${prefix}-vi-tri-tim`,
        `${prefix}-thoi-gian-tim`
      ];
      for (const id of fieldIds) {
        const el = document.getElementById(id);
        if (el && (el.classList.contains('border-red') || el.parentElement?.querySelector('.field-error-msg'))) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
    }, 50);
  }

  // --- TICKET CODE LOOKUP FOR CREATE MODAL ---
  lookupTicketInCreate() {
    const code = this.newItem.ma_ve?.trim();
    if (!code) {
      this.toastService.showError('Vui lòng nhập mã vé để tra cứu (Ví dụ: VE00001, VE00002...)');
      return;
    }
    const upperCode = code.toUpperCase();
    const ticket = MOCK_TICKETS[upperCode];
    if (ticket) {
      this.newItem.ma_ve = ticket.ma_ve;
      this.newItem.ten_khach_hang = ticket.ten_khach_hang;
      this.newItem.so_dien_thoai = ticket.so_dien_thoai;
      this.newItem.email = ticket.email;
      this.newItem.tuyen_xe = ticket.tuyen_xe;
      this.newItem.ngay_di_chuyen = ticket.ngay_di_chuyen;
      this.newItem.vi_tri_ghe = ticket.vi_tri_ghe;

      // Re-validate phone and email if already touched/submitted
      this.validatePhoneCreate();
      this.validateEmailCreate();

      this.toastService.showSuccess(`Đã tìm thấy thông tin vé ${ticket.ma_ve}! Tự động điền dữ liệu thành công.`);
    } else {
      this.toastService.showError(`Không tìm thấy dữ liệu cho mã vé "${code}". Vui lòng kiểm tra lại.`);
    }
    this.cdr.detectChanges();
  }

  // --- STATS GETTERS ---
  get totalItemsCount(): number {
    return this.items.length;
  }
  get activeSearchingCount(): number {
    return this.items.filter(i => i.trang_thai === 'Đang tìm kiếm').length;
  }
  get activeFoundCount(): number {
    return this.items.filter(i => i.trang_thai === 'Đã tìm thấy').length;
  }
  get activeReturnedCount(): number {
    return this.items.filter(i => i.trang_thai === 'Đã trả khách').length;
  }
  get activeClosedCount(): number {
    return this.items.filter(i => i.trang_thai === 'Đóng yêu cầu').length;
  }

  // --- FILTERING & SORTING ---
  filterData() {
    let result = [...this.items];
    this.currentPage = 1;

    // Status Dropdown Filter
    if (this.filterTrangThai !== 'Tất cả trạng thái') {
      result = result.filter(i => i.trang_thai === this.filterTrangThai);
    }

    if (this.filterTuyenXe !== 'Tất cả tuyến xe') {
      result = result.filter(i => i.tuyen_xe === this.filterTuyenXe);
    }

    // Search filter
    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase().trim();
      result = result.filter(i => 
        i.ma_do_that_lac.toLowerCase().includes(search) ||
        (i.ma_ve && i.ma_ve.toLowerCase().includes(search)) ||
        i.ten_khach_hang.toLowerCase().includes(search) ||
        i.so_dien_thoai.includes(search) ||
        i.tuyen_xe.toLowerCase().includes(search) ||
        i.mo_ta_vat_pham.toLowerCase().includes(search)
      );
    }

    // Sorting Fix: Sort by DTL numerical code ascending/descending
    if (this.filterSort === 'Mới nhất') {
      result.sort((a, b) => {
        const numA = parseInt(a.ma_do_that_lac.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.ma_do_that_lac.replace(/\D/g, ''), 10) || 0;
        return numB - numA;
      });
    } else if (this.filterSort === 'Cũ nhất') {
      result.sort((a, b) => {
        const numA = parseInt(a.ma_do_that_lac.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.ma_do_that_lac.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });
    } else if (this.filterSort === 'Theo mô tả A-Z') {
      result.sort((a, b) => a.mo_ta_vat_pham.localeCompare(b.mo_ta_vat_pham, 'vi'));
    } else if (this.filterSort === 'Theo mô tả Z-A') {
      result.sort((a, b) => b.mo_ta_vat_pham.localeCompare(a.mo_ta_vat_pham, 'vi'));
    }

    this.filteredItems = result;
    this.cdr.detectChanges();
  }

  selectTab(status: string) {
    this.filterTrangThai = status;
    this.filterData();
  }

  resetFilters() {
    this.searchText = '';
    this.filterTrangThai = 'Tất cả trạng thái';
    this.filterTuyenXe = 'Tất cả tuyến xe';
    this.filterSort = 'Mới nhất';
    this.filterData();
  }

  // --- PAGINATION WITH AUTO-SCROLL TO TOP ---
  scrollToTop() {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  get totalPages(): number {
    return Math.ceil(this.filteredItems.length / this.itemsPerPage) || 1;
  }

  get paginatedItems(): LostItem[] {
    return this.filteredItems.slice(this.startIndex, this.endIndex);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage;
  }

  get endIndex(): number {
    return Math.min(this.startIndex + this.itemsPerPage, this.filteredItems.length);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.scrollToTop();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.scrollToTop();
    }
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.scrollToTop();
    }
  }

  getPages(): number[] {
    const groupStart = Math.floor((this.currentPage - 1) / 3) * 3 + 1;
    const groupEnd = Math.min(groupStart + 2, this.totalPages);
    return Array.from({ length: groupEnd - groupStart + 1 }, (_, i) => groupStart + i);
  }

  // --- MODALS ---
  openCreateModal() {
    this.newItem = {
      ma_ve: '',
      mo_ta_vat_pham: '',
      tuyen_xe: '',
      ngay_di_chuyen: new Date().toISOString().slice(0, 10),
      ngay_bao_mat: new Date().toISOString().slice(0, 10),
      vi_tri_ghe: '',
      ten_khach_hang: '',
      so_dien_thoai: '',
      email: '',
      hinh_anh: '',
      ghi_chu: ''
    };
    this.createFormSubmitted = false;
    this.phoneTouchedCreate = false;
    this.emailTouchedCreate = false;
    this.phoneErrorCreate = '';
    this.emailErrorCreate = '';
    this.showCreateModal = true;
    this.cdr.detectChanges();
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.cdr.detectChanges();
  }

  onUploadImage(event: Event, mode: 'create' | 'edit', field: 'lost' | 'found') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const result = e.target.result;
        if (mode === 'create') {
          this.newItem.hinh_anh = result;
        } else if (mode === 'edit' && this.editingItem) {
          if (field === 'lost') {
            this.editingItem.hinh_anh = result;
          } else {
            this.editingItem.hinh_anh_tim_thay = result;
          }
        }
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(mode: 'create' | 'edit', field: 'lost' | 'found') {
    if (mode === 'create') {
      this.newItem.hinh_anh = '';
    } else if (mode === 'edit' && this.editingItem) {
      if (field === 'lost') {
        this.editingItem.hinh_anh = '';
      } else {
        this.editingItem.hinh_anh_tim_thay = '';
      }
    }
    this.cdr.detectChanges();
  }

  saveNewItem() {
    this.createFormSubmitted = true;
    this.phoneTouchedCreate = true;
    this.emailTouchedCreate = true;

    this.validatePhoneCreate();
    this.validateEmailCreate();

    let hasError = false;
    if (!this.newItem.ma_ve?.trim()) hasError = true;
    if (!this.newItem.mo_ta_vat_pham?.trim()) hasError = true;
    if (!this.newItem.tuyen_xe) hasError = true;
    if (!this.newItem.ngay_di_chuyen) hasError = true;
    if (!this.newItem.ngay_bao_mat) hasError = true;
    if (!this.newItem.ten_khach_hang?.trim()) hasError = true;
    if (this.phoneErrorCreate || this.emailErrorCreate) hasError = true;

    if (hasError) {
      this.toastService.showError('Vui lòng kiểm tra và điền đầy đủ các thông tin bắt buộc');
      this.focusFirstError('create');
      return;
    }

    const newId = 'DTL' + String(this.items.length + 1).padStart(5, '0');
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const datePart = now.toISOString().slice(0, 10);
    const nowStr = `${hours}:${mins} ${datePart}`;

    const itemToSave: LostItem = {
      ma_do_that_lac: newId,
      ma_ve: this.newItem.ma_ve!.trim().toUpperCase(),
      ma_khach_hang: null,
      ten_khach_hang: this.newItem.ten_khach_hang!.trim(),
      so_dien_thoai: this.newItem.so_dien_thoai!.trim(),
      email: this.newItem.email!.trim(),
      tuyen_xe: this.newItem.tuyen_xe!,
      ngay_di_chuyen: this.newItem.ngay_di_chuyen!,
      ngay_bao_mat: this.newItem.ngay_bao_mat!,
      vi_tri_ghe: this.newItem.vi_tri_ghe?.trim() || null,
      mo_ta_vat_pham: this.newItem.mo_ta_vat_pham!.trim(),
      hinh_anh: this.newItem.hinh_anh?.trim() || null,
      hinh_anh_tim_thay: null,
      trang_thai: 'Đang tìm kiếm',
      ngay_tao: datePart,
      ngay_cap_nhat: nowStr,
      ghi_chu: this.newItem.ghi_chu?.trim() || null
    };

    this.items.unshift(itemToSave);
    this.filterData();
    this.closeCreateModal();
    this.showCenteredSuccess(
      'Tiếp nhận yêu cầu thành công',
      `Yêu cầu thất lạc ${newId} đã được tạo với trạng thái 'Đang tìm kiếm'.`
    );
  }

  openEditModal(item: LostItem) {
    this.editingItem = JSON.parse(JSON.stringify(item));
    this.editFormSubmitted = false;
    this.phoneTouchedEdit = false;
    this.emailTouchedEdit = false;
    this.phoneErrorEdit = '';
    this.emailErrorEdit = '';
    this.showEditModal = true;
    this.cdr.detectChanges();
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingItem = null;
    this.cdr.detectChanges();
  }

  onStatusChange() {
    if (this.editingItem) {
      if (this.editingItem.trang_thai === 'Đã tìm thấy' || this.editingItem.trang_thai === 'Đã trả khách') {
        if (!this.editingItem.thoi_gian_tim_thay) {
          const now = new Date();
          const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          this.editingItem.thoi_gian_tim_thay = localIso;
        }
        if (!this.editingItem.vi_tri_tim_thay) {
          this.editingItem.vi_tri_tim_thay = 'Trên xe khách';
        }
      }
    }
    this.cdr.detectChanges();
  }

  saveEditItem() {
    if (!this.editingItem) return;

    this.editFormSubmitted = true;
    this.phoneTouchedEdit = true;
    this.emailTouchedEdit = true;

    this.validatePhoneEdit();
    this.validateEmailEdit();

    let hasError = false;
    if (!this.editingItem.ma_ve?.trim()) hasError = true;
    if (!this.editingItem.mo_ta_vat_pham?.trim()) hasError = true;
    if (!this.editingItem.tuyen_xe) hasError = true;
    if (!this.editingItem.ngay_di_chuyen) hasError = true;
    if (!this.editingItem.ngay_bao_mat) hasError = true;
    if (!this.editingItem.ten_khach_hang?.trim()) hasError = true;
    if (this.phoneErrorEdit || this.emailErrorEdit) hasError = true;

    if (this.editingItem.trang_thai === 'Đã tìm thấy' || this.editingItem.trang_thai === 'Đã trả khách') {
      if (!this.editingItem.vi_tri_tim_thay?.trim()) hasError = true;
      if (!this.editingItem.thoi_gian_tim_thay?.trim()) hasError = true;
    }

    if (hasError) {
      this.toastService.showError('Vui lòng kiểm tra và điền đầy đủ các thông tin bắt buộc');
      this.focusFirstError('edit');
      return;
    }

    const idx = this.items.findIndex(i => i.ma_do_that_lac === this.editingItem!.ma_do_that_lac);
    if (idx !== -1) {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const datePart = now.toISOString().slice(0, 10);
      const nowStr = `${hours}:${mins} ${datePart}`;

      this.editingItem.ngay_cap_nhat = nowStr;
      this.editingItem.ma_ve = this.editingItem.ma_ve.trim().toUpperCase();

      const code = this.editingItem.ma_do_that_lac;
      this.items[idx] = { ...this.editingItem! };
      this.filterData();
      this.closeEditModal();
      this.showCenteredSuccess(
        'Cập nhật thông tin thành công',
        `Yêu cầu ${code} đã được lưu thông tin mới và cập nhật trạng thái.`
      );
    }
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    if (this.successTimer) {
      clearTimeout(this.successTimer);
      this.successTimer = null;
    }
    this.cdr.detectChanges();
  }

  private showCenteredSuccess(title: string, body: string) {
    this.successMessageTitle = title;
    this.successMessageBody = body;
    this.showSuccessModal = true;
    this.cdr.detectChanges();

    if (this.successTimer) {
      clearTimeout(this.successTimer);
    }

    this.successTimer = setTimeout(() => this.closeSuccessModal(), 2000);
  }
}
