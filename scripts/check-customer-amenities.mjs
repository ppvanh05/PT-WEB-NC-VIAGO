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
 const paletteColors = await page.locator('app-amenities .amenity-badge').evaluateAll(badges => badges.map(badge => getComputedStyle(badge).color)); assert.equal(new Set(paletteColors).size, 5, 'Each amenity category has its own color'); const dialog=page.getByRole('dialog');for(const width of [1440,390]){await page.setViewportSize({width,height:1000});assert.equal(await dialog.locator('app-amenities app-badge').count(),5);assert.equal(await dialog.locator('app-amenities svg path').evaluateAll(paths=>paths.every(path=>!!path.getAttribute('d'))),true);assert.equal(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth),true);await dialog.screenshot({path:'artifacts/customer-booking/details-amenities-'+width+'.png'});}for (const width of [1440,390]) {
  await page.setViewportSize({width,height:1000});
  await dialog.locator('.tabs app-button').nth(1).getByRole('button').click();
  await dialog.locator('.schedule-stop').first().waitFor();
  assert.equal(await dialog.locator('.schedule-stop').count(),2);
  assert.equal(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await dialog.screenshot({path:`artifacts/customer-booking/detail-schedule-${width}.png`});
  await dialog.locator('.tabs app-button').nth(3).getByRole('button').click();
  await dialog.locator('.policy-card').first().waitFor();
  assert.equal(await dialog.locator('.policy-card').count(),3);
  assert.equal(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await dialog.screenshot({path:`artifacts/customer-booking/detail-policy-${width}.png`});
}
await page.goto(base+'/customer/lich-trinh');await page.locator('app-schedule').waitFor();assert.deepEqual(errors,[]);console.log('PASS: every detail amenity has an icon, responsive popup without overflow, schedule component loads.');}finally{await browser.close();}