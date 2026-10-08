import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(`${process.env.BOOKING_PREVIEW_URL || 'http://127.0.0.1:4201'}/customer`);
  const tomorrow = await page.evaluate(() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(Date.now() + 86400000)));
  await page.getByRole('button', { name: 'Ngày đi', exact: true }).click(); await page.locator(`[data-date-picker-day="${tomorrow}"]`).click();
  await page.getByRole('button', { name: 'Tìm chuyến', exact: true }).click();
  await page.locator('.trip-card').filter({ hasText: 'Cabin 22 chỗ' }).getByRole('button', { name: 'Chọn chuyến', exact: true }).click();
  const available = page.locator('.original-seat.available:not(:disabled)'); await available.first().click();
  await page.locator('.room-config-card').first().waitFor();
  await page.locator('.room-config-active').waitFor();
  await page.waitForFunction(() => {
    const section = document.querySelector('.cabin-config-panel').getBoundingClientRect();
    const banner = document.querySelector('.hold-banner').getBoundingClientRect();
    return section.top >= banner.bottom + 8 && section.top <= banner.bottom + 40;
  });
  const deadline = await page.evaluate(() => JSON.parse(localStorage.getItem('viago_customer_booking_state_v1')).holds[0].expiresAt);
  await page.locator('.room-config-card select').first().selectOption('double');
  assert.match(await page.locator('.room-config-price').first().textContent(), /Phòng đôi/);
  await page.locator('.original-seat-map .seat-floor').nth(1).locator('.original-seat.available:not(:disabled)').first().click();
  await page.waitForFunction(() => document.querySelectorAll('.room-config-card').length === 2);
  assert.equal(await page.locator('.room-config-card').count(), 2);
  await page.waitForFunction(() => document.querySelectorAll('.room-config-card')[1].classList.contains('room-config-active'));
  assert.equal(await page.locator('.room-breakdown > div').count(), 2);
  assert.match(await page.locator('.room-config-price').nth(1).textContent(), /Phòng đơn/);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('viago_customer_booking_state_v1')).holds[0].expiresAt), deadline);
  await mkdir('artifacts/customer-booking', { recursive: true });
  for (const width of [1440, 390]) { await page.setViewportSize({ width, height: 1000 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); await page.screenshot({ path: `artifacts/customer-booking/cabin-${width}.png`, fullPage: true }); }
  await page.locator('input#passenger-name').fill('Nguyễn Văn Minh'); await page.locator('input#passenger-phone').fill('0987654321');
  for (const dropdown of await page.locator('.point-leg app-searchable-dropdown').all()) { await dropdown.locator('input').click(); await dropdown.locator('.dropdown-item').first().click(); }
  await page.locator('.terms-check input').check();
  await page.locator('.booking-sidebar').getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('.review-layout').waitFor(); assert.match(await page.locator('.review-selected-seats').textContent(), /Phòng đôi/);
  await page.getByRole('button', { name: 'Tiến hành thanh toán', exact: true }).click(); await page.locator('.payment-layout').waitFor();
  assert.match(await page.locator('.payment-layout .room-summary').textContent(), /Phòng đôi/);
  assert.match(await page.locator('.payment-layout .room-summary').textContent(), /Phòng đơn/);
  assert.deepEqual(errors, []); console.log('PASS: 22-seat room configuration, per-seat pricing, unchanged hold deadline, desktop/mobile layout and room metadata through payment.');
} finally { await context.close(); await browser.close(); }
