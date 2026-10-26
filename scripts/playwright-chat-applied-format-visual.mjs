import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const t = setTimeout(() => {
  console.error('[PLAYWRIGHT TIMEOUT] Visual test timed out');
  process.exit(1);
}, 25000);
t.unref();

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>mOS Chat - Applied CKEditor Format Visual QA</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #0f172a;
          color: #e2e8f0;
          padding: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .chat-feed {
          width: 680px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .bubble {
          padding: 14px 16px;
          border-radius: 16px;
          border-top-left-radius: 4px;
          background: #1e293b;
          border: 1px solid rgba(255,255,255,0.1);
          color: #f1f5f9;
          font-size: 13px;
          line-height: 1.6;
          word-break: break-word;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .heading-1 { font-size: 16px; font-weight: 700; color: #fbbf24; margin: 10px 0 6px 0; }
        .heading-2 { font-size: 14px; font-weight: 700; color: #fcd34d; margin: 8px 0 4px 0; }
        .bullet-item { display: flex; align-items: flex-start; gap: 6px; margin: 2px 0; }
        .bullet-dot { font-weight: 700; color: #fbbf24; }
        .blockquote-box { margin: 6px 0; padding: 4px 10px; border-left: 2px solid rgba(245, 158, 11, 0.8); background: rgba(245, 158, 11, 0.1); border-radius: 0 4px 4px 0; font-style: italic; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; border: 1px solid #334155; border-radius: 8px; overflow: hidden; }
        th { background: #0f172a; color: #fbbf24; padding: 8px 12px; font-size: 12px; text-align: left; border-bottom: 1px solid #334155; }
        td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #1e293b; color: #cbd5e1; }
      </style>
    </head>
    <body>
      <h2 style="color: #fbbf24; margin-bottom: 16px;">mOS Chat - Visual QA: Applied CKEditor Format</h2>
      <div class="chat-feed">
        <!-- Message 1: Applied Announcement Template -->
        <div class="bubble" id="msg-announcement">
          <div class="heading-1">📢 THÔNG BÁO NỘI BỘ</div>
          <div><strong>Kính gửi:</strong> Toàn thể đội ngũ Wings</div>
          <div class="heading-2">1. Mục đích thông báo</div>
          <div class="bullet-item"><span class="bullet-dot">•</span> <span>Chuẩn hóa hiển thị tin nhắn định dạng</span></div>
          <div class="heading-2">2. Nội dung chi tiết & Thời gian áp dụng</div>
          <div class="bullet-item"><span class="bullet-dot">•</span> <span><strong>Thời gian áp dụng:</strong> Bắt đầu từ hôm nay</span></div>
          <div class="bullet-item"><span class="bullet-dot">•</span> <span><strong>Phạm vi áp dụng:</strong> Toàn bộ chi nhánh</span></div>
          <div class="heading-2">3. Lưu ý quan trọng</div>
          <div class="blockquote-box">Mọi thắc mắc xin vui lòng phản hồi trực tiếp dưới tin nhắn này để được giải đáp kịp thời.</div>
        </div>

        <!-- Message 2: Applied Progress Report Table -->
        <div class="bubble" id="msg-table">
          <div class="heading-1">📊 BÁO CÁO TIẾN ĐỘ CÔNG VIỆC</div>
          <div class="heading-2">1. Bảng số liệu tổng hợp</div>
          <table>
            <thead>
              <tr><th>Hạng mục</th><th>Chỉ tiêu</th><th>Thực tế</th><th>Đạt (%)</th></tr>
            </thead>
            <tbody>
              <tr><td>Khách hàng phục vụ</td><td>50</td><td>52</td><td>104%</td></tr>
              <tr><td>Đánh giá hài lòng</td><td>98%</td><td>100%</td><td>102%</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const announcementTitle = await page.textContent('#msg-announcement .heading-1');
  if (!announcementTitle?.includes('THÔNG BÁO NỘI BỘ')) {
    throw new Error('Announcement title visual assertion failed');
  }

  const tableHeader = await page.textContent('#msg-table th');
  if (!tableHeader?.includes('Hạng mục')) {
    throw new Error('Table visual assertion failed');
  }

  mkdirSync(resolve('/tmp/playwright-qa'), { recursive: true });
  const screenshotPath = resolve('/tmp/playwright-qa/mos-chat-applied-format.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log('Playwright Visual QA PASSED: Snapshot captured at', screenshotPath);
} catch (err) {
  console.error('Playwright Visual QA FAILED:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
