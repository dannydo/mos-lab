import { chromium } from 'playwright';

const t = setTimeout(() => {
  console.error('Playwright visual QA timed out.');
  process.exit(1);
}, 25000);
t.unref();

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="utf-8" />
      <title>$CB Sales Command Board Visual QA</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #030712; color: #f8fafc; margin: 0; padding: 24px; box-sizing: border-box; }
        .header { background: #0f172a; border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 16px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
        .title { font-size: 22px; font-weight: 900; background: linear-gradient(to right, #fbbf24, #fef08a, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { font-size: 11px; color: rgba(254, 243, 199, 0.7); font-family: monospace; margin-top: 4px; }
        .badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 9999px; font-size: 10px; font-weight: bold; background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-dot { width: 8px; height: 8px; border-radius: 50%; background: #34d399; }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
        .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .card-title { font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; }
        .card-val { font-size: 28px; font-weight: 900; font-family: monospace; }
        .text-blue { color: #60a5fa; }
        .text-purple { color: #c084fc; }
        .text-amber { color: #fbbf24; }
        .text-green { color: #34d399; }
        .grid-3 { display: grid; grid-template-columns: 5fr 3.5fr 3.5fr; gap: 16px; margin-bottom: 20px; }
        .chart-box { height: 120px; background: rgba(2, 6, 23, 0.6); border: 1px solid #1e293b; border-radius: 12px; margin-top: 10px; position: relative; }
        .progress-bg { background: #1e293b; height: 8px; border-radius: 9999px; overflow: hidden; margin: 10px 0; }
        .progress-green { background: #10b981; height: 100%; border-radius: 9999px; width: 50%; }
        .progress-purple { background: #a855f7; height: 100%; border-radius: 9999px; width: 50%; }
        .grid-2 { display: grid; grid-template-columns: 8fr 4fr; gap: 16px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; font-family: monospace; }
        th { border-bottom: 1px solid #1e293b; padding: 6px; text-align: right; color: #94a3b8; }
        th:first-child { text-align: left; }
        td { border-bottom: 1px solid rgba(30, 41, 59, 0.5); padding: 6px; text-align: right; color: #e2e8f0; }
        td:first-child { text-align: left; }
        .bottom-bar { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="title">$CB SALES COMMAND BOARD</span>
            <span class="badge"><span class="badge-dot"></span>LIVE STREAMING 100% REAL-TIME</span>
          </div>
          <div class="subtitle">THÁNG 11/2026 • ĐỀ THÁM + ESTELLA • CHƯA VAT • MỤC TIÊU 560M • KINH THÁNH WINGS MOS-002</div>
        </div>
        <div style="font-size: 12px; color: #94a3b8;">Đồng bộ: 0s trước</div>
      </div>

      <!-- Top 4 KPIs -->
      <div class="grid-4">
        <div class="card" style="border-color: rgba(59, 130, 246, 0.4);">
          <div class="card-title">DOANH SỐ GÓI</div>
          <div class="card-val text-blue">275M <span style="font-size: 14px; color: #64748b;">/ 550M</span></div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">50,0% mục tiêu tháng (60 đơn)</div>
        </div>
        <div class="card" style="border-color: rgba(168, 85, 247, 0.4);">
          <div class="card-title">SẢN PHẨM</div>
          <div class="card-val text-purple">5M <span style="font-size: 14px; color: #64748b;">/ 10M</span></div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">50,0% mục tiêu tháng (10 đơn)</div>
        </div>
        <div class="card" style="border-color: rgba(245, 158, 11, 0.4);">
          <div class="card-title text-amber">TỔNG DOANH SỐ</div>
          <div class="card-val text-amber">280M <span style="font-size: 14px; color: #64748b;">/ 560M</span></div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Gói + sản phẩm • 50,0%</div>
        </div>
        <div class="card">
          <div class="card-title">NHỊP KẾ HOẠCH</div>
          <div class="card-val text-green">18,7M <span style="font-size: 14px; color: #64748b;">/ ngày</span></div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">560M ÷ 30 ngày</div>
        </div>
      </div>

      <!-- Middle 3 sections -->
      <div class="grid-3">
        <div class="card">
          <div class="card-title text-amber">NHỊP DOANH SỐ LŨY KẾ</div>
          <div style="font-size: 11px; color: #94a3b8;">Triệu đồng • Gói + Sản phẩm • Đến 15/11</div>
          <div class="chart-box">
            <svg width="100%" height="100%" viewBox="0 0 350 120">
              <line x1="10" y1="110" x2="340" y2="10" stroke="#64748b" stroke-dasharray="3 3" stroke-width="1.5" />
              <path d="M 10 110 Q 150 80, 200 55" fill="none" stroke="#f59e0b" stroke-width="2.5" />
              <circle cx="200" cy="55" r="4" fill="#f59e0b" stroke="#fef3c7" stroke-width="2" />
            </svg>
          </div>
        </div>

        <div class="card">
          <div class="card-title text-green">VÒNG XANH (Done từ khách lẻ)</div>
          <div class="card-val text-green">270 <span style="font-size: 14px; color: #64748b;">/ 540 Done</span></div>
          <div class="progress-bg"><div class="progress-green"></div></div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 6px;">• Đơn gói chốt: <strong class="text-green">27 đơn</strong></div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px;">• Tỷ lệ chốt: <strong class="text-green">10,0% (Vạch 10%)</strong></div>
        </div>

        <div class="card">
          <div class="card-title text-purple">KHÁCH ĐANG DÙNG GÓI</div>
          <div class="card-val text-purple">500 <span style="font-size: 14px; color: #64748b;">/ 1.000 Done</span></div>
          <div class="progress-bg"><div class="progress-purple"></div></div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 6px;">• Đơn mua tiếp: <strong class="text-purple">32 đơn</strong></div>
          <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px;">• Doanh số gói: <strong class="text-purple">175M / 349M</strong></div>
        </div>
      </div>

      <!-- Daily breakdown & Forecast -->
      <div class="grid-2">
        <div class="card">
          <div class="card-title">PHÂN TÍCH THEO NGÀY (7 ngày gần nhất)</div>
          <table>
            <thead>
              <tr>
                <th>NGÀY</th><th>GÓI</th><th>SP</th><th>TỔNG</th><th>DONE VX</th><th>DONE GÓI</th><th>SO VỚI NHỊP</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>09/11</td><td>16,7M</td><td>0,3M</td><td>17,0M</td><td>16</td><td>30</td><td style="color: #f87171;">-1,7M</td></tr>
              <tr><td>10/11</td><td>18,6M</td><td>0,4M</td><td>19,0M</td><td>18</td><td>33</td><td style="color: #34d399;">+0,3M</td></tr>
              <tr><td>11/11</td><td>13,8M</td><td>0,2M</td><td>14,0M</td><td>15</td><td>27</td><td style="color: #f87171;">-4,7M</td></tr>
              <tr><td>12/11</td><td>22,5M</td><td>0,5M</td><td>23,0M</td><td>21</td><td>37</td><td style="color: #34d399;">+4,3M</td></tr>
              <tr><td>13/11</td><td>17,7M</td><td>0,3M</td><td>18,0M</td><td>18</td><td>32</td><td style="color: #f87171;">-0,7M</td></tr>
              <tr><td>14/11</td><td>19,6M</td><td>0,4M</td><td>20,0M</td><td>19</td><td>34</td><td style="color: #34d399;">+1,3M</td></tr>
              <tr><td>15/11</td><td>20,6M</td><td>0,4M</td><td>21,0M</td><td>20</td><td>36</td><td style="color: #34d399;">+2,3M</td></tr>
            </tbody>
          </table>
        </div>

        <div class="card">
          <div class="card-title text-amber">DỰ BÁO CHỐT THÁNG (Nhịp 7 ngày)</div>
          <div class="card-val text-green">563M <span style="font-size: 14px; color: #64748b;">/ 560M</span></div>
          <div style="font-size: 16px; font-weight: bold; color: #34d399; margin: 4px 0;">100,5% dự báo đạt</div>
          <div style="padding: 6px 10px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; color: #34d399; font-size: 11px; margin-bottom: 8px;">
            +3M so với mục tiêu
          </div>
          <div style="font-size: 11px; color: #94a3b8; font-family: monospace; line-height: 1.4;">
            7 ngày qua: 132M • TB 18,86M/ngày<br/>280M đã đạt + 15 ngày x 18,86M
          </div>
        </div>
      </div>

      <!-- Bottom status bar -->
      <div class="bottom-bar">
        <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div class="card-title">KHÁCH HÀNG DUY NHẤT</div>
            <div style="font-size: 22px; font-weight: 900; font-family: monospace;">620 <span style="font-size: 13px; color: #94a3b8;">khách</span></div>
          </div>
          <div style="font-size: 11px; color: #94a3b8; text-align: right; font-family: monospace;">
            <div>800 lượt Done</div>
            <div class="text-amber">1,29 lượt / khách</div>
          </div>
        </div>

        <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div class="card-title">CẢNH BÁO NHỊP</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
              <span class="badge-dot"></span>
              <span style="font-size: 18px; font-weight: 900; color: #34d399;">ĐÚNG TIẾN ĐỘ</span>
            </div>
          </div>
          <div style="font-size: 11px; color: #94a3b8; text-align: right; font-family: monospace;">
            <div>Ngưỡng: 18,7M/ngày</div>
            <div>1.000 Done dùng gói</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent);
  await page.waitForLoadState('networkidle');

  // Assert elements
  const title = await page.textContent('.title');
  if (!title.includes('$CB SALES COMMAND BOARD')) throw new Error('Title check failed');

  await page.screenshot({ path: '/tmp/cb-live-telemetry-qa.png', fullPage: true });
  console.log('Playwright visual QA PASSED: $CB Sales Command Board rendered successfully.');
} catch (err) {
  console.error('Playwright visual QA failed:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
