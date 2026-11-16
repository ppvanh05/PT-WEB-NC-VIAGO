// Isolated password recovery and multipart/file persistence regressions. No real SMS or DB writes.
require('reflect-metadata');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { Prisma } = require('@prisma/client');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { AccountsModule } = require('../dist/featured/accounts.module');
const {
  CustomersService,
} = require('../dist/featured/admin/customers/accounts/customers.service');
const {
  ReviewMediaService,
  reviewFileType,
} = require('../dist/featured/customer/profile/review-media.service');
const {
  hashPassword,
  verifyPassword,
} = require('../dist/shared/accounts/account-security');
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jk1kAAAAASUVORK5CYII=',
  'base64',
);
let app, root, media;
const oldDirectory = process.env.REVIEW_UPLOAD_DIR;
let records = [],
  reviews = [];
async function main() {
  const adminHash = await hashPassword('AdminCorrect!');
  const updates = [],
    audits = [];
  let revoked = 0,
    invalidated = 0;
  const tx = {
    $queryRaw: async () => [],
    tai_khoan: {
      findUniqueOrThrow: async (q) =>
        q.where.mataikhoan === 'ADMIN'
          ? {
              mataikhoan: 'ADMIN',
              vaitrotaikhoan: 'NhanVien',
              trangthai: 'HoatDong',
              solandangnhapsai: 0,
              matkhauhash: adminHash,
            }
          : {
              mataikhoan: 'BROKEN',
              vaitrotaikhoan: 'KhachHang',
              trangthai: 'DaKhoa',
            },
      update: async (q) => {
        updates.push(q);
      },
    },
    khach_hang: {
      findUniqueOrThrow: async () => ({
        makhachhang: 'KH_TEST',
        mataikhoan: 'BROKEN',
      }),
    },
    phien_dang_nhap: {
      updateMany: async () => {
        revoked++;
      },
    },
    otp: {
      updateMany: async () => {
        invalidated++;
      },
    },
  };
  const customers = new CustomersService(
    { $transaction: async (fn) => fn(tx) },
    {
      audit: async (...args) => {
        audits.push(args);
      },
    },
  );
  await assert.rejects(
    () =>
      customers.password(
        'KH_TEST',
        { adminPassword: 'wrong', newPassword: 'NewCustomerPassword!' },
        { accountId: 'ADMIN' },
        {},
      ),
    (e) => e.getStatus() === 401,
  );
  assert.equal(revoked, 0);
  assert.equal(updates[0].data.solandangnhapsai, 1);
  const result = await customers.password(
    'KH_TEST',
    { adminPassword: 'AdminCorrect!', newPassword: 'NewCustomerPassword!' },
    { accountId: 'ADMIN' },
    {},
  );
  assert.equal(result.accountId, 'BROKEN');
  const changed = updates.find((q) => q.where.mataikhoan === 'BROKEN');
  assert.equal(
    await verifyPassword('NewCustomerPassword!', changed.data.matkhauhash),
    true,
  );
  assert.equal(changed.data.trangthai, undefined);
  assert.equal(revoked, 1);
  assert.equal(invalidated, 1);
  assert.ok(!JSON.stringify(audits).includes('NewCustomerPassword!'));
  console.log(
    'PASS admin password confirmation, failure counter, repaired scrypt hash, session/OTP revocation and preserved account lock',
  );

  await fs.mkdir(path.resolve(__dirname, '../../artifacts'), {
    recursive: true,
  });
  root = await fs.mkdtemp(
    path.resolve(__dirname, '../../artifacts/review-upload-test-'),
  );
  process.env.REVIEW_UPLOAD_DIR = root;
  const db = {
    onModuleInit: async () => {},
    onModuleDestroy: async () => {},
    $transaction: async (fn) => {
      const previousRecords = [...records],
        previousReviews = [...reviews];
      try {
        return await fn(db);
      } catch (e) {
        records = previousRecords;
        reviews = previousReviews;
        throw e;
      }
    },
    phien_dang_nhap: {
      findFirst: async () => ({
        maphien: 'PDN_TEST',
        tai_khoan: {
          mataikhoan: 'TK_TEST',
          vaitrotaikhoan: 'KhachHang',
          trangthai: 'HoatDong',
          khach_hang: {
            makhachhang: 'KH_TEST',
            hotenkhachhang: 'QA',
            trangthai: 'HoatDong',
          },
        },
      }),
      updateMany: async () => ({ count: 0 }),
    },
    ve_xe: {
      findFirst: async (q) =>
        q.where.mave === 'VE_SELF' ? { mave: 'VE_SELF' } : null,
    },
    danh_gia: {
      create: async (q) => {
        if (reviews.some((r) => r.mave === q.data.mave))
          throw new Prisma.PrismaClientKnownRequestError('Duplicate', {
            code: 'P2002',
            clientVersion: '6.19.3',
          });
        reviews.push(q.data);
        return q.data;
      },
    },
    tep_danh_gia: {
      createMany: async (q) => {
        records.push(...q.data);
      },
      count: async (q) =>
        records.filter((r) => q.where.matepdanhgia.in.includes(r.matepdanhgia))
          .length,
      findFirst: async (q) =>
        records.find(
          (r) =>
            r.matepdanhgia === q.where.matepdanhgia &&
            r.trangthai === 'HienThi',
        ) || null,
    },
    nhat_ky_he_thong: { create: async () => {} },
  };
  const module = await Test.createTestingModule({ imports: [AccountsModule] })
    .overrideProvider(PrismaService)
    .useValue(db)
    .compile();
  app = module.createNestApplication({ logger: false });
  await app.init();
  media = module.get(ReviewMediaService);
  const api = request(app.getHttpServer()),
    token = 'Bearer ' + 'a'.repeat(64);
  await api
    .post('/customer/profile/tickets/VE_OTHER/review')
    .set('Authorization', token)
    .field('scores', '[5,4,5,4,5,4]')
    .attach('files', png, 'proof.png')
    .expect(404);
  assert.equal((await fs.readdir(root)).length, 0);
  await api
    .post('/customer/profile/tickets/VE_SELF/review')
    .set('Authorization', token)
    .field('scores', '[5,4,5,4,5,4]')
    .attach('files', Buffer.from('<html>bad</html>'), 'spoof.png')
    .expect(400);
  assert.equal(records.length, 0);
  await api
    .post('/customer/profile/tickets/VE_SELF/review')
    .set('Authorization', token)
    .field('scores', '[5,4,5,4,5,4]')
    .field('comment', 'QA upload')
    .attach('files', png, 'proof.png')
    .expect(201);
  assert.equal(records.length, 1);
  assert.equal(records[0].dinhdangtep, 'image/png');
  assert.equal(records[0].dungluong, BigInt(png.length));
  const uploaded = await api
    .get('/customer/review-media/' + records[0].matepdanhgia)
    .expect(200);
  assert.deepEqual(uploaded.body, png);
  assert.match(uploaded.headers['x-content-type-options'], /nosniff/);
  await api
    .post('/customer/profile/tickets/VE_SELF/review')
    .set('Authorization', token)
    .field('scores', '[5,4,5,4,5,4]')
    .attach('files', png, 'again.png')
    .expect(409);
  assert.equal(
    (await fs.readdir(root)).length,
    1,
    'Failed duplicate review leaves no orphan files',
  );
  assert.equal(records.length, 1);
  records[0].trangthai = 'DaAn';
  await api
    .get('/customer/review-media/' + records[0].matepdanhgia)
    .expect(404);
  await assert.rejects(
    () => media.read('../private'),
    (e) => e.getStatus() === 404,
  );
  assert.throws(
    () =>
      reviewFileType({
        mimetype: 'image/png',
        size: png.length,
        buffer: Buffer.from('not-an-image'),
      }),
    (e) => e.getStatus() === 400,
  );
  console.log(
    'PASS multipart review upload, ownership, binary MIME validation, private disk + DB metadata, serving, hidden media and rollback cleanup',
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (app) await app.close();
    if (root) {
      for (const name of await fs.readdir(root)) {
        if (!/^TDG_[a-f0-9]{32}\.(png|jpg|webp|mp4|webm)$/.test(name))
          throw new Error('Unexpected test file');
        await fs.unlink(path.join(root, name));
      }
      await fs.rmdir(root);
    }
    if (oldDirectory === undefined) delete process.env.REVIEW_UPLOAD_DIR;
    else process.env.REVIEW_UPLOAD_DIR = oldDirectory;
  });
