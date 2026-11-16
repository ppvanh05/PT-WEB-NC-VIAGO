// Browser-only API fixtures: no real orders, SMS or payments.
const http = require('node:http'),
  fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../dist/viago-frontend/browser');
const order = {
  id: 'DH_LOOKUP_TEST',
  customerId: 'KH_TEST',
  bookerName: 'Khách kiểm thử',
  phone: '0900000000',
  email: 'old@example.invalid',
  bookedAt: new Date().toISOString(),
  route: 'TP.HCM - Vũng Tàu',
  scheduleId: 'LT_TEST',
  departureAt: new Date(Date.now() + 86400000).toISOString(),
  arrivalAt: new Date(Date.now() + 90000000).toISOString(),
  presenceMinutes: 15,
  pickupId: 'P1',
  pickup: 'Điểm đón',
  dropoffId: 'P2',
  dropoff: 'Điểm trả',
  plate: 'TEST',
  total: 160000,
  paymentMethod: 'VIETQR',
  editCount: 0,
  editLimit: 3,
  status: 'upcoming',
  version: new Date().toISOString(),
  canEdit: true,
  points: [
    { id: 'P1', name: 'Điểm đón', kind: 'Don' },
    { id: 'P2', name: 'Điểm trả', kind: 'Tra' },
  ],
  tickets: [
    {
      id: 'VE_TEST',
      seat: '3A',
      passenger: 'Khách kiểm thử',
      price: 160000,
      qr: 'QR_TEST',
      status: 'upcoming',
    },
  ],
};
const server = http.createServer((req, res) => {
  let file = path.resolve(
    root,
    '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname),
  );
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory())
    file = path.join(root, 'index.html');
  res.setHeader(
    'Content-Type',
    {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
    }[path.extname(file)] || 'application/octet-stream',
  );
  fs.createReadStream(file).pipe(res);
});
let browser;
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({
    headless: true,
    ...(fs.existsSync(chromium.executablePath()) ? {} : { channel: 'chrome' }),
  });
  let updates = 0,
    verified = false,
    printed = 0;
  for (const loggedIn of [true, false]) {
    const ctx = await browser.newContext();
    if (loggedIn)
      await ctx.addInitScript(() =>
        sessionStorage.setItem('viago_customer_access_token', 'a'.repeat(64)),
      );
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      const endpoint = url.pathname.slice(5),
        method = route.request().method();
      let data = {};
      if (endpoint === 'customer/profile')
        data = {
          id: 'KH_TEST',
          phoneNumber: order.phone,
          name: order.bookerName,
          gender: 'Nam',
          avatar: '',
          spent: 0,
          tickets: 1,
        };
      else if (endpoint === 'customer/auth/otp/request') {
        assert.equal(route.request().postDataJSON().purpose, 'TraCuuVe');
        data = { challengeId: 'OTP_TEST', expiresAt: new Date(Date.now() + 180000).toISOString() };
      } else if (endpoint === 'customer/auth/otp/verify') {
        assert.equal(route.request().postDataJSON().code, '654321');
        verified = true;
        data = { verificationToken: 'proof' };
      } else if (endpoint === 'customer/ticket-lookup/session') {
        assert.ok(verified);
        data = { expiresIn: 1800 };
      } else if (endpoint === 'customer/ticket-lookup/orders')
        data = { items: [order], pagination: { totalPages: 1 } };
      else if (endpoint.endsWith('/print')) {
        printed++;
        data = order;
      } else if (endpoint === 'customer/ticket-lookup/orders/' + order.id) {
        if (method === 'PATCH') {
          const body = route.request().postDataJSON();
          assert.deepEqual(Object.keys(body).sort(), ['dropoffId', 'email', 'pickupId', 'version']);
          assert.equal(body.email, 'new@example.invalid');
          updates++;
          order.email = body.email;
          order.editCount++;
          order.version = new Date().toISOString();
        }
        data = order;
      }
      return route.fulfill({ json: data });
    });
    await page.goto(origin + '/customer/tra-cuu-ve');
    if (!loggedIn) {
      await page.locator('#phone-input').fill(order.phone);
      await page.locator('#search-btn').click();
      await page.locator('#lookup-otp').fill('654321');
      await page.getByRole('button', { name: 'Xác thực và tra cứu', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Xem đơn ' + order.id, exact: true }).click();
    await page.getByRole('button', { name: /Chỉnh sửa đơn hàng/ }).click();
    assert.equal(await page.locator('#edit-full-name').getAttribute('readonly'), '');
    await page.locator('#edit-email').fill('new@example.invalid');
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await page.getByText('Cập nhật thông tin thành công.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Xem và in vé', exact: true }).click();
    await page.evaluate(() => {
      window.print = () => {};
    });
    await page.getByRole('button', { name: /In vé/ }).click();
    await page.waitForTimeout(200);
    assert.ok(printed > 0);
    assert.deepEqual(errors, []);
    await ctx.close();
    order.email = 'old@example.invalid';
  }
  assert.equal(updates, 2);
  console.log(
    JSON.stringify({
      passed: true,
      loggedInAndGuest: true,
      updates,
      printRequests: printed,
      realSms: 0,
      databaseWrites: 0,
    }),
  );
})()
  .catch(async (e) => {
    console.error(e.stack);
    const page = browser?.contexts().at(-1)?.pages().at(-1);
    if (page) {
      console.error((await page.locator('body').innerText()).slice(-2400));
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    await new Promise((r) => server.close(r));
  });
