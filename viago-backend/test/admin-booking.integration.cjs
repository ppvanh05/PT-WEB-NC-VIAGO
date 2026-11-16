// All fixtures and mutations run inside one transaction that is always rolled back.
// No bank calls, real transfers, or public business-ID sequence increments.
process.env.NODE_ENV = 'test';
require('dotenv').config({ quiet: true });
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID, createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { Test } = require('@nestjs/testing');
const { BaseExceptionFilter } = require('@nestjs/core');
const request = require('supertest');
const { postSepayWebhook } = require('./helpers/sepay-webhook.cjs');
const {
  AdminBookingManagementModule,
} = require('../dist/featured/admin/booking-management/booking-management.module');
const { PrismaService } = require('../dist/prisma/prisma.service');
const db = new PrismaClient({ log: [] });
const suffix = randomBytes(6).toString('hex');
const base = '/admin/booking-management';
const results = [];
const sepayOnly = process.argv.includes('--sepay');
let app;
async function check(name, fn) {
  if (sepayOnly && !/SePay|OCB|late money/.test(name)) return;
  const started = Date.now();
  await fn();
  results.push(name);
  console.log('PASS ' + name + ' (' + (Date.now() - started) + 'ms)');
}

async function run(tx) {
  for (const prefix of ['dh', 've', 'tt', 'sd', 'nk']) {
    const [row] =
      await tx.$queryRaw`SELECT to_regclass(${'public.viago_id_' + prefix})::text AS name`;
    assert.ok(row.name, 'Missing business ID sequence: ' + prefix);
  }
  let savepoint = 0;
  let businessId = 900000000 + Math.floor(Math.random() * 100000000);
  const prisma = new Proxy(tx, {
    get(target, key) {
      if (key === '$transaction')
        return async (fn) => {
          const name = 'admin_booking_' + ++savepoint;
          await tx.$executeRawUnsafe('SAVEPOINT ' + name);
          try {
            const result = await fn(prisma);
            await tx.$executeRawUnsafe('RELEASE SAVEPOINT ' + name);
            return result;
          } catch (e) {
            await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT ' + name);
            await tx.$executeRawUnsafe('RELEASE SAVEPOINT ' + name);
            throw e;
          }
        };
      if (key === '$queryRaw')
        return (strings, ...values) => {
          if (Array.isArray(strings) && strings.join('').includes('nextval('))
            return Promise.resolve([{ number: String(++businessId) }]);
          return target.$queryRaw(strings, ...values);
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
    imports: [AdminBookingManagementModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();
  app = module.createNestApplication({ logger: false, rawBody: true });
  const exceptionFilter = new BaseExceptionFilter(app.getHttpAdapter());
  app.useGlobalFilters({
    catch(error, host) {
      if (typeof error.getStatus !== 'function')
        console.error(
          JSON.stringify({
            unexpectedError: error.name,
            code: error.code ?? null,
            expiredTransaction: error.code === 'P2028',
          }),
        );
      exceptionFilter.catch(error, host);
    },
  });
  await app.init();
  const api = request(app.getHttpServer());
  const staff = await tx.nhan_vien.findMany({
    where: {
      trangthai: 'HoatDong',
      tai_khoan: { trangthai: 'HoatDong', vaitrotaikhoan: 'NhanVien' },
    },
    take: 2,
  });
  assert.equal(
    staff.length,
    2,
    'Need two active operators for ownership checks',
  );
  const tokens = [];
  for (const person of staff) {
    const token = randomBytes(32).toString('hex');
    tokens.push(token);
    await tx.phien_dang_nhap.create({
      data: {
        maphien: 'PDN_ADMIN_TEST_' + person.manhanvien + suffix,
        mataikhoan: person.mataikhoan,
        tokenphien: createHash('sha256').update(token).digest('hex'),
        tenthietbi: 'Rollback test',
        trinhduyet: 'supertest',
        diachiip: '127.0.0.1',
        thoigiandangnhap: new Date(),
        thoigianhoatdongcuoi: new Date(),
        thoigianhethan: new Date(Date.now() + 3600000),
        trangthai: 'DangHoatDong',
      },
    });
  }
  const admin = (method, path, who = 0) =>
    api[method](base + path).set('Authorization', 'Bearer ' + tokens[who]);
  const template = await tx.lich_trinh.findFirstOrThrow({
    where: {
      tuyen_xe: { trangthai: 'HoatDong' },
      xe: { trangthai: 'DangHoatDong', masodoghe: { not: null } },
    },
    include: {
      xe: true,
      lich_trinh_diem: {
        include: { diem_don_tra: true },
        orderBy: { thutu: 'asc' },
      },
    },
  });
  const { xe, lich_trinh_diem: stops, ...fields } = template;
  const tripId = 'LT_ADMIN_TEST_' + suffix;
  const departure = new Date(Math.floor((Date.now() + 86400000) / 1000) * 1000);
  await tx.lich_trinh.create({
    data: {
      ...fields,
      malichtrinh: tripId,
      trangthai: 'DangMoBan',
      thoigiankhoihanh: departure,
      thoigiandongbanve: new Date(departure.getTime() - 1800000),
      thoigiandendukien: new Date(departure.getTime() + 3 * 3600000),
      songaymobantruoc: 30,
      thoigiangiuchophut: 10,
      giavecoso: 160000,
    },
  });
  for (let i = 0; i < stops.length; i++) {
    const { diem_don_tra: _diem_don_tra, ...point } = stops[i];
    await tx.lich_trinh_diem.create({
      data: {
        ...point,
        malichtrinh: tripId,
        thoigiandukien: new Date(departure.getTime() + i * 300000),
      },
    });
  }
  const pickup = stops.find(
    (p) => p.loaidiemtuyen === 'Don' && p.diem_don_tra.trangthai === 'HoatDong',
  );
  const dropoff = stops.find(
    (p) =>
      p.loaidiemtuyen === 'Tra' &&
      p.diem_don_tra.trangthai === 'HoatDong' &&
      p.thutu > pickup?.thutu,
  );
  assert.ok(pickup && dropoff, 'Need active pickup and dropoff');
  const layoutSeats = await tx.ghe.findMany({
    where: { masodoghe: xe.masodoghe, trangthai: 'HoatDong' },
    orderBy: { thutuhienthi: 'asc' },
    take: 5,
  });
  assert.equal(layoutSeats.length, 5);
  const seatIds = layoutSeats.map(
    (_, index) => 'GC_ADMIN_TEST_' + suffix + '_' + index,
  );
  for (let i = 0; i < seatIds.length; i++)
    await tx.ghe_chuyen.create({
      data: {
        maghechuyen: seatIds[i],
        maghe: layoutSeats[i].maghe,
        malichtrinh: tripId,
        trangthaighe: 'Trong',
        giaghe: 160000,
        thoigiancapnhat: new Date(),
      },
    });
  let phone;
  do {
    phone =
      '09' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
  } while (await tx.khach_hang.findUnique({ where: { sodienthoai: phone } }));
  const customer = {
    name: 'Khach Kiem Thu',
    phone,
    email: 'admin-booking-' + suffix + '@example.invalid',
  };
  const customerCount = await tx.khach_hang.count();
  const hold = async (seat = seatIds[0], who = 0) =>
    (
      await admin('post', '/holds', who)
        .send({ holdId: randomUUID(), tripId, seatIds: [seat] })
        .expect(200)
    ).body;
  const quoteBody = (held) => ({
    holdId: held.holdId,
    seatIds: held.seatIds,
    customer,
    pickupId: pickup.madiem,
    dropoffId: dropoff.madiem,
    doubleSeatIds: [],
  });
  const body = (held, method = 'TIEN_MAT', confirmReceived = false) => ({
    ...quoteBody(held),
    idempotencyKey: randomUUID(),
    expectedTotal: 160000,
    source: 'TaiQuay',
    payment: { method, confirmReceived },
    note: 'Internal test note',
  });

  await check(
    'all booking endpoints require admin authentication and strict payloads',
    async () => {
      await api.get(base + '/options').expect(401);
      await api.get(base + '/getAllTickets').expect(401);
      await api
        .post(base + '/orders')
        .send({})
        .expect(401);
      await admin('post', '/holds')
        .send({ tripId, seatIds: [seatIds[0]], staffId: 'forged' })
        .expect(400);
      await admin('post', '/holds')
        .send({ tripId, seatIds: [seatIds[0], seatIds[0]] })
        .expect(400);
    },
  );
  await check(
    'hold ownership, seat conflicts, independent drafts and release',
    async () => {
      const first = await hold();
      const second = await hold(seatIds[1]);
      await admin('post', '/holds', 1)
        .send({ tripId, seatIds: [seatIds[0]] })
        .expect(409);
      await admin('post', '/quote', 1).send(quoteBody(first)).expect(409);
      await admin('delete', '/holds/' + first.holdId, 1).expect(200);
      assert.equal(
        (
          await tx.ghe_chuyen.findUniqueOrThrow({
            where: { maghechuyen: seatIds[0] },
          })
        ).trangthaighe,
        'DangGiu',
      );
      await admin('delete', '/holds/' + first.holdId).expect(200);
      assert.equal(
        (
          await tx.ghe_chuyen.findUniqueOrThrow({
            where: { maghechuyen: seatIds[1] },
          })
        ).trangthaighe,
        'DangGiu',
      );
      await admin('delete', '/holds/' + second.holdId).expect(200);
    },
  );
  await check(
    'inventory reads expired leases without writes or global cleanup',
    async () => {
      const expired = new Date(Date.now() - 60000);
      await tx.ghe_chuyen.update({
        where: { maghechuyen: seatIds[4] },
        data: {
          trangthaighe: 'DangGiu',
          sessiongiucho: 'expired-test',
          giuchoden: expired,
        },
      });
      const inventory = (
        await admin('get', '/trips/' + tripId + '/seats').expect(200)
      ).body;
      assert.equal(
        inventory.seatDetails.find((seat) => seat.id === seatIds[4]).status,
        'available',
      );
      const held = await hold();
      const untouched = await tx.ghe_chuyen.findUniqueOrThrow({
        where: { maghechuyen: seatIds[4] },
      });
      assert.equal(untouched.trangthaighe, 'DangGiu');
      assert.equal(untouched.giuchoden.getTime(), expired.getTime());
      await admin('delete', '/holds/' + held.holdId).expect(200);
      await tx.ghe_chuyen.update({
        where: { maghechuyen: seatIds[4] },
        data: { trangthaighe: 'Trong', sessiongiucho: null, giuchoden: null },
      });
    },
  );
  await check(
    'seat changes preserve retained rows and the original lease deadline',
    async () => {
      const held = await hold();
      const changedAt = new Date(Date.now() - 30000);
      const expiresAt = new Date(Date.now() + 180000);
      await tx.ghe_chuyen.update({
        where: { maghechuyen: seatIds[0] },
        data: { thoigiancapnhat: changedAt, giuchoden: expiresAt },
      });
      const update = async (ids) =>
        (
          await admin('post', '/holds')
            .send({ holdId: held.holdId, tripId, seatIds: ids })
            .expect(200)
        ).body;
      const added = await update(seatIds.slice(0, 2));
      assert.equal(new Date(added.expiresAt).getTime(), expiresAt.getTime());
      const retained = await tx.ghe_chuyen.findUniqueOrThrow({
        where: { maghechuyen: seatIds[0] },
      });
      assert.equal(retained.thoigiancapnhat.getTime(), changedAt.getTime());
      const removed = await update([seatIds[0]]);
      assert.deepEqual(removed.releasedSeatIds, [seatIds[1]]);
      assert.equal(
        (
          await tx.ghe_chuyen.findUniqueOrThrow({
            where: { maghechuyen: seatIds[1] },
          })
        ).trangthaighe,
        'Trong',
      );
      assert.equal(
        (
          await tx.ghe_chuyen.findUniqueOrThrow({
            where: { maghechuyen: seatIds[0] },
          })
        ).thoigiancapnhat.getTime(),
        changedAt.getTime(),
      );
      await admin('delete', '/holds/' + held.holdId).expect(200);
    },
  );
  await check(
    'an expired assigned seat is reclaimed with its order expired atomically',
    async () => {
      const held = await hold(seatIds[4]);
      const order = (
        await admin('post', '/orders').send(body(held)).expect(201)
      ).body;
      const expired = new Date(Date.now() - 1000);
      await tx.don_hang.update({
        where: { madonhang: order.id },
        data: { thoigianhethangiucho: expired },
      });
      await tx.ghe_chuyen.update({
        where: { maghechuyen: seatIds[4] },
        data: { giuchoden: expired },
      });
      const replacement = await hold(seatIds[4], 1);
      assert.equal(
        (
          await tx.don_hang.findUniqueOrThrow({
            where: { madonhang: order.id },
          })
        ).trangthaidonhang,
        'HetHanThanhToan',
      );
      const seat = await tx.ghe_chuyen.findUniqueOrThrow({
        where: { maghechuyen: seatIds[4] },
      });
      assert.equal(seat.trangthaighe, 'DangGiu');
      assert.equal(seat.madonhanggiu, null);
      await admin('delete', '/holds/' + replacement.holdId, 1).expect(200);
    },
  );
  await check(
    'database prices, invalid promotions/points and price-change rollback',
    async () => {
      const before = await tx.don_hang.count({
        where: { emailnguoidat: customer.email },
      });
      const held = await hold();
      const quote = (
        await admin('post', '/quote').send(quoteBody(held)).expect(200)
      ).body;
      assert.equal(quote.total, 160000);
      await admin('post', '/quote')
        .send({ ...quoteBody(held), seatIds: [seatIds[1]] })
        .expect(409);
      await admin('post', '/orders')
        .send({ ...body(held), seatIds: [seatIds[1]] })
        .expect(409);
      await admin('post', '/quote')
        .send({ ...quoteBody(held), voucherCode: 'INVALID_ADMIN_TEST' })
        .expect(400);
      await admin('post', '/quote')
        .send({ ...quoteBody(held), pickupId: dropoff.madiem })
        .expect(400);
      const input = body(held);
      input.expectedTotal = 1;
      await admin('post', '/orders').send(input).expect(409);
      assert.equal(
        await tx.don_hang.count({ where: { emailnguoidat: customer.email } }),
        before,
      );
      await admin('delete', '/holds/' + held.holdId).expect(200);
    },
  );
  let cashOrder;
  await check(
    'pending cash order, idempotent creation, operator attribution and no new profiles',
    async () => {
      const held = await hold();
      const input = body(held);
      cashOrder = (await admin('post', '/orders').send(input).expect(201)).body;
      assert.equal(cashOrder.status, 'pending');
      assert.equal(cashOrder.tickets.length, 0);
      assert.equal(cashOrder.source, 'TaiQuay');
      assert.equal(cashOrder.staffId, staff[0].manhanvien);
      assert.equal(cashOrder.customerId, null);
      assert.equal(cashOrder.note, input.note);
      assert.equal(
        (await admin('post', '/orders').send(input).expect(201)).body.id,
        cashOrder.id,
      );
      await admin('post', '/orders')
        .send({ ...input, note: 'different request' })
        .expect(409);
      assert.equal(await tx.khach_hang.count(), customerCount);
      assert.equal(
        await tx.khach_hang.count({ where: { sodienthoai: phone } }),
        0,
      );
      await admin('delete', '/holds/' + held.holdId).expect(409);
    },
  );
  await check(
    'exact cash amount, idempotent collection, paid-order cancellation rejected',
    async () => {
      await admin('post', '/orders/' + cashOrder.id + '/confirm-payment')
        .send({ idempotencyKey: randomUUID(), receivedAmount: 1 })
        .expect(400);
      const confirmation = {
        idempotencyKey: randomUUID(),
        receivedAmount: cashOrder.total,
      };
      const paid = (
        await admin('post', '/orders/' + cashOrder.id + '/confirm-payment', 1)
          .send(confirmation)
          .expect(200)
      ).body;
      assert.equal(paid.status, 'paid');
      assert.equal(paid.tickets.length, 1);
      assert.equal(paid.collectedBy, staff[1].manhanvien);
      await admin('post', '/orders/' + cashOrder.id + '/confirm-payment', 1)
        .send(confirmation)
        .expect(200);
      assert.equal(
        await tx.ve_xe.count({ where: { madonhang: cashOrder.id } }),
        1,
      );
      assert.equal(
        await tx.phan_bo_thanh_toan_ve.count({
          where: { mave: paid.tickets[0].id },
        }),
        1,
      );
      await admin('post', '/orders/' + cashOrder.id + '/cancel')
        .send({ reason: 'cancel paid' })
        .expect(409);
    },
  );
  await check(
    'cash collection can complete atomically with creation',
    async () => {
      const held = await hold(seatIds[1]);
      const input = body(held, 'TIEN_MAT', true);
      const paid = (await admin('post', '/orders').send(input).expect(201))
        .body;
      assert.equal(paid.status, 'paid');
      assert.equal(paid.tickets.length, 1);
      assert.equal(
        (await admin('post', '/orders').send(input).expect(201)).body.tickets
          .length,
        1,
      );
    },
  );
  const envKeys = [
    'SEPAY_MODE',
    'SEPAY_ACCOUNT_NO',
    'VIETQR_BANK_ID',
    'VIETQR_ACCOUNT_NO',
    'VIETQR_ACCOUNT_NAME',
    'SEPAY_BANK_NAME',
    'SEPAY_WEBHOOK_SECRET',
  ];
  const previous = Object.fromEntries(
    envKeys.map((key) => [key, process.env[key]]),
  );
  try {
    for (const key of envKeys) delete process.env[key];
    await check(
      'unconfigured SePay rejects order creation without partial writes',
      async () => {
        const held = await hold(seatIds[2]);
        const before = await tx.don_hang.count();
        await admin('post', '/orders').send(body(held, 'VIETQR')).expect(503);
        assert.equal(await tx.don_hang.count(), before);
        await admin('delete', '/holds/' + held.holdId).expect(200);
      },
    );
    Object.assign(process.env, {
      VIETQR_BANK_ID: '970422',
      VIETQR_ACCOUNT_NO: 'TEST0001',
      VIETQR_ACCOUNT_NAME: 'ADMIN TEST',
      SEPAY_BANK_NAME: 'TestBank',
      SEPAY_WEBHOOK_SECRET: randomBytes(32).toString('hex'),
    });
    await check(
      'SePay pending order, QR, authenticated webhook, mismatch review and idempotent ticket issuance',
      async () => {
        const held = await hold(seatIds[2]);
        const input = body(held, 'VIETQR');
        const order = (await admin('post', '/orders').send(input).expect(201))
          .body;
        assert.equal(order.tickets.length, 0);
        assert.equal(order.transfer.amount, 160000);
        const unifiedList = (
          await api
            .get('/admin/counter-orders?status=all&search=' + order.id)
            .set('Authorization', 'Bearer ' + tokens[0])
            .expect(200)
        ).body;
        assert.equal(unifiedList.data[0].id, order.id);
        assert.equal(unifiedList.data[0].adminCreated, true);
        assert.equal(unifiedList.data[0].source, 'TaiQuay');
        assert.equal(order.transfer.content, order.paymentCode);
        assert.match(order.paymentCode, /^VIAGO[0-9]{8}$/);
        assert.equal(
          new URL(order.transfer.qrUrl).searchParams.get('addInfo'),
          order.paymentCode,
        );
        await admin('post', '/orders/' + order.id + '/confirm-payment')
          .send({ idempotencyKey: randomUUID(), receivedAmount: order.total })
          .expect(409);
        const payload = {
          id: businessId + 100,
          gateway: 'TestBank',
          accountNumber: 'TEST0001',
          transferType: 'in',
          transferAmount: order.total,
          content: order.paymentCode,
          transactionDate: new Date(Date.now() - 1000).toISOString(),
          referenceCode: 'TEST_' + suffix,
        };
        const webhook = (data) => postSepayWebhook(api, data);
        await api
          .post('/customer/home/payments/sepay')
          .send(payload)
          .expect(401);
        const paymentsBefore = await tx.thanh_toan.count({
          where: { madonhang: order.id },
        });
        await webhook(payload)
          .set('X-SePay-Signature', 'sha256=' + '0'.repeat(64))
          .expect(401);
        assert.equal(
          await tx.thanh_toan.count({ where: { madonhang: order.id } }),
          paymentsBefore,
        );
        assert.equal(
          await tx.ve_xe.count({ where: { madonhang: order.id } }),
          0,
        );
        await webhook({ ...payload, accountNumber: 'WRONG' }).expect(400);
        assert.equal(
          (
            await webhook({
              ...payload,
              id: payload.id + 1,
              transferAmount: order.total + 1000,
            }).expect(201)
          ).body.requiresReview,
          true,
        );
        assert.equal(
          (await admin('get', '/orders/' + order.id).expect(200)).body
            .requiresReview,
          true,
        );
        assert.equal(
          await tx.ve_xe.count({ where: { madonhang: order.id } }),
          0,
        );
        assert.equal((await webhook(payload).expect(201)).body.processed, true);
        assert.equal((await webhook(payload).expect(201)).body.duplicate, true);
        const paid = (await admin('get', '/orders/' + order.id).expect(200))
          .body;
        assert.equal(paid.status, 'paid');
        assert.equal(paid.transfer, null);
        assert.equal(paid.tickets.length, 1);
        assert.equal(paid.tickets[0].paidAmount, order.total);
        assert.equal(
          (await admin('post', '/orders').send(input).expect(201)).body.id,
          order.id,
        );
        assert.equal(
          (await webhook({ ...payload, id: payload.id + 2 }).expect(201)).body
            .requiresReview,
          true,
        );
        assert.equal(
          await tx.ve_xe.count({ where: { madonhang: order.id } }),
          1,
        );
      },
    );
    await check(
      'expiry releases seats without FE and late money is retained for review',
      async () => {
        const held = await hold(seatIds[3]);
        const input = body(held, 'VIETQR');
        input.source = 'Hotline';
        const order = (await admin('post', '/orders').send(input).expect(201))
          .body;
        await tx.don_hang.update({
          where: { madonhang: order.id },
          data: { thoigianhethangiucho: new Date(Date.now() - 1000) },
        });
        // Opening this expired order must release only its group, leaving
        // unrelated expired orders and anonymous holds for the background sweep.
        const unrelatedTrip = tripId + '_DETAIL';
        const unrelatedSeat = 'GC_DETAIL_' + suffix;
        const unrelatedOrder = 'DH_DETAIL_' + suffix;
        await tx.lich_trinh.create({ data: { ...fields, malichtrinh: unrelatedTrip } });
        const root = await tx.don_hang.findUniqueOrThrow({ where: { madonhang: order.id } });
        const note = JSON.parse(root.ghichu);
        note.leg.tripId = unrelatedTrip; note.leg.seats = [unrelatedSeat];
        note.seatPrices = { [unrelatedSeat]: 160000 };
        await tx.don_hang.create({ data: { ...root, madonhang: unrelatedOrder, malichtrinh: unrelatedTrip, khoachonglap: 'HOME:ADM_DETAIL_' + suffix + ':other:0', ghichu: JSON.stringify(note) } });
        await tx.ghe_chuyen.create({ data: { maghechuyen: unrelatedSeat, maghe: layoutSeats[0].maghe, malichtrinh: unrelatedTrip, trangthaighe: 'DangGiu', sessiongiucho: 'unrelated-detail-test', giuchoden: new Date(Date.now() - 1000), giaghe: 160000, thoigiancapnhat: new Date() } });
        await admin('get', '/orders/' + order.id).expect(200);
        assert.equal((await tx.don_hang.findUniqueOrThrow({ where: { madonhang: unrelatedOrder } })).trangthaidonhang, 'ChoThanhToanOnline');
        assert.equal((await tx.ghe_chuyen.findUniqueOrThrow({ where: { maghechuyen: unrelatedSeat } })).trangthaighe, 'DangGiu');
        assert.equal(
          (
            await tx.ghe_chuyen.findUniqueOrThrow({
              where: { maghechuyen: seatIds[3] },
            })
          ).trangthaighe,
          'Trong',
        );
        assert.equal(
          (await admin('get', '/orders/' + order.id).expect(200)).body.status,
          'expired',
        );
        const late = await postSepayWebhook(api, {
          id: businessId + 200,
          gateway: 'TestBank',
          accountNumber: 'TEST0001',
          transferType: 'in',
          transferAmount: order.total,
          content: order.paymentCode,
          transactionDate: new Date().toISOString(),
        }).expect(201);
        assert.equal(late.body.requiresReview, true);
        assert.equal(
          await tx.ve_xe.count({ where: { madonhang: order.id } }),
          0,
        );
      },
    );
    await check(
      'OCB VA QR uses the recipient VA and verifies both parent account and subAccount before issuing tickets',
      async () => {
        const saved = Object.fromEntries(
          envKeys.map((key) => [key, process.env[key]]),
        );
        try {
          Object.assign(process.env, {
            SEPAY_MODE: 'live',
            VIETQR_BANK_ID: '970448',
            SEPAY_BANK_NAME: 'OCB',
            VIETQR_ACCOUNT_NO: 'VAOCBTEST001',
            SEPAY_ACCOUNT_NO: 'MAINOCBTEST001',
          });
          const held = await hold(seatIds[4]);
          const order = (
            await admin('post', '/orders')
              .send(body(held, 'VIETQR'))
              .expect(201)
          ).body;
          assert.equal(order.transfer.environment, 'live');
          assert.equal(order.transfer.accountType, 'virtual');
          assert.equal(order.transfer.accountNumber, 'VAOCBTEST001');
          assert.ok(order.transfer.qrUrl.includes('/970448-VAOCBTEST001-'));
          assert.equal(
            JSON.stringify(order.transfer).includes('MAINOCBTEST001'),
            false,
          );
          const payload = {
            id: businessId + 300,
            gateway: 'OCB',
            accountNumber: 'MAINOCBTEST001',
            subAccount: 'VAOCBTEST001',
            transferType: 'in',
            transferAmount: order.total,
            content: order.paymentCode,
            transactionDate: new Date(Date.now() - 1000).toISOString(),
          };
          const webhook = (data) => postSepayWebhook(api, data);
          await webhook({ ...payload, subAccount: 'FOREIGNVA' }).expect(400);
          await webhook({ ...payload, subAccount: null }).expect(400);
          await webhook({ ...payload, accountNumber: 'FOREIGNACCOUNT' }).expect(
            400,
          );
          assert.equal(
            await tx.ve_xe.count({ where: { madonhang: order.id } }),
            0,
          );
          assert.equal(
            (await webhook(payload).expect(201)).body.processed,
            true,
          );
          assert.equal(
            (await webhook(payload).expect(201)).body.duplicate,
            true,
          );
          const paid = (await admin('get', '/orders/' + order.id).expect(200))
            .body;
          assert.equal(paid.status, 'paid');
          assert.equal(paid.tickets.length, 1);
          assert.equal(
            (
              await tx.thanh_toan.findUniqueOrThrow({
                where: { khoachonglap: 'SEPAY:' + payload.id },
              })
            ).dinhdanhtaikhoandoitac,
            'VAOCBTEST001',
          );
        } finally {
          for (const key of envKeys) {
            if (saved[key] === undefined) delete process.env[key];
            else process.env[key] = saved[key];
          }
        }
      },
    );
  } finally {
    for (const key of envKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
  await check(
    'cancel pending order, list pending without tickets and reject customer orders at admin detail',
    async () => {
      const held = await hold(seatIds[3]);
      const order = (
        await admin('post', '/orders').send(body(held)).expect(201)
      ).body;
      const list = (await admin('get', '/orders?status=pending').expect(200))
        .body;
      assert.ok(list.data.some((row) => row.id === order.id));
      const cancelled = (
        await admin('post', '/orders/' + order.id + '/cancel')
          .send({ reason: 'Khach thay doi ke hoach' })
          .expect(200)
      ).body;
      assert.equal(cancelled.status, 'cancelled');
      assert.equal(cancelled.tickets.length, 0);
      assert.equal(
        (
          await tx.ghe_chuyen.findUniqueOrThrow({
            where: { maghechuyen: seatIds[3] },
          })
        ).trangthaighe,
        'Trong',
      );
      await admin('get', '/orders/DOES_NOT_EXIST').expect(404);
    },
  );
  throw new Error('ROLLBACK_ADMIN_BOOKING_SUCCESS');
}

(async () => {
  try {
    await db.$transaction(run, { timeout: 600000, maxWait: 15000 });
  } catch (e) {
    if (e.message !== 'ROLLBACK_ADMIN_BOOKING_SUCCESS') throw e;
  } finally {
    await app?.close();
  }
  assert.equal(
    await db.lich_trinh.count({
      where: { malichtrinh: 'LT_ADMIN_TEST_' + suffix },
    }),
    0,
  );
  console.log(
    JSON.stringify({
      groupsPassed: results.length,
      rolledBack: true,
      bankTransfersSent: 0,
      productionSequencesChanged: false,
    }),
  );
})()
  .catch((e) => {
    console.error(e.stack);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
