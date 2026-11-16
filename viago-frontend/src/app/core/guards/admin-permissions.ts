export interface AdminAccessAccount {
  roleName?: string;
  permissions?: readonly string[];
  supportChat?: boolean;
}

const requirements: Record<string, readonly string[]> = {
  '/admin/tickets/new': ['QuanLyDatVe', 'DatVeVaThanhToan'],
  '/admin/tickets/list': ['QuanLyDatVe', 'QuanLyVeDaDat', 'TraCuuThongTinVeXe'],
  '/admin/dispatch/routes': ['QuanLyTuyenXe'],
  '/admin/dispatch/schedules': ['QuanLyLichTrinh'],
  '/admin/dispatch/pickup': ['QuanLyDiemDonTraDung'],
  '/admin/dispatch/vehicles': ['QuanLyPhuongTien'],
  '/admin/dispatch/drivers-assistants': ['QuanLyTaiXePhuXe'],
  '/admin/customers/accounts': ['QuanLyTaiKhoanKhachHang'],
  '/admin/customers/contacts': ['QuanLyTaiKhoanKhachHang'],
  '/admin/customers/reviews': ['QuanLyDanhGiaVaPhanHoi'],
  '/admin/customers/lost-items': ['QuanLyDoThatLac'],
  '/admin/staff/accounts': ['QuanLyTaiKhoanNhanVien'],
  '/admin/staff/applications': ['QuanLyTaiKhoanNoiBo'],
  '/admin/staff/jobs': ['QuanLyTaiKhoanNoiBo'],
  '/admin/content/news': ['QuanLyTinTuc'],
  '/admin/content/policies': ['QuanLyChinhSach'],
  '/admin/content/promotions': ['QuanLyKhuyenMai'],
  '/admin/contract-rentals': ['QuanLyYeuCauThueXe'],
  '/admin/reports/revenue': ['BaoCaoDoanhThu'],
  '/admin/reports/customer-report': ['BaoCaoKhachHang'],
  '/admin/reports/drivers': ['BaoCaoTaiXePhuXe'],
  '/admin/reports/routes': ['BaoCaoTuyenXe'],
  '/admin/reports/cancellations': ['BaoCaoHoanHuy'],
  '/admin/logs': ['QuanLyNhatKyHoatDong'],
};
const aliases: Record<string, string> = {
  '/admin/booking/new': '/admin/tickets/new',
  '/admin/datve/moi': '/admin/tickets/new',
  '/admin/booking/management': '/admin/tickets/list',
  '/admin/datve/danhsach': '/admin/tickets/list',
  '/admin/dispatch/drivers': '/admin/dispatch/drivers-assistants',
  '/admin/contract': '/admin/contract-rentals',
  '/admin/reports/customers': '/admin/reports/customer-report',
};

export function canAccessAdminRoute(account: AdminAccessAccount | null, url: string): boolean {
  if (!account) return false;
  const path = url.split(/[?#]/)[0].replace(/\/+$/, '');
  if (path === '/admin' || path === '/admin/home') return true;
  // The support inbox has its own backend permission, including for administrators.
  if (path === '/admin/customers/support') return account.supportChat === true;
  const required = requirements[aliases[path] || path];
  if (!required) return false;
  return account.roleName === 'QuanTriVien' || required.some(p => account.permissions?.includes(p));
}
