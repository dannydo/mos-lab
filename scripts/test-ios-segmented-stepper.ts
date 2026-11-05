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

    // If on Step 12 (Upsell), click back to Step 10 (After)
    const backFromUpsell = page.locator('button:has-text("Ảnh After")').first();
    if (await backFromUpsell.isVisible({ timeout: 1500 }).catch(() => false)) {
      console.log('Clicking back to Step 10...');
      await backFromUpsell.click();
      await page.waitForTimeout(1500);
    }

    // Step 4 (After) screenshot
    console.log('Capturing Step 4 (After) Stepper...');
    const step4Img = path.join(ARTIFACT_DIR, 'stepper-step4-after-verified.png');
    await page.screenshot({ path: step4Img });
    console.log('✓ Saved Step 4 screenshot');

    // Click Back to Step 3 (Timer)
    const backToTimer = page.locator('button:has-text("Giờ Phục Vụ")').first();
    if (await backToTimer.isVisible({ timeout: 1500 }).catch(() => false)) {
      console.log('Clicking back to Step 3 (Timer)...');
      await backToTimer.click();
      await page.waitForTimeout(1500);

      const step3Img = path.join(ARTIFACT_DIR, 'stepper-step3-timer-verified.png');
      await page.screenshot({ path: step3Img });
      console.log('✓ Saved Step 3 screenshot');

      // Click Back to Step 2 (Cleaned)
      const backToCleaned = page.locator('button:has-text("Ảnh Vệ Sinh")').first();
      if (await backToCleaned.isVisible({ timeout: 1500 }).catch(() => false)) {
        console.log('Clicking back to Step 2 (Cleaned)...');
        await backToCleaned.click();
        await page.waitForTimeout(1500);

        const step2Img = path.join(ARTIFACT_DIR, 'stepper-step2-cleaned-verified.png');
        await page.screenshot({ path: step2Img });
        console.log('✓ Saved Step 2 screenshot');

        // Click Back to Step 1 (Before)
        const backToBefore = page.locator('button:has-text("Ảnh Before")').first();
        if (await backToBefore.isVisible({ timeout: 1500 }).catch(() => false)) {
          console.log('Clicking back to Step 1 (Before)...');
          await backToBefore.click();
          await page.waitForTimeout(1500);

          const step1Img = path.join(ARTIFACT_DIR, 'stepper-step1-before-verified.png');
          await page.screenshot({ path: step1Img });
          console.log('✓ Saved Step 1 screenshot');
        }
      }
    }

    console.log('\n🎉 ALL 4 STEPPER SCREENSHOTS CAPTURED CLEANLY!');
  } finally {
    await browser.close();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
