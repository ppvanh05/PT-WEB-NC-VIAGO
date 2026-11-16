// Opt-in end-to-end regression. Uses disposable QA records and deletes them in finally.
// Never changes passwords or permissions of existing accounts; never sends SMS/email.
require('dotenv/config');
require('reflect-metadata');
const path = require('node:path');
const fs = require('node:fs');
const { randomBytes, randomInt } = require('node:crypto');
const assert = require('node:assert/strict');
const express = require('express');
const { Test } = require('@nestjs/testing');
const { chromium } = require('../../viago-frontend/node_modules/playwright');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { AccountsModule } = require('../dist/featured/accounts.module');
const {
  AdminAuthModule,
} = require('../dist/featured/admin/auth/admin-auth.module');
const {
  hashPassword,
  newId,
} = require('../dist/shared/accounts/account-security');
const db = new PrismaService();
const run = randomBytes(5).toString('hex');
const password = `QA_${randomBytes(18).toString('hex')}!`;
const phone = () => '09' + randomInt(10000000, 99999999);
const rootPhone = phone(),
  customerPhone = phone(),
  guestPhone = phone(),
  employeePhone = phone();
const rootEmail = `qa-${run}-root@example.com`,
  customerEmail = `qa-${run}-customer@example.com`,
  employeeEmail = `qa-${run}-employee@example.com`;
const rootAccount = newId('QA_TK'),
  rootStaff = newId('QA_NV'),
  customerAccount = newId('QA_TK'),
  customerId = newId('QA_KH');
let app, browser, page, base;
const repairs = process.argv.includes('--repairs');
const qaTripId = newId('QA_LT'),
  qaSeatId = newId('QA_GC'),
  qaOrderId = newId('QA_DH'),
  qaTicketId = newId('QA_VE');
