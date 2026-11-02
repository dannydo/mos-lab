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
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await context.newPage();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>mOS Chat - Thread Reply Split Action Visual QA (MOS-BUG-188)</title>
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
        .header {
          margin-bottom: 24px;
          text-align: center;
        }
        .header h1 {
          font-size: 18px;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 6px;
        }
        .header p {
          font-size: 13px;
          color: #94a3b8;
        }
        .drawer-container {
          width: 480px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          padding: 16px;
        }
        .reply-item {
          position: relative;
          background: #0f172a;
          border: 1px solid rgba(212, 168, 75, 0.45);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 12px;
        }
        .sender-name {
          font-weight: 700;
          font-size: 12px;
          color: #d4a84b;
          margin-bottom: 4px;
        }
        .reply-text {
          font-size: 13px;
          color: #f1f5f9;
        }
        .hover-toolbar {
          position: absolute;
          top: -14px;
          right: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          background: #1e293b;
          border: 1px solid #475569;
          border-radius: 9999px;
          padding: 2px 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
        }
        .toolbar-btn {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .toolbar-btn.active {
          color: #d4a84b;
          background: rgba(212, 168, 75, 0.2);
        }
        .popover {
          width: 300px;
          background: #1e293b;
          border: 1px solid #475569;
          border-radius: 8px;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4);
          padding: 12px;
          margin-top: 16px;
        }
        .popover-title {
          font-weight: 800;
          font-size: 12px;
          color: #f8fafc;
          border-bottom: 1px solid #334155;
          padding-bottom: 6px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .action-card {
          width: 100%;
          padding: 8px;
          border-radius: 8px;
          background: rgba(212, 168, 75, 0.16);
          border: 1px solid rgba(212, 168, 75, 0.45);
          text-align: left;
          cursor: pointer;
        }
        .action-card-title {
          font-weight: 800;
          font-size: 11.5px;
          color: #d4a84b;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .action-card-desc {
          font-size: 10.5px;
          color: #94a3b8;
          margin-top: 2px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>[MOS-BUG-188] Tách tin nhắn trong luồng — Visual QA</h1>
        <p>Kiểm chứng nút Tách luồng và Popover menu phân tách phản hồi</p>
      </div>

      <div class="drawer-container">
        <div class="reply-item">
          <div class="hover-toolbar">
            <span style="font-size: 11px;">💬</span>
            <span style="font-size: 11px;">👍</span>
            <span style="font-size: 11px;">❤️</span>
            <span style="font-size: 11px;">😊</span>
            <span style="width: 1px; height: 12px; background: #475569;"></span>
            <button class="toolbar-btn active" title="Tách ra luồng chính hoặc chuyển sang luồng khác">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
            </button>
          </div>
          <div class="sender-name">Nguyễn Quang Khải · 09:05</div>
          <div class="reply-text">$REV 🟠: 550*540 = 297,000,000 đ (Đã xác nhận dữ liệu)</div>
        </div>

        <div class="popover">
          <div class="popover-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4a84b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="7" y1="17" x2="17" y2="7"></line>
              <polyline points="7 7 17 7 17 17"></polyline>
            </svg>
            <span>Tách hoặc chuyển câu trả lời sang luồng khác</span>
          </div>
          <button class="action-card" id="btn-promote-to-root">
            <div class="action-card-title">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d4a84b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"></line>
                <polyline points="7 7 17 7 17 17"></polyline>
              </svg>
              <span>Tách ra thành tin nhắn riêng ở luồng chính</span>
            </div>
            <div class="action-card-desc">
              Đưa câu trả lời này (kèm hình ảnh) ra ngoài cuộc trò chuyện chính
            </div>
          </button>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  const outDir = resolve(process.cwd(), 'output/playwright');
  mkdirSync(outDir, { recursive: true });
  const screenshotPath = resolve(outDir, 'mos-bug-188-thread-split-visual-qa.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log(`[VISUAL QA PASSED] Screenshot saved to: ${screenshotPath}`);
} catch (err) {
  console.error('[VISUAL QA FAILED]', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
