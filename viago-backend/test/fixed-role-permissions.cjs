require('reflect-metadata');
const assert = require('node:assert/strict');
const { fixedRolePermissions } = require('../dist/shared/accounts/fixed-role-permissions');
const { EmployeesService } = require('../dist/featured/admin/employees/employees.service');
const names = ['DangKy','DangNhapUser','TimKiemChuyenXe','DatVeVaThanhToan','TraCuuThongTinVeXe','TraCuuHoaDonDienTu','XacThucHoaDonDienTu','QuanLyHoSoCaNhan','QuanLyVeDaDat','QuanLyHanhTrinh','DatThueXeHopDong','TraCuuDoThatLac','DanhGiaChatLuongChuyenDi','DangNhapNoiBo','QuanLyTaiKhoanNoiBo','QuanLyDatVe','QuanLyTuKhoaCam','QuanLyDanhGiaVaPhanHoi','QuanLyDoThatLac','QuanLyTuyenXe','QuanLyDiemDonTraDung','QuanLyPhuongTien','QuanLyTaiXePhuXe','QuanLyLichTrinh','QuanLyYeuCauThueXe','QuanLyTaiKhoanNhanVien','QuanLyTaiKhoanKhachHang','QuanLyChinhSach','QuanLyNhatKyHoatDong','QuanLyTinTuc','QuanLyKhuyenMai','BaoCaoDoanhThu','BaoCaoKhachHang','BaoCaoTaiXePhuXe','BaoCaoTuyenXe','BaoCaoHoanHuy'];
const catalog = names.map((tenquyen, index) => ({ tenquyen, maquyen: 'Q' + String(index + 1).padStart(3, '0') }));
const ids = values => values.map(n => 'Q' + String(n).padStart(3, '0'));

async function main() {
  assert.deepEqual(fixedRolePermissions('NhanVienBanVe', catalog).permissionIds, ids([3,4,5,6,7,8,9,14,16,32,33,34,35,36]));
  assert.deepEqual(fixedRolePermissions('NhanVienDieuPhoi', catalog).permissionIds, ids([8,14,20,21,22,23,24,29,32,33,34,35,36]));
  assert.deepEqual(fixedRolePermissions('BanQuanLy', catalog).permissionIds, ids([8,14,32,33,34,35,36]));
  assert.equal(fixedRolePermissions('QuanTriVien', catalog).permissionIds.length, 36);
  assert.equal(fixedRolePermissions('UnknownRole', catalog), null);
  let available = catalog, deletes = 0, assigned = [];
  const before = { manhanvien: 'QA_NV', mataikhoan: 'QA_TK', mavaitro: 'VT002', vai_tro: { tenvaitro: 'NhanVienBanVe' }, nhan_vien_quyen_han: [{ maquyen: 'Q005' }] };
  const tx = {
    $executeRaw: async () => 0,
    vai_tro: { findUnique: async q => ({ mavaitro: q.where.mavaitro, tenvaitro: q.where.mavaitro === 'VT003' ? 'NhanVienDieuPhoi' : 'NhanVienBanVe', trangthai: 'HoatDong' }) },
    quyen_han: { findMany: async () => available },
    nhan_vien: { findUniqueOrThrow: async () => before, update: async () => ({}) },
    tai_khoan: { update: async () => ({}) },
    nhan_vien_quyen_han: {
      deleteMany: async () => { deletes++; },
      createMany: async q => { assigned = q.data.map(p => p.maquyen); },
    },
  };
  const service = new EmployeesService({ $transaction: async fn => fn(tx) }, { audit: async () => {} });
  service.detail = async () => ({ code: before.manhanvien });
  const actor = { accountId: 'QA_ADMIN', staffId: 'QA_OTHER', roleName: 'QuanTriVien', permissions: [] };
  const dto = { roleId: 'VT002', birthday: '1990-01-01', startDate: '2020-01-01', email: 'qa@example.invalid', firstName: 'QA', lastName: 'Test' };
  const resolved = await service.validate(tx, dto, actor);
  assert.equal(resolved.permissions.length, 14);
  await assert.rejects(() => service.validate(tx, { ...dto, permissions: ['Q004'] }, actor), e => e.getStatus() === 400);
  await assert.rejects(() => service.validate(tx, { ...dto, roleId: 'VT003' }, actor, before), e => e.getStatus() === 400);
  await assert.rejects(() => service.validate(tx, { ...dto, applyRolePermissions: true }, { ...actor, roleName: 'BanQuanLy', permissions: [] }, before), e => e.getStatus() === 403);
  available = catalog.filter(p => p.maquyen !== 'Q032');
  await assert.rejects(() => service.validate(tx, dto, actor), e => e.getStatus() === 503);
  available = catalog;
  await service.update(before.manhanvien, dto, actor, {});
  assert.equal(deletes, 0, 'ordinary profile edits preserve existing grants and grant metadata');
  await assert.rejects(() => service.validate(tx, { ...dto, permissions: [] }, actor, before), e => e.getStatus() === 400);
  await service.update(before.manhanvien, { ...dto, applyRolePermissions: true }, actor, {});
  assert.equal(deletes, 1);
  assert.deepEqual(assigned, resolved.permissions);
  console.log('PASS fixed role bundles, no granular overrides, no partial catalog grants, no privilege escalation, legacy profile preservation and explicit group assignment');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