const pngProof = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jk1kAAAAASUVORK5CYII=',
  'base64',
);
let reviewDirectory;
const requestErrors = [];
async function api(pathname, token, method = 'GET', body) {
  const r = await fetch(base + '/api/' + pathname, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.ok(r.ok, `${method} ${pathname}: ${r.status}`);
  return r.json();
}
async function assertCustomer(field, value, targetPhone = guestPhone) {
  const row = await db.khach_hang.findUnique({
    where: { sodienthoai: targetPhone },
  });
  assert.ok(row);
  assert.equal(row[field], value);
  return row;
}
async function main() {
  const front = path.resolve(
    __dirname,
    process.env.ACCOUNTS_TEST_FRONTEND || (process.argv.includes('--test-build')
      ? '../../artifacts/accounts-browser-build/browser'
      : '../../viago-frontend/dist/viago-frontend/browser'),
  );
  assert.ok(
    fs.existsSync(path.join(front, 'index.html')),
    'Build frontend development first',
  );
  const now = new Date(),
    hash = await hashPassword(password);
  await db.$connect();
  const sample = repairs
    ? await db.ve_xe.findFirst({
        include: {
          don_hang: true,
          ghe_chuyen: { include: { lich_trinh: true } },
        },
      })
    : null;
  if (repairs) {
    assert.ok(sample, 'Need a reference schedule for isolated QA fixtures');
    reviewDirectory = fs.mkdtempSync(
      path.resolve(__dirname, `../../artifacts/review-browser-${run}-`),
    );
    process.env.REVIEW_UPLOAD_DIR = reviewDirectory;
  }
  await db.$transaction(
    async (tx) => {
      await tx.tai_khoan.create({
        data: {
          mataikhoan: rootAccount,
          sodienthoai: rootPhone,
          email: rootEmail,
          tendangnhap: `qa_${run}`,
          matkhauhash: hash,
          vaitrotaikhoan: 'NhanVien',
          trangthai: 'HoatDong',
          thoigiantao: now,
          thoigiancapnhat: now,
        },
      });
      await tx.nhan_vien.create({
        data: {
          manhanvien: rootStaff,
          mataikhoan: rootAccount,
          mavaitro: 'VT005',
          hodem: 'QA',
          ten: 'Admin',
          hoten: 'QA Admin',
          sodienthoai: rootPhone,
          email: rootEmail,
          gioitinh: 'Khac',
          ngaysinh: new Date('1990-01-01'),
          ngayvaolam: now,
          loaihopdong: 'ThuViec',
          trangthai: 'HoatDong',
          thoigiantao: now,
          thoigiancapnhat: now,
        },
      });
      await tx.tai_khoan.create({
        data: {
          mataikhoan: customerAccount,
          sodienthoai: customerPhone,
          email: customerEmail,
          matkhauhash: repairs ? 'QA_INVALID!!' : hash,
          vaitrotaikhoan: 'KhachHang',
          trangthai: 'HoatDong',
          thoigiantao: now,
          thoigiancapnhat: now,
        },
      });
      await tx.khach_hang.create({
        data: {
          makhachhang: customerId,
          mataikhoan: customerAccount,
          hotenkhachhang: 'QA Customer',
          ghichu: `QA_BROWSER:${run}`,
          nghenghiep: 'QA Custom Occupation',
          diemtichluy: 7,
          sodienthoai: customerPhone,
          email: customerEmail,
          gioitinh: 'Khac',
          trangthai: 'HoatDong',
          ngaydangky: now,
          thoigiantao: now,
          thoigiancapnhat: now,
        },
      });
      if (repairs) {
        const {
          don_hang: originalOrder,
          ghe_chuyen: originalSeat,
          ...originalTicket
        } = sample;
        const { lich_trinh: originalTrip, ...seatFields } = originalSeat;
        const departure = new Date(Date.now() - 7 * 86400000),
          arrival = new Date(departure.getTime() + 3600000);
        await tx.lich_trinh.create({
          data: {
            ...originalTrip,
            malichtrinh: qaTripId,
            nguoitao: null,
            ngaykhoihanh: departure,
            giokhoihanh: departure,
            thoigiankhoihanh: departure,
            thoigiandendukien: arrival,
            thoigiandenthucte: arrival,
            thoigiandongbanve: departure,
            trangthai: 'HoanThanh',
            ghichu: `QA_BROWSER:${run}`,
            thoigiantao: now,
            thoigiancapnhat: now,
          },
        });
        await tx.ghe_chuyen.create({
          data: {
            ...seatFields,
            maghechuyen: qaSeatId,
            malichtrinh: qaTripId,
            madonhanggiu: null,
            nguoigiughe: null,
            sessiongiucho: null,
            trangthaighe: 'DaBan',
            giuchoden: null,
            thoigiancapnhat: now,
          },
        });
        await tx.don_hang.create({
          data: {
            ...originalOrder,
            madonhang: qaOrderId,
            khoachonglap: newId('QA_KEY'),
            makhachhang: customerId,
            malichtrinh: qaTripId,
            manhanvien: null,
            makhuyenmai: null,
            madonhangkhuhoi: null,
            hotennguoidat: 'QA Customer',
            sodienthoainguoidat: customerPhone,
            emailnguoidat: customerEmail,
            trangthaidonhang: 'DaThanhToan',
            ghichu: `QA_BROWSER:${run}`,
            thoigiantao: now,
            thoigiancapnhat: now,
          },
        });
        await tx.ve_xe.create({
          data: {
            ...originalTicket,
            mave: qaTicketId,
            madonhang: qaOrderId,
            maghechuyen: qaSeatId,
            hotenhanhkhach: 'QA Customer',
            sodienthoaihanhkhach: customerPhone,
            maqrve: newId('QA_QR'),
            tokentracuu: newId('QA_LOOKUP'),
            nhanvieninve: null,
            trangthaive: 'DaHoanThanh',
            ghichuhanhkhach: `QA_BROWSER:${run}`,
            thoigiantao: now,
            thoigiancapnhat: now,
          },
        });
      }
    },
    { timeout: 30000, maxWait: 10000 },
  );
  const module = await Test.createTestingModule({
    imports: [AccountsModule, AdminAuthModule],
  })
    .overrideProvider(PrismaService)
    .useValue(db)
    .compile();
  app = module.createNestApplication({ logger: false });
  app.useBodyParser('json', { limit: '1mb' });
  app.setGlobalPrefix('api');
  app.use(express.static(front));
  app.use((req, res, next) =>
    req.path.startsWith('/api/')
      ? next()
      : res.sendFile(path.join(front, 'index.html')),
  );
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
  const executablePath = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ].find((p) => fs.existsSync(p));
  browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', (e) => requestErrors.push(e.message));
  page.on('requestfailed', (req) => {
    if (req.url().includes('/api/'))
      console.log(
        'NETWORK',
        new URL(req.url()).pathname,
        req.failure()?.errorText,
      );
  });
  page.on('response', (r) => {
    if (r.url().includes('/api/admin/customers') && r.status() >= 400)
      console.log('API status', new URL(r.url()).pathname, r.status());
  });
  if (!process.argv.includes('--customer-only')) {
    await page.goto(base + '/admin/login');
    await page.locator('#admin-email').fill(rootEmail);
    await page.locator('#admin-password').fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL('**/admin/home');
    console.log('PASS real admin frontend login creates Supabase session');
    if (!repairs) {
      await page.goto(base + '/admin/customers/accounts');
      await page.locator('.admin-create-banner').click();
      const create = page.locator('.edit-modal');
      await create.locator('[name="name"]').fill(`QA Guest ${run}`);
      await create.locator('[name="phone"]').fill(guestPhone);
      await create.locator('[name="occupation"]').fill('QA Created');
      await create
        .getByRole('button', { name: 'Tạo tài khoản', exact: true })
        .click();
      await create.waitFor({ state: 'hidden' });
      const guest = await assertCustomer('nghenghiep', 'QA Created');
      console.log('PASS frontend creates customer in Supabase');
      const findGuest = async () => {
        const search = page.getByPlaceholder('Nhập Mã KH/Họ tên/SĐT/Email...');
        await search.fill(guestPhone);
        await search.press('Enter');
        const row = page.locator('tbody tr').filter({ hasText: guestPhone });
        await row.waitFor();
        return row;
      };
      let row = await findGuest();
      await row.getByRole('button').last().click();
      const edit = page.locator('.edit-modal');
      await edit.locator('[name="occupation"]').fill('QA Updated');
      await edit.getByRole('button', { name: /Lưu/ }).click();
      await edit.waitFor({ state: 'hidden' });
      await assertCustomer('nghenghiep', 'QA Updated');
      await page.reload();
      row = await findGuest();
      await row.getByRole('button').last().click();
      await edit.locator('[name="occupation"]').waitFor();
      assert.equal(
        await edit.locator('[name="occupation"]').inputValue(),
        'QA Updated',
      );
      console.log(
        'PASS frontend edits customer and reload restores Supabase value',
      );
      await edit.getByRole('button', { name: /Khóa tài khoản/ }).click();
      const confirm = page.locator('.confirm-modal');
      await confirm.locator('textarea').fill('QA lock regression');
      console.log(
        'Confirm action labels:',
        await confirm.getByRole('button').allTextContents(),
      );
      const locked = page
        .waitForResponse((r) =>
          r.url().includes(`/customers/${guest.makhachhang}/status`),
        )
        .catch((error) => error);
      await confirm
        .getByRole('button', { name: 'Xác nhận khóa', exact: true })
        .click();
      const lockResult = await locked;
      if (lockResult instanceof Error) throw lockResult;
      assert.equal(lockResult.status(), 200, 'Lock API succeeds');
      await assertCustomer('trangthai', 'DaKhoa');
      await edit.getByRole('button', { name: /Mở khóa/ }).click();
      await page.waitForFunction(
        () => !document.body.innerText.includes('Đang lưu'),
      );
      // Wait for the status response through a database poll, not UI optimistic state.
      for (let i = 0; i < 10; i++) {
        const c = await db.khach_hang.findUnique({
          where: { makhachhang: guest.makhachhang },
        });
        if (c.trangthai === 'HoatDong') break;
        await new Promise((r) => setTimeout(r, 200));
      }
      await assertCustomer('trangthai', 'HoatDong');
      console.log('PASS frontend locks/unlocks customer on Supabase');

      await page.goto(base + '/admin/staff/accounts');
      await page.getByRole('row').filter({ hasText: 'QA Admin' }).waitFor();
      await page
        .getByRole('button', { name: /Thêm tài khoản nhân viên/ })
        .click();
      await page.locator('input#staff-username').fill(`qa_emp_${run}`);
      await page.locator('input#staff-lastName').fill('QA');
      await page.locator('input#staff-firstName').fill('Employee');
      await page.locator('input#staff-password').fill(password);
      await page
        .getByRole('button', { name: 'Ngày sinh *', exact: true })
        .click();
      await page
        .getByRole('combobox', { name: 'Chọn năm', exact: true })
        .selectOption('1995');
      await page
        .getByRole('combobox', { name: 'Chọn tháng', exact: true })
        .selectOption('0');
      await page
        .getByRole('button', { name: '1995-01-15', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Thông tin liên hệ', exact: true })
        .click();
      await page.locator('input#staff-phone').fill(employeePhone);
      await page.locator('input#staff-email').fill(employeeEmail);
      const staffSaved = page
        .waitForResponse(
          (r) =>
            r.request().method() === 'POST' &&
            new URL(r.url()).pathname.endsWith('/admin/employees'),
        )
        .catch((error) => error);
      await page
        .getByRole('button', { name: 'Tạo tài khoản', exact: true })
        .click();
      const savedStaff = await staffSaved;
      if (savedStaff instanceof Error) throw savedStaff;
      assert.equal(savedStaff.status(), 201, 'Employee create API succeeds');
      await page.locator('input#staff-phone').waitFor({ state: 'hidden' });
      let staff = await db.nhan_vien.findUnique({
        where: { sodienthoai: employeePhone },
        include: { tai_khoan: true },
      });
      assert.ok(staff);
      assert.equal(
        await require('../dist/shared/accounts/account-security').verifyPassword(
          password,
          staff.tai_khoan.matkhauhash,
        ),
        true,
      );
      console.log(
        'PASS frontend creates employee and hashed login account on Supabase',
      );
      await page.reload();
      await page
        .getByRole('row')
        .filter({ hasText: `qa_emp_${run}` })
        .getByRole('button')
        .click();
      await page.locator('textarea#staff-notes').fill('QA employee updated');
      await page
        .getByRole('button', { name: 'Lưu thay đổi', exact: true })
        .click();
      await page.locator('textarea#staff-notes').waitFor({ state: 'hidden' });
      staff = await db.nhan_vien.findUnique({
        where: { sodienthoai: employeePhone },
      });
      assert.equal(staff.ghichu, 'QA employee updated');
      await page.reload();
      await page
        .getByRole('row')
        .filter({ hasText: `qa_emp_${run}` })
        .waitFor();
      console.log(
        'PASS frontend updates employee on Supabase and reload keeps the record',
      );

      const adminToken = await page.evaluate(() =>
        sessionStorage.getItem('viago_admin_access_token'),
      );
      const logs = await api(
        `admin/activity-logs?search=${guest.makhachhang}`,
        adminToken,
      );
      assert.ok(logs.items.some((l) => l.action === 'UPDATE_CUSTOMER'));
      await page.goto(base + '/admin/logs');
      await page.getByText('Nhật ký hôm nay', { exact: true }).waitFor();
      console.log('PASS server audit exists and frontend audit page loads');
    } else {
      await page.goto(base + '/admin/customers/accounts');
      const search = page.getByPlaceholder('Nhập Mã KH/Họ tên/SĐT/Email...');
      await search.fill(customerPhone);
      await search.press('Enter');
      const row = page.locator('tbody tr').filter({ hasText: customerPhone });
      await row.getByText('Cần đặt lại mật khẩu', { exact: true }).waitFor();
      await row.getByRole('button').last().click();
      await page
        .getByRole('button', { name: 'Bảo mật đăng nhập', exact: true })
        .click();
      await page.locator('#customer-new-password').fill(password);
      await page.locator('#customer-admin-password').fill(password);
      const reset = page
        .waitForResponse((r) =>
          new URL(r.url()).pathname.endsWith(
            `/admin/customers/${customerId}/password`,
          ),
        )
        .catch((error) => error);
      await page
        .getByRole('button', { name: 'Đặt mật khẩu mới', exact: true })
        .click();
      const response = await reset;
      if (response instanceof Error) throw response;
      assert.equal(response.status(), 201);
      const fixed = await db.tai_khoan.findUnique({
        where: { mataikhoan: customerAccount },
      });
      assert.equal(
        await require('../dist/shared/accounts/account-security').verifyPassword(
          password,
          fixed.matkhauhash,
        ),
        true,
      );
      console.log(
        'PASS admin UI repairs an invalid customer password hash on Supabase',
      );
    }
  }

  // Customer fixture is isolated and belongs to this test run only.
  await page.goto(base + '/customer');
  await page.locator('.btn-auth').first().click();
  await page
    .locator('form[formgroup], .auth-form')
    .first()
    .locator('[formcontrolname="phoneNumber"]')
    .fill(customerPhone);
  await page.locator('[formcontrolname="password"]').first().click();
  await page.locator('[formcontrolname="password"]').first().fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForFunction(
    () => !!sessionStorage.getItem('viago_customer_access_token'),
  );
  await page.goto(base + '/customer/profile');
  await page
    .getByRole('button', { name: /Chỉnh sửa/ })
    .first()
    .click();
  assert.equal(
    await page.locator('#profile-occupation').inputValue(),
    'QA Custom Occupation',
  );
  await page.locator('#profile-email').click();
  await page.locator('#profile-email').fill(`qa-${run}-updated@example.com`);
  const contactSaved = page
    .waitForResponse(
      (r) =>
        r.request().method() === 'PATCH' &&
        new URL(r.url()).pathname.endsWith('/customer/profile'),
    )
    .catch((error) => error);
  await page.getByRole('button', { name: /Lưu/ }).first().click();
  const contactResponse = await contactSaved;
  if (contactResponse instanceof Error) throw contactResponse;
  assert.equal(contactResponse.status(), 200);
  await assertCustomer('nghenghiep', 'QA Custom Occupation', customerPhone);
  const storedAccount = await db.tai_khoan.findUnique({
    where: { mataikhoan: customerAccount },
  });
  assert.equal(storedAccount.email, `qa-${run}-updated@example.com`);
  await page
    .getByRole('button', { name: /Chỉnh sửa/ })
    .first()
    .click();
  console.log(
    'PASS changing profile email preserves custom occupation and updates linked account',
  );
  await page
    .locator('[formcontrolname="occupation"]')
    .selectOption('Nhân viên văn phòng');
  assert.equal(
    await page.locator('[formcontrolname="occupation"]').inputValue(),
    'Nhân viên văn phòng',
  );
  const profileSaved = page
    .waitForResponse(
      (r) =>
        r.request().method() === 'PATCH' &&
        new URL(r.url()).pathname.endsWith('/customer/profile'),
    )
    .catch((error) => error);
  await page.getByRole('button', { name: /Lưu/ }).first().click();
  const profileResponse = await profileSaved;
  if (profileResponse instanceof Error) throw profileResponse;
  assert.equal(profileResponse.status(), 200, 'Profile update API succeeds');
  for (let i = 0; i < 10; i++) {
    const c = await db.khach_hang.findUnique({
      where: { makhachhang: customerId },
    });
    if (c.nghenghiep === 'Nhân viên văn phòng') break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await assertCustomer('nghenghiep', 'Nhân viên văn phòng', customerPhone);
  await page.reload();
  await page
    .getByText('Nhân viên văn phòng', { exact: true })
    .first()
    .waitFor();
  console.log('PASS customer frontend profile save and reload use Supabase');
  if (repairs) {
    await page.goto(base + '/customer/profile?tab=tickets');
    await page
      .locator('.ticket-card')
      .filter({ hasText: qaTicketId })
      .getByRole('button', { name: 'Chi tiết', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Đánh giá chuyến đi', exact: true })
      .click();
    await page
      .getByRole('button', { name: '5 sao', exact: true })
      .first()
      .click();
    await page
      .locator('form.review-form input[type="file"]')
      .setInputFiles({
        name: 'qa-proof.png',
        mimeType: 'image/png',
        buffer: pngProof,
      });
    const posted = page
      .waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          new URL(r.url()).pathname.endsWith(`/tickets/${qaTicketId}/review`),
      )
      .catch((error) => error);
    await page
      .getByRole('button', { name: 'Gửi đánh giá', exact: true })
      .click();
    const response = await posted;
    if (response instanceof Error) throw response;
    assert.equal(response.status(), 201);
    const review = await db.danh_gia.findUnique({
      where: { mave: qaTicketId },
      include: { tep_danh_gia: true },
    });
    assert.equal(review.tep_danh_gia.length, 1);
    const record = review.tep_danh_gia[0];
    assert.equal(record.dungluong, BigInt(pngProof.length));
    assert.equal(record.dinhdangtep, 'image/png');
    const downloaded = await fetch(base + record.duongdantep);
    assert.equal(downloaded.status, 200);
    assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), pngProof);
    console.log(
      'PASS frontend review attachment persists real Supabase metadata and serves the stored file',
    );
  }
  assert.equal(requestErrors.length, 0, 'No uncaught browser errors');
}
async function cleanup() {
  if (page && !page.isClosed())
    await page
      .waitForLoadState('networkidle', { timeout: 10000 })
      .catch(() => {});
  if (browser) await browser.close();
  if (app) await app.close().catch(() => {});
  const cleanDb = new PrismaService();
  // Only IDs/phones generated by this run are selected, never existing user rows.
  await cleanDb.$connect();
  await cleanDb.$transaction(
    async (tx) => {
      if (repairs) {
        await tx.tep_danh_gia.deleteMany({
          where: { danh_gia: { mave: qaTicketId } },
        });
        await tx.danh_gia.deleteMany({ where: { mave: qaTicketId } });
        await tx.ve_xe.deleteMany({
          where: { mave: qaTicketId, madonhang: qaOrderId },
        });
        await tx.don_hang.deleteMany({
          where: { madonhang: qaOrderId, makhachhang: customerId },
        });
        await tx.ghe_chuyen.deleteMany({
          where: { maghechuyen: qaSeatId, malichtrinh: qaTripId },
        });
        await tx.lich_trinh.deleteMany({
          where: { malichtrinh: qaTripId, ghichu: `QA_BROWSER:${run}` },
        });
      }
      const customers = await tx.khach_hang.findMany({
        where: {
          OR: [
            { makhachhang: customerId, mataikhoan: customerAccount },
            {
              sodienthoai: guestPhone,
              hotenkhachhang: `QA Guest ${run}`,
              mataikhoan: null,
              makhachhang: { startsWith: 'KH_' },
            },
          ],
        },
        select: { makhachhang: true, mataikhoan: true },
      });
      const employees = await tx.nhan_vien.findMany({
        where: {
          OR: [
            { manhanvien: rootStaff, mataikhoan: rootAccount },
            {
              sodienthoai: employeePhone,
              email: employeeEmail,
              tai_khoan: { tendangnhap: `qa_emp_${run}` },
            },
          ],
        },
        select: { manhanvien: true, mataikhoan: true },
      });
      const accountIds = [
        ...new Set(
          [
            rootAccount,
            customerAccount,
            ...customers.map((c) => c.mataikhoan),
            ...employees.map((e) => e.mataikhoan),
          ].filter(Boolean),
        ),
      ];
      const entityIds = [
        ...customers.map((c) => c.makhachhang),
        ...employees.map((e) => e.manhanvien),
        ...accountIds,
        ...(repairs ? [qaTripId, qaSeatId, qaOrderId, qaTicketId] : []),
      ];
      await tx.nhat_ky_he_thong.deleteMany({
        where: {
          OR: [
            { mataikhoan: { in: accountIds } },
            { madoituong: { in: entityIds } },
          ],
        },
      });
      await tx.phien_dang_nhap.deleteMany({
        where: { mataikhoan: { in: accountIds } },
      });
      await tx.nhan_vien_quyen_han.deleteMany({
        where: { manhanvien: { in: employees.map((e) => e.manhanvien) } },
      });
      await tx.khach_hang.deleteMany({
        where: { makhachhang: { in: customers.map((c) => c.makhachhang) } },
      });
      await tx.nhan_vien.deleteMany({
        where: { manhanvien: { in: employees.map((e) => e.manhanvien) } },
      });
      await tx.tai_khoan.deleteMany({
        where: { mataikhoan: { in: accountIds } },
      });
    },
    { timeout: 30000 },
  );
  await cleanDb.$disconnect();
  if (reviewDirectory) {
    for (const name of fs.readdirSync(reviewDirectory)) {
      assert.match(name, /^TDG_[a-f0-9]{32}\.(png|jpg|webp|mp4|webm)$/);
      fs.unlinkSync(path.join(reviewDirectory, name));
    }
    fs.rmdirSync(reviewDirectory);
  }
  await db.$disconnect().catch(() => {});
  console.log(
    'CLEANUP disposable QA accounts, customers, sessions and audit rows removed',
  );
}
main()
  .catch(async (e) => {
    if (page) {
      fs.mkdirSync(path.resolve(__dirname, '../../artifacts'), {
        recursive: true,
      });
      await page
        .screenshot({
          path: path.resolve(
            __dirname,
            '../../artifacts/accounts-browser-failure.png',
          ),
          fullPage: true,
        })
        .catch(() => {});
    }
    console.error(String(e.stack || e).replaceAll(password, '[REDACTED]'));
    process.exitCode = 1;
  })
  .finally(() =>
    cleanup().catch((e) => {
      console.error('QA cleanup failed:', e.code || e.name);
      process.exitCode = 1;
    }),
  );
