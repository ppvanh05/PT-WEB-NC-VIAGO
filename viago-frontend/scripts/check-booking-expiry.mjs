import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = []; page.on('pageerror', error => errors.push(error.message));
try {
  await page.clock.install({ time: new Date('2026-10-07T12:00:00+07:00') });
  await page.goto(`${process.env.BOOKING_PREVIEW_URL || 'http://127.0.0.1:4201'}/customer`);
  await page.getByRole('button', { name: 'Ngày đi', exact: true }).click();
  await page.locator('[data-date-picker-day="2026-10-08"]').click();
  await page.getByRole('button', { name: 'Tìm chuyến', exact: true }).click();
  await page.locator('.trip-card').first().waitFor();
  await page.clock.fastForward(120000);
  await page.locator('.trip-card').first().getByRole('button', { name: 'Chọn chuyến', exact: true }).click();
  assert.equal(await page.locator('[role="timer"]').count(), 0, 'Search and choosing a trip do not start a hold');
  const selectSeat = () => page.locator('.original-seat.available:not(:disabled)').first().click();
  await selectSeat();
  await page.locator('[role="timer"]').waitFor();
  assert.equal(await page.locator('[role="timer"]').textContent(), '10:00');
  await page.clock.runFor(2000);
  assert.match(await page.locator('[role="timer"]').textContent(), /^09:5[89]$/, 'Timer updates without any click');
  for (let cycle = 0; cycle < 2; cycle++) {
    await page.clock.fastForward(600000);
    const popup = page.getByRole('dialog', { name: 'Hết thời gian giữ ghế', exact: true });
    await popup.waitFor();
    const expired = await page.evaluate(() => ({ draft: localStorage.getItem('viago_customer_booking_draft_v1'), holds: JSON.parse(localStorage.getItem('viago_customer_booking_state_v1') || '{}').holds }));
    assert.equal(expired.draft, null); assert.equal(expired.holds.length, 0);
    assert.equal(await page.locator('[role="timer"]').count(), 0);
    await popup.getByRole('button', { name: 'Chọn lại ghế', exact: true }).click();
    await page.locator('.trip-card').first().getByRole('button', { name: 'Chọn chuyến', exact: true }).click();
    await selectSeat();
    await page.locator('[role="timer"]').waitFor();
    assert.equal(await page.locator('[role="timer"]').textContent(), '10:00');
    await page.clock.runFor(2000);
    assert.match(await page.locator('[role="timer"]').textContent(), /^09:5[89]$/);
  }
  await page.evaluate(() => { window.__bookingLockAcquired = false; void navigator.locks.request('viago_customer_booking_state_v1', () => new Promise(resolve => { window.__releaseBookingLock = resolve; window.__bookingLockAcquired = true; })); });
  await page.waitForFunction(() => window.__bookingLockAcquired);
  await selectSeat(); await page.clock.fastForward(4000);
  await page.locator('.seat-panel [role="status"]').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('.original-seat.selected').count(), 1, 'A timed-out lock does not claim another seat');
  await page.evaluate(() => { window.__releaseBookingLock(); });
  await selectSeat(); await page.waitForFunction(() => document.querySelectorAll('.original-seat.selected').length === 2);
  assert.deepEqual(errors, []);
  console.log('PASS: starts on the first seat, updates without clicks, two consecutive expiries show a popup and clear holds/drafts, selecting again restarts normally.');
} finally { await context.close(); await browser.close(); }
