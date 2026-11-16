// All fixture updates are rolled back. No SMS, payments or business sequences.
require('dotenv').config({ quiet: true });
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { ValidationPipe } = require('@nestjs/common');
const {
  LookupService,
} = require('../dist/featured/customer/ticket-lookup/lookup.service');
const {
  LookupEditDto,
} = require('../dist/featured/customer/ticket-lookup/lookup.controller');
const { digest } = require('../dist/shared/accounts/account-security');
const {
  CustomerAuthService,
} = require('../dist/featured/customer/auth/customer-auth.service');
const { AccountsAccess } = require('../dist/shared/accounts/accounts-access');
const db = new PrismaClient({ log: [] });
const checks = [];
async function check(name, fn) {
  await fn();
  checks.push(name);
  console.log('PASS ' + name);
}
(async () => {
  try {
    await db.$transaction(
      async (tx) => {
        const root = await tx.don_hang.findFirstOrThrow({
          where: {
            trangthaidonhang: 'DaThanhToan',
            ve_xe: { some: { trangthaive: { not: 'DaHuy' } } },
          },
          include: {
            ve_xe: true,
            lich_trinh: {
              include: { lich_trinh_diem: { include: { diem_don_tra: true } } },
            },
          },
        });
        const token = randomBytes(32).toString('hex'),
          wrong = randomBytes(32).toString('hex');
        await tx.$executeRaw`INSERT INTO phien_tra_cuu_ve(tokenhash,sodienthoai,thoigianhethan) VALUES (${digest(token)},${root.sodienthoainguoidat},NOW()+INTERVAL '30 minutes'),(${digest(wrong)},'0000000000',NOW()+INTERVAL '30 minutes')`;
        const proxy = new Proxy(tx, {
          get(target, key) {
            if (key === '$transaction') return (fn) => fn(proxy);
            return Reflect.get(target, key);
          },
        });
        const service = new LookupService(
          proxy,
          {
            authenticate: async () => {
              throw new Error('Unexpected account auth');
            },
          },
          {},
        );
        await check(
          'guest test OTP is server-generated, purpose-bound and exchanged only once',
          async () => {
            const keys = [
              'ACCOUNT_OTP_MODE',
              'NODE_ENV',
              'ACCOUNT_SMS_WEBHOOK_URL',
              'ACCOUNT_SMS_WEBHOOK_TOKEN',
            ];
            const prior = Object.fromEntries(
              keys.map((k) => [k, process.env[k]]),
            );
            const log = console.info;
            let code = '';
            process.env.ACCOUNT_OTP_MODE = 'test';
            process.env.NODE_ENV = 'test';
            delete process.env.ACCOUNT_SMS_WEBHOOK_URL;
            delete process.env.ACCOUNT_SMS_WEBHOOK_TOKEN;
            console.info = (message) => {
              code = String(message).match(/: (\d{6})$/)?.[1] || '';
            };
            try {
              const auth = new CustomerAuthService(
                proxy,
                new AccountsAccess(proxy),
              );
              const phone =
                '09' +
                String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
              const request = {
                headers: {},
                socket: { remoteAddress: '127.0.0.1' },
              };
              const challenge = await auth.sendOtp(
                { phoneNumber: phone, purpose: 'TraCuuVe' },
                request,
              );
              assert.match(code, /^[1-9]\d{5}$/);
              assert.ok(!JSON.stringify(challenge).includes(code));
              await assert.rejects(
                auth.verifyOtp(
                  { challengeId: challenge.challengeId, code: '000000' },
                  request,
                ),
                (e) => e.getStatus() === 401,
              );
              const proof = await auth.verifyOtp(
                { challengeId: challenge.challengeId, code },
                request,
              );
              const lookup = new LookupService(proxy, {}, auth);
              let issuedCookie;
              const response = {
                cookie: (name, value) => {
                  issuedCookie = value;
                },
              };
              await lookup.session(
                {
                  phoneNumber: phone,
                  verificationToken: proof.verificationToken,
                },
                response,
              );
              assert.equal(
                (
                  await lookup.list({
                    headers: { cookie: 'viago_lookup=' + issuedCookie },
                  })
                ).items.length,
                0,
              );
              await assert.rejects(
                lookup.session(
                  {
                    phoneNumber: phone,
                    verificationToken: proof.verificationToken,
                  },
                  response,
                ),
                (e) => e.getStatus() === 401,
              );
              process.env.NODE_ENV = 'production';
              await assert.rejects(
                auth.sendOtp(
                  { phoneNumber: phone, purpose: 'TraCuuVe' },
                  request,
                ),
                (e) => e.getStatus() === 503,
              );
            } finally {
              console.info = log;
              for (const key of keys) {
                if (prior[key] === undefined) delete process.env[key];
                else process.env[key] = prior[key];
              }
            }
          },
        );
        const req = { headers: { cookie: 'viago_lookup=' + token } };
        const denied = { headers: { cookie: 'viago_lookup=' + wrong } };
        let view;
        await check(
          'verified phone can view its order; another phone and unauthenticated visitors cannot',
          async () => {
            view = await service.detail(req, root.madonhang);
            assert.equal(view.id, root.madonhang);
            await assert.rejects(
              service.detail(denied, root.madonhang),
              (e) => e.getStatus() === 404,
            );
            await assert.rejects(
              service.detail({ headers: {} }, root.madonhang),
              (e) => e.getStatus() === 401,
            );
          },
        );
        await check(
          'authenticated customers only see orders belonging to their account or account phone',
          async () => {
            const person = await tx.khach_hang.findFirstOrThrow({
              select: { makhachhang: true, sodienthoai: true },
            });
            const accountLookup = new LookupService(
              proxy,
              {
                authenticate: async () => ({
                  role: 'customer',
                  customerId: person.makhachhang,
                }),
              },
              {},
            );
            const rows = await accountLookup.list({
              headers: { authorization: 'Bearer fixture' },
            });
            assert.ok(
              rows.items.every(
                (row) =>
                  row.customerId === person.makhachhang ||
                  row.phone === person.sodienthoai,
              ),
            );
          },
        );
        await tx.lich_trinh.update({
          where: { malichtrinh: root.malichtrinh },
          data: { thoigiankhoihanh: new Date(Date.now() + 86400000) },
        });
        await tx.don_hang.update({
          where: { madonhang: root.madonhang },
          data: { solanchinhsua: 0 },
        });
        await tx.ve_xe.updateMany({
          where: { madonhang: root.madonhang, trangthaive: { not: 'DaHuy' } },
          data: { trangthaive: 'ChoKhoiHanh' },
        });
        await check(
          'edits save only email/stops and reject stale versions without consuming another edit',
          async () => {
            view = await service.detail(req, root.madonhang);
            const saved = await service.edit(req, root.madonhang, {
              version: view.version,
              email: 'lookup-check@example.invalid',
              pickupId: root.madiemdon,
              dropoffId: root.madiemtra,
            });
            assert.equal(saved.email, 'lookup-check@example.invalid');
            assert.equal(saved.editCount, 1);
            assert.equal(saved.bookerName, view.bookerName);
            assert.equal(saved.phone, view.phone);
            assert.equal(saved.total, view.total);
            await assert.rejects(
              service.edit(req, root.madonhang, {
                version: view.version,
                email: 'stale@example.invalid',
              }),
              (e) => e.getStatus() === 409,
            );
            const unchanged = await service.edit(req, root.madonhang, {
              version: saved.version,
              email: saved.email,
            });
            assert.equal(unchanged.editCount, 1);
            const pipe = new ValidationPipe({
              transform: true,
              whitelist: true,
              forbidNonWhitelisted: true,
            });
            await assert.rejects(
              pipe.transform(
                {
                  version: saved.version,
                  email: saved.email,
                  name: 'Not allowed',
                  phone: '0900000000',
                },
                { type: 'body', metatype: LookupEditDto },
              ),
              (e) => e.getStatus() === 400,
            );
          },
        );
        await check(
          'two-hour cutoff, edit limits and invalid stops are enforced by backend',
          async () => {
            view = await service.detail(req, root.madonhang);
            await assert.rejects(
              service.edit(req, root.madonhang, {
                version: view.version,
                pickupId: 'INVALID_STOP',
              }),
              (e) => e.getStatus() === 409,
            );
            await tx.lich_trinh.update({
              where: { malichtrinh: root.malichtrinh },
              data: { thoigiankhoihanh: new Date(Date.now() + 3600000) },
            });
            await assert.rejects(
              service.edit(req, root.madonhang, {
                version: view.version,
                email: 'late@example.invalid',
              }),
              (e) => e.getStatus() === 409,
            );
            await tx.lich_trinh.update({
              where: { malichtrinh: root.malichtrinh },
              data: { thoigiankhoihanh: new Date(Date.now() + 86400000) },
            });
            await tx.don_hang.update({
              where: { madonhang: root.madonhang },
              data: { solanchinhsua: root.gioihanchinhsua },
            });
            await assert.rejects(
              service.edit(req, root.madonhang, {
                version: view.version,
                email: 'limit@example.invalid',
              }),
              (e) => e.getStatus() === 409,
            );
          },
        );
        await check(
          'printing is scoped to the owner and rejects unpaid orders',
          async () => {
            const ticket = root.ve_xe.find((v) => v.trangthaive !== 'DaHuy');
            await assert.rejects(
              service.print(denied, root.madonhang, ticket.mave),
              (e) => e.getStatus() === 404,
            );
            await service.print(req, root.madonhang, ticket.mave);
            const updated = await tx.ve_xe.findUniqueOrThrow({
              where: { mave: ticket.mave },
            });
            assert.equal(updated.solaninve, ticket.solaninve + 1);
            await tx.don_hang.update({
              where: { madonhang: root.madonhang },
              data: { trangthaidonhang: 'ChoThanhToanTrucTiep', thoigianhethangiucho: new Date(Date.now()+3600000) },
            });
            const unpaid = await service.detail(req, root.madonhang);
            assert.equal(unpaid.status, 'pending');
            assert.equal(unpaid.seats.length, root.ve_xe.length);
            await assert.rejects(
              service.print(req, root.madonhang, ticket.mave),
              (e) => e.getStatus() === 409,
            );
          },
        );
        throw new Error('ROLLBACK_LOOKUP_SUCCESS');
      },
      { timeout: 120000, maxWait: 15000 },
    );
  } catch (e) {
    if (e.message !== 'ROLLBACK_LOOKUP_SUCCESS') throw e;
  }
  console.log(
    JSON.stringify({
      groupsPassed: checks.length,
      rolledBack: true,
      smsSent: 0,
      bankTransfers: 0,
    }),
  );
})()
  .catch((e) => {
    console.error(
      JSON.stringify({
        name: e.name,
        code: e.code ?? null,
        message: e.message,
      }),
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
