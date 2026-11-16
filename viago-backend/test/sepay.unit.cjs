require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const {
  readSepayConfig,
  sepayRecipientMatches,
} = require('../dist/featured/customer/home/payments/sepay.config');
const {
  generateSepayPaymentCode,
  extractSepayPaymentCode,
} = require('../dist/featured/customer/home/payments/sepay-payment-code');
const {
  SepayWebhookDto,
} = require('../dist/featured/customer/home/common/home.dto');
const env = {
  VIETQR_BANK_ID: '970422',
  VIETQR_ACCOUNT_NO: 'MAIN0001',
  VIETQR_ACCOUNT_NAME: 'TEST',
  SEPAY_BANK_NAME: 'MBBank',
  SEPAY_WEBHOOK_SECRET: 'a'.repeat(64),
};
const ocb = {
  ...env,
  SEPAY_MODE: 'live',
  VIETQR_BANK_ID: '970448',
  SEPAY_BANK_NAME: 'OCB',
  VIETQR_ACCOUNT_NO: 'VATEST001',
  SEPAY_ACCOUNT_NO: 'MAIN0001',
};
void test('direct account remains compatible and defaults to live', () => {
  const { configured, config } = readSepayConfig(env);
  assert.equal(configured, true);
  assert.equal(config.environment, 'live');
  assert.equal(config.accountType, 'bank');
  assert.equal(
    sepayRecipientMatches(config, {
      gateway: 'mbbank',
      accountNumber: 'MAIN0001',
    }),
    true,
  );
  assert.equal(
    sepayRecipientMatches(config, {
      gateway: 'MBBank',
      accountNumber: 'WRONG',
    }),
    false,
  );
  assert.equal(
    sepayRecipientMatches(config, {
      gateway: 'OCB',
      accountNumber: 'MAIN0001',
    }),
    false,
  );
  assert.equal(
    JSON.stringify(config).includes(env.SEPAY_WEBHOOK_SECRET),
    false,
  );
});
void test('OCB validates the parent account and VA independently', () => {
  const { config } = readSepayConfig(ocb);
  assert.equal(config.accountType, 'virtual');
  assert.equal(config.qrAccountNumber, 'VATEST001');
  assert.equal(config.bankAccountNumber, 'MAIN0001');
  assert.equal(
    sepayRecipientMatches(config, {
      gateway: 'OCB',
      accountNumber: 'MAIN0001',
      subAccount: 'VATEST001',
    }),
    true,
  );
  for (const payment of [
    { gateway: 'OCB', accountNumber: 'MAIN0001' },
    { gateway: 'OCB', accountNumber: 'MAIN0001', subAccount: '' },
    { gateway: 'OCB', accountNumber: 'MAIN0001', subAccount: null },
    { gateway: 'OCB', accountNumber: 'MAIN0001', subAccount: 'OTHER' },
    { gateway: 'OCB', accountNumber: 'VATEST001', subAccount: 'VATEST001' },
    { gateway: 'MBBank', accountNumber: 'MAIN0001', subAccount: 'VATEST001' },
  ])
    assert.equal(sepayRecipientMatches(config, payment), false);
});
for (const overrides of [
  { SEPAY_ACCOUNT_NO: '' },
  { SEPAY_ACCOUNT_NO: 'VATEST001' },
  { SEPAY_ACCOUNT_NO: 'invalid_account' },
  { VIETQR_ACCOUNT_NO: '' },
  { SEPAY_WEBHOOK_SECRET: 'short' },
  { SEPAY_WEBHOOK_SECRET: ' '.repeat(64) },
  { SEPAY_MODE: 'liv' },
])
  void test(
    'incomplete or invalid VA configuration disables QR: ' +
      Object.keys(overrides).join(','),
    () => {
      const result = readSepayConfig({ ...ocb, ...overrides });
      assert.equal(result.configured, false);
      assert.equal(result.config, null);
      assert.ok(result.issues.length);
    },
  );
