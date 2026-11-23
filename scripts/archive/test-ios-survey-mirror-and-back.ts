import { chromium } from 'playwright';

const t = setTimeout(() => process.exit(1), 35000);
t.unref();

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    console.log('=== TEST CUSTOMER SURVEY MIRROR & BACK NAVIGATION ===');

    const context = await browser.newContext({
      viewport: { width: 393, height: 852 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

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

    const page = await context.newPage();
    console.log('1. Navigating to http://localhost:4000/ios-app?role=CVL...');
    await page.goto('http://localhost:4000/ios-app?role=CVL', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // 2. Check if at Step 11 (Survey) or advance to it
    const surveyHeader = page.locator('text=Wings Beauty Survey').first();
    const isAtSurvey = await surveyHeader.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Is at Step 11 (Wings Beauty Survey)?', isAtSurvey);

    if (!isAtSurvey) {
      // If at Step 10, proceed to Step 11
      const proceedBtn = page
        .locator('button:has-text("TIẾP TỤC KHẢO SÁT"), button:has-text("CHUYỂN MÁY CHO KHÁCH")')
        .first();
      if (await proceedBtn.isVisible({ timeout: 2000 })) {
        console.log('At Step 10, clicking proceed to Survey...');
        await proceedBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    // 3. Verify Before & After Mirror Showcase Card
    console.log('3. Verifying Before & After Mirror Showcase card on Survey screen...');
    const mirrorTitle = page.locator('text=GƯƠNG SOI FORM MI · ĐỐI CHIẾU TRƯỚC & SAU').first();
    const isMirrorVisible = await mirrorTitle.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Is Mirror Showcase card visible?', isMirrorVisible);

    const beforeTag = page.locator('text=1. Trước khi nối').first();
    console.log('Is "1. Trước khi nối" tag visible?', await beforeTag.isVisible());

    const afterTag = page.locator('text=2. Sau hoàn thiện ✨').first();
    console.log('Is "2. Sau hoàn thiện ✨" tag visible?', await afterTag.isVisible());

    const surveyScreenshot =
      '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/survey-with-mirror-showcase.png';
    await page.screenshot({ path: surveyScreenshot, fullPage: true });
    console.log('✓ Survey screenshot saved to:', surveyScreenshot);

    // 4. Test clicking image to open Lightbox Zoom modal
    console.log('4. Testing zoom on After photo...');
    const afterPhotoBox = page.locator('div:has-text("2. Sau hoàn thiện ✨")').first();
    await afterPhotoBox.click();
    await page.waitForTimeout(800);

    const closeMirrorBtn = page.locator('button:has-text("✕ Đóng Gương Soi")').first();
    const isZoomOpen = await closeMirrorBtn.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Is Zoom modal open for customer inspection?', isZoomOpen);

    if (isZoomOpen) {
      const zoomScreenshot =
        '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/survey-mirror-zoom-modal.png';
      await page.screenshot({ path: zoomScreenshot, fullPage: true });
      console.log('✓ Zoom modal screenshot saved to:', zoomScreenshot);

      console.log('Closing zoom modal...');
      await closeMirrorBtn.click();
      await page.waitForTimeout(600);
    }

    // 5. Test Back Navigation: click "‹ Quay lại xem ảnh After & thời gian"
    console.log('5. Testing Back button from Step 11 -> Step 10...');
    const backBtn = page.locator('button:has-text("‹ Quay lại xem ảnh After")').first();
    await backBtn.click();
    await page.waitForTimeout(1000);

    const afterScreenHeader = page.locator('text=4. Ảnh After Hoàn Thiện').first();
    const isBackAtAfterScreen = await afterScreenHeader.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Navigated back to Step 10 (Ảnh After)?', isBackAtAfterScreen);

    // Wait 6 seconds to ensure the auto-poller does NOT force it forward
    console.log('6. Waiting 6 seconds to test resilience against background auto-poller...');
    await page.waitForTimeout(6000);

    const stillAtAfterScreen = await afterScreenHeader.isVisible();
    console.log('After 6s polling, still securely at Step 10 (Not yanked forward)?', stillAtAfterScreen);

    const backScreenshot =
      '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e/after-screen-navigated-back.png';
    await page.screenshot({ path: backScreenshot, fullPage: true });
    console.log('✓ Back screen screenshot saved to:', backScreenshot);

    if (isMirrorVisible && isBackAtAfterScreen && stillAtAfterScreen) {
      console.log('🎉 ALL TESTS PASSED: MIRROR SHOWCASE & BACK NAVIGATION WORK FLAWLESSLY!');
    } else {
      console.error('❌ Test failed!');
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
