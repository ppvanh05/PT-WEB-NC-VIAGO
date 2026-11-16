require('reflect-metadata');
const { test, before, beforeEach, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { Test } = require('@nestjs/testing');
const request = require('supertest');
const {
  SepayWebhookGuard,
} = require('../dist/featured/customer/home/common/home.guard');
const {
  HomeBookingService,
} = require('../dist/featured/customer/home/booking/booking.service');
const {
  HomePaymentWebhookController,
} = require('../dist/featured/customer/home/payments/payments.controller');
const secret = 'whsec_' + 'a'.repeat(64);
const legacyKey = 'b'.repeat(64);
const previousSecret = process.env.SEPAY_WEBHOOK_SECRET;
const previousApiKey = process.env.SEPAY_WEBHOOK_API_KEY;
const now = Date.now();
const timestamp = String(Math.floor(now / 1000));
const payload = {
  id: 42,
  gateway: 'OCB',
  accountNumber: 'MAIN0001',
  subAccount: 'VATEST001',
  transferType: 'in',
  transferAmount: 160000,
  content: 'VIAGO12345678',
  transactionDate: new Date(now - 1000).toISOString(),
};
const body = JSON.stringify(payload);
const webhook = mock.fn(async () => ({ success: true, processed: true }));
let app, api;
function sign(raw, stamp = timestamp, key = secret) {
  return (
    'sha256=' +
    createHmac('sha256', key)
      .update(stamp + '.')
      .update(raw)
      .digest('hex')
  );
}
function send(raw = body, options = {}) {
  const stamp = options.timestamp ?? timestamp;
  const signature =
    options.signature ??
    sign(options.signedBody ?? raw, stamp, options.secret ?? secret);
  const call = api
    .post('/customer/home/payments/sepay')
    .set('Content-Type', 'application/json');
  if (!options.omitTimestamp) call.set('X-SePay-Timestamp', stamp);
  if (!options.omitSignature) call.set('X-SePay-Signature', signature);
  if (options.legacyAuthorization)
    call.set('Authorization', 'Apikey ' + legacyKey);
  return call.send(raw);
}
before(async () => {
  process.env.SEPAY_WEBHOOK_SECRET = secret;
  process.env.SEPAY_WEBHOOK_API_KEY = legacyKey;
  mock.method(Date, 'now', () => now);
  const module = await Test.createTestingModule({
    controllers: [HomePaymentWebhookController],
    providers: [
      SepayWebhookGuard,
      { provide: HomeBookingService, useValue: { webhook } },
    ],
  }).compile();
  app = module.createNestApplication({ logger: false, rawBody: true });
  // Exercise the same explicit JSON parser configuration as main.ts.
  app.useBodyParser('json', { limit: '20mb' });
  await app.init();
  api = request(app.getHttpServer());
});
beforeEach(() => webhook.mock.resetCalls());
after(async () => {
  await app?.close();
  mock.restoreAll();
  if (previousSecret === undefined) delete process.env.SEPAY_WEBHOOK_SECRET;
  else process.env.SEPAY_WEBHOOK_SECRET = previousSecret;
  if (previousApiKey === undefined) delete process.env.SEPAY_WEBHOOK_API_KEY;
  else process.env.SEPAY_WEBHOOK_API_KEY = previousApiKey;
});
void test('valid HMAC reaches payment processing with the original payload', async () => {
  const result = await send().expect(201);
  assert.equal(result.body.success, true);
  assert.equal(webhook.mock.callCount(), 1);
  assert.equal(webhook.mock.calls[0].arguments[0].transferAmount, 160000);
  assert.equal(webhook.mock.calls[0].arguments[0].subAccount, 'VATEST001');
});
void test('signed raw Unicode and whitespace survive the JSON parser', async () => {
  const original =
    JSON.stringify(
      { ...payload, description: 'Khách Nguyễn Văn An chuyển tiền' },
      null,
      2,
    ) + '\n';
  await send(original).expect(201);
  assert.equal(webhook.mock.callCount(), 1);
});
void test('a modified payment amount is rejected before payment processing', async () => {
  await send(JSON.stringify({ ...payload, transferAmount: 1 }), {
    signedBody: body,
  }).expect(401);
  assert.equal(webhook.mock.callCount(), 0);
});
void test('parsed and re-serialized JSON is not accepted as the original signed bytes', async () => {
  await send(body, { signedBody: JSON.stringify(payload, null, 2) }).expect(
    401,
  );
  assert.equal(webhook.mock.callCount(), 0);
});
/** @type {Array<[string, Record<string, string | boolean>]>} */
const invalidCases = [
  ['missing both headers', { omitTimestamp: true, omitSignature: true }],
  ['missing timestamp', { omitTimestamp: true }],
  ['missing signature', { omitSignature: true }],
  ['wrong signing secret', { secret: 'wrong-secret' }],
  ['short signature', { signature: 'sha256=aa' }],
  ['non-hex signature', { signature: 'sha256=' + 'z'.repeat(64) }],
  ['unsupported algorithm', { signature: 'sha512=' + 'a'.repeat(64) }],
  ['expired timestamp', { timestamp: String(Number(timestamp) - 301) }],
  [
    'future timestamp outside clock tolerance',
    { timestamp: String(Number(timestamp) + 301) },
  ],
  ['timestamp in milliseconds', { timestamp: String(now) }],
  ['non-integer timestamp', { timestamp: timestamp + '.1' }],
  ['combined duplicate timestamp', { timestamp: timestamp + ',' + timestamp }],
  [
    'combined duplicate signature',
    { signature: sign(body) + ',' + sign(body) },
  ],
  [
    'legacy API Key without HMAC',
    { omitTimestamp: true, omitSignature: true, legacyAuthorization: true },
  ],
  [
    'legacy API Key cannot bypass a bad signature',
    { secret: 'wrong-secret', legacyAuthorization: true },
  ],
];
for (const [name, options] of invalidCases)
  void test('rejects ' + name, async () => {
    await send(body, options).expect(401);
    assert.equal(webhook.mock.callCount(), 0);
  });
for (const offset of [-300, 300])
  void test(
    'accepts clock tolerance boundary ' + offset + ' seconds',
    async () => {
      await send(body, {
        timestamp: String(Number(timestamp) + offset),
      }).expect(201);
      assert.equal(webhook.mock.callCount(), 1);
    },
  );
void test('timestamp is included in the signed message', async () => {
  await send(body, {
    timestamp: String(Number(timestamp) - 1),
    signature: sign(body),
  }).expect(401);
  assert.equal(webhook.mock.callCount(), 0);
});
void test('a valid signature does not bypass payment payload validation', async () => {
  await send(JSON.stringify({ ...payload, transferAmount: 'forged' })).expect(
    400,
  );
  assert.equal(webhook.mock.callCount(), 0);
});
void test('missing raw body never falls back to re-serializing parsed JSON', () => {
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {
          'x-sepay-signature': sign(body),
          'x-sepay-timestamp': timestamp,
        },
        body: payload,
      }),
    }),
  };
  assert.throws(() => new SepayWebhookGuard().canActivate(context), {
    status: 401,
  });
});
void test('missing HMAC secret returns unavailable even if the old API Key exists', async () => {
  delete process.env.SEPAY_WEBHOOK_SECRET;
  try {
    await send().expect(503);
    assert.equal(webhook.mock.callCount(), 0);
  } finally {
    process.env.SEPAY_WEBHOOK_SECRET = secret;
  }
});
