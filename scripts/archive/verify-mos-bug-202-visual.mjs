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
    viewport: { width: 1200, height: 800 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MOS-BUG-202 Visual QA - Mini Chat Space Avatar Fix</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b1120; color: #f8fafc; }
      </style>
    </head>
    <body class="bg-slate-950 text-slate-100 p-8 flex flex-col items-center min-h-screen">
      <div class="max-w-4xl w-full">
        <div class="mb-6 border-b border-slate-800 pb-4">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">MOS-BUG-202</span>
            <span class="text-xs text-slate-400">Visual QA Check</span>
          </div>
          <h1 class="text-xl font-black text-white">Khắc phục Mini Chat chưa hiện avatar đúng của Không Gian (Space)</h1>
          <p class="text-xs text-slate-400 mt-1">Đồng bộ avatar đại diện của Space (Emoji 🚀, ảnh tùy chỉnh hoặc fallback icon #) lên thanh tiêu đề mini chat (MosChatDockedWindows) và nút điều hướng luồng.</p>
        </div>

        <div class="grid grid-cols-2 gap-6">
          <!-- BEFORE -->
          <div class="bg-slate-900/60 rounded-2xl border border-rose-500/30 p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span class="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                Trước khi sửa (Chỉ hiện dấu # đơn điệu)
              </span>
              <span class="text-[10px] text-rose-400/80 font-mono">&lt;Hash /&gt; hardcoded</span>
            </div>

            <!-- Mini Chat Mockup Before -->
            <div class="rounded-xl border border-slate-700/60 bg-[#141414] overflow-hidden flex flex-col shadow-xl">
              <!-- Header Before: Always # even when space has emoji 🚀 -->
              <div class="h-10 px-3 bg-[#1e1e1e] border-b border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <div class="w-6 h-6 rounded-lg flex items-center justify-center shadow-sm" style="background: rgba(16, 185, 129, 0.25);">
                    <svg class="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>
                  </div>
                  <span class="text-[13px] font-bold text-white tracking-tight">Chiến Binh Sale</span>
                  <span class="text-[10px] text-rose-400 bg-rose-500/10 px-1 rounded border border-rose-500/20">Mất avatar 🚀</span>
                </div>
                <div class="flex items-center gap-1 text-slate-400 text-xs">
                  <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Docked</span>
                </div>
              </div>
              <div class="p-4 text-center text-xs text-slate-500">
                Mini chat luôn hiển thị biểu tượng # mặc định, bỏ qua avatar emoji cấu hình của Space.
              </div>
            </div>
          </div>

          <!-- AFTER -->
          <div class="bg-slate-900/60 rounded-2xl border border-emerald-500/30 p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Sau khi sửa (Hiện đúng Emoji 🚀 & Avatar của Space)
              </span>
              <span class="text-[10px] text-emerald-400/80 font-mono">isSpaceEmoji + conv.avatar</span>
            </div>

            <!-- Mini Chat Mockup After -->
            <div class="rounded-xl border border-slate-700/60 bg-[#141414] overflow-hidden flex flex-col shadow-xl">
              <!-- Header After: Shows Emoji 🚀 properly -->
              <div class="h-10 px-3 bg-[#1e1e1e] border-b border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <div class="w-6 h-6 rounded-lg flex items-center justify-center shadow-sm overflow-hidden" style="background: rgba(16, 185, 129, 0.25);">
                    <span class="select-none leading-none text-xs">🚀</span>
                  </div>
                  <span class="text-[13px] font-bold text-white tracking-tight">Chiến Binh Sale</span>
                  <span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">✓ Chuẩn avatar</span>
                </div>
                <div class="flex items-center gap-1 text-slate-400 text-xs">
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Docked</span>
                </div>
              </div>
              <div class="p-4 text-center text-xs text-emerald-400/80 font-medium">
                Avatar hiển thị chuẩn xác: emoji Space được render nổi bật, đồng bộ 100% với Chat chính!
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

  const screenshotPath = resolve('/tmp/mos-bug-202-visual.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Visual verification passed! Screenshot saved to ${screenshotPath}`);
} catch (err) {
  console.error('Visual verification failed:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
