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
const accounts = ['QA_TK_' + run + '_s', 'QA_TK_' + run + '_r'];
const staff = ['QA_NV_' + run + '_s', 'QA_NV_' + run + '_r'];
const password = randomBytes(20).toString('hex');
let app, browser, originalGrants;

async function main() {
  const front = path.resolve(__dirname, '../../artifacts/fixed-role-build/browser');
  assert.ok(fs.existsSync(path.join(front, 'index.html')));
  originalGrants = await db.nhan_vien_quyen_han.findMany({ where: { manhanvien: { notIn: staff } }, select: { manhanvien: true, maquyen: true }, orderBy: [{ manhanvien: 'asc' }, { maquyen: 'asc' }] });
  const hash = await hashPassword(password);
  await db.$transaction(async tx => {
    for (let i = 0; i < 2; i++) {
      const phone = '09' + randomInt(10000000, 99999999), email = `qa-fixed-${run}-${i}@example.invalid`;
      await tx.tai_khoan.create({ data: { mataikhoan: accounts[i], sodienthoai: phone, email, tendangnhap: 'qa_fixed_' + run + '_' + i, matkhauhash: hash, vaitrotaikhoan: 'NhanVien', trangthai: 'HoatDong', thoigiantao: new Date(), thoigiancapnhat: new Date() } });
      await tx.nhan_vien.create({ data: { manhanvien: staff[i], mataikhoan: accounts[i], mavaitro: i ? 'VT005' : 'VT002', hodem: 'QA', ten: 'Fixed', hoten: 'QA Fixed', sodienthoai: phone, email, gioitinh: 'Khac', ngaysinh: new Date('1990-01-01'), ngayvaolam: new Date(), loaihopdong: 'ThuViec', trangthai: 'HoatDong', thoigiantao: new Date(), thoigiancapnhat: new Date() } });
    }
    const booking = await tx.quyen_han.findFirstOrThrow({ where: { tenquyen: 'DatVeVaThanhToan' } });
    await tx.nhan_vien_quyen_han.create({ data: { manhanvien: staff[0], maquyen: booking.maquyen, thoigiancap: new Date() } });
  }, { timeout: 30000 });
  const module = await Test.createTestingModule({ imports: [AccountsModule, AdminAuthModule] }).overrideProvider(PrismaService).useValue(db).compile();
  app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api');
  app.use(express.static(front));
  app.use((req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(path.join(front, 'index.html')));
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const rootContext = await browser.newContext(), root = await rootContext.newPage();
  async function login(page, index) {
    await page.goto(base + '/admin/login');
    await page.locator('#admin-email').fill(`qa-fixed-${run}-${index}@example.invalid`);
    await page.locator('#admin-password').fill(password);
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/admin/home');
    await page.waitForLoadState('networkidle');
  }
  await login(root, 1);
  const rootToken = await root.evaluate(() => sessionStorage.getItem('viago_admin_access_token'));
  const options = await (await root.request.get(base + '/api/admin/employees/options', { headers: { Authorization: 'Bearer ' + rootToken } })).json();
  for (const [label, roleName, expectedMenus] of [
    ['Nhân viên bán vé', 'NhanVienBanVe', ['Tổng quan', 'Quản lý đặt vé', 'Báo cáo']],
    ['Nhân viên điều phối', 'NhanVienDieuPhoi', ['Tổng quan', 'Quản lý điều phối', 'Báo cáo', 'Quản lý nhật ký']],
  ]) {
    await root.goto(base + '/admin/staff/accounts');
    await root.getByRole('row').filter({ hasText: `qa-fixed-${run}-0@example.invalid` }).locator('.admin-edit-action').click();
    await root.getByRole('button', { name: 'Phân quyền', exact: true }).click();
    assert.equal(await root.locator('.permissions input[type=checkbox]').count(), 0);
    await root.getByRole('button', { name: label, exact: true }).click();
    const saved = root.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith('/admin/employees/' + staff[0]));
    await root.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    const response = await saved;
    assert.equal(response.status(), 200);
    const body = response.request().postDataJSON();
    assert.equal(body.applyRolePermissions, true);
    assert.equal(Object.hasOwn(body, 'permissions'), false);
    const expected = options.roleGroups.find(group => group.roleName === roleName).permissionIds;
    const granted = await db.nhan_vien_quyen_han.findMany({ where: { manhanvien: staff[0] }, select: { maquyen: true } });
    assert.deepEqual(granted.map(p => p.maquyen).sort(), expected);
    const tampered = await root.request.put(base + '/api/admin/employees/' + staff[0], { headers: { Authorization: 'Bearer ' + rootToken }, data: { ...body, permissions: ['Q026'] } });
    assert.equal(tampered.status(), 400);
    const context = await browser.newContext(), page = await context.newPage();
    await login(page, 0);
    const menus = (await page.locator('.nav-item').allTextContents()).map(text => text.trim());
    assert.deepEqual(menus, expectedMenus);
    await page.goto(base + '/admin/staff/accounts');
    await page.waitForURL('**/admin/home?access=denied');
    await page.getByRole('alert').waitFor();
    await context.close();
    console.log('PASS fixed role saved from UI to Supabase and login menus match:', roleName, expected.length, 'permissions');
  }
  const after = await db.nhan_vien_quyen_han.findMany({ where: { manhanvien: { notIn: staff } }, select: { manhanvien: true, maquyen: true }, orderBy: [{ manhanvien: 'asc' }, { maquyen: 'asc' }] });
  assert.deepEqual(after, originalGrants);
  console.log('PASS non-QA permission assignments unchanged');
}

main().catch(e => { console.error(String(e.stack || e).replaceAll(password, '[REDACTED]')); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (app) await app.close();
  try {
    await db.$transaction(async tx => {
      await tx.nhat_ky_he_thong.deleteMany({ where: { mataikhoan: { in: accounts } } });
      await tx.phien_dang_nhap.deleteMany({ where: { mataikhoan: { in: accounts } } });
      await tx.nhan_vien_quyen_han.deleteMany({ where: { manhanvien: { in: staff } } });
      await tx.nhan_vien.deleteMany({ where: { manhanvien: { in: staff } } });
      await tx.tai_khoan.deleteMany({ where: { mataikhoan: { in: accounts } } });
    }, { timeout: 30000 });
    console.log('CLEANUP fixed-role QA accounts, permissions, sessions and audit rows removed');
  } catch (e) { console.error('QA cleanup failed:', e.code || e.name); process.exitCode = 1; }
  await db.$disconnect();
});
