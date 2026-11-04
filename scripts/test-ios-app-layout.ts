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

  // Click on "Ca Làm Mi" bottom tab to open Screen 06
  console.log('Navigating to Screen 06: clicking "Ca Làm Mi" bottom tab...');
  const taskTabBtn = page.locator('button:has-text("Ca Làm Mi")').first();
  if (await taskTabBtn.isVisible()) {
    await taskTabBtn.click();
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen06-header-refactored.png',
    });
    console.log('Screen 06 refactored header screenshot saved: ios-screen06-header-refactored.png');

    // Test clicking `‹ Sảnh` back button
    console.log('Testing back button: clicking "‹ Sảnh"...');
    const backBtn = page.locator('button:has-text("Sảnh")').first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen06-back-to-lobby.png',
      });
      console.log('Back to lobby screenshot saved: ios-screen06-back-to-lobby.png');
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
