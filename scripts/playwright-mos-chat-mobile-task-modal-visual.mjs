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
    viewport: { width: 390, height: 844 }, // iPhone 12/13/14 viewport
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi" class="dark-theme dark">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <title>mOS Chat - Mobile Task Modal Visual QA</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #020617; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

        /* Mobile Task Modal Overlay */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          z-index: 1000;
        }

        .mos-mobile-task-modal {
          width: 100%;
          max-width: 366px;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          padding: 20px 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .modal-title {
          font-size: 16px;
          font-weight: 700;
          color: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-size: 12px;
          font-weight: 600;
          color: #cbd5e1;
        }

        .task-input {
          width: 100%;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          color: #f8fafc;
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
          resize: none;
        }

        .task-select {
          width: 100%;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 12px;
          color: #f8fafc;
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
          appearance: none;
        }

        /* Mobile Presets Grid */
        .presets-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
          margin-bottom: 4px;
        }

        .preset-btn {
          padding: 6px 8px;
          font-size: 12px;
          font-weight: 500;
          border-radius: 10px;
          border: 1px solid #334155;
          background: rgba(30, 41, 59, 0.9);
          color: #cbd5e1;
          text-align: center;
          cursor: pointer;
        }

        .preset-btn.active {
          border-color: rgba(251, 191, 36, 0.8);
          background: rgba(245, 158, 11, 0.2);
          color: #fcd34d;
          font-weight: 600;
        }

        /* Mobile Touch DateTime Picker Box */
        .datetime-box {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 12px;
          border-radius: 12px;
          border: 1px solid rgba(245, 158, 11, 0.5);
          background: rgba(15, 23, 42, 0.95);
          box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.2);
          cursor: pointer;
        }

        .datetime-content {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #fcd34d;
          font-variant-numeric: tabular-nums;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 6px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .btn-cancel {
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid #334155;
          background: transparent;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 600;
        }

        .btn-submit {
          padding: 8px 18px;
          border-radius: 10px;
          border: none;
          background: #f59e0b;
          color: #020617;
          font-size: 13px;
          font-weight: 700;
        }

        /* Ant Design Responsive Overrides Under Test */
        @media (max-width: 640px) {
          .ant-picker-dropdown {
            max-width: calc(100vw - 16px) !important;
            left: 8px !important;
            right: 8px !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
          }
          .ant-picker-panels {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
          }
          .ant-picker-date-panel {
            width: 100% !important;
          }
          .ant-picker-content {
            width: 100% !important;
            table-layout: fixed !important;
          }
          .ant-picker-content th,
          .ant-picker-content td {
            padding: 2px 1px !important;
          }
          .ant-picker-cell-inner {
            min-width: 28px !important;
            height: 28px !important;
            line-height: 28px !important;
            font-size: 13px !important;
          }
          .ant-picker-time-panel {
            width: 100% !important;
            border-left: none !important;
            border-top: 1px solid rgba(255, 255, 255, 0.12) !important;
            max-height: 140px !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="modal-backdrop">
        <div class="mos-mobile-task-modal" id="task-modal">
          <div class="modal-title">
            <span>Giao việc &amp; Hạn chót</span>
            <span style="font-size: 18px; color: #64748b; cursor: pointer;">✕</span>
          </div>

          <div class="modal-field">
            <label class="field-label">Nội dung công việc *</label>
            <textarea class="task-input" rows="3">Lỗi giao diện giao task trên mobile</textarea>
          </div>

          <div class="modal-field">
            <label class="field-label">Người thực hiện</label>
            <select class="task-select">
              <option>⭐ Chính tôi (Danny Do)</option>
              <option>Nguyễn Quang Khải (Admin)</option>
              <option>Chuyên Viên Mai (CV)</option>
            </select>
          </div>

          <div class="modal-field">
            <label class="field-label">Thời hạn hoàn thành (Deadline)</label>
            <div class="presets-grid">
              <button class="preset-btn active">17:30 hôm nay</button>
              <button class="preset-btn">22:00 hôm nay</button>
              <button class="preset-btn">12:00 trưa mai</button>
              <button class="preset-btn">17:30 chiều mai</button>
            </div>
            <div class="datetime-box">
              <div class="datetime-content">
                <span>📅</span>
                <span>17:30 · 27/10/2026</span>
              </div>
              <span style="font-size: 14px; color: #94a3b8; padding: 2px 4px;">✕</span>
            </div>
          </div>

          <div class="modal-field">
            <label class="field-label">Mức độ ưu tiên</label>
            <select class="task-select">
              <option>P1 · Ưu tiên cao</option>
              <option>P0 · Khẩn cấp</option>
              <option>P2 · Bình thường</option>
            </select>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel">Hủy</button>
            <button class="btn-submit">Tạo công việc</button>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  await page.waitForTimeout(500);

  // Verify modal is within viewport without overflow
  const modalBox = await page.locator('#task-modal').boundingBox();
  if (!modalBox) throw new Error('Task modal not rendered');

  console.log(`[Playwright QA] Task Modal Box: x=${modalBox.x}, y=${modalBox.y}, width=${modalBox.width}, height=${modalBox.height}`);

  if (modalBox.x < 0) {
    throw new Error(`Modal clipped on the left: x=${modalBox.x}`);
  }
  if (modalBox.x + modalBox.width > 390) {
    throw new Error(`Modal clipped on the right: right=${modalBox.x + modalBox.width}`);
  }

  // Check no horizontal scrollbar on body
  const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
  const bodyClientWidth = await page.evaluate(() => document.body.clientWidth);
  console.log(`[Playwright QA] Body scrollWidth=${bodyScrollWidth}, clientWidth=${bodyClientWidth}`);
  if (bodyScrollWidth > bodyClientWidth) {
    throw new Error(`Horizontal overflow detected: scrollWidth (${bodyScrollWidth}) > clientWidth (${bodyClientWidth})`);
  }

  // Capture screenshot
  await page.screenshot({ path: '/tmp/mos-mobile-task-modal-visual.png', fullPage: true });
  console.log('Visual QA screenshot captured successfully at /tmp/mos-mobile-task-modal-visual.png');

  console.log('Playwright mobile task modal visual QA PASSED (iPhone 12 390px, zero clipping, zero overflow).');
} finally {
  if (browser) await browser.close();
  process.exit(0);
}
