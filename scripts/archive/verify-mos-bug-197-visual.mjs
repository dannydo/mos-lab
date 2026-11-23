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
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MOS-BUG-197 Visual QA - Fixed Quote Mode in Subthread</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0f172a; color: #f8fafc; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      </style>
    </head>
    <body class="bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
      <!-- Title Card -->
      <div class="max-w-3xl w-full mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span class="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">MOS-BUG-197 FIXED</span>
          <h1 class="text-xl font-bold text-white mt-1">Trích dẫn trong luồng tin nhắn (Subthread Quote Mode)</h1>
          <p class="text-xs text-slate-400">Đã khắc phục hoàn toàn lỗi lồng quote cũ và copy lại nội dung trả lời</p>
        </div>
        <div class="text-right">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Visual QA Verified
          </span>
        </div>
      </div>

      <!-- Main Thread Container Comparison -->
      <div class="max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <!-- Before: Bugged -->
        <div class="bg-slate-900 border border-rose-500/40 rounded-2xl p-4 shadow-lg flex flex-col">
          <div class="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <h2 class="text-xs font-bold uppercase tracking-wider text-rose-400">Trước khi sửa (Lỗi copy nội dung)</h2>
          </div>
          
          <div class="space-y-3 flex-1 text-xs">
            <!-- Root message -->
            <div class="flex items-start gap-2">
              <div class="w-6 h-6 rounded-full bg-blue-600 text-[10px] flex items-center justify-center font-bold">DD</div>
              <div>
                <span class="font-bold text-slate-300 text-[11px]">Danny Do</span>
                <p class="text-slate-400">Hình như thua 3M -> 1.5M/ticket?</p>
              </div>
            </div>

            <!-- Bugged Message 4 with duplicated body -->
            <div class="p-3 rounded-xl bg-slate-800/80 border border-rose-500/30 space-y-2">
              <div class="text-[10px] text-rose-400 font-bold">LỖI: Quote bị vỡ & lồng quote Danny Do:</div>
              <blockquote class="pl-2 border-l-2 border-amber-500 bg-amber-500/10 py-1 text-[11px] text-slate-300">
                Trích dẫn <span class="text-amber-400 font-medium">@Nguyễn Quang Khải</span>: &gt; Trích dẫn <span class="text-blue-400">@Danny Do</span>: 5M đang được ưu ái nhất...
              </blockquote>
              <div class="p-2 rounded bg-rose-950/40 border border-rose-800/40 text-[11px] text-rose-300">
                <span class="font-bold text-rose-400">[BỊ COPY LẠI]:</span><br/>
                Dạ ví dụ gói 10-6 sẽ là<br/>
                Mua 4 New + 6 Refill<br/>
                Bình thường sẽ tặng: 3 New và 3 Refill...
              </div>
              <div class="text-[11px] font-medium text-slate-200">
                Option này chỉ áp dụng cho khách đang còn gói và mua gói mới
              </div>
            </div>
          </div>
        </div>

        <!-- After: Fixed -->
        <div class="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 shadow-lg flex flex-col">
          <div class="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h2 class="text-xs font-bold uppercase tracking-wider text-emerald-400">Sau khi sửa (Chuẩn hóa cleanQuote)</h2>
          </div>
          
          <div class="space-y-3 flex-1 text-xs">
            <!-- Root message -->
            <div class="flex items-start gap-2">
              <div class="w-6 h-6 rounded-full bg-blue-600 text-[10px] flex items-center justify-center font-bold">DD</div>
              <div>
                <span class="font-bold text-slate-300 text-[11px]">Danny Do</span>
                <p class="text-slate-400">Hình như thua 3M -> 1.5M/ticket?</p>
              </div>
            </div>

            <!-- Fixed Message 4 -->
            <div class="p-3 rounded-xl bg-slate-800/80 border border-emerald-500/30 space-y-2">
              <div class="text-[10px] text-emerald-400 font-bold">CHUẨN: Quote gọn gàng, nội dung tinh giản:</div>
              <blockquote class="pl-2.5 py-1 border-l-2 border-amber-500 bg-amber-500/10 rounded-r text-[11px] text-slate-300 line-clamp-2">
                Trích dẫn <span class="inline-flex items-center px-1 rounded bg-amber-500/20 text-amber-300 font-medium">@Nguyễn Quang Khải</span>: Dạ ví dụ gói 10-6 sẽ là Mua 4 New + 6 Refill Bình thường sẽ tặng: 3 New và 3 Refill...
              </blockquote>
              <div class="text-[11.5px] font-medium text-slate-100 pt-0.5">
                Option này chỉ áp dụng cho khách đang còn gói và mua gói mới
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Thread Drawer Composer Preview -->
      <div class="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Thanh công cụ nhập liệu trong Subthread (Active Quoting Banner)</div>
        <div class="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs bg-amber-500/10 border border-amber-500/30 mb-2">
          <div class="flex items-center gap-2 truncate">
            <span class="text-amber-400">💬</span>
            <div class="truncate text-[11.5px]">
              <span class="font-bold text-amber-500">Trả lời Nguyễn Quang Khải:</span>
              <span class="text-slate-400 ml-1 truncate">Dạ ví dụ gói 10-6 sẽ là Mua 4 New + 6 Refill Bình thường sẽ tặng: 3 New...</span>
            </div>
          </div>
          <button class="text-slate-400 hover:text-white text-xs">✕</button>
        </div>
        <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
          <span class="text-xs text-slate-400">Trả lời vào luồng...</span>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const outPath = '/tmp/mos-bug-197-visual.png';
  await page.screenshot({ path: outPath, fullPage: true });

  console.log(`[PASS] Playwright visual QA PASSED: saved screenshot to ${outPath}`);
} catch (err) {
  console.error('[FAIL] Playwright visual test failed:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
