// Isolated HTTP/security regression tests. No connection or writes to Supabase.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { AccountsModule } = require('../dist/featured/accounts.module');
const {
  AdminAuthModule,
} = require('../dist/featured/admin/auth/admin-auth.module');
const { PrismaService } = require('../dist/prisma/prisma.service');
const {
  CustomerAuthService,
} = require('../dist/featured/customer/auth/customer-auth.service');
const {
  CustomerProfileService,
} = require('../dist/featured/customer/profile/customer-profile.service');
const {
  EmployeesService,
} = require('../dist/featured/admin/employees/employees.service');
const {
  ActivityLogsService,
} = require('../dist/featured/admin/activity-logs/activity-logs.service');
const {
  hashPassword,
  verifyPassword,
  digest,
  calendarDate,
} = require('../dist/shared/accounts/account-security');
const { AccountsAccess } = require('../dist/shared/accounts/accounts-access');
const now = new Date();
const tokens = {
  customer: 'a'.repeat(64),
  staff: 'b'.repeat(64),
  root: 'c'.repeat(64),
  manager: 'd'.repeat(64),
};
const customer = {
  makhachhang: 'KH_TEST',
  mataikhoan: 'TK_customer',
  hotenkhachhang: 'Khách hàng kiểm thử',
  sodienthoai: '0900000000',
  email: 'test@example.com',
  gioitinh: 'Khac',
  ngaysinh: null,
  nghenghiep: null,
  anhdaidien: null,
  diemtichluy: 0,
  trangthai: 'HoatDong',
  ngaydangky: now,
  bang_hang_thanh_vien: null,
  tai_khoan: { xacthuchailop: false },
};
const staffRow = (role, permissions = []) => ({
  manhanvien: 'NV_TEST',
  hoten: 'Nhân viên kiểm thử',
  trangthai: 'HoatDong',
  vai_tro: { tenvaitro: role, trangthai: 'HoatDong' },
  nhan_vien_quyen_han: permissions.map((name) => ({
    quyen_han: { tenquyen: name },
  })),
});
const accounts = {
  customer: {
    mataikhoan: 'TK_customer',
    vaitrotaikhoan: 'KhachHang',
    trangthai: 'HoatDong',
    khach_hang: customer,
    nhan_vien: null,
  },
  staff: {
    mataikhoan: 'TK_staff',
    vaitrotaikhoan: 'NhanVien',
    trangthai: 'HoatDong',
    nhan_vien: staffRow('NhanVienBanVe'),
    khach_hang: null,
  },
  root: {
    mataikhoan: 'TK_root',
    vaitrotaikhoan: 'NhanVien',
    trangthai: 'HoatDong',
    nhan_vien: staffRow('QuanTriVien'),
    khach_hang: null,
  },
  manager: {
    mataikhoan: 'TK_manager',
    vaitrotaikhoan: 'NhanVien',
    trangthai: 'HoatDong',
    nhan_vien: staffRow('BanQuanLy', [
      'QuanLyTaiKhoanNhanVien',
      'QuanLyTaiKhoanKhachHang',
      'QuanLyNhatKyHoatDong',
    ]),
    khach_hang: null,
  },
};
const db = {
  bang_hang_thanh_vien: { findMany: async () => [] },
  $connect: async () => {},
  $disconnect: async () => {},
  $queryRaw: async query => {
    const key = Object.keys(tokens).find(k => digest(tokens[k]) === query?.values?.[0]);
    return key && accounts[key].trangthai === 'HoatDong' ? [{
      maphien: 'PDN_TEST', mataikhoan: accounts[key].mataikhoan,
      thoigianhethan: new Date(Date.now() + 60000), thoigianhoatdongcuoi: new Date(),
      tai_khoan: accounts[key],
    }] : [];
  },
  onModuleInit: async () => {},
  onModuleDestroy: async () => {},
  $transaction: async (op) =>
    typeof op === 'function' ? op(db) : Promise.all(op),
  phien_dang_nhap: {
    findFirst: async (q) => {
      const key = Object.keys(tokens).find(
        (k) => digest(tokens[k]) === q.where.tokenphien,
      );
      return key
        ? {
            maphien: 'PDN_TEST',
            mataikhoan: accounts[key].mataikhoan,
            thoigianhethan: new Date(Date.now() + 60000),
            tai_khoan: accounts[key],
          }
        : null;
    },
    updateMany: async () => ({ count: 0 }),
    findMany: async () => [],
  },
  khach_hang: {
    findUniqueOrThrow: async () => customer,
    findMany: async () => [],
    count: async () => 0,
    groupBy: async () => [],
  },
  nhan_vien: { findMany: async () => [], count: async () => 0, groupBy: async () => [] },
  don_hang: { aggregate: async () => ({ _sum: { tongthanhtoan: null } }) },
  ve_xe: { count: async () => 0, findMany: async () => [] },
  vai_tro: { findMany: async () => [] },
  quyen_han: { findMany: async () => [] },
  nhat_ky_he_thong: { findMany: async () => [], count: async () => 0 },
};
let app;
async function main() {
  const module = await Test.createTestingModule({
    imports: [AccountsModule, AdminAuthModule],
  })
    .overrideProvider(PrismaService)
    .useValue(db)
    .compile();
  app = module.createNestApplication({ logger: false });
  await app.init();
  const api = request(app.getHttpServer()),
    auth = (name) => `Bearer ${tokens[name]}`;
  for (const path of [
    '/customer/profile',
    '/customer/auth/me',
    '/admin/employees',
    '/admin/customers',
    '/admin/activity-logs',
    '/admin/auth/sessions',
  ])
    await api.get(path).expect(401);
  await api
    .get('/admin/customers')
    .set('Authorization', auth('customer'))
    .expect(403);
  await api
    .get('/customer/profile')
    .set('Authorization', auth('root'))
    .expect(403);
  await api
    .get('/admin/employees')
    .set('Authorization', auth('staff'))
    .expect(403);
  await api
    .get('/admin/employees')
    .set('Authorization', auth('manager'))
    .expect(200);
  await api
    .get('/admin/employees')
    .set('Authorization', auth('root'))
    .expect(200);
  await api
    .get('/admin/customers')
    .set('Authorization', auth('manager'))
    .expect(200);
  await api
    .get('/admin/activity-logs/statistics')
    .set('Authorization', auth('root'))
    .expect(200);
  const profile = await api
    .get('/customer/profile')
    .set('Authorization', auth('customer'))
    .expect(200);
  assert.equal(profile.body.id, 'KH_TEST');
  assert.equal(profile.body.spent, 0);
  assert.ok(!JSON.stringify(profile.body).includes('matkhau'));
  await api
    .get('/admin/customers?pageSize=101')
    .set('Authorization', auth('root'))
    .expect(400);
  await api
    .get('/admin/employees?page=-1')
    .set('Authorization', auth('root'))
    .expect(400);
  await api
    .patch('/customer/profile')
    .set('Authorization', auth('customer'))
    .send({ name: null })
    .expect(400);
  await api
    .patch('/customer/profile')
    .set('Authorization', auth('customer'))
    .send({ role: 'admin' })
    .expect(400);
  await api
    .post('/admin/customers')
    .set('Authorization', auth('root'))
    .send({ phoneNumber: '0900000000' })
    .expect(400);
  await api
    .post('/customer/auth/login')
    .send({ username: '0900000000', password: 'test', role: 'admin' })
    .expect(400);
  await api
    .get('/customer/profile/tickets?ticketStatus=reviewed&sort=priceAsc')
    .set('Authorization', auth('customer'))
    .expect(200);
  await api
    .get('/customer/profile/tickets?date=2026-02-30')
    .set('Authorization', auth('customer'))
    .expect(400);
  await api
    .get('/admin/activity-logs?startDate=2026-11-10&endDate=2026-11-09')
    .set('Authorization', auth('root'))
    .expect(400);
  console.log(
    'PASS HTTP module wiring, role/permission isolation, DTO validation, profile and pagination',
  );

  const originalSms = process.env.ACCOUNT_SMS_WEBHOOK_URL;
  delete process.env.ACCOUNT_SMS_WEBHOOK_URL;
  await api
    .post('/customer/auth/otp/request')
    .send({ phoneNumber: '0900000000', purpose: 'DangKy' })
    .expect(503);
  if (originalSms) process.env.ACCOUNT_SMS_WEBHOOK_URL = originalSms;
  console.log('PASS no fake OTP success when SMS delivery is missing');

  const hash = await hashPassword('CorrectPassword!');
  assert.equal(await verifyPassword('CorrectPassword!', hash), true);
  assert.equal(await verifyPassword('WrongPassword!', hash), false);
  assert.equal(
    await verifyPassword('CorrectPassword!', digest('CorrectPassword!')),
    true,
  );
  assert.equal(await verifyPassword('plaintext', 'plaintext'), false);
  assert.throws(() => calendarDate('2026-02-30'));
  console.log(
    'PASS salted passwords, legacy hash verification, no plaintext password fallback',
  );

  let consumed = false;
  const tx = {
    otp: {
      updateMany: async (q) => {
        assert.equal(q.where.loaiotp, 'QuenMatKhau');
        assert.equal(q.where.sodienthoai, '0900000000');
        assert.equal(q.where.mataikhoan, 'TK_customer');
        if (consumed) return { count: 0 };
        consumed = true;
        return { count: 1 };
      },
    },
  };
  const service = new CustomerAuthService(db, new AccountsAccess(db));
  const proof = `OTP_${'f'.repeat(32)}.${'e'.repeat(64)}`;
  await service.consumeProof(
    tx,
    proof,
    '0900000000',
    'QuenMatKhau',
    'TK_customer',
  );
  await assert.rejects(
    () =>
      service.consumeProof(
        tx,
        proof,
        '0900000000',
        'QuenMatKhau',
        'TK_customer',
      ),
    (e) => e.getStatus() === 401,
  );
  await assert.rejects(
    () => service.consumeProof(tx, 'unverified', '0900000000', 'QuenMatKhau'),
    (e) => e.getStatus() === 401,
  );
  console.log(
    'PASS OTP proof bound to purpose/phone/account and consumed atomically once',
  );

  // Wrong OTP attempts must commit instead of rolling back when returning 401.
  let attempts = 4,
    cancelled = false;
  const otpDb = {
    $transaction: async (fn) => fn(otpDb),
    $queryRaw: async () => [],
    otp: {
      findUnique: async () => ({
        maotp: 'OTP_test',
        maxacthuc: 'invalid',
        dasudung: false,
        trangthai: 'KhaDung',
        solanthu: attempts,
        thoigianhethan: new Date(Date.now() + 60000),
      }),
      update: async (q) => {
        attempts += q.data.solanthu?.increment || 0;
        cancelled = q.data.dasudung === true;
      },
    },
  };
  const otpService = new CustomerAuthService(otpDb, { audit: async () => {} });
  await assert.rejects(
    () =>
      otpService.verifyOtp(
        { challengeId: 'OTP_test', code: '000000' },
        { headers: {} },
      ),
    (e) => e.getStatus() === 401,
  );
  assert.equal(attempts, 5);
  assert.equal(cancelled, true);
  console.log(
    'PASS fifth invalid OTP attempt cancels challenge without losing attempt counter',
  );

  let passwordChanged = false,
    sessionsRevoked = false;
  const passwordDb = {
    $transaction: async (fn) => fn(passwordDb),
    $queryRaw: async () => [],
    tai_khoan: {
      findUniqueOrThrow: async () => ({ matkhauhash: hash }),
      update: async () => {
        passwordChanged = true;
      },
    },
    phien_dang_nhap: {
      updateMany: async () => {
        sessionsRevoked = true;
      },
    },
  };
  const profileService = new CustomerProfileService(
    passwordDb,
    { audit: async () => {} },
    service,
  );
  await assert.rejects(
    () =>
      profileService.password(
        { accountId: 'TK_customer' },
        { currentPassword: 'wrong', newPassword: 'NewPassword!' },
        {},
      ),
    (e) => e.getStatus() === 401,
  );
  assert.equal(passwordChanged, false);
  await profileService.password(
    { accountId: 'TK_customer' },
    { currentPassword: 'CorrectPassword!', newPassword: 'NewPassword!' },
    {},
  );
  assert.equal(passwordChanged, true);
  assert.equal(sessionsRevoked, true);
  console.log(
    'PASS password change verifies old password and revokes sessions',
  );

  let revokeWhere;
  const sessionDb = {
    $transaction: async (fn) => fn(sessionDb),
    phien_dang_nhap: {
      updateMany: async (q) => {
        revokeWhere = q.where;
        return { count: 0 };
      },
    },
  };
  await assert.rejects(
    () =>
      new CustomerProfileService(
        sessionDb,
        { audit: async () => {} },
        service,
      ).revoke({ accountId: 'TK_customer' }, 'PDN_OTHER', {}),
    (e) => e.getStatus() === 404,
  );
  assert.equal(revokeWhere.mataikhoan, 'TK_customer');
  console.log('PASS cannot revoke another account session');

  const employees = new EmployeesService(db, {});
  await assert.rejects(
    () =>
      employees.status(
        'NV_SELF',
        { status: 'DaKhoa', reason: 'test' },
        { staffId: 'NV_SELF' },
        {},
      ),
    (e) => e.getStatus() === 400,
  );
  console.log('PASS administrators cannot lock their own account');

  let accountUpdate;
  const loginDb = {
    $transaction: async (fn) => fn(loginDb),
    $queryRaw: async () => [],
    tai_khoan: {
      findFirst: async () => ({ mataikhoan: 'TK_customer' }),
      findUniqueOrThrow: async () => ({
        mataikhoan: 'TK_customer',
        matkhauhash: hash,
        solandangnhapsai: 4,
        trangthai: 'HoatDong',
        khach_hang: customer,
      }),
      update: async (q) => {
        accountUpdate = q.data;
      },
    },
  };
  const loginService = new CustomerAuthService(loginDb, {
    audit: async () => {},
  });
  await assert.rejects(
    () =>
      loginService.login(
        { username: '0900000000', password: 'wrong' },
        { headers: {} },
      ),
    (e) => e.getStatus() === 401,
  );
  assert.equal(accountUpdate.solandangnhapsai, 5);
  assert.ok(accountUpdate.khoatamden > new Date());
  console.log(
    'PASS fifth invalid password locks account with persistent attempt counter',
  );

  let storedSession;
  loginDb.tai_khoan.findUniqueOrThrow = async () => ({
    mataikhoan: 'TK_customer',
    matkhauhash: hash,
    solandangnhapsai: 0,
    trangthai: 'HoatDong',
    khach_hang: customer,
  });
  loginDb.phien_dang_nhap = {
    create: async (q) => {
      storedSession = q.data;
    },
  };
  const loggedIn = await loginService.login(
    { username: '0900000000', password: 'CorrectPassword!' },
    { headers: {}, socket: {} },
  );
  assert.equal(storedSession.tokenphien, digest(loggedIn.token));
  assert.notEqual(storedSession.tokenphien, loggedIn.token);
  assert.equal(loggedIn.account.customerId, 'KH_TEST');
  assert.equal(
    await verifyPassword('CorrectPassword!', accountUpdate.matkhauhash),
    true,
  );
  assert.equal(loggedIn.account.matkhauhash, undefined);
  console.log(
    'PASS successful login issues opaque token, stores only token digest and upgrades password hash',
  );

  const escalationDb = {
    vai_tro: {
      findUnique: async () => ({
        tenvaitro: 'QuanTriVien',
        trangthai: 'HoatDong',
      }),
    },
    quyen_han: { findMany: async () => [] },
  };
  await assert.rejects(
    () =>
      employees.validate(
        escalationDb,
        {
          birthday: '1990-01-01',
          startDate: '2020-01-01',
          roleId: 'VT005',
          permissions: [],
        },
        { roleName: 'BanQuanLy', permissions: [] },
      ),
    (e) => e.getStatus() === 403,
  );
  console.log('PASS a non-root manager cannot assign the administrator role');

  const log = {
    manhatky: 'NK_TEST',
    thoigian: now,
    hanhdong: 'UPDATE',
    trangthai: 'ThanhCong',
    chitiet: 'Test',
    madoituong: 'TK_TEST',
    banglienquan: 'tai_khoan',
    dulieutruoc: { matkhauhash: 'secret', nested: { token: 'secret' } },
    dulieusau: null,
  };
  const logs = new ActivityLogsService({
    nhat_ky_he_thong: { findUnique: async () => log },
  });
  const safe = await logs.detail('NK_TEST');
  assert.equal(safe.before.matkhauhash, '[REDACTED]');
  assert.equal(safe.before.nested.token, '[REDACTED]');
  console.log('PASS legacy audit payload secrets are redacted');
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (app) await app.close();
  });
