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
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen06-task.png',
  });
  console.log('Screen 06 screenshot saved: ios-screen06-task.png');

  // 2. Click "MỞ TIẾN TRÌNH & BẮT ĐẦU CA LÀM" to reach Screen 07 (Photo 1: Before)
  console.log('Navigating to Screen 07 (Photo 1: Before Photo)...');
  const startQuestBtn = page.locator('button:has-text("MỞ TIẾN TRÌNH")').first();
  await startQuestBtn.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen07-photo1-before.png',
  });
  console.log('Screen 07 Photo 1 screenshot saved: ios-screen07-photo1-before.png');

  // 3. Click "LƯU ẢNH BEFORE & TIẾP TỤC" to reach Screen 08 (Photo 2: Cleaned)
  console.log('Navigating to Screen 08 (Photo 2: Cleaned Photo)...');
  const saveBeforeBtn = page.locator('button:has-text("LƯU ẢNH BEFORE")').first();
  await saveBeforeBtn.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen08-photo2-cleaned.png',
  });
  console.log('Screen 08 Photo 2 Cleaned screenshot saved: ios-screen08-photo2-cleaned.png');

  // 4. Click "LƯU ẢNH VỆ SINH & VÀO TIẾN ĐỘ" to reach Screen 09 (Timer Progress)
  console.log('Navigating to Screen 09 (Timer Progress)...');
  const saveCleanedBtn = page.locator('button:has-text("LƯU ẢNH VỆ SINH")').first();
  await saveCleanedBtn.click();
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen09-timer.png',
  });
  console.log('Screen 09 Timer screenshot saved: ios-screen09-timer.png');

  // 5. Click "HOÀN TẤT NỐI MI & CHỤP AFTER" to reach Screen 10 (Photo 3: After)
  console.log('Navigating to Screen 10 (Photo 3: After & 3-Photo Comparison)...');
  const finishTimerBtn = page.locator('button:has-text("HOÀN TẤT NỐI MI")').first();
  await finishTimerBtn.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen10-photo3-after.png',
  });
  console.log('Screen 10 Photo 3 After screenshot saved: ios-screen10-photo3-after.png');

  // 6. Click "CHUYỂN MÁY CHO KHÁCH KHẢO SÁT CẢM XÚC" to reach Screen 11 (Survey)
  console.log('Navigating to Screen 11 (Customer Survey)...');
  const goToSurveyBtn = page.locator('button:has-text("CHUYỂN MÁY CHO KHÁCH KHẢO SÁT")').first();
  await goToSurveyBtn.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-screen11-survey.png',
  });
  console.log('Screen 11 survey screenshot saved: ios-screen11-survey.png');

  // 7. Test clicking back from Screen 11 to Screen 10
  console.log('Testing back navigation from Screen 11 to Screen 10...');
  const backToAfterBtn = page.locator('header button:has-text("Ảnh After")').first();
  await backToAfterBtn.click();
  await page.waitForTimeout(800);

  // 8. Test clicking back from Screen 10 to Screen 09
  console.log('Testing back navigation from Screen 10 to Screen 09 (Timer)...');
  const backToTimerBtn = page.locator('header button:has-text("Giờ Phục Vụ")').first();
  await backToTimerBtn.click();
  await page.waitForTimeout(800);

  // 9. Test clicking back from Screen 09 to Screen 08 (Cleaned)
  console.log('Testing back navigation from Screen 09 to Screen 08 (Cleaned)...');
  const backToCleanedBtn = page.locator('header button:has-text("Ảnh Vệ Sinh")').first();
  await backToCleanedBtn.click();
  await page.waitForTimeout(800);

  // 10. Test clicking back from Screen 08 to Screen 07 (Before)
  console.log('Testing back navigation from Screen 08 to Screen 07 (Before)...');
  const backToBeforeBtn = page.locator('header button:has-text("Ảnh Before")').first();
  await backToBeforeBtn.click();
  await page.waitForTimeout(800);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-back-to-screen07-verified.png',
  });
  console.log('Full bidirectional back navigation verified!');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
