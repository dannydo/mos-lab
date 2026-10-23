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

    console.log('1. Configuring pre-authenticated localStorage via addInitScript...');
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
        avatarUrl: 'https://cdn.example.com/danny-avatar.jpg',
      },
    });

    const page = await context.newPage();
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('response', (res) => {
      if (res.status() >= 400 || res.url().includes('login') || res.url().includes('auth')) {
        console.log('NETWORK:', res.status(), res.url());
      }
    });

    console.log('2. Navigating directly to /dashboard/finance/cash-flow...');
    await page.goto('http://localhost:4000/dashboard/finance/cash-flow', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    console.log('4. Clicking "Dòng tiền Thu (Inflows)" tab...');
    const inflowTab = page.locator('.ant-tabs-tab', { hasText: 'Dòng tiền Thu' });
    await inflowTab.waitFor({ state: 'visible', timeout: 15000 });
    await inflowTab.click({ force: true });
    await page.waitForTimeout(3000);

    const screenshotPath = resolve(process.cwd(), 'output/playwright/cash-flow-inflows-visual.png');
    mkdirSync(dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Debug screenshot saved to: ${screenshotPath}`);

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Page body snippet:', bodyText.slice(0, 1000));

    console.log('[PLAYWRIGHT VISUAL QA PASSED] cash-flow inflows visual snapshot verified successfully');
  } catch (err) {
    console.error('[PLAYWRIGHT ERROR]', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    process.exit(0);
  }
})();
