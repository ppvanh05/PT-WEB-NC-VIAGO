// Keep the background expiry sweep out of this rollback transaction.
process.env.NODE_ENV = 'test';
const path = require('node:path'),
  assert = require('node:assert/strict'),
  { randomBytes, randomUUID, createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
require('reflect-metadata');
const { postSepayWebhook } = require('./helpers/sepay-webhook.cjs');
const { BaseExceptionFilter } = require('@nestjs/core');
const { Test } = require('@nestjs/testing'),
  { PrismaClient } = require('@prisma/client'),
  request = require('supertest');
const {
    CustomerHomeModule,
  } = require('../dist/featured/customer/home/home.module'),
  { PrismaService } = require('../dist/prisma/prisma.service');
const db = new PrismaClient(),
  suffix = randomBytes(6).toString('hex'),
  token = randomBytes(32).toString('hex');
const email = 'booking-' + suffix + '@example.invalid',
  created = [],
  results = [];
let app;
const check = async (name, fn) => {
  await fn();
  results.push(name);
  console.log('PASS ' + name);
};
async function run(tx) {
  let serial = 0;
  const prisma = new Proxy(tx, {
    get(target, key) {
      // Business sequences are not rolled back by PostgreSQL. Use fixture IDs
      // instead so regression tests never advance the real order/ticket counters.
      if (key === '$queryRaw')
        return (strings, ...values) => {
          if (Array.isArray(strings) && strings.join('').includes('nextval('))
            return Promise.resolve([{ number: String(900000000 + ++serial) }]);
          return target.$queryRaw(strings, ...values);
        };
      if (key === '$transaction')
        return async (fn) => {
          const save = 'booking_test_' + ++serial;
          await tx.$executeRawUnsafe('SAVEPOINT ' + save);
          try {
            const result = await (typeof fn === 'function'
              ? fn(prisma)
              : Promise.all(fn));
            await tx.$executeRawUnsafe('RELEASE SAVEPOINT ' + save);
            return result;
          } catch (error) {
            await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT ' + save);
            await tx.$executeRawUnsafe('RELEASE SAVEPOINT ' + save);
            throw error;
          }
        };
      if (
        ['$connect', '$disconnect', 'onModuleInit', 'onModuleDestroy'].includes(
          key,
        )
      )
        return async () => {};
      return Reflect.get(target, key);
    },
  });
  const module = await Test.createTestingModule({
    imports: [CustomerHomeModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();
  app = module.createNestApplication({ logger: false, rawBody: true });
  const exceptionFilter = new BaseExceptionFilter(app.getHttpAdapter());
  app.useGlobalFilters({ catch(error, host) {
    if (typeof error.getStatus !== 'function') console.error(JSON.stringify({
      unexpectedError: error.name, code: error.code ?? null,
    }));
    exceptionFilter.catch(error, host);
  } });
  await app.init();
  const api = request(app.getHttpServer()),
    a = request.agent(app.getHttpServer()),
    b = request.agent(app.getHttpServer()),
    c = request.agent(app.getHttpServer());
  const staff = await tx.nhan_vien.findFirstOrThrow({
    where: {
      trangthai: 'HoatDong',
      tai_khoan: { trangthai: 'HoatDong', vaitrotaikhoan: 'NhanVien' },
    },
  });
  await tx.phien_dang_nhap.create({
    data: {
      maphien: 'PDN_BOOKING_' + suffix,
      mataikhoan: staff.mataikhoan,
      tokenphien: createHash('sha256').update(token).digest('hex'),
      tenthietbi: 'Rollback booking audit',
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
  let trip, seats, leg, order;
  const passenger = { name: 'Booking Audit', phone: '0900000000', email };
  const orderBody = (legs, key = randomUUID()) => ({
    legs,
    passenger,
    terms: true,
    key,
  });
  // Kenh truc tuyen chi nhan VietQR, nen moi don do khach tu tao trong bai
  // kiem thu nay deu la don VietQR va can cong thanh toan da duoc cau hinh.
  const sepayKeys = [
    'VIETQR_BANK_ID',
    'SEPAY_MODE',
    'SEPAY_ACCOUNT_NO',
    'VIETQR_ACCOUNT_NO',
    'VIETQR_ACCOUNT_NAME',
    'SEPAY_BANK_NAME',
    'SEPAY_WEBHOOK_SECRET',
  ];
  const sepayPrior = Object.fromEntries(
    sepayKeys.map((k) => [k, process.env[k]]),
  );
  for (const k of sepayKeys) delete process.env[k];
  Object.assign(process.env, {
    VIETQR_BANK_ID: 'TESTBANK',
    VIETQR_ACCOUNT_NO: 'TEST0001',
    VIETQR_ACCOUNT_NAME: 'Integration Test',
    SEPAY_BANK_NAME: 'TestBank',
    SEPAY_WEBHOOK_SECRET: randomBytes(32).toString('hex'),
  });
  const restoreSepay = () => {
    for (const k of sepayKeys) {
      if (sepayPrior[k] === undefined) delete process.env[k];
      else process.env[k] = sepayPrior[k];
    }
  };
  const webhook = (data) => postSepayWebhook(api, data);
  let transferId = Math.floor(Date.now() / 1000);
  const transfer = (o, extra = {}) => ({
    id: ++transferId,
    gateway: 'TestBank',
    accountNumber: 'TEST0001',
    transferType: 'in',
    transferAmount: o.total,
    content: o.paymentCode,
    transactionDate: new Date(Date.now() - 1000).toISOString(),
    referenceCode: 'TEST-' + suffix + '-' + o.id,
    ...extra,
  });
  await check(
    'online booking offers VietQR only and reports its configuration',
    async () => {
      const options = (await a.get('/customer/home/options').expect(200)).body;
      assert(!options.paymentMethods.some((m) => m.id === 'counter'));
      assert(
        options.paymentMethods.some(
          (m) => m.id === 'vietqr' && typeof m.configured === 'boolean',
        ),
      );
      const unauthenticated = await api
        .post('/customer/home/payments/sepay')
        .send({});
      assert([401, 503].includes(unauthenticated.status));
      await api.get('/customer/home/orders/nope/payment').expect(404);
      await api.post('/customer/home/orders/nope/pay').send({}).expect(404);
      await api.get('/admin/counter-orders').expect(401);
    },
  );
  await check(
    'real search and seat hold persist in Supabase and exclude other visitors',
    async () => {
      // Chon chuyen con mo ban it nhat 20 phut nua: thoi han giu cho bang
      // min(10 phut, cau hinh chuyen, gio dong ban), nen neu lay chuyen sap
      // dong ban thi cho giu se het han ngay giua bai kiem thu.
      const [candidate] =
        await tx.$queryRaw`SELECT t.diemdi,t.diemden,to_char(l.thoigiankhoihanh AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM-DD') AS date FROM lich_trinh l JOIN tuyen_xe t ON t.matuyenduong=l.matuyenduong JOIN xe x ON x.maxe=l.maxe WHERE l.trangthai='DangMoBan' AND t.trangthai='HoatDong' AND x.trangthai='DangHoatDong' AND l.thoigiankhoihanh>now() AND l.thoigiandongbanve>now()+interval '20 minutes' AND l.thoigiankhoihanh-l.songaymobantruoc*interval '1 day'<=now() ORDER BY l.thoigiankhoihanh LIMIT 1`;
      assert(candidate, 'Need at least one open future trip');
      const response = (
        await a
          .get('/customer/home/trips')
          .query({
            from: candidate.diemdi,
            to: candidate.diemden,
            date: candidate.date,
            count: 1,
            pageSize: 100,
          })
          .expect(200)
      ).body;
      trip = response.outbound.data.find(
        (t) => t.availableSeats >= 3 && t.pickup.length && t.dropoff.length,
      );
      assert(trip);
      seats = trip.seatDetails.filter((s) => s.status === 'available');
      leg = {
        tripId: trip.id,
        seats: [seats[0].id],
        doubleSeats: [],
        pickupId: trip.pickup[0].id,
        dropoffId: trip.dropoff.at(-1).id,
      };
      await a
        .post('/customer/home/holds')
        .send({ legs: [leg] })
        .expect(200);
      const held = await tx.ghe_chuyen.findUniqueOrThrow({
        where: { maghechuyen: seats[0].id },
      });
      assert.equal(held.trangthaighe, 'DangGiu');
      assert(held.sessiongiucho);
      assert(held.giuchoden > new Date());
      await b
        .post('/customer/home/holds')
        .send({ legs: [leg] })
        .expect(409);
      const restored = (await a.get('/customer/home/holds').expect(200)).body;
      assert(restored.data.some((s) => s.seatId === seats[0].id));
    },
  );
  await check(
    'guest quote rejects invalid coupons but accepts no coupon and uses server seat prices',
    async () => {
      await a
        .post('/customer/home/quote')
        .send({ legs: [leg], passenger, voucher: 'NOT_A_REAL_CODE_' + suffix })
        .expect(400);
      const quote = (
        await a
          .post('/customer/home/quote')
          .send({ legs: [leg], passenger })
          .expect(200)
      ).body;
      assert.equal(quote.subtotal, seats[0].price);
      assert.equal(quote.discount, 0);
      assert.equal(quote.total, seats[0].price);
      await b
        .post('/customer/home/quote')
        .send({ legs: [leg], passenger })
        .expect(409);
    },
  );
  await check(
    'create saves a pending VietQR order/payment without issuing paid tickets; retries are idempotent',
    async () => {
      const body = orderBody([leg]);
      await a
        .post('/customer/home/orders')
        .send({ ...body, terms: false })
        .expect(400);
      await a
        .post('/customer/home/orders')
        .send({ ...body, method: 'counter' })
        .expect(400);
      order = (await a.post('/customer/home/orders').send(body).expect(201))
        .body;
      created.push(order.id);
      assert.match(order.id, /^DH\d{3,}$/);
      assert.equal(order.status, 'pending');
      assert.equal(order.method, 'vietqr');
      assert.match(order.paymentCode, /^VIAGO[0-9]{8}$/);
      assert.equal(order.tickets.length, 0);
      const stored = await tx.don_hang.findUniqueOrThrow({
        where: { madonhang: order.id },
      });
      assert.equal(stored.trangthaidonhang, 'ChoThanhToanOnline');
      assert.equal(stored.emailnguoidat, email);
      assert.equal(Number(stored.tongthanhtoan), seats[0].price);
      const payment = await tx.thanh_toan.findFirstOrThrow({
        where: { madonhang: order.id },
      });
      assert.equal(payment.phuongthucthanhtoan, 'VIETQR');
      assert.equal(payment.kenhthanhtoan, 'SePay');
      assert.equal(payment.trangthaithanhtoan, 'ChoThanhToan');
      assert.equal(await tx.ve_xe.count({ where: { madonhang: order.id } }), 0);
      assert.equal(
        (await a.post('/customer/home/orders').send(body).expect(201)).body.id,
        order.id,
      );
      await a
        .post('/customer/home/orders')
        .send({ ...body, passenger: { ...passenger, name: 'Changed Name' } })
        .expect(409);
      assert.equal(
        await tx.don_hang.count({ where: { emailnguoidat: email } }),
        1,
      );
      await b.get('/customer/home/orders/' + order.id).expect(404);
      assert.equal(
        (await a.get('/customer/home/orders/pending').expect(200)).body.order
          .id,
        order.id,
      );
      await a
        .post('/customer/home/orders/' + order.id + '/print')
        .send({})
        .expect(409);
    },
  );
  await check(
    'a VietQR order cannot be collected as cash and an authenticated webhook persists tickets and allocation',
    async () => {
      // Don truc tuyen khong con nam trong danh sach thu tien mat tai quay.
      assert.equal(
        (
          await admin('get', '/admin/counter-orders?search=' + order.id).expect(
            200,
          )
        ).body.pagination.total,
        0,
      );
      await admin('post', '/admin/counter-orders/' + order.id + '/confirm')
        .send({})
        .expect(409);
      assert.equal(await tx.ve_xe.count({ where: { madonhang: order.id } }), 0);
      const qr = (
        await a
          .get('/customer/home/orders/' + order.id + '/payment')
          .expect(200)
      ).body;
      assert.equal(qr.amount, order.total);
      assert.equal(qr.content, order.paymentCode);
      await b.get('/customer/home/orders/' + order.id + '/payment').expect(404);
      const money = transfer(order);
      await api
        .post('/customer/home/payments/sepay')
        .send(money)
        .expect(401);
      const confirmed = (await webhook(money).expect(201)).body;
      assert.equal(confirmed.processed, true, JSON.stringify(confirmed));
      const paid = (
        await a.get('/customer/home/orders/' + order.id).expect(200)
      ).body;
      assert.equal(paid.status, 'paid');
      assert.equal(paid.tickets.length, 1);
      assert.match(paid.tickets[0].id, /^VE\d{3,}$/);
      const payment = await tx.thanh_toan.findFirstOrThrow({
        where: { madonhang: order.id, trangthaithanhtoan: 'ThanhCong' },
      });
      assert.equal(payment.phuongthucthanhtoan, 'VIETQR');
      assert.equal(
        (
          await tx.ghe_chuyen.findUniqueOrThrow({
            where: { maghechuyen: seats[0].id },
          })
        ).trangthaighe,
        'DaBan',
      );
      const allocations = await tx.phan_bo_thanh_toan_ve.findMany({
        where: { mathanhtoan: payment.mathanhtoan },
      });
      assert.equal(allocations.length, 1);
      assert.equal(Number(allocations[0].sotienphanbo), order.total);
      await a
        .get('/customer/home/tickets/' + paid.tickets[0].token)
        .expect(200);
      await a
        .post('/customer/home/orders/' + order.id + '/print')
        .send({})
        .expect(200);
      // Webhook gui lai khong duoc xuat them ve.
      assert.equal((await webhook(money).expect(201)).body.duplicate, true);
      assert.equal(await tx.ve_xe.count({ where: { madonhang: order.id } }), 1);
    },
  );
  await check(
    'cancelling a pending order releases seats, cancels payment and issues no tickets',
    async () => {
      const other = { ...leg, seats: [seats[1].id] };
      await b
        .post('/customer/home/holds')
        .send({ legs: [other] })
        .expect(200);
      const pending = (
        await b
          .post('/customer/home/orders')
          .send(orderBody([other]))
          .expect(201)
      ).body;
      created.push(pending.id);
      assert.equal(
        (
          await b
            .post('/customer/home/orders/' + pending.id + '/cancel')
            .send({})
            .expect(200)
        ).body.status,
        'cancelled',
      );
      assert.equal(
        (
          await tx.ghe_chuyen.findUniqueOrThrow({
            where: { maghechuyen: seats[1].id },
          })
        ).trangthaighe,
        'Trong',
      );
      assert.equal(
        (
          await tx.thanh_toan.findFirstOrThrow({
            where: { madonhang: pending.id },
          })
        ).trangthaithanhtoan,
        'DaHuy',
      );
      await admin('post', '/admin/counter-orders/' + pending.id + '/confirm')
        .send({})
        .expect(409);
      assert.equal(
        await tx.ve_xe.count({ where: { madonhang: pending.id } }),
        0,
      );
    },
  );
  await check(
    'expiration releases the hold and prevents payment confirmation or ticket issuance',
    async () => {
      const other = { ...leg, seats: [seats[2].id] };
      await c
        .post('/customer/home/holds')
        .send({ legs: [other] })
        .expect(200);
      const pending = (
        await c
          .post('/customer/home/orders')
          .send(orderBody([other]))
          .expect(201)
      ).body;
      created.push(pending.id);
      await tx.don_hang.update({
        where: { madonhang: pending.id },
        data: { thoigianhethangiucho: new Date(Date.now() - 1000) },
      });
      await c.get('/customer/home/holds').expect(200);
      assert.equal(
        (await c.get('/customer/home/orders/' + pending.id).expect(200)).body
          .status,
        'expired',
      );
      assert.equal(
        (
          await tx.ghe_chuyen.findUniqueOrThrow({
            where: { maghechuyen: seats[2].id },
          })
        ).trangthaighe,
        'Trong',
      );
      assert.equal(
        (
          await tx.thanh_toan.findFirstOrThrow({
            where: { madonhang: pending.id },
          })
        ).trangthaithanhtoan,
        'HetHan',
      );
      await admin('post', '/admin/counter-orders/' + pending.id + '/confirm')
        .send({})
        .expect(409);
      assert.equal(
        await tx.ve_xe.count({ where: { madonhang: pending.id } }),
        0,
      );
    },
  );
  await check(
    'round-trip reservation links both legs and one VietQR payment issues both tickets exactly once',
    async () => {
      const reverse = (
        await c
          .get('/customer/home/trips')
          .query({
            from: trip.to,
            to: trip.from,
            date: trip.date,
            count: 1,
            pageSize: 100,
          })
          .expect(200)
      ).body.outbound.data.find(
        (t) =>
          Date.parse(t.departureAt) > Date.parse(trip.arrivalAt) &&
          t.availableSeats &&
          t.pickup.length &&
          t.dropoff.length,
      );
      assert(reverse, 'Need a reverse trip after arrival');
      const back = {
        tripId: reverse.id,
        seats: [reverse.seatDetails.find((s) => s.status === 'available').id],
        doubleSeats: [],
        pickupId: reverse.pickup[0].id,
        dropoffId: reverse.dropoff.at(-1).id,
      };
      const out = { ...leg, seats: [seats[1].id] };
      await c
        .post('/customer/home/holds')
        .send({ legs: [out, back] })
        .expect(200);
      const pending = (
        await c
          .post('/customer/home/orders')
          .send(orderBody([out, back]))
          .expect(201)
      ).body;
      created.push(...pending.legs.map((l) => l.orderId));
      assert.equal(pending.legs.length, 2);
      const root = await tx.don_hang.findUniqueOrThrow({
        where: { madonhang: pending.id },
      });
      const linked = await tx.don_hang.findUniqueOrThrow({
        where: { madonhang: root.madonhangkhuhoi },
      });
      assert.equal(linked.madonhangkhuhoi, root.madonhang);
      // Don khu hoi dat truc tuyen cung chi thanh toan bang VietQR.
      assert.match(pending.paymentCode, /^VIAGO[0-9]{8}$/);
      await admin('post', '/admin/counter-orders/' + pending.id + '/confirm')
        .send({})
        .expect(409);
      const money = transfer(pending);
      const confirmed = (await webhook(money).expect(201)).body;
      assert.equal(confirmed.processed, true, JSON.stringify(confirmed));
      const paid = (
        await c.get('/customer/home/orders/' + pending.id).expect(200)
      ).body;
      assert.equal(paid.status, 'paid');
      assert.equal(paid.tickets.length, 2);
      // Gui lai webhook khong duoc xuat them ve cho ca hai chieu.
      assert.equal((await webhook(money).expect(201)).body.duplicate, true);
      assert.equal(
        await tx.ve_xe.count({
          where: { madonhang: { in: pending.legs.map((l) => l.orderId) } },
        }),
        2,
      );
      const payment = await tx.thanh_toan.findFirstOrThrow({
        where: { madonhang: pending.id },
      });
      const allocations = await tx.phan_bo_thanh_toan_ve.findMany({
        where: { mathanhtoan: payment.mathanhtoan },
      });
      assert.equal(
        allocations.reduce((n, r) => n + Number(r.sotienphanbo), 0),
        pending.total,
      );
    },
  );
  await check(
    'VietQR creates a pending online order and an authenticated SePay webhook confirms it exactly once',
    async () => {
      const keys = [
        'VIETQR_BANK_ID',
        'SEPAY_MODE',
        'SEPAY_ACCOUNT_NO',
        'VIETQR_ACCOUNT_NO',
        'VIETQR_ACCOUNT_NAME',
        'SEPAY_BANK_NAME',
        'SEPAY_WEBHOOK_SECRET',
      ];
      const prior = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
      try {
        for (const k of keys) delete process.env[k];
        const online = request.agent(app.getHttpServer());
        const selected = { ...leg, seats: [seats[2].id] };
        await online
          .post('/customer/home/holds')
          .send({ legs: [selected] })
          .expect(200);
        const body = { ...orderBody([selected]), method: 'vietqr' };
        const before = await tx.don_hang.count({
          where: { emailnguoidat: email },
        });
        await online.post('/customer/home/orders').send(body).expect(503);
        assert.equal(
          await tx.don_hang.count({ where: { emailnguoidat: email } }),
          before,
        );
        Object.assign(process.env, {
          VIETQR_BANK_ID: 'TESTBANK',
          VIETQR_ACCOUNT_NO: 'TEST0001',
          VIETQR_ACCOUNT_NAME: 'Integration Test',
          SEPAY_BANK_NAME: 'TestBank',
          SEPAY_WEBHOOK_SECRET: randomBytes(32).toString('hex'),
        });
        const pending = (
          await online.post('/customer/home/orders').send(body).expect(201)
        ).body;
        created.push(pending.id);
        assert.equal(pending.method, 'vietqr');
        assert.equal(pending.status, 'pending');
        assert.match(pending.paymentCode, /^VIAGO[0-9]{8}$/);
        const stored = await tx.don_hang.findUniqueOrThrow({
          where: { madonhang: pending.id },
        });
        assert.equal(stored.trangthaidonhang, 'ChoThanhToanOnline');
        const qr = (
          await online
            .get('/customer/home/orders/' + pending.id + '/payment')
            .expect(200)
        ).body;
        assert.equal(qr.amount, pending.total);
        assert.equal(qr.content, pending.paymentCode);
        assert.equal(
          new URL(qr.qrUrl).searchParams.get('addInfo'),
          pending.paymentCode,
        );
        assert.match(qr.qrUrl, /^https:\/\/img\.vietqr\.io\/image\//);
        const payload = {
          id: Math.floor(Date.now() / 1000),
          gateway: 'TestBank',
          accountNumber: 'TEST0001',
          transferType: 'in',
          transferAmount: pending.total,
          content: pending.paymentCode,
          transactionDate: new Date(Date.now() - 1000).toISOString(),
          referenceCode: 'TEST-' + suffix,
        };
        await api
          .post('/customer/home/payments/sepay')
          .send(payload)
          .expect(401);
        const webhook = (data) => postSepayWebhook(api, data);
        await webhook({ ...payload, accountNumber: 'WRONG0001' }).expect(400);
        const mismatch = (
          await webhook({
            ...payload,
            id: payload.id + 1,
            transferAmount: pending.total + 1000,
          }).expect(201)
        ).body;
        assert.equal(mismatch.requiresReview, true);
        assert.equal(
          (await online.get('/customer/home/orders/' + pending.id).expect(200))
            .body.status,
          'pending',
        );
        assert.equal(
          await tx.ve_xe.count({ where: { madonhang: pending.id } }),
          0,
        );
        assert.equal((await webhook(payload).expect(201)).body.processed, true);
        const paid = (
          await online.get('/customer/home/orders/' + pending.id).expect(200)
        ).body;
        assert.equal(paid.status, 'paid');
        assert.equal(paid.tickets.length, 1);
        assert.equal((await webhook(payload).expect(201)).body.duplicate, true);
        assert.equal(
          await tx.ve_xe.count({ where: { madonhang: pending.id } }),
          1,
        );
        const successful = await tx.thanh_toan.findFirstOrThrow({
          where: { madonhang: pending.id, trangthaithanhtoan: 'ThanhCong' },
        });
        assert.equal(successful.phuongthucthanhtoan, 'VIETQR');
        assert.equal(successful.kenhthanhtoan, 'SePay');
      } finally {
        for (const k of keys) {
          if (prior[k] === undefined) delete process.env[k];
          else process.env[k] = prior[k];
        }
      }
    },
  );
  restoreSepay();
  throw new Error('ROLLBACK_BOOKING_SUCCESS');
}
(async () => {
  try {
    await db.$transaction(run, { timeout: 300000, maxWait: 15000 });
  } catch (e) {
    if (e.message !== 'ROLLBACK_BOOKING_SUCCESS') throw e;
  } finally {
    await app?.close();
  }
  assert.equal(await db.don_hang.count({ where: { emailnguoidat: email } }), 0);
  assert.equal(
    await db.phien_dang_nhap.count({
      where: { maphien: 'PDN_BOOKING_' + suffix },
    }),
    0,
  );
  console.log(
    JSON.stringify({
      groupsPassed: results.length,
      rolledBack: true,
      bankTransfersSent: 0,
      createdOrderIds: created,
    }),
  );
})()
  .catch((e) => {
    console.error(e.stack);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
