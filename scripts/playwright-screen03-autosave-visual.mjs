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
  console.error('[PLAYWRIGHT TIMEOUT] Test exceeded 30 seconds');
  process.exit(1);
}, 30000);
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
      viewport: { width: 430, height: 932 }, // iPhone 15 Pro Max viewport
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
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
    console.log('2. Navigating to /ios-app...');
    await page.goto('http://localhost:4000/ios-app', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Wait for app container
    await page.waitForTimeout(2000);

    const outPath = '/tmp/screen03-autosave-visual.png';
    mkdirSync(dirname(resolve(outPath)), { recursive: true });
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`3. Screenshot saved to ${outPath}`);

    console.log('Playwright visual QA snapshot PASSED successfully.');
  } catch (err) {
    console.error('Playwright error:', err);
    process.exit(1);
  } finally {
    await browser?.close?.();
    process.exit(0);
  }
})();
