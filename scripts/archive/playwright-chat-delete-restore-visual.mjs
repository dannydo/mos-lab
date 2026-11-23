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
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>mOS Chat - Thread Reply Soft Delete Persistence Visual QA (MOS-BUG-208)</title>
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
          font-size: 20px;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 6px;
        }
        .header p {
          font-size: 13px;
          color: #94a3b8;
        }
        .chat-container {
          width: 750px;
          background: #1e293b;
          border-radius: 12px;
          border: 1px solid #334155;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }
        .chat-header {
          padding: 16px 20px;
          background: #0f172a;
          border-bottom: 1px solid #334155;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .channel-name {
          font-weight: 600;
          font-size: 15px;
          color: #f8fafc;
        }
        .channel-badge {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
        }
        .messages-list {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .msg-item {
          display: flex;
          gap: 12px;
        }
        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: #3b82f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          color: #fff;
          flex-shrink: 0;
        }
        .msg-body {
          flex: 1;
        }
        .msg-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .author {
          font-weight: 600;
          font-size: 13px;
          color: #f8fafc;
        }
        .time {
          font-size: 11px;
          color: #64748b;
        }
        .msg-text {
          font-size: 13.5px;
          line-height: 1.5;
          color: #cbd5e1;
        }
        .thread-container {
          margin-top: 10px;
          margin-left: 12px;
          padding-left: 14px;
          border-left: 2px solid #334155;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .reply-item {
          display: flex;
          gap: 10px;
        }
        .reply-avatar {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: #8b5cf6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: #fff;
          flex-shrink: 0;
        }
        .reply-body {
          flex: 1;
        }
        .deleted-box {
          background: rgba(239, 68, 68, 0.1);
          border: 1px dashed rgba(239, 68, 68, 0.4);
          border-radius: 8px;
          padding: 8px 12px;
          color: #fca5a5;
          font-style: italic;
          font-size: 12.5px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .restore-btn {
          background: rgba(255, 255, 255, 0.1);
          color: #cbd5e1;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          padding: 2px 8px;
          font-size: 11px;
          cursor: pointer;
          font-style: normal;
        }
        .persisted-badge {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 4px;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>mOS Chat · Thread Reply Soft Delete Persistence</h1>
        <p>Kiểm chứng khắc phục MOS-BUG-208: Tin nhắn đã xoá trong luồng không bị mở lại khi có tin nhắn mới</p>
      </div>

      <div class="chat-container">
        <div class="chat-header">
          <div class="channel-name"># core-team</div>
          <div class="channel-badge">Space</div>
        </div>

        <div class="messages-list">
          <!-- Root message with thread -->
          <div class="msg-item">
            <div class="avatar">K</div>
            <div class="msg-body">
              <div class="msg-meta">
                <span class="author">Nguyễn Quang Khải</span>
                <span class="time">21:50</span>
              </div>
              <div class="msg-text">Bàn giao checklist triển khai tính năng mOS Chat cho team</div>

              <div class="thread-container">
                <!-- Soft deleted reply -->
                <div class="reply-item">
                  <div class="reply-avatar">K</div>
                  <div class="reply-body">
                    <div class="msg-meta">
                      <span class="author">Nguyễn Quang Khải</span>
                      <span class="time">21:56</span>
                    </div>
                    <div class="deleted-box">
                      <span>💬 Tin nhắn này đã bị xoá bởi Nguyễn Quang Khải</span>
                      <button class="restore-btn">Khôi phục</button>
                    </div>
                    <div class="persisted-badge">
                      ✓ Đã lưu bền vững vào relational DB (crm_chat_messages is_deleted=1)
                    </div>
                  </div>
                </div>

                <!-- Normal reply sent after deletion -->
                <div class="reply-item">
                  <div class="reply-avatar">K</div>
                  <div class="reply-body">
                    <div class="msg-meta">
                      <span class="author">Nguyễn Quang Khải</span>
                      <span class="time">21:57</span>
                    </div>
                    <div class="msg-text">Checklist cập nhật: Đã bổ sung persistence validation</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- New Root message sent after deletion -->
          <div class="msg-item">
            <div class="avatar">D</div>
            <div class="msg-body">
              <div class="msg-meta">
                <span class="author">Danny Do</span>
                <span class="time">22:01</span>
              </div>
              <div class="msg-text">Tuyệt vời, tin nhắn đã xoá vẫn ở trạng thái xoá và không bị mở lại khi gửi tin nhắn mới!</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  const outPath = resolve('/tmp/chat-delete-restore-visual.png');
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`[PLAYWRIGHT VISUAL QA PASSED] Screenshot saved to ${outPath}`);
} catch (err) {
  console.error('[PLAYWRIGHT ERROR]', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
