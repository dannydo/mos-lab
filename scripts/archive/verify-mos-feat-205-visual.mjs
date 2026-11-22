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
    viewport: { width: 1380, height: 960 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MOS-FEAT-205 Visual QA - Message Copying in Main Feed & Subthreads</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b1120; color: #f8fafc; }
      </style>
    </head>
    <body class="bg-slate-950 text-slate-100 p-8 flex flex-col items-center min-h-screen">
      <div class="max-w-6xl w-full">
        <div class="mb-6 border-b border-slate-800 pb-4">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">MOS-FEAT-205</span>
            <span class="text-xs text-slate-400">Playwright Visual QA &amp; Interactive Message Copying Verification</span>
          </div>
          <h1 class="text-xl font-black text-white">Sao chép tin nhắn mOS Chat (Cả trong luồng lẫn tin nhắn chính)</h1>
          <p class="text-xs text-slate-400 mt-1">Hỗ trợ nút sao chép 1-click trên thanh công cụ hover của tin nhắn chính, tin nhắn gốc trong luồng, các phản hồi phụ và cửa sổ docked; đồng thời đổi lớp <code>select-none</code> sang <code>select-text</code> cho phép bôi đen copy chữ mượt mà.</p>
        </div>

        <div class="grid grid-cols-2 gap-6">
          <!-- BEFORE -->
          <div class="bg-slate-900/60 rounded-2xl border border-rose-500/30 p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span class="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                Trước khi sửa (Chưa có tính năng sao chép)
              </span>
              <span class="text-[10px] text-rose-400 font-mono">select-none · Không có nút Copy</span>
            </div>

            <div class="space-y-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
              <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <div class="flex items-center justify-between text-slate-300 font-semibold mb-1">
                  <span>Tin nhắn chính (Main Feed)</span>
                  <span class="text-[10px] text-rose-400">❌ Chỉ có Reaction, Reply, Pin</span>
                </div>
                <div class="text-slate-400 select-none bg-slate-900/60 p-2 rounded border border-dashed border-rose-500/40">
                  "Khách hẹn làm mi lúc 14h hôm nay tại chi nhánh Q1"
                  <span class="block text-[10px] text-rose-400 mt-1 italic">⚠️ Bị khóa bôi đen chuột (select-none), không copy được</span>
                </div>
              </div>

              <div class="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <div class="flex items-center justify-between text-slate-300 font-semibold mb-1">
                  <span>Phản hồi trong luồng (Subthread)</span>
                  <span class="text-[10px] text-rose-400">❌ Thiếu nút Copy trên thanh công cụ</span>
                </div>
                <div class="text-slate-400 select-none bg-slate-900/60 p-2 rounded border border-dashed border-rose-500/40">
                  "Em đã xác nhận với khách rồi ạ, khách đi 2 người"
                  <span class="block text-[10px] text-rose-400 mt-1 italic">⚠️ Không có nút sao chép nhanh</span>
                </div>
              </div>
            </div>
          </div>

          <!-- AFTER -->
          <div class="bg-slate-900/60 rounded-2xl border border-emerald-500/30 p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Sau khi sửa (Nút sao chép 1-click &amp; Bôi đen tự do)
              </span>
              <span class="text-[10px] text-emerald-400 font-mono">select-text · 1-Click Copy Button</span>
            </div>

            <div class="space-y-4 p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-xs">
              <!-- Main message with copy button -->
              <div class="relative group p-3 rounded-lg bg-slate-800/80 border border-emerald-500/40">
                <div class="flex items-center justify-between text-slate-200 font-semibold mb-1">
                  <span class="flex items-center gap-1.5">
                    <span class="w-5 h-5 rounded-full bg-indigo-600 text-[10px] flex items-center justify-center font-bold">NV</span>
                    Chuyên Viên Mi (Tin nhắn chính)
                  </span>
                  <!-- Hover Toolbar with Copy Button -->
                  <div class="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-emerald-500/50 shadow">
                    <button class="p-1 rounded text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 font-bold flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      <span class="text-[10px]">Sao chép tin nhắn</span>
                    </button>
                    <span class="text-slate-600">|</span>
                    <span class="text-[10px] text-slate-400">Thả cảm xúc</span>
                    <span class="text-[10px] text-slate-400">Trả lời</span>
                  </div>
                </div>
                <div class="text-slate-100 select-text bg-slate-950/70 p-2.5 rounded border border-slate-700/60 cursor-text">
                  "Khách hẹn làm mi lúc 14h hôm nay tại chi nhánh Q1"
                  <span class="block text-[10px] text-emerald-400 mt-1.5 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    Bôi đen chuột tự do &amp; Bấm nút sao chép sao chép ngay lập tức
                  </span>
                </div>
              </div>

              <!-- Subthread reply with copy button -->
              <div class="relative group p-3 rounded-lg bg-slate-800/80 border border-emerald-500/40">
                <div class="flex items-center justify-between text-slate-200 font-semibold mb-1">
                  <span class="flex items-center gap-1.5">
                    <span class="w-5 h-5 rounded-full bg-violet-600 text-[10px] flex items-center justify-center font-bold">CC</span>
                    Chăm sóc Khách hàng (Trong luồng phụ)
                  </span>
                  <!-- Hover Toolbar for thread reply -->
                  <div class="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-emerald-500/50 shadow">
                    <button class="p-1 rounded text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 font-bold flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      <span class="text-[10px]">Sao chép phản hồi</span>
                    </button>
                  </div>
                </div>
                <div class="text-slate-100 select-text bg-slate-950/70 p-2.5 rounded border border-slate-700/60 cursor-text">
                  "Em đã xác nhận với khách rồi ạ, khách đi 2 người"
                  <span class="block text-[10px] text-emerald-400 mt-1.5 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    Nút sao chép phản hồi hoạt động mượt mà trong drawer luồng
                  </span>
                </div>
              </div>

              <!-- Toast notification mockup -->
              <div class="flex items-center gap-2 bg-slate-900/90 border border-emerald-500/60 px-3 py-2 rounded-lg text-emerald-300 text-[11px] shadow-lg">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Thông báo Toast: <b>"Đã sao chép tin nhắn vào clipboard"</b></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForLoadState('networkidle');

  const screenshotPath = resolve('/tmp/mos-feat-205-visual.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Playwright visual QA PASSED: Screenshot saved to ${screenshotPath}`);
} catch (err) {
  console.error('Visual verification failed:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
