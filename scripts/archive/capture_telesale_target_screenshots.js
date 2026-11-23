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

  console.log('1. Setting up authentication...');
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

  console.log('2. Navigating to /dashboard/telesale-target (Laptop Large 1720x1150)...');
  await page.setViewport({ width: 1720, height: 1150, deviceScaleFactor: 2 });
  await page.goto('http://localhost:4000/dashboard/telesale-target', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 3000));

  const laptopPath = path.join(ARTIFACT_DIR, 'telesale_target_laptop.png');
  await page.screenshot({ path: laptopPath, fullPage: true });
  console.log('Captured laptop full screenshot:', laptopPath);

  console.log('3. Clicking button to open Customer Pool Drawer for stage > 120D...');
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const b of buttons) {
      if (b.innerText && b.innerText.includes('Mở Pool Khách & Gọi')) {
        b.click();
        return true;
      }
    }
    return false;
  });
  console.log('Clicked button result:', clicked);
  await new Promise((r) => setTimeout(r, 2500));

  const drawerPath = path.join(ARTIFACT_DIR, 'telesale_target_drawer.png');
  await page.screenshot({ path: drawerPath, fullPage: true });
  console.log('Captured drawer screenshot:', drawerPath);

  console.log('4. Navigating with iPhone 12 viewport (390x844)...');
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  await page.goto('http://localhost:4000/dashboard/telesale-target', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 3000));

  const iphoneFullPath = path.join(ARTIFACT_DIR, 'telesale_target_iphone12_full.png');
  await page.screenshot({ path: iphoneFullPath, fullPage: true });
  console.log('Captured iPhone 12 full page screenshot:', iphoneFullPath);

  await browser.close();
  console.log('All screenshots completed successfully!');
})().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
