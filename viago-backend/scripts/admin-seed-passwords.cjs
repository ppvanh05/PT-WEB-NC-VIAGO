require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const { randomBytes, scryptSync } = require('node:crypto');
const db = new PrismaClient();
const apply = process.argv.includes('--apply');
async function main() {
  const target = await db.tai_khoan.findUnique({ where: { email: 'nvbanve01@gmail.com' }, select: { mataikhoan: true, vaitrotaikhoan: true } });
  if (!target || target.vaitrotaikhoan !== 'NhanVien') throw new Error('Không tìm thấy tài khoản nhân viên cần thiết lập.');
  const accounts = await db.tai_khoan.findMany({ where: { vaitrotaikhoan: 'NhanVien' }, select: { mataikhoan: true, matkhauhash: true } });
  const samples = accounts.filter(account => /^HASH_MAU_\d{3}$/.test(account.matkhauhash));
  let updated = 0;
  if (apply) await db.$transaction(async tx => {
    for (const account of samples) {
      const salt = randomBytes(16).toString('hex');
      const hash = 'scrypt:' + salt + ':' + scryptSync(account.matkhauhash, salt, 64).toString('hex');
      const result = await tx.tai_khoan.updateMany({ where: { mataikhoan: account.mataikhoan, matkhauhash: account.matkhauhash },
        data: { matkhauhash: hash, solandangnhapsai: 0, khoatamden: null, thoigiancapnhat: new Date() } });
      if (result.count) {
        updated += result.count;
        await tx.phien_dang_nhap.updateMany({ where: { mataikhoan: account.mataikhoan, trangthai: 'DangHoatDong' }, data: { trangthai: 'DaDangXuat' } });
      }
    }
  }, { timeout: 15000 });
  console.log(JSON.stringify({ mode: apply ? 'applied' : 'preview', samplePasswords: samples.length, updated }));
}
main().catch(error => { console.error(error.code || error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
