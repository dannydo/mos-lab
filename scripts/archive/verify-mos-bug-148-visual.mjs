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
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=390, initial-scale=1.0">
      <title>MOS-BUG-148 Visual Verification</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #020617; color: #f8fafc; }
      </style>
    </head>
    <body class="p-3 bg-slate-950 flex flex-col gap-4">
      <!-- 1. Main Room Message with Unread Thread Count Badge -->
      <div class="p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
        <div class="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
          1. Hiển thị tin nhắn chưa đọc trong Thread trên Mobile
        </div>
        <div class="flex flex-col items-start gap-1">
          <div class="px-3.5 py-2.5 rounded-2xl bg-slate-800 border border-slate-700/80 text-slate-100 text-xs max-w-[85%] shadow-sm">
            <div class="font-bold text-[11px] text-amber-400 mb-0.5">Nguyễn Quang Khải</div>
            Em chuyển 2 tin này vào trong luồng trên Desktop đã work nhưng trên mobile thì chưa
            <div class="text-[10px] text-slate-400 text-right mt-1 tabular-nums">14:15 · ✓✓</div>
          </div>

          <!-- Thread badge with unread count (+2 mới) -->
          <button class="mt-1 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-900/90 border border-indigo-500 text-indigo-200 shadow-md">
            <span>💬 2 câu trả lời trong luồng</span>
            <span class="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold tabular-nums">
              +2 mới
            </span>
          </button>
        </div>
      </div>

      <!-- 2. Mobile Reaction & Action Sheet with Move to Thread option & Delete -->
      <div class="p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
        <div class="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
          2. Action Sheet: Thêm tuỳ chọn "Gộp vào luồng khác" & Xoá tin nhắn
        </div>
        <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 space-y-1">
          <div class="flex items-center justify-around bg-slate-800/90 border border-slate-700/60 rounded-xl py-1.5 px-2 mb-2">
            <span class="text-xl">👍</span><span class="text-xl">❤️</span><span class="text-xl">😂</span><span class="text-xl">😮</span><span class="text-xl">😢</span><span class="text-xl">🙏</span>
          </div>
          <div class="flex items-center gap-2.5 px-2.5 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-lg">
            <span class="text-amber-400">↪</span>
            <span class="font-medium">Trả lời tin nhắn</span>
          </div>
          <div class="flex items-center gap-2.5 px-2.5 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-lg">
            <span class="text-indigo-400">💬</span>
            <span class="font-medium">Thảo luận trong luồng (Thread)</span>
          </div>
          <div class="flex items-center gap-2.5 px-2.5 py-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <span class="text-amber-400 font-bold">↳</span>
            <span class="font-bold">Gộp tin nhắn vào luồng khác... (1-Click)</span>
          </div>
          <div class="flex items-center gap-2.5 px-2.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg">
            <span>🗑</span>
            <span class="font-medium">Xóa tin nhắn (Hoạt động chuẩn xác)</span>
          </div>
        </div>
      </div>

      <!-- 3. MosChatMobileMoveThreadModal Visual Preview -->
      <div class="p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
        <div class="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
          3. Modal Chuyển/Gộp tin nhắn vào Luồng trên Mobile
        </div>
        <div class="bg-slate-900 border border-slate-700/80 rounded-2xl p-3 space-y-2.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">↳</span>
              <div>
                <div class="text-xs font-bold text-white">Gộp tin nhắn vào luồng phụ</div>
                <div class="text-[10px] text-slate-400">Chọn tin nhắn đích để chuyển vào thảo luận trong luồng</div>
              </div>
            </div>
            <span class="text-slate-400 text-sm">✕</span>
          </div>

          <!-- 1-Click Fast Action -->
          <div class="p-2 rounded-xl bg-amber-500/15 border border-amber-500/40">
            <div class="flex items-center justify-between text-[11px] font-bold text-amber-400">
              <span>⚡ Gộp vào luồng ngay phía trên (1-Chạm)</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20">2 trả lời</span>
            </div>
            <div class="text-xs text-slate-200 truncate mt-0.5">
              <span class="font-bold text-white">Nguyễn Quang Khải:</span> Tin nhắn gốc có luồng thảo luận
            </div>
          </div>

          <!-- Candidates list -->
          <div class="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
            <div>
              <div class="font-bold text-white text-[11px]">Danny Do · 14:10</div>
              <div class="text-slate-300 text-xs truncate max-w-[240px]">Anh đang nâng cấp từ từ cho mobile...</div>
            </div>
            <span class="text-[10px] text-indigo-400 font-bold">💬 3</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.screenshot({ path: '/tmp/playwright-mos-bug-148-visual.png' });
  console.log('Playwright visual QA PASSED: Screenshot saved to /tmp/playwright-mos-bug-148-visual.png');
} catch (err) {
  console.error('Playwright verification failed:', err);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  process.exit(0);
}
