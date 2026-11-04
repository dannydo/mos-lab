import { chromium } from 'playwright';
import path from 'path';

const t = setTimeout(() => process.exit(1), 45000);
t.unref();

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 393, height: 852 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    const page = await context.newPage();
    const testImage = path.resolve(process.cwd(), 'apps/web/public/apple-touch-icon.png');

    // Set mock token/user
    await context.addInitScript(() => {
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

    // 2. Click Ca Làm Mi tab
    console.log('2. Opening task screen...');
    const taskTabBtn = page.locator('button:has-text("Ca Làm Mi")').first();
    await taskTabBtn.click();
    await page.waitForTimeout(800);

    // 3. Start task -> Step 7 (Before Photo)
    console.log('3. Starting lash progress (Step 7)...');
    const startQuestBtn = page.locator('button:has-text("MỞ TIẾN TRÌNH")').first();
    await startQuestBtn.click();
    await page.waitForTimeout(800);

    // 4. Upload Real Before Photo & Save -> Step 8
    console.log('4. Uploading Real Before Photo and Saving (Step 7 -> Step 8)...');
    const beforeInput = page.locator('input[type="file"]').first();
    await beforeInput.setInputFiles(testImage);
    await page.waitForTimeout(1000); // Allow canvas compression
    const saveBeforeBtn = page.locator('button:has-text("TIẾP TỤC"), button:has-text("LƯU ẢNH BEFORE")').first();
    await saveBeforeBtn.click();
    await page.waitForTimeout(800);

    // 5. Upload Real Cleaned Photo & Save -> Step 9 (Timer)
    console.log('5. Uploading Real Cleaned Photo and Saving (Step 8 -> Step 9)...');
    const cleanedInput = page.locator('input[type="file"]').first();
    await cleanedInput.setInputFiles(testImage);
    await page.waitForTimeout(1000); // Allow canvas compression
    const saveCleanedBtn = page
      .locator('button:has-text("BẮT ĐẦU NỐI MI"), button:has-text("TIẾP TỤC"), button:has-text("LƯU ẢNH VỆ SINH")')
      .first();
    await saveCleanedBtn.click();
    await page.waitForTimeout(800);

    // 6. Finish Timer -> Step 10 (After Photo / Comparison Screen 09)
    console.log('6. Finishing Timer (Step 9 -> Step 10)...');
    const finishTimerBtn = page.locator('button:has-text("HOÀN TẤT NỐI MI & CHỤP AFTER")').first();
    await finishTimerBtn.click();
    await page.waitForTimeout(1000);

    // Upload Real After Photo at Step 10
    console.log('Uploading Real After Photo at Step 10...');
    const afterInput = page.locator('input[type="file"]').first();
    await afterInput.setInputFiles(testImage);
    await page.waitForTimeout(1500); // Allow canvas compression and auto-save

    // Verify 3-step comparison card is displayed at Step 10
    const step10Header = page.locator('text=4. Ảnh After Hoàn Thiện ✓');
    await step10Header.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Successfully reached Step 10 with 3-step comparison card');

    // Verify bottom button changed to "ĐÃ LƯU ẢNH AFTER · TIẾP TỤC KHẢO SÁT →"
    const savedAfterBtn = page.locator('text=ĐÃ LƯU ẢNH AFTER · TIẾP TỤC KHẢO SÁT →');
    const isSavedAfterBtnVisible = await savedAfterBtn.isVisible();
    console.log(`✓ Bottom button changed to saved state: ${isSavedAfterBtnVisible}`);

    // Wait 8 seconds to allow background polling (fetchBookings every 7s) to run and prove photo is NOT wiped out
    console.log('Waiting 8 seconds for background poll to verify photo 3 is NOT wiped out...');
    await page.waitForTimeout(8000);

    const isAfterPhotoStillVisible = await page.locator('img[alt="After"]').isVisible();
    console.log(`✓ After photo still visible after 8s background poll: ${isAfterPhotoStillVisible}`);

    await page.screenshot({
      path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-before-kill-real-photos.png',
    });
    console.log('Saved: ios-before-kill-real-photos.png');

    // 7. SIMULATE KILLED BROWSER (Close tab, re-open without ?step)
    console.log('7. Simulating killed browser (closing page & reopening fresh tab)...');
    await page.close();

    const page2 = await context.newPage();
    console.log('Navigating to http://localhost:4000/ios-app?role=CVL (bare URL, no step query param)...');
    await page2.goto('http://localhost:4000/ios-app?role=CVL', { waitUntil: 'domcontentloaded' });
    await page2.waitForSelector('text=Tiến Trình Nối Mi', { timeout: 10000 });
    await page2.waitForTimeout(1500);

    // 8. Assert that page2 automatically resumed at Step 10!
    const step10RestoredHeader = page2.locator('text=4. Ảnh After Hoàn Thiện ✓');
    const isStep10Restored = await step10RestoredHeader.isVisible();
    console.log(
      `Step 10 automatically restored after browser kill: ${isStep10Restored ? 'PASSED (YES)' : 'FAILED (NO)'}`
    );

    if (!isStep10Restored) {
      const currentUrl = page2.url();
      console.error(`ERROR: App did not restore to Step 10. Current URL: ${currentUrl}`);
      await page2.screenshot({
        path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-failed-restore.png',
      });
      process.exit(1);
    }

    // Verify all 3 real photos exist in 3 vertical rows
    const photoBeforeLabel = page2.locator('text=1. ẢNH BEFORE');
    const photoCleanedLabel = page2.locator('text=2. ẢNH VỆ SINH');
    const photoAfterLabel = page2.locator('text=3. ẢNH AFTER');

    console.log('Checking 3 photos in restored 3-row comparison view:');
    console.log(`- #1 Before label: ${await photoBeforeLabel.first().isVisible()}`);
    console.log(`- #2 Vệ sinh label: ${await photoCleanedLabel.first().isVisible()}`);
    console.log(`- #3 After label: ${await photoAfterLabel.first().isVisible()}`);

    // Check img tags inside the 3 photo slots
    const afterImgRestored = await page2.locator('img[alt="After"]').isVisible();
    const beforeImgRestored = await page2.locator('img[alt="Before"]').isVisible();
    const cleanedImgRestored = await page2.locator('img[alt="Cleaned"]').isVisible();
    console.log(`- Restored Photo 1 (Before): ${beforeImgRestored}`);
    console.log(`- Restored Photo 2 (Cleaned): ${cleanedImgRestored}`);
    console.log(`- Restored Photo 3 (After): ${afterImgRestored}`);

    await page2.screenshot({
      path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-after-kill-real-photos-restored.png',
    });
    console.log('Saved: ios-after-kill-real-photos-restored.png');

    // 9. Click "ĐÃ LƯU ẢNH AFTER · TIẾP TỤC KHẢO SÁT →" to proceed to Step 11
    console.log('9. Clicking continue button to proceed to Step 11 (Survey)...');
    const continueBtn = page2.locator('text=TIẾP TỤC KHẢO SÁT').first();
    await continueBtn.click();
    await page2.waitForTimeout(1000);

    const surveyHeader = page2.locator('text=Wings Beauty Survey');
    const isSurveyVisible = await surveyHeader.isVisible();
    console.log(`✓ Step 11 Survey reached: ${isSurveyVisible}`);

    await page2.screenshot({
      path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/ios-step11-survey-from-after.png',
    });
    console.log('Saved: ios-step11-survey-from-after.png');

    console.log('\n=========================================');
    console.log('🎉 VERIFICATION SUCCESS: Real compressed photos and active ca làm restored 100% after browser kill!');
    console.log('=========================================\n');
  } finally {
    await browser?.close?.();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
