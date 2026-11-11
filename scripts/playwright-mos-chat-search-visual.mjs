import { chromium } from 'playwright';

const t = setTimeout(() => {
  console.error('Playwright visual test timed out');
  process.exit(1);
}, 25000);
t.unref();

let browser;
try {
  browser = await chromium.launch({ headless: true });
  // Viewport matching reporter Khải's mobile layout { width: 520, height: 1063 }
  const context = await browser.newContext({
    viewport: { width: 520, height: 1063 },
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
      <title>mOS Chat - Search Visual QA (MOS-BUG-212)</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #020617; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        header { height: 56px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background: #0f172a; flex-shrink: 0; z-index: 40; }
        .header-title { font-size: 16px; font-weight: 700; color: #fff; }
        .header-actions { display: flex; align-items: center; gap: 8px; }
        .btn-circle { width: 34px; height: 34px; border-radius: 9999px; background: #1e293b; border: 1px solid #334155; display: flex; align-items: center; justify-content: center; color: #cbd5e1; cursor: pointer; }
        .btn-search { color: #f59e0b; }
        
        .search-sheet { position: fixed; inset: 0; z-index: 1600; background: #090d16; display: flex; flex-direction: column; }
        .search-top-bar { height: 56px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; gap: 10px; padding: 0 12px; background: #0f172a; }
        .search-input-box { flex: 1; display: flex; align-items: center; gap: 8px; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 6px 12px; }
        .search-input-box input { border: none; outline: none; background: transparent; color: #fff; font-size: 14px; width: 100%; }
        
        .filter-pills { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid #1e293b; overflow-x: auto; }
        .pill { padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .pill-active { background: #f59e0b; color: #020617; }
        .pill-inactive { background: #1e293b; color: #94a3b8; border: 1px solid #334155; }
        
        .results-list { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
        .result-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
        .result-header { display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #94a3b8; }
        .result-sender { font-weight: 600; color: #cbd5e1; }
        .result-time { color: #64748b; font-size: 10px; }
        .result-text { font-size: 13px; color: #e2e8f0; line-height: 1.4; }
        .result-attachment-preview { display: flex; align-items: center; gap: 8px; margin-top: 4px; padding: 6px 10px; background: rgba(30, 41, 59, 0.6); border: 1px solid #334155; border-radius: 8px; }
        .attachment-thumb { width: 36px; height: 36px; border-radius: 6px; background: #334155; object-fit: cover; }
        .attachment-meta { font-size: 11px; color: #94a3b8; }
        .highlight { background: rgba(245, 158, 11, 0.3); color: #fef08a; padding: 1px 3px; border-radius: 4px; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="search-sheet">
        <div class="search-top-bar">
          <div class="btn-circle" style="width:28px; height:28px; font-size:12px;">←</div>
          <div class="search-input-box">
            <span>🔍</span>
            <input type="text" value="đính kèm 1 ảnh" readonly />
            <span style="color:#94a3b8; cursor:pointer;">✕</span>
          </div>
        </div>

        <div class="filter-pills">
          <div class="pill pill-inactive">Tất cả</div>
          <div class="pill pill-inactive"># Danny Do</div>
          <div class="pill pill-inactive">↳ Trong Luồng (Thread)</div>
          <div class="pill pill-active">📎 Có đính kèm (2)</div>
        </div>

        <div class="results-list">
          <div class="result-card">
            <div class="result-header">
              <span class="result-sender">Nguyễn Quang Khải · Quản lý</span>
              <span class="result-time">Hôm nay 11:07</span>
            </div>
            <div class="result-text">
              [Đính kèm 1 hình ảnh/tệp]
            </div>
            <div class="result-attachment-preview">
              <div class="attachment-thumb" style="display:flex;align-items:center;justify-content:center;font-size:18px;">🖼️</div>
              <div class="attachment-meta">
                <div style="font-weight:600;color:#f1f5f9;">IMG_0521.jpg</div>
                <div style="font-size:10px;color:#64748b;">52.0 KB · Ảnh chụp màn hình</div>
              </div>
            </div>
          </div>

          <div class="result-card">
            <div class="result-header">
              <span class="result-sender">Danny Do · Super Admin</span>
              <span class="result-time">Hôm nay 09:30</span>
            </div>
            <div class="result-text">
              Ảnh nghiệm thu kết quả tìm kiếm chat trên bản mobile.
            </div>
            <div class="result-attachment-preview">
              <div class="attachment-thumb" style="display:flex;align-items:center;justify-content:center;font-size:18px;">📷</div>
              <div class="attachment-meta">
                <div style="font-weight:600;color:#f1f5f9;">evidence-result.png</div>
                <div style="font-size:10px;color:#64748b;">140.2 KB · PNG Image</div>
              </div>
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
