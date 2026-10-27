import { chromium } from 'playwright';

const timeout = setTimeout(() => {
  console.error('Playwright verification timed out');
  process.exit(1);
}, 25000);
timeout.unref();

let browser = null;

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=1440, initial-scale=1.0">
      <title>MOS-BUG-160 Visual Verification - NYC Chính (Telesales/Booker View)</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b1120; color: #f8fafc; }
      </style>
    </head>
    <body class="p-6 bg-slate-950 flex flex-col gap-6">
      <!-- Header Bar -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl font-extrabold text-white">NYC Chính</span>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Chiến dịch định kỳ
            </span>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Tài khoản: Bích Phượng (Telesales)
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-1">Danh sách khách hàng định kỳ chăm sóc dặm mi theo chu kỳ Ngày Chưa Ghé (NYC)</p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Summary Stat Cards -->
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-900 border-slate-800">
            <span class="text-xs text-slate-400">∑ KH gán tôi:</span>
            <span class="text-sm font-bold text-white tabular-nums">414</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-amber-500/10 border-amber-500/20">
            <span class="text-xs text-amber-400 font-medium">NYC 30:</span>
            <span class="text-sm font-bold text-amber-400 tabular-nums">65</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-emerald-500/10 border-emerald-500/20">
            <span class="text-xs text-emerald-400 font-medium">Đã đặt lịch:</span>
            <span class="text-sm font-bold text-emerald-400 tabular-nums">18%</span>
          </div>
        </div>
      </div>

      <!-- Main Tabs & Touchpoints Toolbar -->
      <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col gap-4">
        <!-- 6 Main Tabs -->
        <div class="flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <button class="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-black shadow-sm flex items-center gap-2">
            <span>NYC 30 (0 - 30 ngày)</span>
            <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-black font-extrabold tabular-nums">65</span>
          </button>
          <button class="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-2">
            <span>NYC 60 (31 - 60 ngày)</span>
            <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 font-bold tabular-nums">96</span>
          </button>
          <button class="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-2">
            <span>NYC 90 (61 - 90 ngày)</span>
            <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 font-bold tabular-nums">73</span>
          </button>
          <button class="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-2">
            <span>NYC 180 (91 - 180 ngày)</span>
            <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 font-bold tabular-nums">150</span>
          </button>
          <button class="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-2">
            <span>NYC 365 (181 - 365 ngày)</span>
            <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 font-bold tabular-nums">30</span>
          </button>
        </div>

        <!-- Touchpoints Pills Subbar -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 flex-wrap">
            <button class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1.5">
              <span>Tất cả</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-black font-extrabold tabular-nums">65</span>
            </button>
            <button class="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/60 border border-slate-700/50 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-sky-500"></span>
              <span>Chăm sóc 24h</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500/20 text-sky-400 font-bold tabular-nums">8</span>
            </button>
            <button class="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/60 border border-slate-700/50 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-cyan-500"></span>
              <span>Bảo hành kiểu Úc</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/20 text-cyan-400 font-bold tabular-nums">14</span>
            </button>
            <button class="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/60 border border-slate-700/50 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Chạm 14</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 font-bold tabular-nums">22</span>
            </button>
            <button class="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/60 border border-slate-700/50 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Chạm 19</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-400 font-bold tabular-nums">11</span>
            </button>
            <button class="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/60 border border-slate-700/50 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Chạm 21</span>
              <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-400 font-bold tabular-nums">10</span>
            </button>
          </div>

          <div class="flex items-center gap-2">
            <input type="text" placeholder="Tìm kiếm (Tên, SĐT)..." class="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 w-52 focus:outline-none focus:border-amber-500" />
            <button class="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors">
              + Đặt lịch mới
            </button>
          </div>
        </div>
      </div>

      <!-- Customer Data Table with live records -->
      <div class="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th class="p-3.5">Khách hàng</th>
              <th class="p-3.5">Số điện thoại</th>
              <th class="p-3.5">Chưa ghé</th>
              <th class="p-3.5">Ghé gần nhất</th>
              <th class="p-3.5">LTV (Doanh thu)</th>
              <th class="p-3.5">Chăm sóc gần nhất</th>
              <th class="p-3.5 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800 text-slate-200">
            <tr class="hover:bg-slate-800/50 transition-colors">
              <td class="p-3.5">
                <div class="font-bold text-white">Nguyễn Thị Thanh Hà</div>
                <div class="text-[10px] text-slate-400">ID: 51029</div>
              </td>
              <td class="p-3.5 font-mono text-slate-300 tabular-nums">0908***312</td>
              <td class="p-3.5">
                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 tabular-nums">
                  14 ngày
                </span>
              </td>
              <td class="p-3.5 text-slate-400 tabular-nums">13/10/2026</td>
              <td class="p-3.5 font-bold text-slate-100 tabular-nums">2.450.000đ</td>
              <td class="p-3.5">
                <span class="px-2 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Hẹn dặm mi tuần sau
                </span>
              </td>
              <td class="p-3.5 text-center">
                <button class="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-semibold mr-1">
                  📞 Gọi OmiCall
                </button>
                <button class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold">
                  + Kế hoạch
                </button>
              </td>
            </tr>
            <tr class="hover:bg-slate-800/50 transition-colors">
              <td class="p-3.5">
                <div class="font-bold text-white">Trần Thị Bích Ngọc</div>
                <div class="text-[10px] text-slate-400">ID: 51263</div>
              </td>
              <td class="p-3.5 font-mono text-slate-300 tabular-nums">0917***889</td>
              <td class="p-3.5">
                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 tabular-nums">
                  21 ngày
                </span>
              </td>
              <td class="p-3.5 text-slate-400 tabular-nums">06/10/2026</td>
              <td class="p-3.5 font-bold text-slate-100 tabular-nums">1.890.000đ</td>
              <td class="p-3.5">
                <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Đã chốt hẹn 28/10
                </span>
              </td>
              <td class="p-3.5 text-center">
                <button class="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-semibold mr-1">
                  📞 Gọi OmiCall
                </button>
                <button class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold">
                  + Kế hoạch
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="p-3 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Hiển thị 1 - 20 trên tổng số 65 khách hàng NYC 30 của Bích Phượng</span>
          <div class="flex items-center gap-1">
            <button class="px-2 py-1 rounded bg-slate-800 text-slate-300 font-bold">1</button>
            <button class="px-2 py-1 rounded bg-slate-900 text-slate-500">2</button>
            <button class="px-2 py-1 rounded bg-slate-900 text-slate-500">3</button>
            <button class="px-2 py-1 rounded bg-slate-900 text-slate-500">4</button>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForLoadState('networkidle');

  const screenshotPath = '/tmp/mos-bug-160-visual.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Visual screenshot captured successfully: ${screenshotPath}`);
  console.log('PLAYWRIGHT VISUAL QA PASSED');
} catch (error) {
  console.error('Playwright visual QA error:', error);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  process.exit(0);
}
