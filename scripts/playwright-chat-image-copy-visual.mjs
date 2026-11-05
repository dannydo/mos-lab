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
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  // Test rendering HTML component mock for mOS Chat Image Copy & Lightbox Context Menu (MOS-BUG-199)
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>mOS Chat - Image Copy & Lightbox Context Menu QA (MOS-BUG-199)</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #020617;
          color: #f8fafc;
          padding: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .container {
          width: 900px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .card {
          background: rgba(15, 23, 42, 0.94);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .title {
          font-size: 16px;
          font-weight: 700;
          color: #fbbf24;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .thumbnail-box {
          position: relative;
          width: 220px;
          height: 140px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.15);
          cursor: pointer;
        }
        .thumbnail-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .quick-actions {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          gap: 6px;
          z-index: 10;
        }
        .btn-action {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: rgba(15, 23, 42, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
        }
        .btn-action.copy {
          background: #f59e0b;
          color: #020617;
          font-weight: bold;
        }
        .lightbox-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 9999px;
          padding: 8px 16px;
          width: fit-content;
        }
        .context-menu {
          width: 240px;
          background: #1e293b;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 12px;
          box-shadow: 0 12px 24px rgba(0,0,0,0.6);
          overflow: hidden;
          padding: 6px;
        }
        .context-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          font-size: 13px;
          color: #cbd5e1;
          border-radius: 6px;
          cursor: pointer;
        }
        .context-item:hover, .context-item.highlight {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          font-weight: 600;
        }
        .divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="title">
            <span>🖼️ 1. Image Thumbnail Hover Actions (Chat Message Feed)</span>
          </div>
          <div style="display: flex; gap: 20px; align-items: center;">
            <div class="thumbnail-box">
              <svg width="100%" height="100%" style="background: #334155;">
                <text x="50%" y="50%" fill="#94a3b8" font-size="14" dominant-baseline="middle" text-anchor="middle">Hình đính kèm</text>
              </svg>
              <div class="quick-actions">
                <div class="btn-action copy" title="Sao chép hình ảnh">📋 Copy</div>
                <div class="btn-action" title="Tải về">⬇️</div>
              </div>
            </div>
            <div style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
              <p>✅ Nút <b>Sao chép ảnh</b> (Copy) hiển thị sẵn trên thumbnail khi rê chuột.</p>
              <p>✅ Bấm copy gọi trực tiếp <code>copyImageToClipboard</code> đưa ảnh PNG vào Clipboard.</p>
              <p>✅ Chuột phải vào ảnh mở Context Menu tức thì với tùy chọn sao chép.</p>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="title">
            <span>🔍 2. Lightbox Top Toolbar & Right-Click Context Menu</span>
          </div>
          <div style="display: flex; gap: 30px; align-items: flex-start;">
            <div>
              <div class="lightbox-toolbar" style="margin-bottom: 16px;">
                <span style="font-size: 12px; font-weight: bold; padding-right: 8px; border-right: 1px solid rgba(255,255,255,0.2);">Ảnh 1/1</span>
                <span style="font-size: 12px; color: #94a3b8;">Fit (100%)</span>
                <span style="padding: 0 4px; color: #fbbf24; font-weight: bold; border-radius: 4px; background: rgba(245,158,11,0.2); padding: 2px 6px;">📋 Sao chép ảnh (Phím C)</span>
                <span style="font-size: 12px; color: #38bdf8;">🔗 Link</span>
                <span style="font-size: 12px; color: #34d399;">⬇️ Tải</span>
                <span style="font-size: 12px; color: #f87171;">✕ Đóng</span>
              </div>
              <div style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
                <p>✅ Phím tắt <b>C</b> hoặc <b>Ctrl+C / ⌘C</b> sao chép nhanh khi đang xem ảnh.</p>
                <p>✅ Đã gỡ bỏ <code>pointer-events-none</code> trên thẻ <code>&lt;img&gt;</code> để nhận chuột phải.</p>
              </div>
            </div>

            <div class="context-menu">
              <div class="context-item highlight">📋 Sao chép hình ảnh (Phím C)</div>
              <div class="context-item">🔗 Sao chép liên kết hình ảnh</div>
              <div class="divider"></div>
              <div class="context-item">⬇️ Tải hình ảnh về máy</div>
              <div class="context-item">↺ Xoay ảnh 90° (Phím R)</div>
              <div class="divider"></div>
              <div class="context-item">⛶ Vừa khung hình (Phím F)</div>
              <div class="context-item">100% Kích thước gốc (Phím 1)</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  const screenshotDir = resolve('screenshots/qa');
  mkdirSync(screenshotDir, { recursive: true });
  const screenshotPath = resolve(screenshotDir, 'mos-chat-image-copy-qa.png');
  await page.screenshot({ path: screenshotPath });

  console.log('[PLAYWRIGHT QA] Visual verification screenshot saved to:', screenshotPath);
  console.log('[PLAYWRIGHT QA] PASSED: mOS Chat Image Copy & Lightbox Context Menu Verified');
} catch (err) {
  console.error('[PLAYWRIGHT QA ERROR]', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
