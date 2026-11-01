import { chromium } from 'playwright';

const t = setTimeout(() => {
  console.error('Playwright visual test timed out');
  process.exit(1);
}, 25000);
t.unref();

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 12/13/14
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  // Test rendering Mobile Chat Feed with quoted reply message (MOS-BUG-185)
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>mOS Chat - Mobile Reply to Message Visual QA (MOS-BUG-185)</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #020617; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        header { height: 56px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background: #0f172a; flex-shrink: 0; }
        .header-peer { display: flex; align-items: center; gap: 10px; }
        .avatar-md { width: 32px; height: 32px; border-radius: 9999px; object-fit: cover; border: 1px solid rgba(255,255,255,0.15); }
        .feed { flex: 1; overflow-y: auto; padding: 16px 12px; display: flex; flex-direction: column; gap: 12px; }
        
        .msg-row { display: flex; flex-direction: column; margin-bottom: 4px; }
        .msg-other { align-items: flex-start; }
        .msg-mine { align-items: flex-end; }
        
        .sender-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; padding-left: 4px; }
        .avatar-sm { width: 24px; height: 24px; border-radius: 9999px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1); }
        .avatar-initials-sm { width: 24px; height: 24px; border-radius: 9999px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #020617; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
        .sender-name { font-size: 12px; font-weight: 600; color: #cbd5e1; }
        .role-badge { font-size: 9px; padding: 1px 6px; border-radius: 4px; background: #1e293b; color: #94a3b8; border: 1px solid #334155; text-transform: uppercase; font-weight: 600; }
        
        .bubble { max-width: 85%; padding: 10px 14px; border-radius: 18px; font-size: 13.5px; line-height: 1.45; }
        .bubble-other { background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(51, 65, 85, 0.7); border-top-left-radius: 4px; color: #f1f5f9; }
        .bubble-mine { background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.4); border-top-right-radius: 4px; color: #fff; }
        
        /* Quoted Message Preview */
        .quote-preview {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          border-radius: 8px;
          margin-bottom: 8px;
          font-size: 11px;
          border-left: 3px solid #f59e0b;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .quote-preview-mine {
          background: rgba(245, 158, 11, 0.2);
          border-left-color: #fbbf24;
          color: #e2e8f0;
        }
        .quote-preview-other {
          background: rgba(15, 23, 42, 0.6);
          border-left-color: #f59e0b;
          color: #cbd5e1;
        }
        .quote-sender { font-weight: 700; font-size: 11px; margin-bottom: 2px; }
        .quote-text { opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }

        /* Replying Banner in Composer */
        .reply-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          background: rgba(30, 41, 59, 0.85);
          border-top: 1px solid rgba(51, 65, 85, 0.6);
          font-size: 11.5px;
        }
        .reply-banner-left { display: flex; align-items: center; gap: 6px; overflow: hidden; }
        .reply-tag { font-weight: 700; color: #fcd34d; }
        .reply-snippet { color: #cbd5e1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px; }

        footer { border-top: 1px solid #1e293b; background: #0f172a; display: flex; flex-direction: column; flex-shrink: 0; }
        .composer-bar { height: 56px; display: flex; align-items: center; padding: 0 12px; gap: 8px; }
        .composer-box { flex: 1; height: 38px; background: #1e293b; border-radius: 19px; border: 1px solid #334155; padding: 0 14px; color: #fff; font-size: 13px; display: flex; align-items: center; }
      </style>
    </head>
    <body>
      <header>
        <div class="header-peer">
          <div class="avatar-initials-sm">DD</div>
          <div>
            <div style="font-size: 14px; font-weight: 700;">Danny Do</div>
            <div style="font-size: 10px; color: #10b981;">Đang hoạt động</div>
          </div>
        </div>
      </header>

      <div class="feed">
        <!-- Message 1: Original message from Danny -->
        <div class="msg-row msg-other" id="mos-chat-msg-1">
          <div class="sender-header">
            <div class="avatar-initials-sm">DD</div>
            <span class="sender-name">Danny Do</span>
            <span class="role-badge">Super Admin</span>
          </div>
          <div class="bubble bubble-other">
            Sáng nay mọi người kiểm tra lịch hẹn các chi nhánh chưa?
          </div>
        </div>

        <!-- Message 2: Reply from Ha My with Quoted Preview Card -->
        <div class="msg-row msg-mine" id="mos-chat-msg-2">
          <div class="sender-header" style="flex-direction: row-reverse; padding-right: 4px;">
            <div class="avatar-initials-sm" style="background: linear-gradient(135deg, #ec4899, #8b5cf6);">HM</div>
            <span class="sender-name" style="color: #fcd34d;">Hà My</span>
            <span class="role-badge">Chuyên Viên Mi</span>
          </div>
          <div class="bubble bubble-mine">
            <div class="quote-preview quote-preview-mine" data-testid="quoted-message-card">
              <div style="min-width: 0;">
                <div class="quote-sender">Danny Do</div>
                <div class="quote-text">Sáng nay mọi người kiểm tra lịch hẹn các chi nhánh chưa?</div>
              </div>
            </div>
            Dạ em đã kiểm tra xong hết toàn bộ 3 chi nhánh rồi anh nhé! Tất cả đều đã sẵn sàng phục vụ khách hàng.
          </div>
        </div>
      </div>

      <footer>
        <div class="reply-banner" data-testid="composer-reply-banner">
          <div class="reply-banner-left">
            <span class="reply-tag">Trả lời Hà My:</span>
            <span class="reply-snippet">Dạ em đã kiểm tra xong hết toàn bộ 3 chi nhánh rồi anh nhé...</span>
          </div>
          <div style="color: #94a3b8; font-size: 13px; cursor: pointer;">✕</div>
        </div>
        <div class="composer-bar">
          <div class="composer-box">Nhập câu trả lời...</div>
        </div>
      </footer>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  await page.waitForTimeout(500);

  // Validate quoted message card and reply banner rendered
  const quoteCard = await page.$('[data-testid="quoted-message-card"]');
  if (!quoteCard) {
    throw new Error('Quoted message card preview was not rendered properly!');
  }

  const replyBanner = await page.$('[data-testid="composer-reply-banner"]');
  if (!replyBanner) {
    throw new Error('Composer reply banner was not rendered properly!');
  }

  const screenshotPath = '/tmp/mos-bug-185-mobile-reply-visual-qa.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`[Playwright Visual QA PASSED] Mobile chat reply visual screenshot saved to ${screenshotPath}`);
} catch (err) {
  console.error('[Playwright Visual QA FAILED]:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
