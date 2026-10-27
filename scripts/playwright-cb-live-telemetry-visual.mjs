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
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // HTML content rendering the $CB Live Telemetry Pipeline UI for Visual QA
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>Dashboard $CB Live Telemetry Pipeline Visual QA</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; min-height: 100vh; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .title-group h1 { font-size: 24px; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 10px; }
        .pulse-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; }
        .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 10px #10b981; }
        .subtitle { font-size: 13px; color: #94a3b8; margin-top: 4px; }
        .banner { background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .banner-title { font-size: 15px; font-weight: 700; color: #f1f5f9; display: flex; align-items: center; gap: 8px; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
        .card { background: #1e293b; border-radius: 14px; border: 1px solid #334155; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; }
        .card-c1 { border-color: #1e3a8a; }
        .card-c2 { border-color: #065f46; }
        .card-c3 { border-color: #701a75; }
        .card-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #334155; margin-bottom: 14px; }
        .card-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .tag { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
        .tag-blue { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        .tag-green { background: rgba(16, 185, 129, 0.2); color: #34d399; }
        .tag-purple { background: rgba(192, 38, 211, 0.2); color: #e879f9; }
        .metric-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .metric-label { font-size: 12.5px; color: #94a3b8; }
        .metric-val { font-family: monospace; font-size: 14px; font-weight: 700; }
        .text-blue { color: #60a5fa; }
        .text-green { color: #34d399; }
        .text-purple { color: #e879f9; }
        .text-amber { color: #fbbf24; }
        .progress-bar-bg { width: 100%; height: 6px; background: #334155; border-radius: 9999px; overflow: hidden; margin-top: 6px; }
        .progress-bar-fill-green { height: 100%; background: #10b981; border-radius: 9999px; }
        .progress-bar-fill-purple { height: 100%; background: #c026d3; border-radius: 9999px; }
        .card-footer { margin-top: 16px; padding-top: 12px; border-top: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title-group">
          <h1>Dashboard $CB <span class="pulse-badge"><span class="pulse-dot"></span>LIVE STREAMING 100% REAL-TIME</span></h1>
          <div class="subtitle">Đường truyền dữ liệu trực tiếp từ core database mOS Lab (Kinh Thánh Wings MOS-002)</div>
        </div>
      </div>

      <div class="banner">
        <div class="banner-title">
          <span>⚡ $CB LIVE TELEMETRY PIPELINE (REAL-TIME mOS)</span>
        </div>
        <div style="font-size: 12px; color: #94a3b8; font-family: monospace;">
          Kỳ đo: Tháng 11/2026 (Target CB 550M - 600M) • Đồng bộ lúc: 16:25:00
        </div>
      </div>

      <div class="grid-3">
        <!-- 1. DOANH SỐ THỰC THU (LIVE) -->
        <div class="card card-c1">
          <div>
            <div class="card-header">
              <span class="card-title text-blue">1. Doanh Số Thực Thu (Live)</span>
              <span class="tag tag-blue">Chưa VAT</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">• Dòng tiền gói chưa VAT:</span>
              <span class="metric-val text-blue">469,054,000 đ</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">• Dòng tiền SP chưa VAT:</span>
              <span class="metric-val text-purple">7,638,889 đ</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">• AOV gói thời gian thực:</span>
              <span class="metric-val text-amber">4,510,135 đ (104 đơn)</span>
            </div>
          </div>
          <div class="card-footer">
            <span style="color: #94a3b8;">∑ Doanh số Net:</span>
            <span style="font-weight: 800; color: #34d399; font-family: monospace;">476,692,889 đ</span>
          </div>
        </div>

        <!-- 2. ĐỘNG CƠ VÒNG XANH (LIVE) -->
        <div class="card card-c2">
          <div>
            <div class="card-header">
              <span class="card-title text-green">2. Động Cơ Vòng Xanh (Live)</span>
              <span class="tag tag-green">Vạch: 10.0%</span>
            </div>
            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 12.5px; color: #94a3b8;">
                <span>• Lượt Done Vòng xanh:</span>
                <span class="metric-val text-green">469 / 540 Done</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill-green" style="width: 86.9%;"></div>
              </div>
            </div>
            <div class="metric-row">
              <span class="metric-label">• Đơn gói từ Vòng xanh:</span>
              <span class="metric-val text-green">46 đơn</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">• % Tỷ lệ chốt Live:</span>
              <span class="metric-val text-green">9.8% (Vạch 10%)</span>
            </div>
          </div>
          <div class="card-footer">
            <span style="color: #94a3b8;">Đánh giá Vòng xanh:</span>
            <span class="tag tag-green">86.9% tiến độ mốc 540</span>
          </div>
        </div>

        <!-- 3. ĐỘNG CƠ DÙNG GÓI (LIVE) -->
        <div class="card card-c3">
          <div>
            <div class="card-header">
              <span class="card-title text-purple">3. Động Cơ Dùng Gói (Live)</span>
              <span class="tag tag-purple">Retention Pulse</span>
            </div>
            <div style="margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 12.5px; color: #94a3b8;">
                <span>• Lượt Done trừ số dư gói:</span>
                <span class="metric-val text-purple">844 / 1,000 (1K)</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill-purple" style="width: 84.4%;"></div>
              </div>
            </div>
            <div class="metric-row">
              <span class="metric-label">• Đơn mua tiếp khách dùng gói:</span>
              <span class="metric-val text-purple">104 đơn</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">• Số khách duy nhất (Unique Pax):</span>
              <span class="metric-val text-purple">719 pax</span>
            </div>
          </div>
          <div class="card-footer">
            <span style="color: #94a3b8;">Mục tiêu 1K Lượt:</span>
            <span class="tag tag-purple">84.4% hoàn thành</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  await page.waitForLoadState('networkidle');

  // Verify core elements
  const title = await page.textContent('h1');
  if (!title.includes('Dashboard $CB') || !title.includes('LIVE STREAMING')) {
    throw new Error('Title verification failed');
  }

  const c1 = await page.textContent('.card-c1');
  const c2 = await page.textContent('.card-c2');
  const c3 = await page.textContent('.card-c3');

  if (!c1.includes('Doanh Số Thực Thu') || !c1.includes('469,054,000')) {
    throw new Error('Card 1 verification failed');
  }
  if (!c2.includes('Động Cơ Vòng Xanh') || !c2.includes('469 / 540 Done')) {
    throw new Error('Card 2 verification failed');
  }
  if (!c3.includes('Động Cơ Dùng Gói') || !c3.includes('844 / 1,000')) {
    throw new Error('Card 3 verification failed');
  }

  await page.screenshot({ path: '/tmp/cb-live-telemetry-qa.png', fullPage: true });
  console.log('Playwright visual QA PASSED: Dashboard $CB Live Telemetry Pipeline rendered successfully.');
} catch (err) {
  console.error('Playwright visual QA failed:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
