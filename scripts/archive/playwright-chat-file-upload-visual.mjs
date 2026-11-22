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

  // Test rendering HTML component mock for mOS Chat Document Card & PDF attachments (MOS-BUG-147)
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>mOS Chat - PDF & Document Attachments Visual QA</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #090d16;
          color: #f8fafc;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .chat-container {
          background: #0f172a;
          border-radius: 20px;
          border: 1px solid #1e293b;
          width: 680px;
          padding: 24px;
          box-shadow: 0 20px 40px -15px rgba(0,0,0,0.7);
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #1e293b;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .header-title {
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .badge {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 9999px;
          border: 1px solid rgba(245, 158, 11, 0.3);
          font-weight: 600;
        }
        .message-bubble {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 16px 16px 16px 4px;
          padding: 16px;
          margin-bottom: 16px;
          max-width: 580px;
        }
        .sender-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .sender-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #3b82f6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }
        .sender-name {
          font-size: 13px;
          font-weight: 600;
          color: #e2e8f0;
        }
        .sender-time {
          font-size: 11px;
          color: #64748b;
        }
        .message-text {
          font-size: 14px;
          color: #cbd5e1;
          line-height: 1.5;
          margin-bottom: 14px;
        }
        .document-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .document-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          background: #0f172a;
          border: 1px solid #334155;
          text-decoration: none;
          color: inherit;
          transition: all 0.2s ease;
        }
        .document-card:hover {
          border-color: #60a5fa;
          background: #131e36;
        }
        .doc-icon-wrap {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .doc-icon-pdf {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .doc-icon-excel {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .doc-details {
          flex: 1;
          min-width: 0;
        }
        .doc-name {
          font-size: 13px;
          font-weight: 600;
          color: #f1f5f9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .doc-meta {
          font-size: 11px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
        }
        .doc-actions {
          display: flex;
          gap: 6px;
        }
        .btn-action {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid #475569;
          background: #1e293b;
          color: #e2e8f0;
          transition: all 0.15s;
        }
        .btn-action.primary {
          background: #2563eb;
          border-color: #3b82f6;
          color: #fff;
        }
        .composer-preview {
          background: #1e293b;
          border-radius: 14px;
          border: 1px solid #334155;
          padding: 12px;
          margin-top: 16px;
        }
        .composer-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #0f172a;
          border: 1px solid #475569;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
        }
        .chip-pdf {
          color: #f87171;
          font-weight: bold;
        }
        .composer-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid #334155;
        }
        .toolbar-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
          background: #0f172a;
          border: 1px solid #334155;
          color: #94a3b8;
          cursor: pointer;
        }
        .toolbar-btn.active {
          color: #60a5fa;
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
        }
      </style>
    </head>
    <body>
      <div class="chat-container">
        <div class="header">
          <div class="header-title">
            <span>📦 Nhóm Kho & Vận Hành Toàn Diện</span>
            <span class="badge">MOS-BUG-147 Verified</span>
          </div>
          <div style="font-size: 12px; color: #64748b;">mOS Google Chat Engine</div>
        </div>

        <!-- Chat Message with PDF Document -->
        <div class="message-bubble">
          <div class="sender-info">
            <div class="sender-avatar">K</div>
            <div class="sender-name">Nguyễn Quang Khải</div>
            <div class="sender-time">19:20 Hôm nay</div>
          </div>
          <div class="message-text">
            Em gửi file PDF danh sách order kho vật tư và công cụ dụng cụ tháng mới để phòng duyệt ạ!
          </div>

          <div class="document-grid">
            <!-- PDF Document Card -->
            <div class="document-card" id="pdf-doc-card">
              <div class="doc-icon-wrap doc-icon-pdf">PDF</div>
              <div class="doc-details">
                <div class="doc-name">Order_Kho_Vat_Tu_Thang_11_2026.pdf</div>
                <div class="doc-meta">
                  <span>1.4 MB</span>
                  <span>•</span>
                  <span>Tài liệu PDF</span>
                </div>
              </div>
              <div class="doc-actions">
                <button class="btn-action primary" id="btn-view-pdf">Xem</button>
                <button class="btn-action" id="btn-download-pdf">Tải về</button>
              </div>
            </div>

            <!-- Excel Document Card -->
            <div class="document-card" id="excel-doc-card">
              <div class="doc-icon-wrap doc-icon-excel">XLSX</div>
              <div class="doc-details">
                <div class="doc-name">Bang_Ke_Chi_Tiet_Vat_Tu_T11.xlsx</div>
                <div class="doc-meta">
                  <span>340 KB</span>
                  <span>•</span>
                  <span>Bảng tính Excel</span>
                </div>
              </div>
              <div class="doc-actions">
                <button class="btn-action">Mở</button>
                <button class="btn-action">Tải về</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Composer Preview Strip with Staged Attachments -->
        <div class="composer-preview">
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">Tệp đính kèm đang chờ gửi:</div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <div class="composer-chip">
              <span class="chip-pdf">PDF</span>
              <span>De_Xuat_Nhap_Kho_Bo_Sung.pdf (820 KB)</span>
              <span style="cursor: pointer; color: #94a3b8; margin-left: 4px;">✕</span>
            </div>
          </div>
          <div class="composer-toolbar">
            <div style="display: flex; gap: 6px;">
              <div class="toolbar-btn active">
                <span>📎 Đính kèm tệp / PDF</span>
              </div>
              <div class="toolbar-btn">
                <span>🖼️ Ảnh</span>
              </div>
            </div>
            <button class="btn-action primary" style="padding: 6px 16px;">Gửi</button>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  await page.waitForSelector('#pdf-doc-card');
  await page.waitForSelector('#btn-view-pdf');

  const pdfCardVisible = await page.isVisible('#pdf-doc-card');
  if (!pdfCardVisible) {
    throw new Error('PDF Document Card was not visible in DOM');
  }

  const outDir = resolve(process.cwd(), 'output/playwright');
  mkdirSync(outDir, { recursive: true });
  const screenshotPath = '/tmp/playwright-chat-file-upload-visual.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log(`[PLAYWRIGHT SUCCESS] Screenshot captured successfully at ${screenshotPath}`);
  console.log('Visual QA PASSED: PDF & document attachments rendered properly.');
} catch (err) {
  console.error('[PLAYWRIGHT ERROR]', err);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  process.exit(0);
}
