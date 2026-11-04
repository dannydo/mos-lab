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

  console.log('Navigating to Screen 01...');
  await page.goto('http://localhost:4000/ios-app?role=CVL', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen01-refactored.png',
  });

  // Navigate to Screen 02 (step=2)
  console.log('Navigating to Screen 02 top...');
  await page.goto('http://localhost:4000/ios-app?role=CVL&step=2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen02-top-fixed.png',
  });

  console.log('Scrolling Screen 02 to bottom to capture Sticky Action Bar...');
  // Scroll the scrollable container
  await page.evaluate(() => {
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    } else {
      window.scrollTo(0, document.body.scrollHeight);
    }
  });
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen02-scrolled-sticky.png',
  });
  console.log('Scrolled screenshot saved.');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
