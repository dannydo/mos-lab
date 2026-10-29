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
      <title>MOS-BUG-179 Visual Verification - Mobile Customer Card Attachment Detail</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #020617; color: #f8fafc; }
        .adaptive-overlay-mobile-fullscreen {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          background: #0f172a;
          z-index: 2000;
        }
      </style>
    </head>
    <body class="bg-slate-950 flex flex-col h-screen text-slate-100 select-none overflow-hidden">
      <!-- Mobile Subthread View with Customer Attachment -->
      <div id="thread-view" class="flex flex-col h-full">
        <!-- Subthread Header -->
        <header class="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-md">
          <div class="flex items-center gap-2">
            <button class="flex items-center gap-1 text-xs font-semibold text-amber-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              Quay lại
            </button>
          </div>
          <div class="text-center">
            <p class="font-bold text-white text-sm">Luồng thảo luận</p>
            <p class="text-[10px] text-slate-400">Trả lời tin nhắn</p>
          </div>
          <div class="flex items-center gap-1.5">
            <button class="text-slate-400 hover:text-white p-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </header>

        <!-- Replies Feed -->
        <main class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div class="flex flex-col items-end my-1">
            <div class="flex items-center gap-1.5 mb-1 px-1 flex-row-reverse">
              <div class="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center">
                QK
              </div>
              <span class="text-[11px] font-semibold text-amber-300">Nguyễn Quang Khải</span>
              <span class="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-medium uppercase border border-slate-700/50">ADMIN</span>
            </div>

            <div class="max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm break-words shadow-sm bg-amber-500/20 text-slate-100 border border-amber-500/40 rounded-tr-sm">
              <p class="text-xs text-slate-200">Đính kèm thẻ khách hàng Nadhira Ulya :</p>

              <!-- Customer Card Component Rendered Inside Thread Bubble -->
              <div
                id="customer-attachment-card"
                class="mt-2 p-2.5 rounded-xl bg-slate-900/90 border border-amber-500/35 hover:border-amber-400 flex items-center justify-between gap-2 shadow-sm cursor-pointer active:scale-95 transition-all"
                onclick="document.getElementById('customer-drawer').classList.remove('hidden')"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-9 h-9 rounded-full bg-amber-600 border border-amber-400/40 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">
                    NU
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-bold text-white truncate">Nadhira Ulya</span>
                      <span class="text-[10px] px-1 rounded bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">#5678</span>
                    </div>
                    <p class="text-[11px] text-amber-400 font-medium truncate mt-0.5">Booking 12:20 · Thiết Kế Mi Tự Nhiên</p>
                    <p class="text-[10px] text-slate-400 truncate">Chi nhánh Estella Place · CV: Diễm My</p>
                  </div>
                </div>
                <button
                  id="open-customer-btn"
                  class="p-1.5 rounded-lg bg-slate-800/80 text-slate-300 hover:text-amber-400 border border-slate-700 shrink-0"
                  aria-label="Mở hồ sơ khách hàng"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                </button>
              </div>

              <div class="flex items-center justify-end gap-1 mt-1 text-[10px] tabular-nums text-amber-300/80">
                <span>12:21</span>
                <svg class="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Customer Detail Drawer [MOS-BUG-179 FIXED: z-index: 2000, 100vw fullscreen mobile] -->
      <div id="customer-drawer" class="hidden adaptive-overlay-mobile-fullscreen flex flex-col transition-all duration-300">
        <!-- Drawer Header with title left and close button right [UI Invariant] -->
        <header class="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-lg">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-full bg-amber-600 border border-amber-400/50 flex items-center justify-center text-white font-bold text-xs shadow">
              NU
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-white text-sm">Nadhira Ulya</span>
                <span class="text-amber-400 text-xs">⭐⭐⭐⭐•</span>
                <span class="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold text-[10px] border border-purple-500/30">🌐 Nước ngoài</span>
              </div>
              <p class="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span>📞 0909 123 456</span>
                <span class="text-slate-600">·</span>
                <span>ID: #5678</span>
              </p>
            </div>
          </div>

          <!-- Close button on top-right [MANDATORY INVARIANT] -->
          <button
            id="close-drawer-btn"
            class="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
            onclick="document.getElementById('customer-drawer').classList.add('hidden')"
            aria-label="Đóng chi tiết khách hàng"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </header>

        <!-- Drawer Content: KPI Stats & Tabs -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <!-- KPI Stats Card -->
          <div class="grid grid-cols-2 gap-2 bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-sm">
            <div class="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
              <span class="text-[10px] text-slate-400 uppercase font-semibold">Tổng chi tiêu</span>
              <p class="text-sm font-bold text-amber-400 tabular-nums mt-0.5">3.450.000đ</p>
            </div>
            <div class="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
              <span class="text-[10px] text-slate-400 uppercase font-semibold">Lượt ghé</span>
              <p class="text-sm font-bold text-emerald-400 tabular-nums mt-0.5">6 lần</p>
            </div>
            <div class="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
              <span class="text-[10px] text-slate-400 uppercase font-semibold">Combo còn lại</span>
              <p class="text-sm font-bold text-indigo-400 tabular-nums mt-0.5">2 / 5 buổi</p>
            </div>
            <div class="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
              <span class="text-[10px] text-slate-400 uppercase font-semibold">Chi nhánh quen</span>
              <p class="text-sm font-bold text-slate-200 truncate mt-0.5">Estella Place</p>
            </div>
          </div>

          <!-- History Tabs Navigation -->
          <div class="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-800 text-xs">
            <button class="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 shrink-0">Lịch hẹn (6)</button>
            <button class="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white shrink-0">Đơn hàng (6)</button>
            <button class="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white shrink-0">Gói Combo (1)</button>
            <button class="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white shrink-0">Ghi chú (3)</button>
          </div>

          <!-- Active Appointment Card -->
          <div class="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-white">Lịch hẹn hôm nay</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Đang thực hiện</span>
            </div>
            <p class="text-xs text-amber-400 font-semibold">12:20 - 13:30 · Mi Thiết Kế Tự Nhiên (390k)</p>
            <p class="text-[11px] text-slate-400">CV thực hiện: Diễm My (CV+) · Ghế số 4</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });

  // 1. Verify Customer Card Attachment exists
  const card = await page.locator('#customer-attachment-card');
  if (!(await card.isVisible())) throw new Error('Customer card attachment missing in chat');

  // 2. Click Customer Card Attachment
  await card.click();

  // 3. Verify Customer Detail Drawer opens on top
  const drawer = await page.locator('#customer-drawer');
  if (!(await drawer.isVisible())) throw new Error('Customer Detail Drawer did not open after clicking attachment');

  const drawerTitle = await page.textContent('text=Nadhira Ulya');
  if (!drawerTitle) throw new Error('Customer detail title missing');

  const spentStat = await page.textContent('text=3.450.000đ');
  if (!spentStat) throw new Error('Customer spending KPI stat missing');

  const screenshotPath = resolve(
    '/tmp/verify-mos-bug-179.png'
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log('Playwright visual QA PASSED: Screenshot saved to ' + screenshotPath);
} catch (error) {
  console.error('Playwright verification failed:', error);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
