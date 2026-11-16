// Browser smoke test against a built FE with a simulated API. No database/bank calls.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../dist/viago-frontend/browser');
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const at = today + 'T23:59:00+07:00';
const seat = {
  id: 'GC042',
  name: '1A',
  floor: 1,
  row: 1,
  column: 1,
  type: 'GheNgoi',
  price: 160000,
  status: 'Trong',
};
const trip = {
  id: 'LT003',
  departureDate: today,
  departureTime: '23:59',
  departureAt: at,
  arrivalAt: at,
  status: 'DangMoBan',
  price: 160000,
  seatCount: 1,
  availableSeatCount: 1,
  route: {
    id: 'TX002',
    name: 'TP.HCM - Vũng Tàu',
    from: 'TP.HCM',
    to: 'Vũng Tàu',
    distance: 100,
    durationMinutes: 120,
    basePrice: 160000,
    tripsPerDay: 1,
    pickupPoints: [{ id: 'DD005', name: 'Văn phòng Quận 10', city: 'TP.HCM', address: '' }],
    dropoffPoints: [{ id: 'DD013', name: 'Bến xe Vũng Tàu', city: 'Vũng Tàu', address: '' }],
  },
  vehicle: {
    id: 'XE002',
    name: 'Limousine VIP 02',
    licensePlate: 'TEST-01',
    type: 'Limousine9Cho',
  },
  seats: [seat],
};
const account = {
  id: 'TK_TEST',
  staffId: 'NV_TEST',
  name: 'Nhân viên kiểm thử',
  phoneNumber: '0900000000',
  email: 'test@example.invalid',
  avatar: '',
  role: 'admin',
};
let created = 0,
  confirmedManually = 0,
  paid = false,
  order;
let browser;
let holdAcknowledged = false;
let inventoryReads = 0;
let detailDelayMs = 0, detailAcknowledged = false;
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = path.resolve(root, '.' + relative);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory())
    file = path.join(root, 'index.html');
  const mime =
    {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.woff2': 'font/woff2',
    }[path.extname(file)] || 'application/octet-stream';
  res.setHeader('Content-Type', mime);
  fs.createReadStream(file).pipe(res);
});

