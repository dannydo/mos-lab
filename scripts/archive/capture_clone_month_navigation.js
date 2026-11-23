const puppeteer = require('puppeteer');
const jwt = require('/Users/dannydo/projects/mos-lab/node_modules/.pnpm/jsonwebtoken@9.0.3/node_modules/jsonwebtoken/index.js');
const path = require('path');

const ARTIFACT_DIR = '/Users/dannydo/.gemini/antigravity/brain/257ec924-eeb4-4050-bbf1-8acb00609942';

(async () => {
  const token = jwt.sign(
    { id: 1, username: 'admin', role: 'admin', displayName: 'Admin' },
    'super_secret_mos_lab_jwt_key_development_only'
  );

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1720, height: 1150 },
  });

  const page = await browser.newPage();

  console.log('1. Setting up auth session...');
  await page.goto('http://localhost:4000/login', { waitUntil: 'networkidle2' });

  await page.evaluate((jwtToken) => {
    localStorage.setItem('mos_token', jwtToken);
    localStorage.setItem(
      'mos_user',
      JSON.stringify({
        id: 1,
        username: 'admin',
        role: 'admin',
        displayName: 'Admin',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      })
    );
    localStorage.setItem('mos_avatar_snooze_until', '2099-01-01T00:00:00.000Z');
  }, token);

  console.log('2. Navigating to /dashboard/telesale-target?month=2026-10...');
  await page.setViewport({ width: 1720, height: 1150, deviceScaleFactor: 2 });
  await page.goto('http://localhost:4000/dashboard/telesale-target?month=2026-10', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));

  const navPath = path.join(ARTIFACT_DIR, 'telesale_target_month_nav_laptop.png');
  await page.screenshot({ path: navPath, fullPage: false });
  console.log('Captured laptop navigation header screenshot:', navPath);

  console.log('3. Clicking "Sao chép Kế hoạch" button...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const b of buttons) {
      if (b.innerText && b.innerText.includes('Sao chép Kế hoạch')) {
        b.click();
        return true;
      }
    }
    return false;
  });
  await new Promise((r) => setTimeout(r, 1500));

  const cloneModalPath = path.join(ARTIFACT_DIR, 'telesale_plan_clone_modal.png');
  await page.screenshot({ path: cloneModalPath });
  console.log('Captured Clone Modal screenshot:', cloneModalPath);

  console.log('4. Navigating to iPhone 12 Viewport (390x844)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await page.goto('http://localhost:4000/dashboard/telesale-target?month=2026-10', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2000));

  const iphonePath = path.join(ARTIFACT_DIR, 'telesale_target_iphone12_month_nav.png');
  await page.screenshot({ path: iphonePath });
  console.log('Captured iPhone 12 screenshot:', iphonePath);

  await browser.close();
  console.log('All screenshots captured successfully!');
  process.exit(0);
})();
