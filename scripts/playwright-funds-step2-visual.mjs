import { chromium } from 'playwright';
import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

function signJwt(payload, secret) {
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const h = b64({ alg: 'HS256', typ: 'JWT' });
  const p = b64(payload);
  const s = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${s}`;
}

const hardTimeout = setTimeout(() => {
  console.error('[PLAYWRIGHT TIMEOUT] Test exceeded 45 seconds');
  process.exit(1);
}, 45000);
hardTimeout.unref();

(async () => {
  let browser;
  try {
    const token = signJwt(
      { id: 1, username: 'danhdo@gmail.com', role: 'super_admin', displayName: 'Danny Do', email: 'danhdo@gmail.com' },
      'super_secret_mos_lab_jwt_key_development_only'
    );

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });

    console.log('1. Setting pre-authenticated session...');
    await context.addInitScript((userData) => {
      window.localStorage.setItem('mos_token', userData.token);
      window.localStorage.setItem('mos_user', JSON.stringify(userData.user));
      window.localStorage.setItem('mos_avatar_snooze_until', '2099-01-01');
    }, {
      token,
      user: {
        id: 1,
        username: 'danhdo@gmail.com',
        displayName: 'Danny Do',
        role: 'super_admin',
        isActive: true,
      },
    });

    const page = await context.newPage();

    let fundsList = [];

    // Mock API funds
    await page.route('**/api/funds', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: fundsList }),
        });
      }
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const newFund = {
          id: `fund-${body.code?.toLowerCase() || 'custom'}`,
          code: body.code,
          name: body.name,
          description: body.description,
          currentBalance: 0,
          maxQuota: body.maxQuota || 1000000,
          unitQuota: body.unitQuota || 50000,
          status: body.status || 'DRAFT',
          alertThresholdPercent: body.alertThresholdPercent || 80,
          toleranceMode: body.toleranceMode || 'STRICT',
          toleranceAmount: body.toleranceAmount || 0,
          roles: body.roles || [],
          approvalConfig: body.approvalConfig,
          isLowBalance: false,
          usedAmount: 0,
          usedPercent: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        fundsList.push(newFund);
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: newFund }),
        });
      }
      return route.continue();
    });

    // Mock API staff
    await page.route('**/api/staff', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Danny Do', username: 'dannydo', role: 'admin' },
          { id: 10, name: 'Nguyễn Văn A', username: 'nguyenvana', role: 'telesale' },
          { id: 20, name: 'Bích Phượng', username: 'bichphuong', role: 'accountant' },
        ]),
      });
    });

    console.log('2. Navigating to /dashboard/funds...');
    await page.goto('http://localhost:4000/dashboard/funds', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    console.log('3. Waiting for header and empty state...');
    await page.waitForSelector('text=Quản Lý Quỹ Hoạt Động Nội Bộ', { timeout: 15000 });
    await page.waitForSelector('text=Chưa có quỹ hoạt động nào', { timeout: 15000 });

    console.log('4. Clicking Tạo Quỹ Mới button...');
    await page.click('button:has-text("Tạo Quỹ Mới")');

    console.log('5. Waiting for 4-tab modal...');
    await page.waitForSelector('text=Thiết Lập Quỹ Hoạt Động Nội Bộ Mới', { timeout: 10000 });
    await page.waitForSelector('text=Tab 1 – Thông tin', { timeout: 10000 });
    await page.waitForSelector('text=Tab 2 – Cấu hình tài chính', { timeout: 10000 });
    await page.waitForSelector('text=Tab 3 – Vai trò & Nhân sự', { timeout: 10000 });
    await page.waitForSelector('text=Tab 4 – Quy trình phê duyệt', { timeout: 10000 });

    console.log('6. Filling fund information in Tab 1...');
    await page.fill('input[placeholder*="Ví dụ: Quỹ Nạp Card Telesale"]', 'Quỹ Hoạt Động Telesale 2026');

    // Verify auto suggested code
    const codeValue = await page.inputValue('input[placeholder*="Ví dụ: FUND_TELESALE"]');
    console.log(`Auto suggested fund code: ${codeValue}`);
    if (!codeValue.includes('FUND_HOAT_DONG_TELESALE_2026')) {
      throw new Error(`Unexpected fund code suggestion: ${codeValue}`);
    }

    console.log('7. Switching to Tab 2 (Cấu hình tài chính)...');
    await page.click('text=Tab 2 – Cấu hình tài chính');
    await page.waitForSelector('text=Hạn mức quỹ tối đa', { timeout: 5000 });
    await page.waitForSelector('text=Chính xác tuyệt đối', { timeout: 5000 });

    console.log('8. Switching to Tab 3 (Vai trò & Nhân sự)...');
    await page.click('text=Tab 3 – Vai trò & Nhân sự');
    await page.waitForSelector('text=Thủ Quỹ (Quản lý số dư)', { timeout: 5000 });
    await page.waitForSelector('text=Kế Toán Giải Ngân', { timeout: 5000 });
    await page.waitForSelector('text=Quản Lý Phê Duyệt', { timeout: 5000 });

    console.log('9. Switching to Tab 4 (Quy trình phê duyệt)...');
    await page.click('text=Tab 4 – Quy trình phê duyệt');
    await page.waitForSelector('text=Quy trình phê duyệt đề xuất chi/bổ sung quỹ', { timeout: 5000 });
    await page.waitForSelector('text=Cấp 1 – Quản lý quỹ phê duyệt', { timeout: 5000 });

    console.log('10. Submitting fund creation...');
    await page.click('button:has-text("Khởi Tạo Quỹ")');

    console.log('11. Waiting for fund to appear in the table with DRAFT status...');
    await page.waitForSelector('text=Quỹ Hoạt Động Telesale 2026', { timeout: 10000 });
    await page.waitForSelector('text=BẢN NHÁP (DRAFT)', { timeout: 10000 });

    const screenshotPath = resolve(process.cwd(), 'output/playwright/funds-step2-created-visual.png');
    mkdirSync(dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Debug screenshot saved to: ${screenshotPath}`);

    console.log('[PLAYWRIGHT VISUAL QA PASSED] MOS-FEAT-177 Step 2 verified successfully');
  } catch (err) {
    console.error('[PLAYWRIGHT ERROR]', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    process.exit(0);
  }
})();
