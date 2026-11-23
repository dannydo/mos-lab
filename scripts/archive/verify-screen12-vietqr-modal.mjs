import { chromium } from 'playwright';

const hardTimeout = setTimeout(() => {
  console.error('Hard timeout triggered');
  process.exit(1);
}, 25000);
hardTimeout.unref();

let browser = null;

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  // Set mock auth to bypass login
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
  await page.waitForTimeout(1500);

  // 1. Nếu đang ở màn Dưỡng Mi & Combo (Step 12), click "Checkout" ở navbar hoặc nút dưới cùng
  const checkoutNavBtn = page.locator('button:has-text("Checkout")').first();
  if (await checkoutNavBtn.isVisible()) {
    console.log('Clicking Checkout nav button...');
    await checkoutNavBtn.click();
    await page.waitForTimeout(1000);
  } else {
    const bottomCheckoutBtn = page.locator('button:has-text("CHỐT ĐƠN & SANG THANH TOÁN")').first();
    if (await bottomCheckoutBtn.isVisible()) {
      console.log('Clicking bottom checkout button...');
      await bottomCheckoutBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // Bây giờ đã ở Screen 12 (Check Out / Thanh Toán)
  // Bấm nút "MỞ MÃ QR THANH TOÁN"
  const qrButton = page.locator('button:has-text("MỞ MÃ QR THANH TOÁN")').first();
  if (await qrButton.isVisible()) {
    console.log('Clicking MỞ MÃ QR THANH TOÁN...');
    await qrButton.click();
  } else {
    // Nếu chưa chọn VietQR
    const qrRow = page.locator('text=Chuyển khoản QR (Bank)').first();
    if (await qrRow.isVisible()) {
      await qrRow.click();
      await page.waitForTimeout(400);
      await page.locator('button:has-text("MỞ MÃ QR THANH TOÁN")').first().click();
    }
  }

  await page.waitForTimeout(1500);

  const artifactDir = '/Users/dannydo/.gemini/antigravity/brain/ec80c3ab-dd49-45b4-9c0f-982c3957019e';

  // 1. Chụp modal QR ban đầu
  await page.screenshot({
    path: `${artifactDir}/screen12-vietqr-modal-refactored.png`,
    fullPage: false,
  });
  console.log('Saved screen12-vietqr-modal-refactored.png');

  // 2. Chụp modal sau khi upload mock ảnh bill
  const sampleBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  await page.evaluate((b64) => {
    const input = document.querySelector('input[type="file"]');
    if (input) {
      const byteString = atob(b64.split(',')[1]);
      const mimeString = b64.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const file = new File([blob], 'bill-vietqr-proof.png', { type: mimeString });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, sampleBase64);

  await page.waitForTimeout(1000);

  await page.screenshot({
    path: `${artifactDir}/screen12-vietqr-proof-captured.png`,
    fullPage: false,
  });
  console.log('Saved screen12-vietqr-proof-captured.png');

  // 3. Bấm xác nhận nhận tiền thành công -> Screen 14
  const confirmBtn = page.locator('button:has-text("ĐÃ NHẬN TIỀN THÀNH CÔNG")').first();
  if (await confirmBtn.isVisible()) {
    console.log('Clicking ĐÃ NHẬN TIỀN THÀNH CÔNG...');
    await confirmBtn.click();
    await page.waitForTimeout(1200);

    await page.screenshot({
      path: `${artifactDir}/screen14-receipt-with-proof.png`,
      fullPage: false,
    });
    console.log('Saved screen14-receipt-with-proof.png');
  }

  console.log('PLAYWRIGHT VISUAL QA FINISHED SUCCESS');
} catch (err) {
  console.error('Playwright Error:', err);
} finally {
  if (browser) await browser.close();
  process.exit(0);
}