(async () => {
  const qrPreview = await require('qrcode').toDataURL('VIAGO12345678', { width: 280, margin: 2 });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({
    headless: true,
    ...(fs.existsSync(chromium.executablePath()) ? {} : { channel: 'chrome' }),
  });
  const context = await browser.newContext({
    timezoneId: 'Asia/Ho_Chi_Minh',
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript(
    ({ account }) => {
      sessionStorage.setItem('viago_admin_access_token', 'a'.repeat(64));
      sessionStorage.setItem('viago_admin_account', JSON.stringify(account));
    },
    { account },
  );
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    const pathname = url.pathname.replace(/^\/api/, '');
    if (pathname === '/admin/auth/me') return route.fulfill({ json: { account } });
    if (pathname === '/admin/counter-orders') return route.fulfill({ json: { data: order ? [{ id: order.id, name: order.passenger.name, phone: order.passenger.phone, from: trip.route.from, to: trip.route.to, departureAt: at, createdAt: order.createdAt, expiresAt: order.expiresAt, total: order.total, seatCount: 1, status: paid ? 'DaThanhToan' : 'ChoThanhToanOnline', source: 'TaiQuay', adminCreated: true }] : [], pagination: { total: order ? 1 : 0, totalPages: 1 } } });
    if (!pathname.startsWith('/admin/booking-management')) return route.continue();
    assert.ok(route.request().headers().authorization, 'Admin requests must send the token');
    const endpoint = pathname.slice('/admin/booking-management'.length);
    const data = route.request().method() === 'POST' ? route.request().postDataJSON() : null;
    let result;
    if (endpoint === '/options')
      result = {
        paymentMethods: [
          { id: 'vietqr', configured: true },
          { id: 'counter', configured: true },
        ],
      };
    else if (endpoint === '/getAllTickets') result = [];
    else if (endpoint === '/getAllRoutesName') result = [trip.route.name];
    else if (endpoint === '/getAllPoint') result = ['TP.HCM', 'Vũng Tàu'];
    else if (endpoint === '/getAllVehicleTypes') result = ['Limousine 9 chỗ'];
    else if (endpoint === '/getAllRoutes') result = [trip];
    else if (endpoint === '/getCustomerInfoByPhone') result = null;
    else if (endpoint === '/trips/LT003/seats') {
      inventoryReads++;
      result = {
        id: trip.id,
        availableSeats: created ? 0 : 1,
        seatDetails: [
          { ...seat, label: '1A', status: paid ? 'sold' : created ? 'held' : 'available' },
        ],
      };
    }
    else if (endpoint === '/holds' && data) {
      assert.deepEqual(data.seatIds, ['GC042']);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      holdAcknowledged = true;
      result = {
        holdId: data.holdId,
        seatIds: data.seatIds,
        releasedSeatIds: [],
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        serverTime: new Date().toISOString(),
      };
    } else if (endpoint.startsWith('/holds/')) result = { released: true };
    else if (endpoint === '/quote') {
      assert.deepEqual(data.seatIds, ['GC042']);
      assert.equal(data.pickupId, 'DD005');
      assert.equal(data.dropoffId, 'DD013');
      result = { subtotal: 160000, insurance: 0, discount: 0, total: 160000, currency: 'VND' };
    } else if (endpoint === '/orders' && data) {
      created++;
      assert.deepEqual(data.seatIds, ['GC042']);
      assert.equal(data.expectedTotal, 160000);
      assert.equal(data.payment.method, 'VIETQR');
      assert.equal(data.payment.confirmReceived, false);
      order = {
        id: 'DH_BROWSER_TEST',
        status: 'pending',
        orderStatus: 'ChoThanhToanOnline',
        source: 'TaiQuay',
        note: '',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        serverTime: new Date().toISOString(),
        subtotal: 160000,
        discount: 0,
        total: 160000,
        method: 'vietqr',
        requiresReview: false,
        passenger: data.customer,
        legs: [
          {
            tripId: trip.id,
            seats: ['GC042'],
            doubleSeats: [],
            pickupId: 'DD005',
            dropoffId: 'DD013',
            trip: {
              ...trip,
              from: 'TP.HCM',
              to: 'Vũng Tàu',
              seatDetails: [{ ...seat, label: '1A' }],
              pickup: trip.route.pickupPoints,
              dropoff: trip.route.dropoffPoints,
            },
          },
        ],
        tickets: [],
        transfer: {
          environment: 'live',
          qrUrl: qrPreview,
          bankId: '970448',
          accountNumber: 'VAOCBTEST001',
          accountType: 'virtual',
          accountName: 'TEST',
          amount: 160000,
          content: 'VIAGO12345678',
        },
      };
      result = order;
    } else if (endpoint === '/orders')
      result = {
        data: order
          ? [
              {
                id: order.id,
                name: order.passenger.name,
                phone: order.passenger.phone,
                route: trip.route.name,
                departureAt: at,
                createdAt: order.createdAt,
                status: paid ? 'DaThanhToan' : 'ChoThanhToanOnline',
                total: 160000,
                source: 'TaiQuay',
              },
            ]
          : [],
        pagination: { totalPages: 1 },
      };
    else if (endpoint.endsWith('/confirm-payment')) {
      confirmedManually++;
      result = {};
    } else if (endpoint === '/orders/DH_BROWSER_TEST') {
      if (detailDelayMs) await new Promise(resolve => setTimeout(resolve, detailDelayMs));
      detailAcknowledged = true;
      result = paid
        ? {
            ...order,
            status: 'paid',
            orderStatus: 'DaThanhToan',
            transfer: null,
            tickets: [
              {
                id: 'VE_BROWSER_TEST',
                seatId: 'GC042',
                seat: '1A',
                qrValue: 'test',
                paidAmount: 160000,
              },
            ],
          }
        : order;
    } else
      return route.fulfill({
        status: 404,
        json: { message: 'Unexpected test endpoint: ' + endpoint },
      });
    return route.fulfill({ status: endpoint === '/orders' && data ? 201 : 200, json: result });
  });
  await page.goto(origin + '/admin/booking/new');
  await page.locator('#booking-origin').fill('TP.HCM');
  await page.getByRole('option', { name: 'TP.HCM', exact: true }).click();
  await page.locator('#booking-destination').fill('Vũng Tàu');
  await page.getByRole('option', { name: 'Vũng Tàu', exact: true }).click();
  await page.locator('.time-chip').first().waitFor();
  assert.equal(await page.locator('.workbench').count(), 0, 'Do not show the seat workspace before a trip is selected');
  await page.locator('.time-chip').first().click();
  await page.locator('.workbench').waitFor();
  const readsBeforeHold = inventoryReads;
  await page.locator('#seat-1A').click();
  await page.locator('#seat-1A.dang-chon').waitFor();
  assert.equal(holdAcknowledged, false, 'The seat must turn orange before the slow hold responds');
  await page.waitForFunction(() => document.querySelector('#seat-1A')?.getAttribute('aria-busy') !== 'true');
  assert.equal(holdAcknowledged, true);
  assert.equal(inventoryReads, readsBeforeHold, 'A successful hold must not trigger a seats reload');
  await page.getByRole('button', { name: 'Nhập thông tin đặt vé', exact: true }).click();
  await page.locator('#booking-phone').fill('0901234567');
  await page.locator('#booking-name').fill('Nguyễn Văn An');
  await page.locator('#booking-method').selectOption('chuyen-khoan');
  await page.getByRole('button', { name: 'Kiểm tra thông tin', exact: true }).click();
  await page.locator('.review-consent input').check();
  await page.getByRole('button', { name: 'Xác nhận đặt vé', exact: true }).click();
  await page.getByText('VIAGO12345678', { exact: true }).waitFor();
  await page.getByText('VAOCBTEST001', { exact: true }).waitFor();
  assert.ok((await page.locator('.transfer').textContent()).includes('Số tài khoản'));
  assert.equal(await page.getByText('Đang thử nghiệm', { exact: false }).count(), 0);
  assert.equal(await page.getByText('Dùng thông tin dưới đây', { exact: false }).count(), 0);
  assert.equal(
    await page.getByRole('button', { name: 'Xác nhận thu tiền mặt', exact: true }).count(),
    0,
  );
  const previewDirectory = path.resolve(__dirname, '../node_modules/.cache');
  fs.mkdirSync(previewDirectory, { recursive: true });
  await page.screenshot({ path: path.join(previewDirectory, 'admin-payment-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.qr-frame').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('.order-layout').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 1);
  assert.equal(await page.locator('.order-detail').evaluate(el => el.scrollWidth <= el.clientWidth), true, 'Payment detail must fit a mobile screen');
  await page.screenshot({ path: path.join(previewDirectory, 'admin-payment-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  paid = true;
  await page.getByText('VE_BROWSER_TEST', { exact: false }).waitFor({ timeout: 12000 });
  await page.locator('#seat-1A.da-thanh-toan').waitFor();
  assert.equal(await page.getByText('200.000đ', { exact: true }).count(), 0);
  assert.equal(created, 1);
  assert.equal(confirmedManually, 0);
  await page.goto(origin + '/admin/booking/management');
  await page.getByRole('button', { name: 'Xem và xử lý đơn DH_BROWSER_TEST', exact: true }).waitFor();
  detailDelayMs = 1500; detailAcknowledged = false;
  await page.getByRole('button', { name: 'Xem và xử lý đơn DH_BROWSER_TEST', exact: true }).click();
  await page.locator('.detail-pending').waitFor({ timeout: 800 });
  assert.equal(detailAcknowledged, false, 'The detail dialog must open before its slow API response');
  assert.ok((await page.locator('.detail-pending').textContent()).includes(order.passenger.name));
  await page.getByText('VE_BROWSER_TEST', { exact: false }).waitFor();
  assert.deepEqual(errors, []);
  const artifact = path.resolve(__dirname, '../node_modules/.cache/admin-booking-smoke.png');
  fs.mkdirSync(path.dirname(artifact), { recursive: true });
  await page.screenshot({ path: artifact, fullPage: true });
  console.log(
    JSON.stringify({
      passed: true,
      orangeBeforeHoldAcknowledged: true,
      holdDelayMs: 1500,
      detailsOpenBeforeResponse: true,
      createdOrders: created,
      manualTransferConfirmations: confirmedManually,
      screenshot: artifact,
      databaseCalls: 0,
      bankTransfers: 0,
    }),
  );
})()
  .catch((e) => {
    console.error(e.stack);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  });