void test('test and live use the same VA validation with explicit environment labels', () => {
  const result = readSepayConfig({ ...ocb, SEPAY_MODE: 'test' });
  assert.equal(result.configured, true);
  assert.equal(result.environment, 'test');
  const empty = readSepayConfig({});
  assert.equal(empty.configured, false);
  assert.ok(empty.issues.includes('SEPAY_WEBHOOK_SECRET'));
});
void test('a legacy API Key alone cannot enable HMAC payment configuration', () => {
  const result = readSepayConfig({
    ...env,
    SEPAY_WEBHOOK_SECRET: '',
    SEPAY_WEBHOOK_API_KEY: 'legacy'.repeat(10),
  });
  assert.equal(result.configured, false);
  assert.ok(result.issues.includes('SEPAY_WEBHOOK_SECRET'));
});
void test('webhook DTO preserves VA and normalizes SePay local time before validation', async () => {
  const payload = {
    id: 1,
    gateway: 'OCB',
    accountNumber: 'MAIN0001',
    subAccount: 'VATEST001',
    transferType: 'in',
    transferAmount: 10000,
    content: 'VIAGO12345678',
    transactionDate: '2026-11-14 10:00:00',
  };
  const dto = plainToInstance(SepayWebhookDto, payload);
  assert.deepEqual(await validate(dto, { whitelist: true }), []);
  assert.equal(dto.subAccount, 'VATEST001');
  assert.equal(dto.transactionDate, '2026-11-14T10:00:00+07:00');
  const invalid = plainToInstance(SepayWebhookDto, {
    ...payload,
    subAccount: { forged: true },
  });
  assert.ok(
    (await validate(invalid, { whitelist: true })).some(
      (error) => error.property === 'subAccount',
    ),
  );
});

void test('payment codes fit the configured SePay pattern, including leading zeroes', async (t) => {
  const draws = [0, 12345678, 99999999];
  t.mock.method(crypto, 'randomInt', () => draws.shift());
  const tx = { thanh_toan: { findFirst: async () => null } };
  for (const expected of ['VIAGO00000000', 'VIAGO12345678', 'VIAGO99999999']) {
    const code = await generateSepayPaymentCode(tx);
    assert.equal(code, expected);
    assert.match(code, /^VIAGO[0-9]{6,8}$/);
  }
});

void test('generation retries existing references without limiting checks to pending payments', async (t) => {
  const draws = [12345678, 87654321];
  t.mock.method(crypto, 'randomInt', () => draws.shift());
  const queries = [];
  const tx = {
    thanh_toan: {
      findFirst: async (query) => {
        queries.push(query.where);
        return query.where.mathamchieuyeucau === 'VIAGO12345678'
          ? { mathanhtoan: 'ALREADY_USED' }
          : null;
      },
    },
  };
  assert.equal(await generateSepayPaymentCode(tx), 'VIAGO87654321');
  assert.deepEqual(queries, [
    { kenhthanhtoan: 'SePay', mathamchieuyeucau: 'VIAGO12345678' },
    { kenhthanhtoan: 'SePay', mathamchieuyeucau: 'VIAGO87654321' },
  ]);
});

void test('generation fails safely if no unused payment reference can be allocated', async (t) => {
  t.mock.method(crypto, 'randomInt', () => 12345678);
  let attempts = 0;
  const tx = {
    thanh_toan: {
      findFirst: async () => {
        attempts++;
        return { mathanhtoan: 'ALREADY_USED' };
      },
    },
  };
  await assert.rejects(
    generateSepayPaymentCode(tx),
    (error) => error.getStatus() === 503,
  );
  assert.equal(attempts, 10);
});

void test('webhook extracts VIAGO references from bank transfer descriptions', () => {
  for (const code of ['VIAGO123456', 'VIAGO1234567', 'VIAGO00123456']) {
    assert.equal(extractSepayPaymentCode('CK ' + code + ' dat ve'), code);
    assert.equal(extractSepayPaymentCode(code.toLowerCase()), code);
  }
  assert.equal(
    extractSepayPaymentCode('VIAGO12345678 / VIAGO12345678'),
    'VIAGO12345678',
  );
});

void test('webhook retains support for legacy references and rejects ambiguous payments', () => {
  const legacy = 'VG' + 'A'.repeat(20);
  assert.equal(extractSepayPaymentCode('CK ' + legacy), legacy);
  for (const content of [
    'VIAGO12345678 VIAGO87654321',
    'VIAGO12345678 ' + legacy,
    legacy + ' VG' + 'B'.repeat(20),
  ])
    assert.equal(extractSepayPaymentCode(content), null);
});

void test('webhook rejects malformed or partially matched payment references', () => {
  for (const content of [
    '',
    'VIAGO12345',
    'VIAGO123456789',
    'VIAGO12AB5678',
    'XVIAGO12345678',
    'VIAGO12345678X',
    'VIAGO12345678_9',
    'VG' + 'A'.repeat(19),
    'VG' + 'A'.repeat(21),
    'VG' + 'Z'.repeat(20),
  ])
    assert.equal(extractSepayPaymentCode(content), null);
});
