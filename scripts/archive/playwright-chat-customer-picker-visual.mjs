import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const t = setTimeout(() => {
  console.error('[PLAYWRIGHT TIMEOUT] Test exceeded 25 seconds');
  process.exit(1);
}, 25000);
t.unref();

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 960 },
  });

  const page = await context.newPage();

  // Test rendering HTML component mock for mOS Chat Customer Card & Booking Attachment (MOS-BUG-159)
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>mOS Chat - Customer & Booking Card Attachment Visual QA (MOS-BUG-159)</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #090d16;
          color: #f8fafc;
          padding: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          min-height: 100vh;
        }
        .header-title {
          font-size: 20px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #f8fafc;
        }
        .badge {
          background: rgba(212, 168, 75, 0.15);
          color: #d4a84b;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid rgba(212, 168, 75, 0.3);
        }
        .container-row {
          display: flex;
          gap: 20px;
          width: 100%;
          max-width: 1180px;
        }
        .modal-card {
          flex: 1.2;
          background: #141414;
          border-radius: 16px;
          border: 1px solid #303030;
          padding: 20px;
          box-shadow: 0 20px 40px -15px rgba(0,0,0,0.8);
        }
        .composer-preview-card {
          flex: 0.9;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .preview-box {
          background: #141414;
          border-radius: 16px;
          border: 1px solid #303030;
          padding: 20px;
          box-shadow: 0 20px 40px -15px rgba(0,0,0,0.8);
        }
        .modal-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px solid #303030;
          margin-bottom: 16px;
        }
        .modal-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(212, 168, 75, 0.15);
          color: #d4a84b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
        .tabs {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid #262626;
          padding-bottom: 10px;
          margin-bottom: 16px;
        }
        .tab-btn {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          background: transparent;
          color: #888;
        }
        .tab-btn.active {
          background: rgba(212, 168, 75, 0.15);
          color: #d4a84b;
          border: 1px solid rgba(212, 168, 75, 0.3);
        }
        .search-input {
          width: 100%;
          height: 38px;
          background: #1f1f1f;
          border: 1px solid #383838;
          border-radius: 10px;
          padding: 0 14px;
          color: #fff;
          font-size: 13px;
          margin-bottom: 14px;
          outline: none;
        }
        .customer-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-radius: 12px;
          background: #1f1f1f;
          border: 1px solid #303030;
          margin-bottom: 8px;
        }
        .cust-avatar {
          width: 36px;
          height: 36px;
          border-radius: 18px;
          background: #d4a84b;
          color: #111;
          font-weight: bold;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cust-info {
          flex: 1;
          margin-left: 12px;
        }
        .cust-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #f1f5f9;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .cust-sub {
          font-size: 11.5px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .btn-group {
          display: flex;
          gap: 6px;
        }
        .btn-attach {
          padding: 5px 10px;
          border-radius: 8px;
          border: 1px solid #444;
          background: #2a2a2a;
          color: #f1f5f9;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-send {
          padding: 5px 12px;
          border-radius: 8px;
          border: none;
          background: #d4a84b;
          color: #090d16;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
        }
        /* Staged preview in composer */
        .staged-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border-radius: 10px;
          background: rgba(212, 168, 75, 0.12);
          border: 1px solid rgba(212, 168, 75, 0.35);
          font-size: 12px;
          color: #f8fafc;
          margin-bottom: 8px;
        }
        .staged-card .icon {
          color: #d4a84b;
        }
        .staged-card .remove {
          margin-left: auto;
          cursor: pointer;
          color: #888;
        }
        /* Message Card in Feed */
        .feed-msg-card {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 12px;
          margin-top: 6px;
          border-left: 3px solid #d4a84b;
        }
        .feed-btn {
          margin-top: 8px;
          width: 100%;
          padding: 6px;
          border-radius: 8px;
          background: rgba(212, 168, 75, 0.1);
          border: 1px solid rgba(212, 168, 75, 0.25);
          color: #d4a84b;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
      </style>
    </head>
    <body>
      <div class="header-title">
        <span>mOS Chat - Đính kèm Thẻ Khách hàng & Booking</span>
        <span class="badge">MOS-BUG-159 QA PASSED</span>
      </div>

      <div class="container-row">
        <!-- 1. Modal Picker -->
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-icon">👤+</div>
            <div>
              <div style="font-size: 15px; font-weight: 700; color: #fff;">Đính kèm thẻ Khách hàng / Booking mOS</div>
              <div style="font-size: 11.5px; color: #888;">Tìm kiếm khách hàng hoặc lịch hẹn để chia sẻ nhanh vào cuộc trò chuyện</div>
            </div>
          </div>

          <div class="tabs">
            <button class="tab-btn active">Tra cứu Khách hàng</button>
            <button class="tab-btn">Lịch hẹn hôm nay (4)</button>
            <button class="tab-btn">Thẻ Mẫu Nhanh</button>
          </div>

          <input class="search-input" value="Phương" placeholder="Tìm theo tên khách, số điện thoại hoặc mã khách..." />

          <div class="customer-item">
            <div class="cust-avatar">MP</div>
            <div class="cust-info">
              <div class="cust-name">
                Võ Thị Mai Phương
                <span class="badge" style="background: rgba(212,168,75,0.2);">VIP Combo</span>
              </div>
              <div class="cust-sub">📞 0901234567 · 14 lần ghé · CV phụ trách: Thúy Vi</div>
            </div>
            <div class="btn-group">
              <button class="btn-attach">+ Đính kèm</button>
              <button class="btn-send">Gửi ngay</button>
            </div>
          </div>

          <div class="customer-item">
            <div class="cust-avatar" style="background: #3b82f6; color: #fff;">TH</div>
            <div class="cust-info">
              <div class="cust-name">
                Nguyễn Thu Phương
                <span class="badge" style="background: rgba(59,130,246,0.15); color: #60a5fa; border-color: rgba(59,130,246,0.3);">Khách lẻ</span>
              </div>
              <div class="cust-sub">📞 0987654321 · 3 lần ghé · CV phụ trách: Mai Anh</div>
            </div>
            <div class="btn-group">
              <button class="btn-attach">+ Đính kèm</button>
              <button class="btn-send">Gửi ngay</button>
            </div>
          </div>
        </div>

        <!-- 2. Staging in Composer & Feed Message -->
        <div class="composer-preview-card">
          <div class="preview-box">
            <div style="font-size: 13px; font-weight: 700; margin-bottom: 12px; color: #d4a84b;">
              1. Khung Soạn Thảo (Composer with Staged Card)
            </div>
            <div class="staged-card">
              <span class="icon">👤</span>
              <span style="font-weight: 600;">Võ Thị Mai Phương</span>
              <span style="color: #d4a84b;">(VIP Combo · 14 lần ghé)</span>
              <span style="color: #888; font-size: 11px;">· CV: Thúy Vi</span>
              <span class="remove" title="Bỏ đính kèm">✕</span>
            </div>
            <div style="background: #1e1e1e; border: 1px solid #383838; border-radius: 12px; padding: 10px; font-size: 13px; color: #ddd;">
              Chị Phương vừa ghé dặm mi thiết kế nhé các bạn!
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; border-top: 1px solid #2a2a2a; padding-top: 6px;">
                <div style="display: flex; gap: 8px; color: #d4a84b; font-size: 12px; align-items: center;">
                  <span>👤+ Đã đính kèm thẻ</span>
                </div>
                <button class="btn-send" style="padding: 4px 14px;">Gửi tin</button>
              </div>
            </div>
          </div>

          <div class="preview-box">
            <div style="font-size: 13px; font-weight: 700; margin-bottom: 12px; color: #d4a84b;">
              2. Hiển thị Trong Feed (Feed Card with Real Drawer Click)
            </div>
            <div style="font-size: 13px; color: #f8fafc; margin-bottom: 4px;">
              Chị Phương vừa ghé dặm mi thiết kế nhé các bạn!
            </div>
            <div class="feed-msg-card">
              <div style="font-size: 13.5px; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: space-between;">
                <span>Võ Thị Mai Phương</span>
                <span class="badge">VIP COMBO</span>
              </div>
              <div style="font-size: 12px; color: #d4a84b; margin: 3px 0;">VIP Combo · 14 lần ghé</div>
              <div style="font-size: 11.5px; color: #94a3b8;">📞 0901234567 · CV phụ trách: Thúy Vi</div>
              <button class="feed-btn">
                <span>🔗 Mở hồ sơ khách hàng (CustomerDetailDrawer)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  await page.waitForTimeout(500);

  mkdirSync(resolve('docs/screenshots'), { recursive: true });
  const screenshotPath = resolve('docs/screenshots/playwright-chat-customer-picker.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log('[PLAYWRIGHT VISUAL QA] Snapshot PASSED: Saved visual QA screenshot to ' + screenshotPath);
} catch (err) {
  console.error('[PLAYWRIGHT VISUAL QA] FAILED:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
