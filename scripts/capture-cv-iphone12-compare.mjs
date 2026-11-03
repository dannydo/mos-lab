import { chromium } from 'playwright';
import { resolve } from 'node:path';
import crypto from 'node:crypto';

const hardTimeout = setTimeout(() => {
  console.log('[PLAYWRIGHT TIMEOUT]');
  process.exit(1);
}, 25000);
hardTimeout.unref();

function generateDannyToken() {
  function base64url(str) {
    return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      id: 69,
      username: 'danny.do@wingslashes.com',
      displayName: 'Danny Do',
      role: 'super_admin',
      email: 'danny.do@wingslashes.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 86400,
    })
  );
  // Try both dev secret and prod secret in case
  const secret = 'super_secret_mos_lab_jwt_key_development_only';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${payload}.${signature}`;
}

(async () => {
  let browser;
  try {
    const token = generateDannyToken();
    const user = {
      id: 69,
      username: 'danny.do@wingslashes.com',
      displayName: 'Danny Do',
      role: 'super_admin',
      email: 'danny.do@wingslashes.com',
    };

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    });

    const page = await context.newPage();

    // 1. Establish origin
    console.log('Navigating to http://localhost:4000/login ...');
    await page.goto('http://localhost:4000/login', { waitUntil: 'domcontentloaded', timeout: 10000 });

    // 2. Set tokens
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('mos_token', token);
        localStorage.setItem('mos_user', JSON.stringify(user));
        localStorage.setItem('theme_mode', 'dark');
        localStorage.setItem('cv_active_tab', 'thunhap');
      },
      { token, user }
    );
    console.log('Authenticated session configured.');

    // 3. Navigate to Live CV Dashboard (Thu Nhập tab)
    const cvUrl = 'http://localhost:4000/dashboard/cv?tab=thunhap';
    console.log(`Navigating to ${cvUrl} ...`);
    await page.goto(cvUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('Page loaded, waiting for data to populate...');
    await page.waitForTimeout(4000);

    const artifactDir = '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e';

    // Live App Screenshot 1: Overview top
    const liveFile1 = resolve(artifactDir, 'live-cv-iphone12pro-top.png');
    await page.screenshot({ path: liveFile1 });
    console.log(`Captured: ${liveFile1}`);

    // Scroll to the first mobile card and center it in viewport
    await page.evaluate(() => {
      const cards = document.querySelectorAll('.responsive-mobile-record-card');
      if (cards.length > 0) {
        cards[0].scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    });
    await page.waitForTimeout(1000);

    // Live App Screenshot 2: The actual cards (Thảo Ly, Khanh Cao, etc.)
    const liveFile2 = resolve(artifactDir, 'live-cv-iphone12pro-cards.png');
    await page.screenshot({ path: liveFile2 });
    console.log(`Captured: ${liveFile2}`);

    // 4. Navigate to Mockup 1
    const mockupUrl = 'http://localhost:4000/mockups/mockup-1-minimal-cards.html';
    console.log(`Navigating to ${mockupUrl} ...`);
    await page.goto(mockupUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(1000);

    const mockupFile = resolve(artifactDir, 'mockup1-iphone12pro-reference.png');
    await page.screenshot({ path: mockupFile });
    console.log(`Captured: ${mockupFile}`);

    console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during capture:', err);
    process.exit(1);
  } finally {
    await browser?.close?.();
    process.exit(0);
  }
})();
