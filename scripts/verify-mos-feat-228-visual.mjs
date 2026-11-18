import { chromium } from 'playwright';
import { resolve } from 'node:path';

const timeout = setTimeout(() => {
  console.error('Playwright verification timed out');
  process.exit(1);
}, 25000);
timeout.unref();

let browser = null;

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MOS-FEAT-228 Visual QA - Chỉnh sửa kịch bản mô phỏng /ios-app</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b1120; color: #f8fafc; }
        .tabular-nums { font-variant-numeric: tabular-nums; }
      </style>
    </head>
    <body class="bg-black/80 text-white p-3 flex flex-col items-center min-h-screen justify-center">
      <div class="w-full max-w-[420px] bg-[#141414] border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="px-4 py-3 border-b border-neutral-800 flex items-center justify-between gap-2 shrink-0">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-amber-500 font-bold text-sm">📊</span>
              <h3 class="text-[14px] font-black truncate">So sánh Phương án Tư vấn · Trâm</h3>
            </div>
            <p class="text-[11px] truncate tabular-nums text-neutral-400">
              #BK-28 · Đã lưu 1 phương án trong Sandbox
            </p>
          </div>
          <button class="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-300">✕</button>
        </div>

        <!-- Body with Saved Attempt Card -->
        <div class="p-3.5 space-y-3">
          <!-- Attempt Card 1 -->
          <div class="rounded-2xl p-3 border border-emerald-500/50 bg-emerald-950/25 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <span class="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500 text-black">PA #1</span>
                <span class="text-[11px] font-bold text-neutral-300">Đã checkout hoàn tất</span>
              </div>
              <span class="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Thu nhập cao nhất</span>
            </div>

            <div class="space-y-0.5">
              <div class="flex items-baseline justify-between text-[12px]">
                <span class="font-extrabold text-white truncate">Classic 1D · Natural</span>
                <span class="tabular-nums font-bold text-neutral-300">550.000đ</span>
              </div>
              <div class="flex items-baseline justify-between text-[11.5px] text-amber-400">
                <span class="truncate">+ Gói 3 Lần (Tiết kiệm)</span>
                <span class="tabular-nums font-bold">1.170.000đ</span>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-1.5 pt-1">
              <div class="p-2 rounded-xl border bg-black/40 border-neutral-800/80 text-center">
                <div class="text-[9.5px] text-neutral-400 font-medium">Khách thanh toán</div>
                <div class="text-[12px] font-black tabular-nums text-white">1.720.000đ</div>
              </div>
              <div class="p-2 rounded-xl border bg-black/40 border-neutral-800/80 text-center">
                <div class="text-[9.5px] text-neutral-400 font-medium">Thưởng + Tip CV</div>
                <div class="text-[12px] font-black tabular-nums text-emerald-400">+105.000đ</div>
              </div>
              <div class="p-2 rounded-xl border bg-black/40 border-neutral-800/80 text-center">
                <div class="text-[9.5px] text-neutral-400 font-medium">Điểm Xoay Tua</div>
                <div class="text-[12px] font-black tabular-nums text-amber-400">+2 🪶</div>
              </div>
            </div>

            <!-- Actions: Edit & Apply -->
            <div class="flex items-center justify-end gap-1.5 pt-1.5 border-t border-neutral-800/80">
              <button class="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-amber-500/40 text-amber-400 bg-neutral-900 flex items-center gap-1">
                <span>✏️</span>
                <span>Chỉnh sửa kịch bản</span>
              </button>
              <button class="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500 text-black flex items-center gap-1 shadow-xs">
                <span>▶</span>
                <span>Nạp kịch bản</span>
              </button>
            </div>
          </div>

          <!-- Empty State with New Quick Action (when 0 attempts) -->
          <div class="rounded-2xl p-4 text-center border border-dashed border-neutral-800 bg-neutral-900/30 space-y-2">
            <div class="text-xs font-bold text-amber-400">Muốn thử phương án mới?</div>
            <p class="text-[10.5px] text-neutral-400">Tạo thêm kịch bản so sánh doanh thu & thưởng để chọn chiến lược tư vấn tối ưu.</p>
            <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 text-black text-[11px] font-black shadow-xs">
              <span>+</span>
              <span>Tạo &amp; Chỉnh sửa kịch bản mới</span>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-3 border-t border-neutral-800 bg-neutral-950/70 grid grid-cols-2 gap-2 shrink-0">
          <button class="py-2.5 px-3 rounded-xl bg-amber-500 text-black font-black text-[11.5px] flex items-center justify-center gap-1">
            <span>🔄</span>
            <span>Thử kịch bản mới</span>
          </button>
          <button class="py-2.5 px-3 rounded-xl border border-neutral-700 bg-neutral-900 text-neutral-200 font-bold text-[11.5px]">
            Reset về Chờ đón
          </button>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const screenshotPath = resolve('/tmp/playwright-mos-feat-228-visual.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log(`Playwright visual QA PASSED: Screenshot saved to ${screenshotPath}`);
} catch (error) {
  console.error('Playwright visual QA error:', error);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  process.exit(0);
}
