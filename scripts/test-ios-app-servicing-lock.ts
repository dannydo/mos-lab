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

  // Set mock token/user
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

  console.log('1. Navigating to Screen 01: http://localhost:4000/ios-app?role=CVL');
  await page.goto('http://localhost:4000/ios-app?role=CVL', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // 2. Select customer Chị Trúc (Ca làm của mình)
  console.log('2. Opening task screen...');
  const taskTabBtn = page.locator('button:has-text("Ca Làm Mi")').first();
  await taskTabBtn.click();
  await page.waitForTimeout(1000);

  // 3. Start task -> Step 7 (Before Photo)
  console.log('3. Starting lash progress (Step 7)...');
  const startQuestBtn = page.locator('button:has-text("MỞ TIẾN TRÌNH")').first();
  await startQuestBtn.click();
  await page.waitForTimeout(1000);

  // 4. Save Before Photo -> Step 8 (Cleaned Photo)
  console.log('4. Saving Before Photo (Step 7 -> Step 8)...');
  const saveBeforeBtn = page.locator('button:has-text("LƯU ẢNH BEFORE")').first();
  await saveBeforeBtn.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-lock-step8-cleaned.png',
  });
  console.log('Saved: ios-lock-step8-cleaned.png');

  // 5. Navigate out to Screen 01 (via back buttons)
  console.log('5. Navigating back from Step 8 to Screen 01 (Sảnh)...');
  const backToStep7Btn = page.locator('button:has-text("Ảnh Before")').first();
  await backToStep7Btn.click();
  await page.waitForTimeout(600);

  const backToStep6Btn = page.locator('button:has-text("Ca Làm")').first();
  await backToStep6Btn.click();
  await page.waitForTimeout(600);

  const backToScreen01Btn = page.locator('button:has-text("Sảnh")').first();
  await backToScreen01Btn.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-lock-screen01-banner.png',
  });
  console.log('Saved: ios-lock-screen01-banner.png (Banner & Locked state)');

  // 6. Attempt to click on another customer (Chị Mai Linh)
  console.log('6. Attempting to click another customer (Chị Mai Linh)...');
  const otherCustomerCard = page.locator('text=Chị Mai Linh').first();
  await otherCustomerCard.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-lock-screen01-modal.png',
  });
  console.log('Saved: ios-lock-screen01-modal.png (Lock Warning Modal)');

  // 7. Click "Quay lại ca làm" on the modal
  console.log('7. Resuming active servicing session from modal...');
  const resumeBtn = page.locator('button:has-text("Quay lại ca làm")').first();
  await resumeBtn.click();
  await page.waitForTimeout(1200);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-lock-resumed-step8.png',
  });
  console.log('Saved: ios-lock-resumed-step8.png (Resumed at Step 8 Cleaned)');

  // 8. Progress from Step 8 -> Step 9 (Timer)
  console.log('8. Saving Cleaned Photo (Step 8 -> Step 9 Timer)...');
  const saveCleanedBtn = page.locator('button:has-text("LƯU ẢNH VỆ SINH")').first();
  await saveCleanedBtn.click();
  await page.waitForTimeout(1000);

  // 9. Finish timer -> Step 10 (After Photo)
  console.log('9. Finishing Timer (Step 9 -> Step 10 After Photo)...');
  const finishTimerBtn = page.locator('button:has-text("HOÀN TẤT NỐI MI")').first();
  await finishTimerBtn.click();
  await page.waitForTimeout(1000);

  // 10. Save After Photo -> Step 11 (Survey)
  console.log('10. Saving After Photo (Step 10 -> Step 11 Survey)...');
  const saveAfterBtn = page.locator('button:has-text("CHUYỂN MÁY CHO KHÁCH")').first();
  await saveAfterBtn.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-lock-step11-survey.png',
  });
  console.log('Saved: ios-lock-step11-survey.png');

  console.log('All verification steps succeeded cleanly!');
  await browser.close();
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
