require('reflect-metadata');
const assert = require('node:assert/strict');
const { CustomerAuthService } = require('../dist/featured/customer/auth/customer-auth.service');
const { verifyPassword } = require('../dist/shared/accounts/account-security');

async function main() {
  const saved = { node: process.env.NODE_ENV, flag: process.env.CUSTOMER_ALLOW_LOCAL_SEED_LOGIN };
  let update, session;
  const account = {
    mataikhoan: 'QA_ACCOUNT', matkhauhash: 'HASH_MAU_001', solandangnhapsai: 0,
    trangthai: 'HoatDong', xacthuchailop: false,
    khach_hang: { makhachhang: 'QA_CUSTOMER', hotenkhachhang: 'QA', trangthai: 'HoatDong' },
  };
  const tx = {
    $queryRaw: async () => [],
    tai_khoan: {
      findFirst: async () => ({ mataikhoan: account.mataikhoan }),
      findUniqueOrThrow: async () => account,
      update: async q => { update = q.data; },
    },
    phien_dang_nhap: { create: async q => { session = q.data; } },
  };
  const auth = new CustomerAuthService({ $transaction: async fn => fn(tx) }, { audit: async () => {} });
  const request = address => ({ headers: {}, socket: { remoteAddress: address } });
  const login = (password = 'HASH_MAU_001', address = '127.0.0.1') =>
    auth.login({ username: 'qa@example.invalid', password }, request(address));
  const rejected = async (password, address) => {
    session = undefined;
    await assert.rejects(() => login(password, address), e => e.getStatus() === 401);
    assert.equal(session, undefined);
  };
  try {
    process.env.NODE_ENV = 'development';
    process.env.CUSTOMER_ALLOW_LOCAL_SEED_LOGIN = 'true';
    const result = await login();
    assert.ok(result.token);
    assert.ok(session);
    assert.equal(Object.hasOwn(update, 'matkhauhash'), false);
    assert.equal(account.matkhauhash, 'HASH_MAU_001');
    await rejected('HASH_MAU_002');
    await rejected('HASH_MAU_001', '192.0.2.1');
    process.env.NODE_ENV = 'production';
    await rejected('HASH_MAU_001');
    process.env.NODE_ENV = 'development';
    process.env.CUSTOMER_ALLOW_LOCAL_SEED_LOGIN = 'false';
    await rejected('HASH_MAU_001');
    assert.equal(await verifyPassword('anything', 'anything', true), false);
    console.log('PASS exact customer seed login only in opted-in local development; rejects wrong/remote/production; preserves stored seed');
  } finally {
    if (saved.node === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = saved.node;
    if (saved.flag === undefined) delete process.env.CUSTOMER_ALLOW_LOCAL_SEED_LOGIN; else process.env.CUSTOMER_ALLOW_LOCAL_SEED_LOGIN = saved.flag;
  }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
