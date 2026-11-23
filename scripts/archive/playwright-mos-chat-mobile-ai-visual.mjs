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
    viewport: { width: 390, height: 844 }, // iPhone 12 viewport
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>mOS Chat - Mobile AI Copilot Visual QA</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #020617; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        
        /* Mobile Header */
        header { background: rgba(15, 23, 42, 0.95); border-bottom: 1px solid #1e293b; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; }
        .back-btn { color: #f59e0b; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 4px; }
        .room-info { display: flex; align-items: center; gap: 8px; }
        .ai-avatar { width: 36px; height: 36px; border-radius: 12px; background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899); display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
        .room-title { font-size: 14px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 6px; }
        .ai-tag { font-size: 10px; font-weight: 700; color: #d8b4fe; background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.4); padding: 1px 6px; border-radius: 4px; text-transform: uppercase; }
        .room-sub { font-size: 11px; color: #c084fc; margin-top: 2px; }
        .refresh-btn { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #1e293b; color: #d8b4fe; border: 1px solid #334155; font-size: 14px; }

        /* Stream Container */
        .stream { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 14px; }
        
        /* Welcome card */
        .welcome-card { background: linear-gradient(180deg, rgba(88, 28, 135, 0.2), transparent); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 16px; padding: 18px; text-align: center; }
        .welcome-avatar { width: 52px; height: 52px; border-radius: 18px; background: linear-gradient(135deg, #6366f1, #a855f7, #ec4899); display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 10px; box-shadow: 0 8px 20px rgba(168, 85, 247, 0.3); }
        .welcome-title { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 4px; }
        .welcome-sub { font-size: 12px; color: #94a3b8; line-height: 1.5; }

        /* Message item */
        .msg-row { display: flex; flex-direction: column; align-items: flex-start; max-width: 90%; }
        .msg-bubble { background: #0f172a; border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 16px 16px 16px 4px; padding: 12px 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        
        /* Thinking box */
        .thinking-box { background: rgba(59, 7, 100, 0.4); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 10px; padding: 8px 10px; margin-bottom: 10px; }
        .thinking-header { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 700; color: #d8b4fe; }
        .thinking-content { font-size: 11px; color: #cbd5e1; margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(168, 85, 247, 0.2); line-height: 1.4; }

        /* Action button */
        .action-row { margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(168, 85, 247, 0.2); display: flex; gap: 8px; }
        .action-btn { background: rgba(168, 85, 247, 0.2); border: 1px solid #a855f7; color: #f3e8ff; border-radius: 8px; padding: 6px 12px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; cursor: pointer; }

        /* Quick prompts bar */
        .prompts-bar { padding: 8px 14px 4px; display: flex; gap: 8px; overflow-x: auto; background: #020617; }
        .prompt-chip { background: rgba(88, 28, 135, 0.5); border: 1px solid rgba(168, 85, 247, 0.4); color: #e9d5ff; border-radius: 20px; padding: 6px 12px; font-size: 12px; white-space: nowrap; font-weight: 500; display: flex; align-items: center; gap: 6px; }

        /* Composer */
        .composer { background: #0f172a; border-top: 1px solid #1e293b; padding: 10px 14px 28px; display: flex; align-items: center; gap: 8px; }
        .input-box { flex: 1; background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 10px 14px; font-size: 13px; color: #fff; }
        .send-btn { width: 36px; height: 36px; border-radius: 50%; background: #a855f7; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 16px; border: none; }
      </style>
    </head>
    <body>
      <!-- Header -->
      <header>
        <div class="back-btn">‹ Hộp thư</div>
        <div class="room-info">
          <div class="ai-avatar">✨</div>
          <div>
            <div class="room-title">
              <span>🤖 MAI</span>
              <span class="ai-tag">mOS AI</span>
            </div>
            <div class="room-sub">Tra cứu & Phân tích riêng tư</div>
          </div>
        </div>
        <button class="refresh-btn">🔄</button>
      </header>

      <!-- Message Stream -->
      <div class="stream">
        <div class="welcome-card">
          <div class="welcome-avatar">✨</div>
          <div class="welcome-title">Trợ lý mOS AI (MAI)</div>
          <div class="welcome-sub">Kênh 1-1 riêng tư · Mọi trao đổi và phân tích dữ liệu chỉ một mình bạn nhìn thấy.</div>
        </div>

        <div class="msg-row">
          <div class="msg-bubble">
            <div class="thinking-box">
              <div class="thinking-header">
                <span>✨ Quá trình suy luận của MAI</span>
                <span>▲</span>
              </div>
              <div class="thinking-content">Đang phân tích dữ liệu khách hàng chưa ghé trong 60 ngày qua...</div>
            </div>
            <div class="msg-text">Chào anh Danny! Em đã lọc được 18 khách hàng VIP nhóm NYC 60 có tổng chi tiêu trên 1 triệu đồng cần gọi chăm sóc dặm mi trong tuần này.</div>
            <div class="action-row">
              <button class="action-btn">🎯 Lọc 18 khách VIP NYC 60</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick prompts -->
      <div class="prompts-bar">
        <div class="prompt-chip">✨ Giải thích nhóm khách (Buckets)</div>
        <div class="prompt-chip">✨ Lọc khách NYC 60 chi tiêu > 1tr</div>
        <div class="prompt-chip">✨ Tư vấn quy trình CSKH dặm mi</div>
      </div>

      <!-- Composer -->
      <div class="composer">
        <input class="input-box" placeholder="Hỏi MAI về khách hàng, doanh thu..." value="" />
        <button class="send-btn">▲</button>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  await page.screenshot({ path: '/tmp/playwright-mos-chat-mobile-ai.png' });
  console.log('Playwright visual QA PASSED: Screenshot captured at /tmp/playwright-mos-chat-mobile-ai.png');
} catch (err) {
  console.error('Playwright error:', err);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  process.exit(0);
}
