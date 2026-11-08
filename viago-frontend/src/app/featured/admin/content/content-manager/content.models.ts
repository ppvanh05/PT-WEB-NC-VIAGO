export type ContentKind = 'news' | 'policies' | 'promotions';
export interface ContentRow {
  id?: string;
  maCS?: string;
  tieuDe?: string;
  moTa?: string;
  loai?: string;
  loaiCode?: string;
  nguoiDang?: string;
  ngayDang?: string;
  trangThai?: string;
  trangThaiCode?: string;
  image?: string;
  noiBat?: boolean;
  tags?: string[];
  noiDung?: string;
  henDangLuc?: string | null;
  soBinhLuan?: number;
  tenChinhSach?: string;
  loaiChinhSach?: string;
  loaiChinhSachCode?: string;
  ngayApDung?: string;
  noiDungChinhSach?: string;
  mocThoiGianHuyVe?: { truocGio: number; phiHuy: number }[];
  nguoiThucHien?: string;
  capNhatCuoi?: string;
  code?: string;
  name?: string;
  description?: string;
  discountType?: string;
  discountValue?: number;
  maxDiscount?: number | null;
  minOrderValue?: number;
  serviceScope?: string;
  memberTierIds?: string[];
  memberTiers?: string[];
  firstOrderOnly?: boolean;
  birthdayMonthOnly?: boolean;
  birthdayMonths?: string[];
  assignedCustomer?: { emailOrPhone: string; reason: string; note: string } | null;
  routesType?: string;
  selectedRoutes?: string[];
  daysOfWeek?: string[];
  startDate?: string;
  endDate?: string;
  referralRequired?: boolean;
  emailFollowRequired?: boolean;
  priority?: string;
  status?: string;
  statusCode?: string;
  maxUsage?: number | null;
  limitPerUser?: number | null;
  limitSubject?: string;
  usageCount?: number;
  revenueGenerated?: string;
  benefitConfig?: Record<string, unknown> | null;
}
export interface PageResult<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
export interface PromotionOptions {
  memberTiers: {
    id: string;
    label: string;
    minSpend: string;
    minTickets: number;
    pointsRate: string;
    privileges: { title: string; description: string; icon?: string }[];
  }[];
  routes: { id: string; label: string }[];
}
export interface ContentDraft {
  title: string;
  category: string;
  status: string;
  content: string;
  summary: string;
  image: string;
  author: string;
  tags: string;
  featured: boolean;
  scheduleDate: string;
  scheduleTime: string;
  effectiveDate: string;
  rules: { hours: string; fee: string }[];
  code: string;
  discountType: string;
  value: string;
  maximum: string;
  minimum: string;
  serviceScope: string;
  start: string;
  end: string;
  maxUsage: string;
  perUser: string;
  limitSubject: string;
  tiers: string[];
  routesType: string;
  routes: string[];
  days: string[];
  months: string[];
  firstOrder: boolean;
  birthdayOnly: boolean;
  referral: boolean;
  followEmail: boolean;
  priority: string;
  assigned: boolean;
  customerContact: string;
  assignmentReason: string;
  assignmentNote: string;
  giftName: string;
  giftDescription: string;
}
export interface ManagedComment {
  id: string;
  author: string;
  date: string;
  content: string;
  trangThaiCode: string;
  parentId?: string;
}
export interface PromotionUsage {
  id: string;
  name: string;
  emailOrPhone: string;
  time: string;
  tickets: number;
  orderVal: string;
  savedVal: string;
  orderId: string;
}
export const NEWS_TYPES = [
  { value: 'TinTucNhaXe', label: 'Tin tức nhà xe' },
  { value: 'KhuyenMai', label: 'Khuyến mãi' },
  { value: 'CamNangDiChuyen', label: 'Cẩm nang di chuyển' },
  { value: 'SuKien', label: 'Sự kiện' },
  { value: 'TuyenDung', label: 'Tuyển dụng' },
];
export const POLICY_TYPES = [
  { value: 'DatVe', label: 'Chính sách đặt vé' },
  { value: 'ChinhSuaVe', label: 'Chính sách chỉnh sửa vé' },
  { value: 'HoanHuy', label: 'Chính sách hoàn hủy' },
  { value: 'DieuKhoanDichVu', label: 'Điều khoản dịch vụ' },
  { value: 'BaoMat', label: 'Chính sách bảo mật' },
];
export const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Giảm theo phần trăm' },
  { value: 'fixed', label: 'Giảm số tiền' },
  { value: 'gift', label: 'Quà tặng' },
];
export const NEWS_STATUSES = [
  { value: 'DangHienThi', label: 'Đang hiển thị' },
  { value: 'BanNhap', label: 'Bản nháp' },
  { value: 'LichHenDang', label: 'Hẹn đăng' },
  { value: 'DaAn', label: 'Đã ẩn' },
];
export const POLICY_STATUSES = [
  { value: 'DangApDung', label: 'Đang áp dụng' },
  { value: 'DaKhoa', label: 'Đã khóa' },
];
export const PROMOTION_STATUSES = [
  { value: 'running', label: 'Đang chạy' },
  { value: 'upcoming', label: 'Sắp diễn ra' },
  { value: 'paused', label: 'Tạm dừng' },
  { value: 'expired', label: 'Hết hạn' },
  { value: 'locked', label: 'Đã khóa' },
];
