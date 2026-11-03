import { chromium } from 'playwright';
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

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });

    await context.addInitScript(
      ({ token, user }) => {
        localStorage.setItem('mos_token', token);
        localStorage.setItem('mos_user', JSON.stringify(user));
        localStorage.setItem('mos_theme_mode', 'dark');
      },
      { token, user }
    );

    const page = await context.newPage();
    await page.goto('http://localhost:4000/dashboard/cv', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Open drawer navigation
    const navBtn = page.locator('button[data-header-action="navigation"]');
    if (await navBtn.isVisible()) {
      await navBtn.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Scroll sidebar nav scroll region down to NHÂN SỰ & LỊCH LÀM VIỆC
    await page.evaluate(() => {
      const scrollEl = document.querySelector('.sidebar-nav-scroll-region');
      if (scrollEl) scrollEl.scrollTop = 580;
    });
    await page.waitForTimeout(400);

    // Expand NHÂN SỰ & LỊCH LÀM VIỆC
    const expandBtn = page.locator('button[aria-label*="nhóm NHÂN SỰ & LỊCH LÀM VIỆC"]');
    if (await expandBtn.isVisible()) {
      await expandBtn.click({ force: true });
      await page.waitForTimeout(500);
    }

    const outPath =
      '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/mobile-sidebar-verified.png';
    await page.screenshot({ path: outPath });
    console.log('[SUCCESS] Screenshot saved to', outPath);
  } catch (err) {
    console.error('Error during screenshot:', err);
  } finally {
    if (browser) await browser.close();
    process.exit(0);
  }
})();
