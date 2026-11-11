require('reflect-metadata');
const assert = require('node:assert/strict');
const { AdminAuthService } = require('../dist/featured/admin/auth/admin-auth.service');
const { hashPassword } = require('../dist/shared/accounts/account-security');

async function main() {
  const hash = await hashPassword('QaOnlyPassword!');
  const staff = { manhanvien: 'QA_NV', hoten: 'QA', sodienthoai: '', email: '', anhdaidien: null, trangthai: 'HoatDong',
    vai_tro: { tenvaitro: 'NhanVienBanVe', trangthai: 'HoatDong' },
    nhan_vien_quyen_han: [{ quyen_han: { tenquyen: 'DatVeVaThanhToan', maquyen: 'Q_DEMO' } }],
  };
  const account = { mataikhoan: 'QA_TK', matkhauhash: hash, vaitrotaikhoan: 'NhanVien', trangthai: 'HoatDong', solandangnhapsai: 0, nhan_vien: staff };
  const tx = { $queryRaw: async () => [account],
    tai_khoan: { findUniqueOrThrow: async () => account, update: async () => ({}) },
    phien_dang_nhap: { create: async () => ({}) },
  };
  const db = { $transaction: async fn => fn(tx), $queryRaw: async () => [{ mataikhoan: account.mataikhoan, thoigianhethan: new Date(Date.now() + 60000), tai_khoan: { vaitrotaikhoan: 'NhanVien', nhan_vien: staff } }] };
  const auth = new AdminAuthService(db, { audit: async () => {} }, {});
  const login = await auth.login({ username: 'qa@example.invalid', password: 'QaOnlyPassword!' }, { headers: {}, socket: { remoteAddress: '127.0.0.1' } });
  assert.equal(login.account.roleName, 'NhanVienBanVe');
  assert.deepEqual(login.account.permissions, ['DatVeVaThanhToan']);
  assert.equal(login.account.supportChat, false);
  const current = await auth.current('Bearer ' + login.token);
  assert.deepEqual(current.account.permissions, login.account.permissions);
  staff.nhan_vien_quyen_han = [];
  assert.deepEqual((await auth.current('Bearer ' + login.token)).account.permissions, []);
  assert.ok(!JSON.stringify(login).includes(hash));
  console.log('PASS login/current return database role and permissions; refresh reflects revocation; no password hash exposed');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
