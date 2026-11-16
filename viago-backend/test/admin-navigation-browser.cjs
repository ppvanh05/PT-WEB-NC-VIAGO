// Uses disposable QA staff only; never changes an existing account or permission.
require('dotenv/config');
require('reflect-metadata');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, randomInt } = require('node:crypto');
const express = require('express');
const { Test } = require('@nestjs/testing');
const { chromium } = require('../../viago-frontend/node_modules/playwright');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { AccountsModule } = require('../dist/featured/accounts.module');
const { AdminAuthModule } = require('../dist/featured/admin/auth/admin-auth.module');
const { hashPassword } = require('../dist/shared/accounts/account-security');
const db = new PrismaService();
const run = randomBytes(6).toString('hex');
const accountIds = ['QA_TK_' + run + '_s', 'QA_TK_' + run + '_r'];
const staffIds = ['QA_NV_' + run + '_s', 'QA_NV_' + run + '_r'];
const password = randomBytes(20).toString('hex');
let app, browser;

async function main() {
  const front = path.resolve(__dirname, '../../artifacts/admin-permission-build/browser');
  assert.ok(fs.existsSync(path.join(front, 'index.html')));
  const hash = await hashPassword(password);
  const booking = await db.quyen_han.findFirstOrThrow({ where: { tenquyen: 'DatVeVaThanhToan' } });
  const customers = await db.quyen_han.findFirstOrThrow({ where: { tenquyen: 'QuanLyTaiKhoanKhachHang' } });
  await db.$transaction(async tx => {
    for (let i = 0; i < 2; i++) {
      const phone = '09' + randomInt(10000000, 99999999);
      const email = `qa-${run}-${i}@example.invalid`;
      await tx.tai_khoan.create({ data: {
        mataikhoan: accountIds[i], sodienthoai: phone, email, tendangnhap: 'qa_' + run + '_' + i,
        matkhauhash: hash, vaitrotaikhoan: 'NhanVien', trangthai: 'HoatDong',
        thoigiantao: new Date(), thoigiancapnhat: new Date(),
      } });
      await tx.nhan_vien.create({ data: {
        manhanvien: staffIds[i], mataikhoan: accountIds[i], mavaitro: i ? 'VT005' : 'VT002',
        hodem: 'QA', ten: 'Navigation', hoten: 'QA Navigation', sodienthoai: phone, email,
        gioitinh: 'Khac', ngaysinh: new Date('1990-01-01'), ngayvaolam: new Date(),
        loaihopdong: 'ThuViec', trangthai: 'HoatDong', thoigiantao: new Date(), thoigiancapnhat: new Date(),
      } });
    }
    await tx.nhan_vien_quyen_han.create({ data: { manhanvien: staffIds[0], maquyen: booking.maquyen, thoigiancap: new Date() } });
  }, { timeout: 30000 });
  const module = await Test.createTestingModule({ imports: [AccountsModule, AdminAuthModule] })
    .overrideProvider(PrismaService).useValue(db).compile();
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api');
  app.use(express.static(front));
  app.use((req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(path.join(front, 'index.html')));
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (let i = 0; i < 2; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '/admin/login');
    await page.locator('#admin-email').fill(`qa-${run}-${i}@example.invalid`);
    await page.locator('#admin-password').fill(password);
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/admin/home');
    await page.waitForLoadState('networkidle');
    if (!i) {
      assert.equal(await page.locator('.nav-item').count(), 2);
      assert.equal(await page.locator('.sub-item').count(), 1);
      assert.equal(await page.locator('.quick-action-cards [role=link]').count(), 1);
      let employeeRequests = 0;
      page.on('request', req => { if (req.url().includes('/api/admin/employees')) employeeRequests++; });
      await page.goto(base + '/admin/staff/accounts');
      await page.waitForURL('**/admin/home?access=denied');
      await page.getByRole('alert').waitFor();
      assert.equal(employeeRequests, 0);
      const token = await page.evaluate(() => sessionStorage.getItem('viago_admin_access_token'));
      assert.equal((await page.request.get(base + '/api/admin/employees', { headers: { Authorization: 'Bearer ' + token } })).status(), 403);
      // Change only this disposable account, then verify a fresh session read updates the UI.
      await db.nhan_vien_quyen_han.create({ data: { manhanvien: staffIds[0], maquyen: customers.maquyen, thoigiancap: new Date() } });
      await page.reload();
      await page.waitForLoadState('networkidle');
      assert.equal(await page.locator('.nav-item').count(), 3);
      const response = page.waitForResponse(r => r.url().includes('/api/admin/customers?'));
      await page.goto(base + '/admin/customers/accounts');
      assert.equal((await response).status(), 200);
      console.log('PASS seller sees only assigned menus/cards; direct URL blocked before data request; API stays 403; QA grant reflected after reload');
    } else {
      await page.getByRole('button', { name: 'Nhân viên', exact: true }).click();
      const response = page.waitForResponse(r => r.url().includes('/api/admin/employees?'));
      await page.getByRole('button', { name: 'Tài khoản nhân viên', exact: true }).click();
      assert.equal((await response).status(), 200);
      await page.waitForLoadState('networkidle');
      const logs = page.waitForResponse(r => r.url().includes('/api/admin/activity-logs?'));
      await page.getByRole('button', { name: 'Quản lý nhật ký', exact: true }).click();
      assert.equal((await logs).status(), 200);
      console.log('PASS administrator menus and protected employee/log pages work');
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
}

main().catch(e => { console.error(String(e.stack || e).replaceAll(password, '[REDACTED]')); process.exitCode = 1; })
  .finally(async () => {
    if (browser) await browser.close();
    if (app) await app.close();
    try {
      await db.$transaction(async tx => {
        await tx.nhat_ky_he_thong.deleteMany({ where: { mataikhoan: { in: accountIds } } });
        await tx.phien_dang_nhap.deleteMany({ where: { mataikhoan: { in: accountIds } } });
        await tx.nhan_vien_quyen_han.deleteMany({ where: { manhanvien: { in: staffIds } } });
        await tx.nhan_vien.deleteMany({ where: { manhanvien: { in: staffIds } } });
        await tx.tai_khoan.deleteMany({ where: { mataikhoan: { in: accountIds } } });
      }, { timeout: 30000 });
      console.log('CLEANUP disposable navigation QA accounts, permissions, sessions and audits removed');
    } catch (e) { console.error('QA cleanup failed:', e.code || e.name); process.exitCode = 1; }
    await db.$disconnect();
  });
