import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  // Set mock token/user to bypass auth
  await page.addInitScript(() => {
    window.localStorage.setItem('mos_token', 'mock-token-for-dev');
    window.localStorage.setItem(
      'mos_user',
      JSON.stringify({
        id: 46272,
        name: 'Thảo Ly',
        role: 'CVL',
        legacyStaffId: 46272,
      })
    );
  });

  console.log('Navigating to Screen 01: http://localhost:4000/ios-app?role=CVL');
  await page.goto('http://localhost:4000/ios-app?role=CVL', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen01-avatar-badge.png',
  });
  console.log('Screen 01 screenshot saved: ios-screen01-avatar-badge.png');

  // Test clicking `<` on date switcher
  console.log('Testing date switcher: clicking previous day...');
  const prevDateBtn = page.locator('button[title*="ngày trước"], button[title*="Ngày trước"]').first();
  if (await prevDateBtn.isVisible()) {
    await prevDateBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen01-prev-day.png',
    });
    console.log('Previous day screenshot saved: ios-screen01-prev-day.png');
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
