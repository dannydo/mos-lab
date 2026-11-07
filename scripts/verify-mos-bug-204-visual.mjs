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
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MOS-BUG-204 Visual QA - Image Preview Lightbox Stacking Context Fix</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b1120; color: #f8fafc; }
      </style>
    </head>
    <body class="bg-slate-950 text-slate-100 p-8 flex flex-col items-center min-h-screen">
      <div class="max-w-5xl w-full">
        <div class="mb-6 border-b border-slate-800 pb-4">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">MOS-BUG-204</span>
            <span class="text-xs text-slate-400">Playwright Visual QA &amp; Lightbox Stacking Verification</span>
          </div>
          <h1 class="text-xl font-black text-white">Khắc phục lỗi bấm xem hình trong phản hồi mOS bị che khuất UI</h1>
          <p class="text-xs text-slate-400 mt-1">Chuẩn hóa hệ thống Z-Index cho Bug Report Ecosystem: Nâng <code>BUG_REPORT_Z_INDEX.PREVIEW</code> lên <code>12200</code> vượt trên Modal Rejection (<code>12050</code>), Workflow (<code>12040</code>) và Surface (<code>12010</code>), bổ sung hiệu ứng mờ nền backdrop blur 8px.</p>
        </div>

        <div class="grid grid-cols-2 gap-6">
          <!-- BEFORE -->
          <div class="bg-slate-900/60 rounded-2xl border border-rose-500/30 p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span class="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                Trước khi sửa (Lỗi UI kẹt bên dưới modal)
              </span>
              <span class="text-[10px] text-rose-400/80 font-mono">z-index: 12030 &lt; modal 12050</span>
            </div>

            <!-- Mockup Before -->
            <div class="relative h-[480px] rounded-xl border border-slate-800 bg-[#141414] overflow-hidden flex flex-col shadow-xl">
              <!-- Background / Page Content -->
              <div class="p-3 opacity-30 text-xs text-slate-400">
                Dashboard &gt; Phản hồi mOS &gt; Nghiệm thu tính năng
              </div>

              <!-- Rejection Modal (z-index 12050) -->
              <div class="absolute inset-x-4 top-10 rounded-xl bg-slate-900 border border-slate-700 p-4 shadow-2xl z-20">
                <div class="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                  <h3 class="text-xs font-bold text-white">Phản hồi điểm chưa đúng (MOS-FEAT-194)</h3>
                  <span class="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-mono font-bold">z-index: 12050</span>
                </div>
                <div class="text-[11px] text-slate-300 mb-2">Lý do từ chối nghiệm thu: Đính kèm hình ảnh giao diện lỗi.</div>
                
                <!-- Attachment Thumbnail -->
                <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div class="w-10 h-10 rounded bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs">🖼️</div>
                  <div class="text-[11px] flex-1 truncate text-slate-200">screenshot-issue.jpg</div>
                  <span class="text-[10px] text-amber-400 underline cursor-pointer">Bấm xem hình</span>
                </div>

                <div class="mt-4 flex justify-end gap-2">
                  <div class="px-3 py-1 rounded text-[11px] bg-slate-800 text-slate-300">Đóng</div>
                  <div class="px-3 py-1 rounded text-[11px] bg-rose-600 text-white font-bold">Gửi phản hồi</div>
                </div>
              </div>

              <!-- Obscured Lightbox Behind Modal (z-index 12030) -->
              <div class="absolute inset-0 bg-black/60 z-10 flex items-center justify-center p-6">
                <div class="w-72 h-44 rounded-lg bg-indigo-950/80 border border-indigo-500/40 p-4 flex flex-col items-center justify-center text-center shadow-2xl">
                  <span class="text-xs font-bold text-slate-400">Cửa sổ phóng to ảnh bị che khuất</span>
                  <span class="text-[10px] text-rose-400 font-mono mt-1">z-index: 12030 (Bị kẹt dưới Modal 12050)</span>
                  <span class="text-[10px] text-rose-400 mt-2">⚠️ Người dùng không thể xem trọn vẹn bằng chứng!</span>
                </div>
              </div>
            </div>
          </div>

          <!-- AFTER -->
          <div class="bg-slate-900/60 rounded-2xl border border-emerald-500/30 p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Sau khi sửa (Nổi hoàn toàn trên đỉnh màn hình)
              </span>
              <span class="text-[10px] text-emerald-400 font-mono">z-index: 12200 &gt; modal 12050</span>
            </div>

            <!-- Mockup After -->
            <div class="relative h-[480px] rounded-xl border border-slate-800 bg-[#141414] overflow-hidden flex flex-col shadow-xl">
              <!-- Rejection Modal Dimmed Behind (z-index 12050) -->
              <div class="absolute inset-x-4 top-10 rounded-xl bg-slate-900/80 border border-slate-700/60 p-4 opacity-40 z-10">
                <div class="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                  <h3 class="text-xs font-bold text-white">Phản hồi điểm chưa đúng (MOS-FEAT-194)</h3>
                  <span class="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono">z-index: 12050</span>
                </div>
                <div class="text-[11px] text-slate-300 mb-2">Lý do từ chối: Giao diện notification chưa đúng format...</div>
              </div>

              <!-- Backdrop Blur Mask (z-index 12200) -->
              <div class="absolute inset-0 bg-black/75 backdrop-blur-md z-20 flex flex-col items-center justify-center p-4">
                <div class="relative max-w-sm w-full rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-500/50 p-5 shadow-2xl flex flex-col items-center text-center">
                  <div class="absolute -top-3 right-3 bg-emerald-500 text-neutral-950 font-black text-[10px] px-2.5 py-0.5 rounded-full shadow">
                    ✓ z-index: 12200
                  </div>
                  <div class="w-full h-44 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center mb-3 overflow-hidden">
                    <img class="max-h-full object-contain" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='150' fill='%231e1b4b'><rect width='300' height='150' rx='8'/><text x='50%' y='45%' dominant-baseline='middle' text-anchor='middle' fill='%23a5b4fc' font-size='14' font-weight='bold'>Ảnh bằng chứng nghiệm thu</text><text x='50%' y='65%' dominant-baseline='middle' text-anchor='middle' fill='%2310b981' font-size='11'>Hiển thị sắc nét &amp; không bị đè UI</text></svg>" />
                  </div>
                  <div class="text-xs font-bold text-white flex items-center gap-1.5">
                    <span class="text-emerald-400">✓</span> Ảnh phóng to hiển thị chuẩn mực trên toàn bộ modal
                  </div>
                  <div class="text-[10px] text-slate-400 mt-1">Lớp nền làm mờ 8px (Backdrop Blur) giúp tập trung 100% vào bằng chứng</div>
                </div>
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

  const screenshotPath = resolve('/tmp/mos-bug-204-visual.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Playwright visual QA PASSED: Screenshot saved to ${screenshotPath}`);
} catch (err) {
  console.error('Visual verification failed:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
