import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const t = setTimeout(() => {
  console.error('Hard timeout reached');
  process.exit(1);
}, 60000);
t.unref();

let browser;
try {
  const userJsonRaw = readFileSync('/tmp/danny_user.json', 'utf8');
  const userData = JSON.parse(userJsonRaw.slice(userJsonRaw.indexOf('{'), userJsonRaw.lastIndexOf('}') + 1));

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[BROWSER CONSOLE ERROR]', msg.text());
  });
  page.on('pageerror', (err) => console.log('[BROWSER UNCAUGHT ERROR]', err.message));

  console.log('Navigating to wingslashes.com...');
  await page.goto('https://wingslashes.com/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((user) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem(
      'selectedClientBusiness',
      JSON.stringify(user.client_business || { client_business_id: 1, business_key: 'wings', business_name: 'Wings' })
    );
    localStorage.setItem(
      'selectedClientStore',
      JSON.stringify(user.client_store || { client_store_id: 4, client_store_key: 'hq', client_store_name: 'HQ' })
    );
  }, userData);

  const phone = process.argv[2] || '0989662323';
  const targetUrl = `https://wingslashes.com/admin/online-consultant/user/customer?phone=${phone}`;
  console.log('Navigating to:', targetUrl);
  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 1. Select the customer first
  console.log(`Selecting customer (${phone}) in list...`);
  const customerItem = page.locator('app-customer-list .detail').first();
  await customerItem.waitFor({ state: 'visible', timeout: 10000 });
  await customerItem.click();
  await page.waitForTimeout(2000);

  // 2. Test Edit User Modal
  console.log('Clicking Edit User button (pencil icon)...');
  const editBtn = page.locator('app-customer-list button:has(i.fa-pencil-alt)').first();
  await editBtn.click();
  console.log('Waiting for Edit User modal...');
  await page.waitForSelector('mat-dialog-container', { timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `/tmp/modal_edit_user_${phone}.png` });
  console.log(`✅ Edit user modal opened successfully! Saved /tmp/modal_edit_user_${phone}.png`);

  // Close modal
  console.log('Closing Edit User modal...');
  const closeBtn = page.locator('mat-dialog-container button.close, mat-dialog-container [mat-dialog-close]').first();
  if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeBtn.click();
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForSelector('mat-dialog-container', { state: 'detached', timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // 3. Test Booking Modal
  console.log('Clicking Create Booking button (calendar-plus icon)...');
  const bookingBtn = page.locator('button:has(i.fa-calendar-plus)').first();
  await bookingBtn.click();
  console.log('Waiting for Booking modal...');
  await page.waitForSelector('mat-dialog-container', { timeout: 12000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `/tmp/modal_booking_${phone}.png` });
  console.log(`✅ Booking modal opened successfully! Saved /tmp/modal_booking_${phone}.png`);

  console.log('All verification passed with flying colors!');
} catch (e) {
  console.error('Verification failed:', e);
  process.exitCode = 1;
} finally {
  await browser?.close?.();
  process.exit(process.exitCode || 0);
}
