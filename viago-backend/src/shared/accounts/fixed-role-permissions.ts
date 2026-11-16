export const PERMISSION_GROUPS: Record<string, readonly string[]> = {
  datve: ['TimKiemChuyenXe', 'DatVeVaThanhToan', 'TraCuuThongTinVeXe', 'TraCuuHoaDonDienTu', 'XacThucHoaDonDienTu', 'QuanLyVeDaDat', 'QuanLyDatVe'],
  tintuc: ['QuanLyTinTuc'],
  dieuphoi: ['QuanLyTuyenXe', 'QuanLyDiemDonTraDung', 'QuanLyPhuongTien', 'QuanLyTaiXePhuXe', 'QuanLyLichTrinh'],
  khachhang: ['QuanLyTaiKhoanKhachHang'],
  nhanvien: ['QuanLyTaiKhoanNhanVien', 'QuanLyTaiKhoanNoiBo'],
  chinhsach: ['QuanLyChinhSach'],
  tukhoacam: ['QuanLyTuKhoaCam'],
  baocao: ['BaoCaoDoanhThu', 'BaoCaoKhachHang', 'BaoCaoTaiXePhuXe', 'BaoCaoTuyenXe', 'BaoCaoHoanHuy'],
  nhatky: ['QuanLyNhatKyHoatDong'],
  danhgiaphanhoi: ['QuanLyDanhGiaVaPhanHoi'],
  dothatlac: ['QuanLyDoThatLac'],
  thuexehopdong: ['QuanLyYeuCauThueXe'],
  khuyenmai: ['QuanLyKhuyenMai'],
};

export const FIXED_ROLE_GROUPS: Record<string, readonly string[]> = {
  QuanTriVien: Object.keys(PERMISSION_GROUPS),
  BanQuanLy: ['baocao'],
  NhanVienDieuPhoi: ['dieuphoi', 'baocao', 'nhatky'],
  NhanVienBanVe: ['datve', 'baocao'],
  NhanVienCSKH: ['khachhang', 'tukhoacam', 'danhgiaphanhoi', 'dothatlac', 'baocao'],
};

export type PermissionCatalogRow = { maquyen: string; tenquyen: string };
export function fixedRolePermissions(roleName: string, catalog: PermissionCatalogRow[]) {
  const groups = FIXED_ROLE_GROUPS[roleName];
  if (!groups) return null;
  const names = roleName === 'QuanTriVien'
    ? [...new Set([
        'DangNhapNoiBo', 'QuanLyHoSoCaNhan', ...Object.values(PERMISSION_GROUPS).flat(),
        'DangKy', 'DangNhapUser', 'QuanLyHanhTrinh', 'DatThueXeHopDong',
        'TraCuuDoThatLac', 'DanhGiaChatLuongChuyenDi',
      ])]
    : [...new Set(['DangNhapNoiBo', 'QuanLyHoSoCaNhan', ...groups.flatMap(key => PERMISSION_GROUPS[key])])];
  const available = new Set(catalog.map(p => p.tenquyen));
  const missing = names.filter(name => !available.has(name));
  return {
    roleName, groupKeys: [...groups], missing,
    permissionIds: catalog.filter(p => names.includes(p.tenquyen)).map(p => p.maquyen).sort(),
    permissions: [...names],
  };
}

export function samePermissionIds(a: readonly string[], b: readonly string[]): boolean {
  return [...a].sort().join('\0') === [...b].sort().join('\0');
}
