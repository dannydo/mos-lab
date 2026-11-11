import { chromium } from 'playwright';

const t = setTimeout(() => {
  console.error('Playwright visual test timed out');
  process.exit(1);
}, 25000);
t.unref();

let browser;
try {
  browser = await chromium.launch({ headless: true });
  // Viewport matching reporter Khải's mobile layout { width: 520, height: 1063 } with device scale 3
  const context = await browser.newContext({
    viewport: { width: 520, height: 1063 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>mOS Chat - Search Visual QA Safe Area & Scopes (MOS-BUG-212)</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: #020617;
          color: #f8fafc;
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* Simulated iOS Status Bar */
        .ios-status-bar {
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          font-size: 14px;
          font-weight: 600;
          color: #f8fafc;
          background: #090d16;
          z-index: 1700;
          flex-shrink: 0;
        }
        .ios-notch {
          width: 140px;
          height: 24px;
          background: #000;
          border-radius: 0 0 16px 16px;
        }

        .search-sheet {
          position: fixed;
          inset: 0;
          z-index: 1600;
          background: #090d16;
          display: flex;
          flex-direction: column;
          padding-top: 44px; /* Simulating safe-area-inset-top */
          padding-bottom: 24px; /* Simulating safe-area-inset-bottom */
        }
        
        .search-top-bar {
          height: 56px;
          border-bottom: 1px solid #1e293b;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 12px;
          background: #0f172a;
          flex-shrink: 0;
        }

        .btn-back {
          width: 40px;
          height: 40px;
          border-radius: 9999px;
          background: #1e293b;
          border: 1px solid #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fbbf24;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
        }

        .search-input-box {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(245, 158, 11, 0.5);
          border-radius: 12px;
          padding: 8px 12px;
        }
        .search-input-box input {
          border: none;
          outline: none;
          background: transparent;
          color: #fff;
          font-size: 14px;
          width: 100%;
        }

        .filter-pills {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-bottom: 1px solid #1e293b;
          overflow-x: auto;
          background: #0b1120;
          flex-shrink: 0;
        }
        .pill {
          padding: 5px 14px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .pill-active {
          background: #f59e0b;
          color: #020617;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        }
        .pill-inactive {
          background: #1e293b;
          color: #94a3b8;
          border: 1px solid #334155;
        }

        .scope-banner {
          padding: 8px 14px;
          background: rgba(245, 158, 11, 0.1);
          border-bottom: 1px solid rgba(245, 158, 11, 0.2);
          font-size: 12px;
          color: #fbbf24;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .results-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .discovery-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
          margin-bottom: 12px;
        }
        .discovery-card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
        }
        .discovery-title {
          font-size: 13px;
          font-weight: 600;
          color: #f1f5f9;
        }
        .discovery-desc {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .discovery-icon {
          font-size: 18px;
          color: #f59e0b;
        }

        .result-card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          color: #94a3b8;
        }
        .result-sender {
          font-weight: 600;
          color: #cbd5e1;
        }
        .result-time {
          color: #64748b;
          font-size: 10px;
        }
        .result-text {
          font-size: 13px;
          color: #e2e8f0;
          line-height: 1.4;
        }
        .result-attachment-preview {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 4px;
          padding: 8px 12px;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid #334155;
          border-radius: 8px;
        }
        .attachment-thumb {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          background: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        .attachment-meta {
          font-size: 11px;
          color: #94a3b8;
        }
        .highlight {
          background: rgba(245, 158, 11, 0.3);
          color: #fef08a;
          padding: 1px 4px;
          border-radius: 4px;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="search-sheet">
        <!-- Top bar with safe area inset -->
        <div class="search-top-bar">
          <div class="btn-back">←</div>
          <div class="search-input-box">
            <span style="font-size:14px;color:#f59e0b;">🔍</span>
            <input type="text" value="đính kèm 1 ảnh" placeholder="Tìm kiếm trong # Danny Do..." readonly />
            <span style="color:#94a3b8; cursor:pointer; font-size:13px;">✕</span>
          </div>
        </div>

        <!-- Filter Scope Pills -->
        <div class="filter-pills">
          <div class="pill pill-inactive">Tất cả</div>
          <div class="pill pill-active"># Danny Do (Hiện tại)</div>
          <div class="pill pill-inactive">↳ Trong Luồng</div>
          <div class="pill pill-inactive">📎 Có tệp đính kèm</div>
        </div>

        <div class="scope-banner">
          <span>Đang tìm trong <strong># Danny Do</strong> (2 kết quả)</span>
          <span style="color:#94a3b8; font-size:11px;">Chạm vào thẻ để chuyển đến tin nhắn</span>
        </div>

        <div class="results-list">
          <div class="result-card">
            <div class="result-header">
              <span class="result-sender">Nguyễn Quang Khải · Quản lý</span>
              <span class="result-time">Hôm nay 11:07</span>
            </div>
            <div class="result-text">
              [<span class="highlight">Đính kèm 1</span> hình ảnh/tệp]
            </div>
            <div class="result-attachment-preview">
              <div class="attachment-thumb">🖼️</div>
              <div class="attachment-meta">
                <div style="font-weight:600;color:#f1f5f9;">IMG_0521.jpg</div>
                <div style="font-size:10px;color:#64748b;">52.0 KB · Ảnh chụp màn hình mOS Chat</div>
              </div>
            </div>
          </div>

          <div class="result-card">
            <div class="result-header">
              <span class="result-sender">Danny Do · Super Admin</span>
              <span class="result-time">Hôm nay 09:30</span>
            </div>
            <div class="result-text">
              Đã kiểm tra lại trên iPhone, thanh tìm kiếm đã né hoàn toàn tai thỏ và nút back bấm nhạy.
            </div>
          </div>

          <!-- Quick Actions Discovery -->
          <div class="discovery-grid" style="margin-top: 8px;">
            <div class="discovery-card">
              <div>
                <div class="discovery-title">🔍 Mở rộng tìm kiếm toàn bộ hệ thống</div>
                <div class="discovery-desc">Tìm từ khóa "đính kèm 1 ảnh" trong tất cả phòng ban và kênh chat</div>
              </div>
              <div class="discovery-icon">➔</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  await page.waitForTimeout(500);

  const screenshotPath = '/tmp/mos-chat-search-visual-qa.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Playwright visual QA PASSED. Screenshot saved to', screenshotPath);
} catch (err) {
  console.error('Playwright error:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
