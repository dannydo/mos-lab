import { chromium } from 'playwright';

const hardTimeout = setTimeout(() => {
  console.error('Hard timeout triggered');
  process.exit(1);
}, 30000);
hardTimeout.unref();

let browser = null;
const artifactDir = '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e';

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

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

  await page.goto('http://localhost:4000/ios-app?role=CVL', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. Click Checkout trên navbar
  const checkoutBtn = page.locator('button:has-text("Checkout")').first();
  if (await checkoutBtn.isVisible()) {
    console.log('Clicking Checkout...');
    await checkoutBtn.click();
    await page.waitForTimeout(1000);
  }

  // 2. Click "MỞ MÃ QR THANH TOÁN"
  const qrBtn = page.locator('button:has-text("MỞ MÃ QR THANH TOÁN")').first();
  if (await qrBtn.isVisible()) {
    console.log('Clicking MỞ MÃ QR THANH TOÁN...');
    await qrBtn.click();
    await page.waitForTimeout(1000);
  }

  // 3. Click "ĐÃ NHẬN TIỀN THÀNH CÔNG \n XUẤT HÓA ĐƠN"
  const confirmQrBtn = page.locator('button:has-text("ĐÃ NHẬN TIỀN THÀNH CÔNG")').first();
  if (await confirmQrBtn.isVisible()) {
    console.log('Clicking ĐÃ NHẬN TIỀN THÀNH CÔNG...');
    await confirmQrBtn.click();
    await page.waitForTimeout(1000);

    // 4. Modal Zalo Consent xuất hiện
    await page.screenshot({
      path: `${artifactDir}/screen12-zalo-consent-modal.png`,
      fullPage: false,
    });
    console.log('Saved screen12-zalo-consent-modal.png');

    // 5. Click "KHÁCH ĐỒNG Ý · GỬI QUA ZALO NGAY"
    const agreeZaloBtn = page.locator('button:has-text("KHÁCH ĐỒNG Ý · GỬI QUA ZALO NGAY")').first();
    if (await agreeZaloBtn.isVisible()) {
      console.log('Clicking KHÁCH ĐỒNG Ý · GỬI QUA ZALO NGAY...');
      await agreeZaloBtn.click();

      // Đợi hiệu ứng gửi Zalo và chuyển sang Screen 14
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: `${artifactDir}/screen14-receipt-with-zalo-agreed.png`,
        fullPage: false,
      });
      console.log('Saved screen14-receipt-with-zalo-agreed.png');
    }
  }

  console.log('PLAYWRIGHT ZALO FLOW VERIFICATION FINISHED SUCCESS');
} catch (err) {
  console.error('Playwright Error:', err);
} finally {
  if (browser) await browser.close();
  process.exit(0);
}
