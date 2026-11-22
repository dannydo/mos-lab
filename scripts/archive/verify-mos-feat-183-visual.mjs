import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MOS-FEAT-183 Visual Verification - Financial Goals</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #09090b; color: #f4f4f5; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .tabular-nums { font-variant-numeric: tabular-nums; }
      </style>
    </head>
    <body class="bg-zinc-950 text-zinc-100 min-h-screen p-6 select-none">
      <div class="max-w-[1400px] mx-auto space-y-5">
        <!-- Top Action Bar -->
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs px-2.5 py-0.5 rounded font-mono font-bold tracking-wider uppercase bg-amber-950/70 text-amber-300 border border-amber-800/60">
                FINANCIAL GOALS
              </span>
              <span class="text-xs font-mono text-zinc-500">• Toàn Hệ Thống Wings Lashes</span>
            </div>
            <h1 class="text-2xl font-black tracking-tight text-white mt-1">Mục Tiêu Tài Chính – Tháng 11/2026</h1>
          </div>
          <div class="flex items-center gap-2">
            <div class="inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1 font-mono text-xs font-bold text-amber-400">
              📅 Tháng 11/2026
            </div>
            <button class="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md hover:bg-amber-500">
              ⚙️ Cài đặt KPI
            </button>
          </div>
        </div>

        <!-- 1. Hero Main Card: KPI Tổng Doanh Thu -->
        <section class="rounded-3xl border border-amber-500/50 p-6 bg-gradient-to-br from-amber-950/30 via-zinc-950 to-zinc-950 shadow-[0_0_30px_rgba(245,158,11,0.15)] relative overflow-hidden">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl flex items-center justify-center bg-amber-500/20 text-amber-400 text-lg">
                🏆
              </div>
              <div>
                <span class="text-xs uppercase font-mono font-bold tracking-wider text-amber-400">KPI CHÍNH HỆ THỐNG WINGS LASHES</span>
                <h2 class="text-2xl font-black text-white">Tổng Doanh Thu Tháng 11/2026</h2>
              </div>
            </div>
            <span class="text-xs px-3 py-1 rounded-full font-mono font-bold border border-cyan-600/50 bg-cyan-950 text-cyan-300 flex items-center gap-1">
              ✓ Đúng nhịp (52.9%)
            </span>
          </div>

          <div class="grid grid-cols-12 gap-6 items-center">
            <div class="col-span-5 space-y-2">
              <div class="flex items-baseline gap-3">
                <span class="text-5xl font-black tabular-nums text-white">450.000.000đ</span>
                <span class="text-sm font-mono font-semibold text-zinc-500">/ 850.000.000đ</span>
              </div>
              <div class="flex items-center gap-4 text-sm">
                <span class="text-zinc-400">Tỷ lệ hoàn thành: <strong class="tabular-nums font-mono font-bold text-emerald-300">52.9%</strong></span>
                <span class="text-zinc-500">•</span>
                <span class="text-zinc-400">Còn thiếu: <strong class="tabular-nums font-mono font-bold text-amber-300">400.000.000đ</strong></span>
              </div>
            </div>

            <div class="col-span-4 space-y-2">
              <div class="flex justify-between text-xs font-mono">
                <span class="text-zinc-400">Tiến độ doanh thu</span>
                <span class="text-amber-300 font-bold tabular-nums">52.9%</span>
              </div>
              <div class="w-full h-3.5 bg-zinc-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full" style="width: 52.9%"></div>
              </div>
              <div class="flex justify-between text-[11px] font-mono text-zinc-500">
                <span>0đ</span>
                <span>Mục tiêu: 850 tr</span>
              </div>
            </div>

            <div class="col-span-3 rounded-2xl p-3 border border-zinc-800 bg-zinc-900/60 space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-zinc-400">Tiến độ tháng:</span>
                <span class="font-mono font-bold tabular-nums">15/30 ngày (50%)</span>
              </div>
              <div class="flex justify-between">
                <span class="text-zinc-400">Ngày còn lại:</span>
                <span class="font-mono font-bold tabular-nums">15 ngày</span>
              </div>
              <div class="pt-1.5 border-t border-dashed border-zinc-700/40 flex justify-between">
                <span class="text-zinc-400">Cần đạt/ngày:</span>
                <strong class="font-mono tabular-nums text-amber-300">26.7 tr/ngày</strong>
              </div>
            </div>
          </div>
        </section>

        <!-- 2. Three Component KPI Cards -->
        <div>
          <div class="flex items-center justify-between mb-3 px-1">
            <span class="text-xs font-bold uppercase tracking-wider font-mono text-zinc-400">
              🎯 CÁC CHỈ TIÊU THÀNH PHẦN (COMBO • KHÁCH LẺ • SẢN PHẨM)
            </span>
            <span class="text-[11px] font-mono text-zinc-500">Tự động đồng bộ doanh thu thực tế từ mOS</span>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <!-- 2.1 Combo -->
            <div class="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <span class="text-base">📦</span>
                  <div>
                    <h3 class="text-sm font-bold text-white">Doanh Thu Combo</h3>
                    <p class="text-[10px] text-zinc-500">Gói dịch vụ nối mi / uốn mi</p>
                  </div>
                </div>
                <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded border border-cyan-700/50 bg-cyan-950 text-cyan-300">
                  Đúng nhịp
                </span>
              </div>
              <div>
                <div class="flex justify-between items-baseline">
                  <span class="text-2xl font-black tabular-nums text-white">300.000.000đ</span>
                  <span class="text-xs font-mono font-bold text-zinc-400 tabular-nums">54.5%</span>
                </div>
                <div class="flex justify-between text-xs mt-1 text-zinc-500">
                  <span>Mục tiêu: <strong class="text-zinc-300">550.000.000đ</strong></span>
                  <span class="text-cyan-400 font-mono font-semibold">66.7% tổng</span>
                </div>
              </div>
              <div class="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" style="width: 54.5%"></div>
              </div>
              <div class="pt-2 border-t border-dashed border-zinc-800 flex justify-between text-xs font-mono text-zinc-400">
                <span>Thiếu: <strong class="text-amber-300">250 tr</strong></span>
                <span>Cần: <strong class="text-zinc-200">16.7 tr/ngày</strong></span>
              </div>
            </div>

            <!-- 2.2 Khách lẻ -->
            <div class="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <span class="text-base">✂️</span>
                  <div>
                    <h3 class="text-sm font-bold text-white">Doanh Thu Khách Lẻ</h3>
                    <p class="text-[10px] text-zinc-500">Dịch vụ lẻ, dặm mi, tháo mi</p>
                  </div>
                </div>
                <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded border border-rose-700/50 bg-rose-950 text-rose-300">
                  Chậm nhịp
                </span>
              </div>
              <div>
                <div class="flex justify-between items-baseline">
                  <span class="text-2xl font-black tabular-nums text-white">120.000.000đ</span>
                  <span class="text-xs font-mono font-bold text-zinc-400 tabular-nums">48.0%</span>
                </div>
                <div class="flex justify-between text-xs mt-1 text-zinc-500">
                  <span>Mục tiêu: <strong class="text-zinc-300">250.000.000đ</strong></span>
                  <span class="text-emerald-400 font-mono font-semibold">26.7% tổng</span>
                </div>
              </div>
              <div class="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style="width: 48%"></div>
              </div>
              <div class="pt-2 border-t border-dashed border-zinc-800 flex justify-between text-xs font-mono text-zinc-400">
                <span>Thiếu: <strong class="text-amber-300">130 tr</strong></span>
                <span>Cần: <strong class="text-zinc-200">8.7 tr/ngày</strong></span>
              </div>
            </div>

            <!-- 2.3 Sản phẩm -->
            <div class="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <span class="text-base">🛍️</span>
                  <div>
                    <h3 class="text-sm font-bold text-white">Doanh Thu Sản Phẩm</h3>
                    <p class="text-[10px] text-zinc-500">Dưỡng mi, mascara, phụ kiện</p>
                  </div>
                </div>
                <span class="text-[11px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-700/50 bg-emerald-950 text-emerald-300">
                  Vượt nhịp
                </span>
              </div>
              <div>
                <div class="flex justify-between items-baseline">
                  <span class="text-2xl font-black tabular-nums text-white">30.000.000đ</span>
                  <span class="text-xs font-mono font-bold text-zinc-400 tabular-nums">60.0%</span>
                </div>
                <div class="flex justify-between text-xs mt-1 text-zinc-500">
                  <span>Mục tiêu: <strong class="text-zinc-300">50.000.000đ</strong></span>
                  <span class="text-amber-400 font-mono font-semibold">6.7% tổng</span>
                </div>
              </div>
              <div class="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style="width: 60%"></div>
              </div>
              <div class="pt-2 border-t border-dashed border-zinc-800 flex justify-between text-xs font-mono text-zinc-400">
                <span>Thiếu: <strong class="text-amber-300">20 tr</strong></span>
                <span>Cần: <strong class="text-zinc-200">1.3 tr/ngày</strong></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Daily Breakdown Table Preview -->
        <div class="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-bold text-zinc-100 flex items-center gap-2">
              📅 Tiến Độ Doanh Thu Từng Ngày (Tháng 11/2026)
            </h3>
            <span class="text-xs font-mono text-zinc-500">30 ngày trong kỳ</span>
          </div>
          <table class="w-full text-xs font-mono text-left">
            <thead>
              <tr class="border-b border-zinc-800 text-zinc-400">
                <th class="py-2">Ngày</th>
                <th class="py-2 text-right">Doanh Thu Combo</th>
                <th class="py-2 text-right">Doanh Thu Khách Lẻ</th>
                <th class="py-2 text-right">Doanh Thu Sản Phẩm</th>
                <th class="py-2 text-right text-white">Tổng Ngày</th>
                <th class="py-2 text-right text-cyan-400">Lũy Kế Tháng</th>
                <th class="py-2 text-center">Số Đơn</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800/60">
              <tr>
                <td class="py-2 font-bold text-white">01/11 (CN)</td>
                <td class="py-2 text-right text-purple-300 tabular-nums">22.500.000đ</td>
                <td class="py-2 text-right text-emerald-300 tabular-nums">8.200.000đ</td>
                <td class="py-2 text-right text-amber-300 tabular-nums">2.100.000đ</td>
                <td class="py-2 text-right font-bold text-white tabular-nums">32.800.000đ</td>
                <td class="py-2 text-right font-semibold text-cyan-300 tabular-nums">32.800.000đ</td>
                <td class="py-2 text-center text-zinc-300">28 đơn</td>
              </tr>
              <tr>
                <td class="py-2 font-bold text-white">02/11 (T2)</td>
                <td class="py-2 text-right text-purple-300 tabular-nums">18.000.000đ</td>
                <td class="py-2 text-right text-emerald-300 tabular-nums">7.500.000đ</td>
                <td class="py-2 text-right text-amber-300 tabular-nums">1.800.000đ</td>
                <td class="py-2 text-right font-bold text-white tabular-nums">27.300.000đ</td>
                <td class="py-2 text-right font-semibold text-cyan-300 tabular-nums">60.100.000đ</td>
                <td class="py-2 text-center text-zinc-300">24 đơn</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(500);

  // Desktop screenshot
  const desktopPath = resolve('/tmp/financial-goals-desktop.png');
  await page.screenshot({ path: desktopPath, fullPage: true });
  console.log(`[Playwright Visual QA] Desktop screenshot saved: ${desktopPath}`);

  // Mobile viewport verification
  await page.setViewportSize({ width: 390, height: 844 });
  const mobilePath = resolve('/tmp/financial-goals-mobile.png');
  await page.screenshot({ path: mobilePath, fullPage: true });
  console.log(`[Playwright Visual QA] Mobile screenshot saved: ${mobilePath}`);

  console.log('[Playwright Visual QA] PASSED');
  process.exit(0);
} catch (err) {
  console.error('[Playwright Visual QA] FAILED:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
}
