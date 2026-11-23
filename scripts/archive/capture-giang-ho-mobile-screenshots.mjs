import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import crypto from 'node:crypto';

const hardTimeout = setTimeout(() => {
  console.log('[PLAYWRIGHT TIMEOUT]');
  process.exit(1);
}, 60000);
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
  const secret = 'mos_lab_jwt_super_secret_production_2026_XkP9mNqR7vT3wY';
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
    console.log('Navigating to login to set localStorage...');
    await page.goto('https://lab.masteros.app/login', { waitUntil: 'domcontentloaded', timeout: 15000 });

    // 2. Set tokens
    await page.evaluate(
      ({ token, user }) => {
        localStorage.setItem('mos_token', token);
        localStorage.setItem('mos_user', JSON.stringify(user));
      },
      { token, user }
    );
    console.log('Authenticated session configured in localStorage.');

    // 3. Navigate to target URL
    const targetUrl = 'https://lab.masteros.app/dashboard/pilot-dark-lashes?tab=exam';
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);

    const outDir = resolve(process.cwd(), 'output/screenshots');
    const artifactDir = '/Users/dannydo/.gemini/antigravity/brain/156abc40-aaa3-4216-b8db-8241e3e0309b';
    mkdirSync(outDir, { recursive: true });

    // Scroll to Giang Hồ card
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="giang-ho-learning-journey"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await page.waitForTimeout(1000);

    // Screenshot 1: Giang Hồ Learning Journey Card & Action Buttons
    const file1 = resolve(outDir, '01-mobile-giang-ho-journey.png');
    const artFile1 = resolve(artifactDir, '01-mobile-giang-ho-journey.png');
    await page.screenshot({ path: file1 });
    await page.screenshot({ path: artFile1 });
    console.log(`Captured: ${file1}`);

    // Click "📱 iPhone Chấm Thi 1-Chạm (70')" with testid and force: true
    console.log('Clicking "📱 iPhone Chấm Thi 1-Chạm (70\')" button...');
    await page.locator('[data-testid="btn-open-iphone-rubric-quick"]').click({ force: true });
    await page.waitForTimeout(1500);

    // Screenshot 2: Top of Practical Exam Rubric (Timer + Candidate + Stages)
    const file2 = resolve(outDir, '02-mobile-rubric-top.png');
    const artFile2 = resolve(artifactDir, '02-mobile-rubric-top.png');
    await page.screenshot({ path: file2 });
    await page.screenshot({ path: artFile2 });
    console.log(`Captured: ${file2}`);

    // Scroll down inside the rubric modal/drawer body
    console.log('Scrolling rubric down...');
    await page.evaluate(() => {
      const scrollable = document.querySelector('.ant-modal-body, .ant-drawer-body, [role="dialog"]');
      if (scrollable) {
        scrollable.scrollTop = 900;
      }
    });
    await page.waitForTimeout(1000);

    // Screenshot 3: Bottom of Rubric (Macro Photo & Sticky Score Bar)
    const file3 = resolve(outDir, '03-mobile-rubric-bottom.png');
    const artFile3 = resolve(artifactDir, '03-mobile-rubric-bottom.png');
    await page.screenshot({ path: file3 });
    await page.screenshot({ path: artFile3 });
    console.log(`Captured: ${file3}`);

    // Close rubric modal by clicking close button or pressing Escape
    console.log('Closing rubric...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);

    // Click "📝 Bài Thi Lý Thuyết (30')" with testid and force: true
    console.log('Clicking "📝 Bài Thi Lý Thuyết (30\')" button...');
    await page.locator('[data-testid="btn-open-theory-quiz-quick"]').click({ force: true });
    await page.waitForTimeout(1500);

    // Screenshot 4: Theory Exam Modal
    const file4 = resolve(outDir, '04-mobile-theory-quiz.png');
    const artFile4 = resolve(artifactDir, '04-mobile-theory-quiz.png');
    await page.screenshot({ path: file4 });
    await page.screenshot({ path: artFile4 });
    console.log(`Captured: ${file4}`);

    console.log('ALL MOBILE SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    if (browser) await browser.close();
    process.exit(0);
  }
})();
