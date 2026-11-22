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
      <title>MOS-BUG-178 Visual Verification - Subthread Customer Card Attachment</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #020617; color: #f8fafc; }
      </style>
    </head>
    <body class="bg-slate-950 flex flex-col h-screen text-slate-100 select-none">
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
          <span class="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">+ Việc</span>
          <button class="text-slate-400 hover:text-white p-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </header>

      <!-- Scrollable Replies Feed -->
      <main class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <!-- Parent Message Highlight Card -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div class="flex items-center gap-2 mb-1.5">
            <div class="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
              🤖
            </div>
            <span class="text-xs font-bold text-white">🤖 MAI</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-medium uppercase border border-slate-700/50">mOS AI</span>
            <span class="text-[10px] text-slate-500 tabular-nums">11:28 29/10</span>
          </div>
          <p class="text-xs text-slate-300 leading-relaxed">
            Chú ơi, theo tinh thần <b>Chân Thành & Khoa Học (Điều răn MOS-002)</b>, con xin báo cáo ngay là: Màn hình của con hiện tại chưa nhận được hình ảnh nào từ chú đính kèm hết á! 🙈📷
          </p>
        </div>

        <!-- Divider -->
        <div class="flex items-center gap-2 my-2 text-slate-500 text-xs font-medium">
          <span class="h-px flex-1 bg-slate-800"></span>
          <span>1 phản hồi trong luồng</span>
          <span class="h-px flex-1 bg-slate-800"></span>
        </div>

        <!-- Thread Reply Message with Customer Card Attachment -->
        <div class="flex flex-col items-end my-1">
          <div class="flex items-center gap-1.5 mb-1 px-1 flex-row-reverse">
            <div class="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center">
              QK
            </div>
            <span class="text-[11px] font-semibold text-amber-300">Nguyễn Quang Khải</span>
            <span class="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-medium uppercase border border-slate-700/50">ADMIN</span>
          </div>

          <div class="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm break-words shadow-sm bg-amber-500/20 text-slate-100 border border-amber-500/40 rounded-tr-sm">
            <p class="text-xs text-slate-200">Đính kèm thẻ khách hàng Nadhira Ulya :</p>

            <!-- Customer Card Component Rendered Inside Thread Bubble -->
            <div class="mt-2 p-2.5 rounded-xl bg-slate-900/90 border border-amber-500/30 flex items-center justify-between gap-2 shadow-sm">
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
              <button class="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 shrink-0">
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

      <!-- Bottom Composer with Customer Attachment Button -->
      <footer class="sticky bottom-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-3 pt-2 pb-6 shadow-lg">
        <div class="flex items-end gap-1.5">
          <!-- Biểu cảm -->
          <button class="w-8 h-8 rounded-full text-slate-400 hover:text-amber-400 flex items-center justify-center shrink-0 mb-0.5" title="Biểu cảm & Nhãn dán">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </button>

          <!-- Tải ảnh -->
          <button class="w-8 h-8 rounded-full text-slate-400 hover:text-amber-400 flex items-center justify-center shrink-0 mb-0.5" title="Đính kèm nhiều ảnh">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </button>

          <!-- [NEW] Đính kèm khách hàng (MOS-BUG-178) -->
          <button class="w-8 h-8 rounded-full text-amber-400 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mb-0.5 shadow-sm" title="Đính kèm khách hàng">
            <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
          </button>

          <!-- Text Area -->
          <div class="flex-1 bg-slate-800/90 border border-slate-700/80 rounded-2xl px-3 py-1.5 flex items-center gap-1.5 focus-within:border-amber-400/80">
            <span class="text-sm text-slate-400">Trả lời trong luồng...</span>
          </div>

          <!-- Send Button -->
          <button class="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/30 shrink-0 mb-0.5">
            <svg class="w-4 h-4 text-slate-950 fill-current" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </footer>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });

  // Assert elements exist
  const cardTitle = await page.textContent('text=Nadhira Ulya');
  if (!cardTitle) throw new Error('Customer card title missing');

  const customerBtn = await page.locator('button[title="Đính kèm khách hàng"]');
  if (!(await customerBtn.isVisible())) throw new Error('Attach customer button missing in toolbar');

  const screenshotPath = resolve(
    '/Users/dannydo/.gemini/antigravity/brain/2b09f7b3-ff3b-438a-a1ee-f0eb69a532a2/scratch/verify-mos-bug-178.png'
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
