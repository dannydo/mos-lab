const puppeteer = require('puppeteer');
const jwt = require('/Users/dannydo/projects/mos-lab/node_modules/.pnpm/jsonwebtoken@9.0.3/node_modules/jsonwebtoken/index.js');

(async () => {
  const token = jwt.sign(
    { id: 1, username: 'admin', role: 'admin', displayName: 'Admin' },
    'super_secret_mos_lab_jwt_key_development_only'
  );

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();

  // 1. Go to login page first to establish origin
  console.log('Navigating to login page...');
  await page.goto('http://localhost:4000/login', { waitUntil: 'networkidle2' });

  // 2. Set localStorage authentication tokens
  await page.evaluate((jwtToken) => {
    localStorage.setItem('mos_token', jwtToken);
    localStorage.setItem('mos_user', JSON.stringify({ id: 1, username: 'admin', role: 'admin', displayName: 'Admin' }));
  }, token);

  // 3. Navigate to customers page
  console.log('Navigating to /dashboard/customers...');
  await page.goto('http://localhost:4000/dashboard/customers', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 3000));

  // 4. Click the "Đặt lịch mới" gold button next to Danh Sách Khách Hàng title
  console.log('Clicking "Đặt lịch mới" button...');
  const clickedBooking = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      if (b.getAttribute('title') === 'Đặt lịch mới' || b.parentElement?.getAttribute('title') === 'Đặt lịch mới') {
        b.click();
        return 'clicked title="Đặt lịch mới"';
      }
    }
    // Fallback: search for button in header area next to Danh Sách Khách Hàng title
    const headerBtns = Array.from(document.querySelectorAll('div > button'));
    for (const b of headerBtns) {
      const bg = window.getComputedStyle(b).backgroundColor;
      if (bg.includes('212, 168, 75')) {
        b.click();
        return 'clicked gold button';
      }
    }
    return 'not found';
  });
  console.log('Click result:', clickedBooking);

  await new Promise((r) => setTimeout(r, 4000));

  // 5. Check drawer title & content
  const drawerInfo = await page.evaluate(() => {
    const titles = Array.from(document.querySelectorAll('.ant-drawer-title')).map((el) => el.innerText);
    const bodyText = document.querySelector('.ant-drawer-body')?.innerText || '';
    return { titles, hasStaffList: bodyText.includes('Chuyên viên') || bodyText.includes('HOẶC CHỌN') };
  });
  console.log('Drawer Info:', drawerInfo);

  // Take screenshot
  const screenshotPath =
    '/Users/dannydo/.gemini/antigravity/brain/cd02e9f6-fc21-43db-a763-c5a758fa83f6/booking_cv_selector_fixed.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
})();
