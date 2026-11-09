import { chromium } from 'playwright';

const base = process.env.BOOKING_PREVIEW_URL || 'http://localhost:4200';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on('pageerror', e => console.log('PAGE ERROR:', e.message));

const readRange = () => page.evaluate(() => {
  const raw = localStorage.getItem('viago_customer_trip_catalog_v1');
  if (!raw) return { exists: false };
  const c = JSON.parse(raw);
  const dates = [...new Set(c.map(t => t.date))].sort();
  return { exists: true, count: c.length, min: dates[0], max: dates[dates.length - 1], today: new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()), searching: null };
});

await page.goto(`${base}/customer`);
await page.locator('.search-card').waitFor();
await page.waitForTimeout(800);
console.log('FRESH CATALOG:', JSON.stringify(await readRange()));

await page.getByRole('button', { name: 'Tìm chuyến', exact: true }).click();
await page.waitForTimeout(1500);
console.log('FRESH SEARCH -> trip-card:', await page.locator('.trip-card').count(), '| empty-state:', await page.locator('.empty-results').count());

// Simulate a stale persisted catalog: shift every trip 40 days into the past.
await page.evaluate(() => {
  const key = 'viago_customer_trip_catalog_v1';
  const c = JSON.parse(localStorage.getItem(key) || '[]');
  const shift = 40 * 86400000;
  const d = s => new Date(Date.parse(s) - shift).toISOString();
  const vd = s => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(Date.parse(s)));
  for (const t of c) {
    t.date = vd(t.departureAt);
    t.departureAt = d(t.departureAt); t.arrivalAt = d(t.arrivalAt); t.saleClosesAt = d(t.saleClosesAt);
    for (const p of [...t.pickup, ...t.dropoff]) p.at = d(p.at);
  }
  localStorage.setItem(key, JSON.stringify(c));
});

await page.reload();
await page.locator('.search-card').waitFor();
await page.waitForTimeout(800);
console.log('STALE CATALOG:', JSON.stringify(await readRange()));

await page.getByRole('button', { name: 'Tìm chuyến', exact: true }).click();
await page.waitForTimeout(1500);
console.log('STALE SEARCH -> trip-card:', await page.locator('.trip-card').count(), '| empty-state:', await page.locator('.empty-results').count());
console.log('STALE SEARCH -> empty text:', await page.locator('.empty-results h3').allTextContents());

await browser.close();
