import { chromium } from 'playwright';

const t = setTimeout(() => {
  console.error('Playwright visual test timed out');
  process.exit(1);
}, 25000);
t.unref();

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Test rendering HTML component mock for Space Emoji and Google Chat Palette
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>mOS Chat - Space Config & Emoji Visual QA</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #fff; padding: 40px; display: flex; flex-direction: column; align-items: center; }
        .card { background: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 24px; width: 440px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .avatar-wrap { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
        .avatar { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .colors { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
        .swatch { width: 28px; height: 28px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; }
        .swatch.selected { border-color: #fff; transform: scale(1.1); }
        .title { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
        .subtitle { font-size: 13px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="avatar-wrap">
          <div class="avatar" style="background-color: #0d9488;">🚀</div>
          <div>
            <div class="title">Dự án Wings 2026</div>
            <div class="subtitle">Không gian trao đổi nghiệp vụ & phát triển sản phẩm</div>
          </div>
        </div>
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 6px;">Bảng màu đại diện Space:</div>
        <div class="colors">
          <div class="swatch" style="background: #0d9488; border-color: #fff;"></div>
          <div class="swatch" style="background: #2563eb;"></div>
          <div class="swatch" style="background: #7c3aed;"></div>
          <div class="swatch" style="background: #db2777;"></div>
          <div class="swatch" style="background: #ea580c;"></div>
          <div class="swatch" style="background: #16a34a;"></div>
          <div class="swatch" style="background: #475569;"></div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  await page.screenshot({ path: '/tmp/playwright-space-config-visual.png' });
  console.log('Playwright visual screenshot captured at /tmp/playwright-space-config-visual.png');
} catch (err) {
  console.error('Playwright error:', err);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  process.exit(0);
}
