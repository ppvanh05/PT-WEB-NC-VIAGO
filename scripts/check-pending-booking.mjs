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
 await page.reload(); await page.waitForFunction(()=>document.activeElement?.id==='pending-booking'); await page.waitForFunction(()=>{const r=document.getElementById('pending-booking').getBoundingClientRect();return r.top>0&&r.bottom<=innerHeight;});assert.equal(await page.locator('.floating-notice').count(),0);await page.getByRole('button',{name:'Tìm chuyến',exact:true}).click();await page.locator('.trip-card').first().waitFor();await page.locator('.trip-card').first().getByRole('button',{name:'Chọn chuyến',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='pending-booking');assert.equal(await page.locator('.floating-notice').count(),0);await page.locator('#pending-booking app-button').last().getByRole('button').click();await page.locator('.booking-layout').waitFor();console.log('PASS: reload and blocked trip selection reveal held booking without toast; resume works.'); } finally {await browser.close();}