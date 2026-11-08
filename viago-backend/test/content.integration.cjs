const path = require('node:path'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
require('reflect-metadata');
process.env.NEWS_SCHEDULER_ENABLED = 'false';
const { randomBytes, createHash } = require('node:crypto');
const { Test } = require('@nestjs/testing'),
  { PrismaClient } = require('@prisma/client'),
  request = require('supertest');
const { AppModule } = require('../dist/app.module');
const { PrismaService } = require('../dist/prisma/prisma.service');
const {
  HomePromotionsService,
} = require('../dist/featured/customer/home/promotions/promotions.service');
const { vietnamDate } = require('../dist/featured/customer/about/about.dto');
const db = new PrismaClient(),
  suffix = randomBytes(5).toString('hex'),
  token = randomBytes(32).toString('hex');
let app,
  groups = 0;
const created = {};
async function check(name, fn) {
  await fn();
  groups++;
  console.log('PASS ' + name);
}
async function run(tx) {
  const prisma = new Proxy(tx, {
    get(target, prop) {
      if (prop === '$transaction')
        return async (fn) =>
          typeof fn === 'function' ? fn(prisma) : Promise.all(fn);
      if (
        ['$connect', '$disconnect', 'onModuleInit', 'onModuleDestroy'].includes(
          prop,
        )
      )
        return async () => {};
      return Reflect.get(target, prop);
    },
  });
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();
  app = module.createNestApplication({ logger: false });
  await app.init();
  const api = request(app.getHttpServer()),
    visitor = request.agent(app.getHttpServer());
  const staff = await tx.nhan_vien.findFirstOrThrow({
    where: {
      trangthai: 'HoatDong',
      tai_khoan: { trangthai: 'HoatDong', vaitrotaikhoan: 'NhanVien' },
    },
    select: { manhanvien: true, mataikhoan: true },
  });
  await tx.phien_dang_nhap.create({
    data: {
      maphien: 'PDN_CONTENT_' + suffix,
      mataikhoan: staff.mataikhoan,
      tokenphien: createHash('sha256').update(token).digest('hex'),
      tenthietbi: 'Content integration',
      trinhduyet: 'supertest',
      diachiip: '127.0.0.1',
      thoigiandangnhap: new Date(),
      thoigianhoatdongcuoi: new Date(),
      thoigianhethan: new Date(Date.now() + 600000),
      trangthai: 'DangHoatDong',
    },
  });
  const admin = (method, url) =>
    api[method](url).set('Authorization', 'Bearer ' + token);
  await check(
    'content APIs require a server-issued admin session',
    async () => {
      for (const name of ['news', 'policies', 'promotions']) {
        await api.get('/admin/' + name).expect(401);
        await api
          .post('/admin/' + name)
          .send({})
          .expect(401);
        await admin('get', '/admin/' + name + '?pageSize=1').expect(200);
      }
    },
  );
  await check(
    'admin article create and edit appear in the public news API; actor cannot be forged',
    async () => {
      const r = (
        await admin('post', '/admin/news')
          .send({
            maNhanVien: 'FORGED',
            tieuDe: 'Content audit ' + suffix,
            moTa: 'Database-backed article ' + suffix,
            image: '/assets/customer/logo.png',
            loai: 'TinTucNhaXe',
            noiDung: '<p>Initial content ' + suffix + '</p>',
            trangThai: 'DangHienThi',
            noiBat: true,
            tags: ['Audit'],
          })
          .expect(201)
      ).body;
      created.news = r.id;
      assert.match(r.id, /^TT\d+$/);
      assert.equal(r.maNhanVienDang, staff.manhanvien);
      const detail = (await api.get('/customer/news/' + r.id).expect(200)).body;
      assert.equal(detail.content, '<p>Initial content ' + suffix + '</p>');
      await admin('patch', '/admin/news/' + r.id)
        .send({
          noiDung: '<p>Updated database content ' + suffix + '</p>',
          tieuDe: 'Updated ' + suffix,
        })
        .expect(200);
      assert.equal(
        (await api.get('/customer/news/' + r.duongDan).expect(200)).body
          .content,
        '<p>Updated database content ' + suffix + '</p>',
      );
      const list = (
        await api
          .get('/customer/news?search=' + suffix + '&pageSize=1')
          .expect(200)
      ).body;
      assert.equal(list.pagination.total, 1);
      assert.equal(list.data[0].id, r.id);
    },
  );
  let commentId;
  await check(
    'views, comments, replies and cookie-based likes persist in Supabase',
    async () => {
      const before = await tx.tin_tuc.findUniqueOrThrow({
        where: { matintuc: created.news },
        select: { luotxem: true },
      });
      await visitor
        .post('/customer/news/' + created.news + '/views')
        .send({})
        .expect(200);
      assert.equal(
        (
          await tx.tin_tuc.findUniqueOrThrow({
            where: { matintuc: created.news },
            select: { luotxem: true },
          })
        ).luotxem,
        before.luotxem + 1,
      );
      const comment = (
        await visitor
          .post('/customer/news/' + created.news + '/comments')
          .send({
            authorName: 'QA reader',
            content: 'Persisted comment ' + suffix,
          })
          .expect(201)
      ).body;
      commentId = comment.id;
      assert.match(commentId, /^BL\d+$/);
      await visitor
        .post(
          '/customer/news/' +
            created.news +
            '/comments/' +
            commentId +
            '/replies',
        )
        .send({ content: 'Persisted reply ' + suffix })
        .expect(201);
      assert.equal(
        (
          await visitor
            .put(
              '/customer/news/' +
                created.news +
                '/comments/' +
                commentId +
                '/like',
            )
            .expect(200)
        ).body.likes,
        1,
      );
      assert.equal(
        (
          await visitor
            .put(
              '/customer/news/' +
                created.news +
                '/comments/' +
                commentId +
                '/like',
            )
            .expect(200)
        ).body.likes,
        1,
      );
      const comments = (
        await visitor
          .get('/customer/news/' + created.news + '/comments')
          .expect(200)
      ).body;
      assert.equal(comments.pagination.total, 1);
      assert.equal(comments.data[0].isLiked, true);
      assert.equal(comments.data[0].replies.length, 1);
      assert.equal(
        (
          await visitor
            .delete(
              '/customer/news/' +
                created.news +
                '/comments/' +
                commentId +
                '/like',
            )
            .expect(200)
        ).body.likes,
        0,
      );
    },
  );
  await check(
    'admin comment moderation and article visibility affect the customer immediately',
    async () => {
      await admin(
        'patch',
        '/admin/news/' + created.news + '/comments/' + commentId + '/status',
      )
        .send({ trangThai: 'DaAn' })
        .expect(200);
      assert.equal(
        (
          await api
            .get('/customer/news/' + created.news + '/comments')
            .expect(200)
        ).body.pagination.total,
        0,
      );
      await admin('patch', '/admin/news/' + created.news + '/status')
        .send({ trangThai: 'DaAn' })
        .expect(200);
      await api.get('/customer/news/' + created.news).expect(404);
      await admin('patch', '/admin/news/' + created.news + '/status')
        .send({ trangThai: 'DangHienThi' })
        .expect(200);
      await api.get('/customer/news/' + created.news).expect(200);
    },
  );
  await check(
    'privacy policy updates and locking are reflected by the public policy API',
    async () => {
      const r = (
        await admin('post', '/admin/policies')
          .send({
            tenChinhSach: 'Privacy audit ' + suffix,
            loaiChinhSach: 'BaoMat',
            noiDungChinhSach: '<p>Privacy database ' + suffix + '</p>',
            ngayApDung: vietnamDate(),
          })
          .expect(201)
      ).body;
      created.policy = r.maCS;
      assert.match(r.maCS, /^CS\d{5,}$/);
      assert.equal(
        (await api.get('/customer/about/policies/' + r.maCS).expect(200)).body
          .content,
        '<p>Privacy database ' + suffix + '</p>',
      );
      await admin('patch', '/admin/policies/' + r.maCS)
        .send({ noiDungChinhSach: '<p>Changed privacy ' + suffix + '</p>' })
        .expect(200);
      assert.equal(
        (await api.get('/customer/about/policies?search=' + suffix).expect(200))
          .body.data[0].content,
        '<p>Changed privacy ' + suffix + '</p>',
      );
      await admin('patch', '/admin/policies/' + r.maCS + '/status')
        .send({ trangThai: 'DaKhoa' })
        .expect(200);
      await api.get('/customer/about/policies/' + r.maCS).expect(404);
    },
  );
  await check(
    'terms and cancellation fee versions are sourced from actual policy records',
    async () => {
      const r = (
        await admin('post', '/admin/policies')
          .send({
            tenChinhSach: 'Refund audit ' + suffix,
            loaiChinhSach: 'HoanHuy',
            noiDungChinhSach: '<p>Cancellation terms ' + suffix + '</p>',
            ngayApDung: vietnamDate(),
            mocThoiGianHuyVe: [
              { truocGio: 24, phiHuy: 10 },
              { truocGio: 0, phiHuy: 100 },
            ],
          })
          .expect(201)
      ).body;
      created.terms = r.maCS;
      const detail = (
        await api.get('/customer/about/terms/' + r.maCS).expect(200)
      ).body;
      assert.equal(detail.cancellationRules.length, 2);
      assert.equal(detail.cancellationRules[0].feePercent, 10);
      await admin('patch', '/admin/policies/' + r.maCS)
        .send({
          mocThoiGianHuyVe: [
            { truocGio: 24, phiHuy: 20 },
            { truocGio: 0, phiHuy: 100 },
          ],
        })
        .expect(200);
      const versions = await tx.chinh_sach_huy.count({
        where: { manhomchinhsach: r.maCS },
      });
      assert.equal(versions, 2);
      const current = (
        await api.get('/customer/about/terms/' + r.maCS).expect(200)
      ).body;
      assert.equal(current.cancellationRules[0].feePercent, 20);
    },
  );
  await check(
    'promotion CRUD affects public vouchers and server-side discount calculation',
    async () => {
      const today = vietnamDate(),
        ends = vietnamDate(new Date(Date.now() + 7 * 86400000)),
        code = 'QA' + suffix.toUpperCase();
      const r = (
        await admin('post', '/admin/promotions')
          .send({
            code,
            name: 'Promotion audit ' + suffix,
            description: 'Integration promotion',
            discountType: 'fixed',
            discountValue: 10000,
            minOrderValue: 0,
            startDate: today,
            endDate: ends,
            memberTiers: ['Tất cả'],
            limitSubject: 'SoDienThoai',
          })
          .expect(201)
      ).body;
      created.promotion = r.id;
      created.code = code;
      assert.match(r.id, /^KM\d+$/);
      const list = (
        await api.get('/customer/home/promotions?pageSize=100').expect(200)
      ).body;
      assert(list.data.some((p) => p.code === code));
      const route = await tx.tuyen_xe.findFirstOrThrow({
        where: { trangthai: 'HoatDong' },
        select: { matuyenduong: true },
      });
      const calculate = () =>
        module
          .get(HomePromotionsService)
          .discount(
            prisma,
            code,
            [{ routeId: route.matuyenduong, subtotal: 100000 }],
            '0900000000',
          );
      assert.equal((await calculate()).discount, 10000);
      await admin('patch', '/admin/promotions/' + r.id)
        .send({ discountValue: 15000 })
        .expect(200);
      assert.equal((await calculate()).discount, 15000);
      await admin('patch', '/admin/promotions/' + r.id + '/status')
        .send({ status: 'paused' })
        .expect(200);
      await assert.rejects(calculate);
      await admin('patch', '/admin/promotions/' + r.id + '/status')
        .send({ status: 'running' })
        .expect(200);
      assert.equal((await calculate()).discount, 15000);
      assert.equal(
        (
          await admin('get', '/admin/promotions/' + r.id + '/usages').expect(
            200,
          )
        ).body.pagination.total,
        0,
      );
    },
  );
  throw new Error('ROLLBACK_CONTENT_OK');
}
(async () => {
  try {
    await db.$transaction(run, { timeout: 240000, maxWait: 15000 });
  } catch (e) {
    if (e.message !== 'ROLLBACK_CONTENT_OK') throw e;
  } finally {
    await app?.close();
  }
  if (created.news)
    assert.equal(
      await db.tin_tuc.count({ where: { matintuc: created.news } }),
      0,
    );
  if (created.policy)
    assert.equal(
      await db.chinh_sach.count({ where: { machinhsach: created.policy } }),
      0,
    );
  if (created.terms)
    assert.equal(
      await db.chinh_sach.count({ where: { machinhsach: created.terms } }),
      0,
    );
  if (created.promotion)
    assert.equal(
      await db.khuyen_mai.count({ where: { makhuyenmai: created.promotion } }),
      0,
    );
  assert.equal(
    await db.phien_dang_nhap.count({
      where: { maphien: 'PDN_CONTENT_' + suffix },
    }),
    0,
  );
  console.log(JSON.stringify({ groupsPassed: groups, rolledBack: true }));
})()
  .catch((e) => {
    console.error(e.stack);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
