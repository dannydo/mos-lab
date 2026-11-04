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
  await page.waitForTimeout(1500);

  // 1. Go to Screen 06 (Task)
  const taskTabBtn = page.locator('button:has-text("Ca Làm Mi")').first();
  await taskTabBtn.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen06-nobed.png',
  });
  console.log('Screen 06 nobed screenshot saved: ios-screen06-nobed.png');

  // 2. Click "MỞ TIẾN TRÌNH & BẮT ĐẦU CA LÀM" to reach Screen 07
  console.log('Navigating to Screen 07 (Before Photo)...');
  const startQuestBtn = page.locator('button:has-text("MỞ TIẾN TRÌNH")').first();
  await startQuestBtn.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen07-camera-upload.png',
  });
  console.log('Screen 07 camera/upload screenshot saved: ios-screen07-camera-upload.png');

  // 3. Click "LƯU ẢNH BEFORE & BẮT ĐẦU BẤM GIỜ" to reach Screen 08 (Timer Countdown)
  console.log('Navigating to Screen 08 (Timer Countdown)...');
  const saveBeforeBtn = page.locator('button:has-text("BẮT ĐẦU BẤM GIỜ")').first();
  await saveBeforeBtn.click();
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen08-nobed.png',
  });
  console.log('Screen 08 nobed screenshot saved: ios-screen08-nobed.png');

  // 4. Click "HOÀN TẤT NỐI MI & CHỤP AFTER" to reach Screen 09
  console.log('Navigating to Screen 09 (After Photo & Speed Audit)...');
  const finishTimerBtn = page.locator('button:has-text("HOÀN TẤT NỐI MI")').first();
  await finishTimerBtn.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen09-camera-upload.png',
  });
  console.log('Screen 09 camera/upload screenshot saved: ios-screen09-camera-upload.png');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
