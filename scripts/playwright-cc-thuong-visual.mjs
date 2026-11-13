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

    console.log('2. Navigating to /dashboard/cc?tab=thunhap...');
    await page.goto('http://localhost:4000/dashboard/cc?tab=thunhap', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });

    await page.waitForTimeout(2000);

    const screenshotPath = resolve(process.cwd(), 'output/playwright/cc-thuong-visual.png');
    mkdirSync(dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Debug screenshot saved to: ${screenshotPath}`);

    console.log('[PLAYWRIGHT VISUAL QA PASSED] CC Thu nhập dashboard screenshot verified successfully');
  } catch (err) {
    console.error('[PLAYWRIGHT ERROR]', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    process.exit(0);
  }
})();
