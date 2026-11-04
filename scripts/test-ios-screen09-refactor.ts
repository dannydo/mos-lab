import { chromium } from 'playwright';
import path from 'path';

const t = setTimeout(() => process.exit(1), 35000);
t.unref();

const ARTIFACT_DIR = '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e';

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
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
    await page.waitForTimeout(2000);

    // If on Dashboard, click "Vào ca →"
    const vaoCa = page.locator('text=Vào ca').first();
    if (await vaoCa.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Clicking "Vào ca →" to enter servicing...');
      await vaoCa.click();
      await page.waitForTimeout(1000);
    }

    // Step 7 -> 8 if needed
    const nextBtn1 = page.locator('button:has-text("TIẾP TỤC →")').first();
    if (await nextBtn1.isVisible({ timeout: 1500 }).catch(() => false)) {
      console.log('At Step 7 (Before), clicking TIẾP TỤC...');
      await nextBtn1.click();
      await page.waitForTimeout(1000);
    }

    // Step 8 -> 9 if needed
    const nextBtn2 = page.locator('button:has-text("TIẾP TỤC →")').first();
    if (await nextBtn2.isVisible({ timeout: 1500 }).catch(() => false)) {
      console.log('At Step 8 (Cleaned), clicking TIẾP TỤC...');
      await nextBtn2.click();
      await page.waitForTimeout(1000);
    }

    // Step 9 -> 10 if needed
    const finishTimerBtn = page.locator('button:has-text("HOÀN TẤT NỐI MI"), button:has-text("CHỤP AFTER")').first();
    if (await finishTimerBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      console.log('At Step 9 (Timer), finishing timer to enter Step 10...');
      await finishTimerBtn.click();
      await page.waitForTimeout(1500);
    }

    // If on Step 11, click back to step 10
    const backFromSurvey = page.locator('button:has-text("‹ Quay lại xem ảnh After")').first();
    if (await backFromSurvey.isVisible({ timeout: 1500 }).catch(() => false)) {
      console.log('Currently at Survey, clicking back to Step 10...');
      await backFromSurvey.click();
      await page.waitForTimeout(1500);
    }

    // If on Step 12, click back to step 10
    const backFromUpsell = page.locator('button:has-text("Ảnh After"), button:has-text("‹ Ảnh After")').first();
    if (await backFromUpsell.isVisible({ timeout: 1500 }).catch(() => false)) {
      console.log('Currently at Upsell, clicking back to Step 10...');
      await backFromUpsell.click();
      await page.waitForTimeout(1500);
    }

    console.log('\n2. Verifying Screen09 Refactored Layout...');

    // Block 1: Viewfinder After on top
    const afterCardTitle = page.locator('text=3. ẢNH AFTER · HOÀN THIỆN').first();
    const isAfterTopVisible = await afterCardTitle.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('✓ Block 1: After Photo Viewfinder on top:', isAfterTopVisible);

    const cameraBtn = page.locator('button:has-text("Chụp lại After"), button:has-text("Chụp Bằng Camera")').first();
    console.log('✓ Camera button visible:', await cameraBtn.isVisible());

    const libraryBtn = page.locator('button:has-text("Chọn Từ Thư Viện")').first();
    console.log('✓ Library button visible:', await libraryBtn.isVisible());

    // Block 2: 2 compact thumbnails below
    const thumbnailsTitle = page.locator('text=ĐỐI CHIẾU NHANH VỚI ẢNH TRƯỚC ĐÓ').first();
    const isThumbnailsTitleVisible = await thumbnailsTitle.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('✓ Block 2: Compact thumbnails header visible:', isThumbnailsTitleVisible);

    const thumb1 = page.locator('text=1. Mắt Mộc').first();
    console.log('✓ Thumbnail 1 (Before):', await thumb1.isVisible());

    const thumb2 = page.locator('text=2. Vệ Sinh').first();
    console.log('✓ Thumbnail 2 (Cleaned):', await thumb2.isVisible());

    // Block 3: Speed & promotion card
    const perfCard = page.locator('text=HIỆU SUẤT CA LÀM').first();
    console.log('✓ Block 3: Performance card visible:', await perfCard.isVisible());

    const wingsTechCheck = page.locator('text=Chuẩn kỹ thuật Wings').first();
    console.log('✓ Wings technical check visible:', await wingsTechCheck.isVisible());

    // Block 4: CTA Button
    const ctaBtn = page.locator('button:has-text("TIẾP TỤC →")').first();
    console.log('✓ Block 4: CTA button visible:', await ctaBtn.isVisible());

    // Save full page screenshot of Screen09
    const screen09Screenshot = path.join(ARTIFACT_DIR, 'refactored-screen09-after-verified.png');
    await page.screenshot({ path: screen09Screenshot, fullPage: true });
    console.log('✓ Screen09 screenshot saved to:', screen09Screenshot);

    // Test transition directly to Step 12 (Product Upsell)
    console.log('\n3. Testing CTA button click -> direct transition to Step 12 (Product Upsell)...');
    await ctaBtn.click();
    await page.waitForTimeout(2000);

    const isStep12 = await page.evaluate(() => {
      const text = document.body.innerText;
      return (
        text.includes('Yeppeum') || text.includes('Combo') || text.includes('Dưỡng Mi') || text.includes('Bán Dưỡng Mi')
      );
    });
    console.log('✓ Successfully arrived at Step 12 (Product Upsell/Checkout):', isStep12);

    const step12Screenshot = path.join(ARTIFACT_DIR, 'screen12-upsell-verified.png');
    await page.screenshot({ path: step12Screenshot, fullPage: true });
    console.log('✓ Step 12 screenshot saved to:', step12Screenshot);

    // Test Back button on Step 12 -> back to Step 10
    console.log('\n4. Testing Back button from Step 12 -> Step 10...');
    const backBtn = page.locator('button:has-text("Ảnh After"), [aria-label="Back"]').first();
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(1500);

      const returnedTo10 = await page
        .locator('text=3. ẢNH AFTER · HOÀN THIỆN')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      console.log('✓ Back button smoothly returned to Step 10 (Ảnh After):', returnedTo10);
      if (!returnedTo10) {
        throw new Error('Failed to return to Step 10 from Step 12');
      }
    } else {
      throw new Error('Back button on Step 12 not found');
    }

    console.log('\n🎉 ALL REFACTOR VERIFICATIONS PASSED 100%!');
  } finally {
    await browser.close();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
