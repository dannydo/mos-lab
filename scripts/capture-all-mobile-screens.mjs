import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.MOS_WEB_URL || 'http://localhost:4000';
const apiUrl = process.env.MOS_API_URL || 'http://localhost:4001';
const screenshotDir = '/Users/dannydo/.gemini/antigravity/brain/2c515d11-f892-48a8-8aa7-dcf0dd1ea4b0/screenshots';

async function getDevAuth() {
  const res = await fetch(`${apiUrl}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isMock: true, email: 'danhdo@gmail.com', name: 'Danny Do' }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  return res.json();
}

async function main() {
  await mkdir(screenshotDir, { recursive: true });
  const auth = await getDevAuth();
  console.log('Obtained dev auth for:', auth.user?.displayName || auth.user?.email);

  const browser = await chromium.launch({ headless: true });

  // iPhone 12 Pro context
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  });

  await context.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('mos_token', token);
      localStorage.setItem('mos_user', JSON.stringify(user));
      localStorage.setItem('mos_theme', 'dark');
      localStorage.setItem('mos_desktop_density', 'standard');
    },
    { token: auth.token, user: auth.user }
  );

  const page = await context.newPage();

  const captures = [
    { id: '01_dashboard', path: '/dashboard', label: 'Dashboard Tổng quan' },
    { id: '02_today', path: '/dashboard/today', label: 'Hôm nay & Doanh thu 2x2' },
    { id: '05_customers', path: '/dashboard/customers', label: 'Khách hàng (Mobile Cards)' },
    { id: '06_appointments', path: '/dashboard/appointments', label: 'Lịch hẹn của tôi' },
    { id: '07_plans', path: '/dashboard/plans', label: 'Kế hoạch gọi điện' },
    { id: '08_calls', path: '/dashboard/calls', label: 'Lịch sử cuộc gọi' },
    { id: '09_cc_leaderboard', path: '/dashboard/cc', label: 'Báo cáo CC & Banner xoay ngang' },
    { id: '10_cv_leaderboard', path: '/dashboard/cv', label: 'Báo cáo CV & Banner xoay ngang' },
    { id: '11_bk_report', path: '/dashboard/bk', label: 'Báo cáo BK' },
    { id: '12_cs_report', path: '/dashboard/cs', label: 'Báo cáo CS' },
    { id: '13_fal_tower', path: '/dashboard/fal', label: 'FAL Control Tower' },
    { id: '14_qa_shop', path: '/dashboard/qa-shop', label: 'QA & QC Shop' },
    { id: '15_staff', path: '/dashboard/staff', label: 'Danh sách nhân sự' },
  ];

  for (const item of captures) {
    console.log(`Capturing: ${item.label} (${item.path})...`);
    try {
      await page.goto(`${baseUrl}${item.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const filePath = path.join(screenshotDir, `${item.id}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`Saved: ${filePath}`);
    } catch (err) {
      console.error(`Failed ${item.id}:`, err.message);
    }
  }

  // Interactive captures:
  // 1. Quick Search Modal
  console.log('Capturing Quick Search Modal...');
  try {
    await page.goto(`${baseUrl}/dashboard/today`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const searchBtn = page.locator('button[aria-label*="Tìm nhanh"]');
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(screenshotDir, '03_quick_search_modal.png') });
      console.log('Saved 03_quick_search_modal.png');
      // Type a sample query to show results
      const searchInput = page.locator('.ant-modal input[placeholder*="Nhập tên"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('09');
        await page.waitForTimeout(1200);
        await page.screenshot({ path: path.join(screenshotDir, '03_quick_search_results.png') });
        console.log('Saved 03_quick_search_results.png');
      }
    }
  } catch (err) {
    console.error('Quick search capture failed:', err.message);
  }

  // 2. Mobile Drawer Navigation
  console.log('Capturing Mobile Navigation Drawer...');
  try {
    await page.goto(`${baseUrl}/dashboard/today`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const menuBtn = page.locator('button[aria-label*="Mở điều hướng"]');
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(screenshotDir, '04_mobile_drawer_navigation.png') });
      console.log('Saved 04_mobile_drawer_navigation.png');
    }
  } catch (err) {
    console.error('Drawer capture failed:', err.message);
  }

  // 3. Booking Wizard Drawer
  console.log('Capturing Booking Wizard Drawer...');
  try {
    await page.goto(`${baseUrl}/dashboard/today`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const bookBtn = page.locator('button[aria-label*="Book lịch"]');
    if (await bookBtn.isVisible()) {
      await bookBtn.click({ force: true, timeout: 5000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotDir, '16_booking_wizard_drawer.png') });
      console.log('Saved 16_booking_wizard_drawer.png');
    }
  } catch (err) {
    console.error('Booking wizard capture failed:', err.message);
  }

  // 4. Landscape Mode (844 x 390)
  console.log('Capturing iPhone 12 Pro Landscape Mode...');
  const landscapeContext = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  await landscapeContext.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('mos_token', token);
      localStorage.setItem('mos_user', JSON.stringify(user));
      localStorage.setItem('mos_theme', 'dark');
    },
    { token: auth.token, user: auth.user }
  );

  const landscapePage = await landscapeContext.newPage();
  try {
    await landscapePage.goto(`${baseUrl}/dashboard/today`, { waitUntil: 'domcontentloaded' });
    await landscapePage.waitForTimeout(2000);
    await landscapePage.screenshot({ path: path.join(screenshotDir, '17_today_landscape.png') });
    console.log('Saved 17_today_landscape.png');

    await landscapePage.goto(`${baseUrl}/dashboard/cc`, { waitUntil: 'domcontentloaded' });
    await landscapePage.waitForTimeout(2000);
    await landscapePage.screenshot({ path: path.join(screenshotDir, '18_cc_landscape.png') });
    console.log('Saved 18_cc_landscape.png');
  } catch (err) {
    console.error('Landscape capture failed:', err.message);
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Capture script error:', err);
  process.exit(1);
});
