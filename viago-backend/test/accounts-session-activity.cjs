require('reflect-metadata');
const assert = require('node:assert/strict');
const { AccountsAccess } = require('../dist/shared/accounts/accounts-access');

async function main() {
  let reads = 0, writes = 0;
  const session = {
    maphien: 'QA_SESSION', thoigianhoatdongcuoi: new Date(),
    tai_khoan: { mataikhoan: 'QA_ACCOUNT', vaitrotaikhoan: 'NhanVien',
      nhan_vien: { manhanvien: 'QA_STAFF', hoten: 'QA', trangthai: 'HoatDong',
        vai_tro: { tenvaitro: 'QuanTriVien', trangthai: 'HoatDong' }, nhan_vien_quyen_han: [] } },
  };
  const access = new AccountsAccess({ phien_dang_nhap: {
    findFirst: async () => { reads++; return session; },
    updateMany: async q => { writes++; assert.ok(q.where.thoigianhoatdongcuoi.lt instanceof Date); return { count: 1 }; },
  } });
  const token = 'Bearer ' + 'a'.repeat(64);
  await access.authenticate(token);
  await access.authenticate(token);
  assert.equal(reads, 2);
  assert.equal(writes, 0);
  session.thoigianhoatdongcuoi = new Date(Date.now() - 120000);
  await access.authenticate(token);
  assert.equal(writes, 1);
  session.tai_khoan.nhan_vien.trangthai = 'DaKhoa';
  await assert.rejects(() => access.authenticate(token), e => e.getStatus() === 401);
  assert.equal(writes, 1);
  console.log('PASS every request revalidates identity; recent sessions skip DB writes; stale activity updates; locked staff rejected');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
