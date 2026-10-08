import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.BOOKING_PREVIEW_URL || 'http://127.0.0.1:4201';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.route('https://api.open-meteo.com/**', route => { const day = new URL(route.request().url()).searchParams.get('start_date'); return route.fulfill({ json: { daily: { time: [day], temperature_2m_min: [22], temperature_2m_max: [29], precipitation_probability_max: [60], weather_code: [61] } } }); });
await context.addInitScript(() => { window.print = () => { window.__bookingPrintCalled = true; }; });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await mkdir('artifacts/customer-booking', { recursive: true });
const shot = async name => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name}: horizontal overflow`);
  await page.screenshot({ path: `artifacts/customer-booking/${name}.png`, fullPage: true });
};
try {
  await page.goto(`${base}/customer`);
  await page.locator('.search-card').waitFor();
  // Trigger lazy images before taking the full-page preview.
  await page.locator('.amenity-grid').scrollIntoViewIfNeeded();
  await page.locator('.amenity-grid img').first().evaluate(img => img.decode());
  await page.locator('.marketing img').evaluateAll(async images => { await Promise.all(images.map(async img => { img.loading = 'eager'; await img.decode(); })); });
  await page.evaluate(() => scrollTo(0, 0));
  await shot('home-desktop');
  const tomorrow = await page.evaluate(() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(Date.now() + 86400000)));
  await page.getByRole('button', { name: 'Ngày đi', exact: true }).click();
  await page.locator(`[data-date-picker-day="${tomorrow}"]`).click();
  await page.getByRole('button', { name: 'Tìm chuyến', exact: true }).click();
  await page.locator('.trip-card').first().waitFor();
  await shot('results-desktop');
  await page.locator('.trip-card').first().locator('.trip-tabs app-button').nth(2).getByRole('button').click();
  await page.locator('.trip-expanded').waitFor();
  assert.equal(await page.locator('.trip-expanded h3').count(), 2);
  await shot('inline-points-desktop');
  await page.locator('.trip-card').first().locator('.trip-tabs app-button').first().getByRole('button').click();
  await page.locator('.original-seat-map').waitFor();
  await shot('inline-seats-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await shot('inline-seats-mobile');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('.trip-card').first().locator('.trip-tabs app-button').first().getByRole('button').click();
  await page.getByRole('button', { name: 'Chi tiết chuyến', exact: true }).first().click();
  await page.getByRole('dialog', { name: 'Chi tiết chuyến xe' }).waitFor();
  await shot('trip-details');
  await page.getByRole('dialog', { name: 'Chi tiết chuyến xe' }).getByRole('button', { name: 'Chọn chuyến', exact: true }).click();
  await page.locator('.seat.available:not(:disabled)').first().click();
  await page.locator('.seat.selected').waitFor();
  await page.locator('.booking-title app-button').getByRole('button').click();
  const leaveDialog = page.locator('[role="dialog"]').filter({ has: page.locator('.leave-actions') });
  await leaveDialog.waitFor();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await leaveDialog.evaluate(el => el.scrollWidth <= el.clientWidth), true, 'Leave dialog fits without horizontal scroll');
    await leaveDialog.screenshot({ path: 'artifacts/customer-booking/leave-dialog-' + width + '.png' });
  }
  await leaveDialog.locator('.leave-stay button').click();
  await page.setViewportSize({ width: 1440, height: 1000 });

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator('input#passenger-name').scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const bounds = await page.evaluate(() => ({ banner: document.querySelector('.hold-banner').getBoundingClientRect().toJSON(), navbar: document.querySelector('.viago-customer-navbar-wrapper').getBoundingClientRect().toJSON() }));
    assert.ok(bounds.banner.top >= bounds.navbar.bottom - 1 && bounds.banner.top <= bounds.navbar.bottom + 12, 'Countdown stays directly below the navbar while scrolling');
    await shot('sticky-countdown-' + width);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('input#voucher-code').fill('VIAGO2026');
  await page.getByRole('button', { name: '\u00c1p d\u1ee5ng', exact: true }).click();
  await page.locator('.voucher-confetti i').first().waitFor();
  assert.equal(await page.locator('input#passenger-phone').inputValue(), '');
  await shot('voucher-confetti');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('button.vehicle-image').nth(1).click();
    const gallery = page.getByRole('dialog').filter({ has: page.locator('.interior-viewer') });
    await gallery.waitFor();
    assert.equal(await gallery.locator('.interior-controls > span').textContent(), '2 / 3');
    await gallery.locator('.interior-full-image').evaluate(img => img.decode());
    assert.equal(await gallery.locator('.interior-full-image').evaluate(img => img.naturalWidth > 0), true);
    await gallery.locator('.interior-controls app-button').last().getByRole('button').click();
    await page.waitForFunction(() => document.querySelector('.interior-controls > span')?.textContent === '3 / 3');
    await gallery.locator('.interior-thumbnails button').first().click();
    await page.waitForFunction(() => document.querySelector('.interior-controls > span')?.textContent === '1 / 3');
    assert.equal(await gallery.evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await gallery.screenshot({ path: `artifacts/customer-booking/interior-gallery-${width}.png` });
    await page.keyboard.press('Escape');
    await gallery.waitFor({ state: 'hidden' });
  }
  assert.deepEqual(errors, []);
  console.log('PASS: image enlargement, navigation, thumbnails, Escape, desktop/mobile without overflow.');
} finally { await browser.close(); }