import { chromium } from 'playwright';

const t = setTimeout(() => process.exit(1), 35000);
t.unref();

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    console.log('=== TEST REAL-TIME CROSS-DEVICE SESSION SYNC ===');

    console.log('1. Launching Device 2 (Desktop Browser) with clean local storage...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 850 },
      deviceScaleFactor: 2,
    });

    await desktopContext.addInitScript(() => {
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
      window.localStorage.removeItem('ios_active_servicing_id');
      window.localStorage.removeItem('ios_active_servicing_step');
    });

    const desktopPage = await desktopContext.newPage();
    console.log('2. Desktop navigating to http://localhost:4000/ios-app?role=CVL...');
    await desktopPage.goto('http://localhost:4000/ios-app?role=CVL', { waitUntil: 'domcontentloaded' });

    console.log('3. Waiting for Desktop to auto-detect active servicing ca làm from server...');
    await desktopPage.waitForTimeout(3000);

    // Verify it detected Thúy (337532)
    const pageText = await desktopPage.innerText('body');
    console.log('Detected active customer on Desktop:', pageText.includes('Thúy') ? 'Thúy (MATCHED!)' : 'Unknown');

    // If at Step 11 (Survey), take screenshot and click back to Step 10 (Ảnh After) to verify 3 rows layout
    const surveyHeader = desktopPage.locator('text=Wings Beauty Survey').first();
    const isAtSurvey = await surveyHeader.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Is Desktop at Step 11 (Survey)?', isAtSurvey);

    if (isAtSurvey) {
      await desktopPage.screenshot({
        path: '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/desktop-synced-step11-survey.png',
        fullPage: true,
      });
      console.log('Clicking back button to Step 10 (Ảnh After)...');
      const backToAfterBtn = desktopPage.locator('button:has-text("Ảnh After"), button:has-text("Quay lại")').first();
      await backToAfterBtn.click();
      await desktopPage.waitForTimeout(1000);
    }

    // Verify Step 10 (Ảnh After) is displayed
    const afterHeader = desktopPage.locator('text=4. Ảnh After Hoàn Thiện').first();
    const isAtStep10 = await afterHeader.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Is Desktop now at Step 10 (Ảnh After Hoàn Thiện)?', isAtStep10);

    // Verify 3 rows layout
    const threeRowsTitle = desktopPage.locator('text=ĐỐI CHIẾU TIẾN TRÌNH 3 BƯỚC (BEFORE / VỆ SINH / AFTER)').first();
    const isThreeRowsVisible = await threeRowsTitle.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Is 3-Rows layout visible on Desktop?', isThreeRowsVisible);

    // Verify images are rendered
    const beforeImg = desktopPage.locator('img[alt="Before"]').first();
    const isBeforeImgVisible = await beforeImg.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Is Before Photo rendered from server sync?', isBeforeImgVisible);

    const cleanedImg = desktopPage.locator('img[alt="Cleaned"]').first();
    const isCleanedImgVisible = await cleanedImg.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Is Cleaned Photo rendered from server sync?', isCleanedImgVisible);

    const step10Screenshot =
      '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/desktop-synced-step10-3rows.png';
    await desktopPage.screenshot({ path: step10Screenshot, fullPage: true });
    console.log('✓ Step 10 Screenshot saved to:', step10Screenshot);

    if (isAtStep10 && isThreeRowsVisible && isBeforeImgVisible && isCleanedImgVisible) {
      console.log('🎉 ALL CROSS-DEVICE SYNC CHECKS PASSED 100%!');
    } else {
      console.error('❌ Check failed: Step 10 elements not fully matched.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await browser.close();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
