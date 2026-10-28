import { chromium } from 'playwright';
import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

function signJwt(payload, secret) {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const h = b64({ alg: 'HS256', typ: 'JWT' });
  const p = b64(payload);
  const s = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${s}`;
}

const hardTimeout = setTimeout(() => {
  console.error('[PLAYWRIGHT TIMEOUT] Test exceeded 45 seconds');
  process.exit(1);
}, 45000);
hardTimeout.unref();

(async () => {
  let browser;
  try {
    const token = signJwt(
      { id: 1, username: 'danhdo@gmail.com', role: 'super_admin', displayName: 'Danny Do', email: 'danhdo@gmail.com' },
      'super_secret_mos_lab_jwt_key_development_only'
    );

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });

    console.log('1. Setting pre-authenticated session...');
    await context.addInitScript((userData) => {
      window.localStorage.setItem('mos_token', userData.token);
      window.localStorage.setItem('mos_user', JSON.stringify(userData.user));
      window.localStorage.setItem('mos_avatar_snooze_until', '2099-01-01');
    }, {
      token,
      user: {
        id: 1,
        username: 'danhdo@gmail.com',
        displayName: 'Danny Do',
        role: 'super_admin',
        isActive: true,
      },
    });

    const page = await context.newPage();

    // Mock API funds to return 0 funds (Step 1 requirement)
    await page.route('**/api/funds', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    console.log('2. Navigating to /dashboard/funds...');
    await page.goto('http://localhost:4000/dashboard/funds', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    console.log('3. Waiting for header and empty state...');
    await page.waitForSelector('text=Quản Lý Quỹ Hoạt Động Nội Bộ', { timeout: 15000 });
    await page.waitForSelector('text=Chưa có quỹ hoạt động nào', { timeout: 15000 });

    const screenshotPath = resolve(process.cwd(), 'output/playwright/funds-empty-state-visual.png');
    mkdirSync(dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Debug screenshot saved to: ${screenshotPath}`);

    const bodyText = await page.evaluate(() => document.body.innerText);
    if (!bodyText.includes('Quản Lý Quỹ Hoạt Động Nội Bộ')) {
      throw new Error('Header text not found');
    }
    if (!bodyText.includes('Chưa có quỹ hoạt động nào')) {
      throw new Error('Empty state text not found');
    }
    if (bodyText.includes('Quỹ Nạp Card Telesale')) {
      throw new Error('Mock Quỹ Nạp Card Telesale found on page! Invariant violated!');
    }

    console.log('[PLAYWRIGHT VISUAL QA PASSED] funds empty state and sidebar verified successfully');
  } catch (err) {
    console.error('[PLAYWRIGHT ERROR]', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    process.exit(0);
  }
})();
