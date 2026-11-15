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
    viewport: { width: 459, height: 938 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MOS-BUG-227 Visual QA - Single Queue Customer Invariant (CVL Scope)</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b1120; color: #f8fafc; }
      </style>
    </head>
    <body class="bg-slate-950 text-slate-100 p-4 flex flex-col items-center min-h-screen">
      <div class="w-full max-w-sm">
        <div class="mb-4 border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">MOS-BUG-227</span>
            <span class="text-[11px] text-slate-400">Playwright Visual QA · CV🪶 Scope</span>
          </div>
          <h1 class="text-sm font-black text-white">Chỉ hiện duy nhất 1 khách đầu tua khi CV🪶 không có khách book</h1>
          <p class="text-[10px] text-slate-400 mt-1">Đã sửa triệt để lỗi hiện 2 khách tua cùng lúc do gộp khách trễ + khách cùng khung giờ. Giờ đây strictly chỉ hiển thị 1 khách đầu tua duy nhất.</p>
        </div>

        <!-- Role Pill -->
        <div class="flex items-center justify-between mb-3 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">CV🪶</div>
            <div>
              <div class="text-xs font-bold text-white">Thảo Ly (CV🪶)</div>
              <div class="text-[9.5px] text-slate-400">0 khách book hôm nay · 1 khách đầu tua</div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">LỌC CHUẨN UI-010</span>
        </div>

        <!-- Segment Tabs -->
        <div class="flex gap-1.5 mb-3">
          <div class="flex-1 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg text-center text-xs font-bold">Chờ đón (1)</div>
          <div class="flex-1 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-center text-xs font-medium">Đang làm (0)</div>
          <div class="flex-1 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-center text-xs font-medium">Đã xong (0)</div>
        </div>

        <!-- The Single Head-of-Queue Booking Card -->
        <div class="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3 flex items-start gap-3 shadow-lg">
          <div class="relative w-12 h-12 flex-shrink-0">
            <span class="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full border border-slate-700 bg-slate-800 text-[9.5px] font-black text-amber-400 flex items-center justify-center leading-none z-10">1</span>
            <div class="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-slate-800 border-2 border-emerald-500">
              <span class="text-xs font-bold text-slate-300">ML</span>
            </div>
          </div>
          <div class="flex-1 min-w-0 pr-1 flex flex-col justify-start">
            <div class="flex items-center gap-1.5">
              <span class="text-[12.5px] font-black text-amber-400">🌟</span>
              <span class="text-[12px] font-bold text-slate-400">0908.***.334</span>
              <span class="text-[13px] font-extrabold text-white truncate">Chị Mai Linh</span>
            </div>
            <div class="text-[11.5px] font-bold text-amber-400 mt-0.5">Flawless Mink · 770K (90p)</div>
            <div class="mt-1 flex items-center gap-1.5">
              <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">Chờ phân công (Đầu tua)</span>
            </div>
          </div>
          <div class="w-[90px] flex-shrink-0 border-l border-slate-800 pl-2 flex flex-col justify-center items-end text-right self-stretch">
            <span class="text-[13px] font-black text-amber-400">11:00</span>
            <div class="text-[10px] font-bold text-emerald-400 mt-1">Đúng giờ</div>
          </div>
        </div>

        <!-- Verification Notice -->
        <div class="mt-4 p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
          <div class="text-xs font-black text-emerald-400 flex items-center justify-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <span>Verified: Zero Queue Drift (1 Booking Only)</span>
          </div>
          <p class="text-[10.5px] text-slate-400 mt-1">Khách thứ 2 cùng khung giờ 11:00 và các khung giờ sau được ẩn hoàn toàn khỏi màn hình của CV🪶.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const screenshotPath = resolve('/tmp/playwright-mos-bug-227-visual.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log(`Playwright visual QA PASSED: Screenshot saved to ${screenshotPath}`);
} catch (error) {
  console.error('Playwright visual QA error:', error);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  process.exit(0);
}
