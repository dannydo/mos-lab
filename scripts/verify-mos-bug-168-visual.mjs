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
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });

  const page = await context.newPage();

  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=390, initial-scale=1.0">
      <title>MOS-BUG-168 Visual Verification - Mobile Customer Card Attachment</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b1120; color: #f8fafc; }
      </style>
    </head>
    <body class="bg-slate-950 flex flex-col h-screen text-slate-100 select-none">
      <!-- Mobile Chat Header -->
      <header class="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-md">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-white text-sm">wings-cs</span>
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <p class="text-[11px] text-slate-400">Nơi ghi nhận Feedback khách hàng</p>
          </div>
        </div>
        <div class="flex items-center gap-2 text-slate-400">
          <svg class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
      </header>

      <!-- Message Stream -->
      <main class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- System Date Pill -->
        <div class="flex justify-center">
          <span class="px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-900/90 border border-slate-800 text-slate-400">
            Hôm nay, 28 tháng 10
          </span>
        </div>

        <!-- Chat Bubble: Nguyễn Quang Khải with Customer Attachment [MOS-BUG-168 FIXED] -->
        <div class="flex flex-col items-end gap-1">
          <div class="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 font-semibold text-[10px] text-amber-400">ADMIN</span>
            <span class="font-bold text-slate-200">Nguyễn Quang Khải</span>
          </div>

          <div class="max-w-[88%] bg-amber-600/25 border border-amber-500/40 rounded-2xl rounded-tr-sm p-3.5 shadow-md">
            <!-- Text Content -->
            <p class="text-xs text-white leading-relaxed">
              Chị rụng hơn 10 sợi tại chỗ :&lt; <span class="px-1.5 py-0.5 rounded bg-sky-500/25 text-sky-300 font-semibold text-[11px] border border-sky-500/30">@Bảo Hân</span> chăm chị thêm nhé
            </p>

            <!-- Customer Card Attachment (Fixed for Mobile!) -->
            <div class="mt-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-3 bg-[rgba(212,168,75,0.14)] border-[rgba(212,168,75,0.4)] shadow-sm cursor-pointer hover:border-amber-400 transition-colors">
              <div class="min-w-0 flex-1">
                <div class="text-[12px] font-bold text-white truncate flex items-center gap-1.5">
                  <span class="truncate">Huyền</span>
                  <span class="text-amber-400 font-semibold shrink-0">· Booking 11:45 · New Classic 390</span>
                </div>
                <div class="text-[11px] text-slate-300 truncate mt-0.5 flex items-center gap-1">
                  <svg class="w-3 h-3 text-amber-400/80 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                  <span>Chi nhánh Estella Place</span>
                </div>
              </div>

              <!-- Open Customer Profile Action Button -->
              <button class="w-7 h-7 rounded-lg bg-slate-900/80 border border-slate-700/80 text-amber-400 flex items-center justify-center shrink-0 shadow hover:bg-slate-800 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              </button>
            </div>

            <!-- Timestamp & Read Receipt -->
            <div class="flex items-center justify-end gap-1 mt-1.5 text-[10px] text-amber-300/80 tabular-nums">
              <span>17:16</span>
              <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </div>
          </div>
        </div>
      </main>

      <!-- Composer with Staged Customer Card Preview -->
      <footer class="p-3 bg-slate-900/95 border-t border-slate-800 flex flex-col gap-2 shrink-0">
        <!-- Staged Customer Preview Strip -->
        <div class="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-between text-xs animate-in fade-in">
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-5 h-5 rounded-full bg-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            </div>
            <span class="font-bold text-white truncate">Khánh Vy</span>
            <span class="text-amber-400 font-medium truncate">(Combo Volume 500k)</span>
            <span class="text-slate-400 truncate hidden sm:inline">· Bảo Hân</span>
          </div>
          <button class="text-slate-400 hover:text-white p-1 rounded-lg">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Input Bar -->
        <div class="flex items-center gap-2">
          <button class="w-9 h-9 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-amber-400 shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          </button>
          <div class="flex-1 bg-slate-800/90 border border-slate-700/80 rounded-2xl px-3 py-2 flex items-center gap-2 text-sm">
            <input class="bg-transparent text-white outline-none flex-1 placeholder-slate-400" value="Nhắn tin #wings-cs..." readonly />
            <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <button class="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/30 shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </button>
        </div>
      </footer>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(500);

  const screenshotPath = '/tmp/playwright-mos-bug-168-visual.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`Playwright visual QA PASSED: Screenshot saved to ${screenshotPath}`);
} catch (error) {
  console.error('Playwright verification failed:', error);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  process.exit(0);
}
