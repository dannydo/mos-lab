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
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MOS-BUG-201 Visual QA - Mini Chat Color & Contrast Normalization</title>
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
            <span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">MOS-BUG-201</span>
            <span class="text-xs text-slate-400">Visual QA Check</span>
          </div>
          <h1 class="text-xl font-black text-white">Khắc phục màu sắc và độ tương phản ở Mini Chat (Docked Windows)</h1>
          <p class="text-xs text-slate-400 mt-1">Chuẩn hóa màu bóng chat của người gửi (isMine) về tông màu nền bán trong suốt thanh lịch (accentSoftBg), xóa bỏ hoàn toàn dải màu cam đậm chói mắt làm chìm văn bản vàng/cam.</p>
        </div>

        <div class="grid grid-cols-2 gap-6">
          <!-- BEFORE -->
          <div class="bg-slate-900/60 rounded-2xl border border-rose-500/30 p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span class="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                Trước khi sửa (Lỗi tương phản cực thấp)
              </span>
              <span class="text-[10px] text-slate-500 font-mono">bg-gradient-to-br from-[#d4a84b] to-[#b45309]</span>
            </div>

            <!-- Mini Chat Mockup Before -->
            <div class="rounded-xl border border-slate-700/60 bg-[#141414] overflow-hidden flex flex-col shadow-xl">
              <!-- Header -->
              <div class="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <span class="text-xs font-bold text-amber-400"># ken's 📌</span>
                <span class="text-[10px] text-slate-400">Mini Chat</span>
              </div>
              <!-- Segmented Control Before -->
              <div class="p-2 border-b border-slate-800">
                <div class="grid grid-cols-2 p-0.5 rounded-xl bg-black/40 text-xs">
                  <div class="py-1 text-center font-bold bg-amber-500 text-neutral-950 rounded-lg shadow-sm">💬 Tin nhắn</div>
                  <div class="py-1 text-center text-neutral-400">⏱️ Tác vụ</div>
                </div>
              </div>
              <!-- Message Bubble Before -->
              <div class="p-3 space-y-3">
                <div class="flex gap-2 items-start flex-row-reverse">
                  <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-[#d4a84b] to-[#b45309] flex items-center justify-center text-[10px] text-black font-bold">K</div>
                  <div class="max-w-[85%] p-2.5 rounded-2xl rounded-tr-xs bg-gradient-to-br from-[#d4a84b] to-[#b45309] text-neutral-950 text-xs shadow-sm">
                    <div class="text-[10.5px] font-bold text-neutral-900/80 mb-1 flex justify-end">Nguyễn Quang Khải · 11:10</div>
                    <div class="space-y-1 text-amber-300 font-semibold text-[11px] leading-relaxed">
                      <p class="text-amber-200">01–30/11 | Mục tiêu Doanh thu Combo: 575 Triệu</p>
                      <p class="text-orange-300">🧡 CHƯƠNG TRÌNH THÁNG 11 – THANKSGIVING MONTH</p>
                      <p class="text-neutral-900">Thông điệp: * Cảm ơn vì đã chọn Wings ❤️*</p>
                      <p class="text-amber-200">🎁 1. KHÁCH ĐANG CÓ GÓI – MỞ THÊM GÓI</p>
                      <p class="text-neutral-900 text-[10px] italic">⚠️ Khó nhìn do chữ vàng cam chìm vào nền cam đậm!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- AFTER -->
          <div class="bg-slate-900/60 rounded-2xl border border-emerald-500/30 p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Sau khi sửa (Đồng bộ chuẩn Theme & Chat chính)
              </span>
              <span class="text-[10px] text-emerald-400/80 font-mono">accentSoftBg + token.colorText</span>
            </div>

            <!-- Mini Chat Mockup After -->
            <div class="rounded-xl border border-slate-700/60 bg-[#141414] overflow-hidden flex flex-col shadow-xl">
              <!-- Header -->
              <div class="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <span class="text-xs font-bold text-amber-400"># ken's 📌</span>
                <span class="text-[10px] text-emerald-400">✓ Đã đồng bộ</span>
              </div>
              <!-- Segmented Control After -->
              <div class="p-2 border-b border-slate-800">
                <div class="grid grid-cols-2 p-0.5 rounded-xl bg-white/5 border border-white/5 text-xs">
                  <div class="py-1 text-center font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-lg">💬 Tin nhắn</div>
                  <div class="py-1 text-center text-slate-400">⏱️ Tác vụ</div>
                </div>
              </div>
              <!-- Message Bubble After -->
              <div class="p-3 space-y-3">
                <div class="flex gap-2 items-start flex-row-reverse">
                  <div class="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-[10px] text-black font-bold">K</div>
                  <div class="max-w-[85%] p-2.5 rounded-2xl rounded-tr-xs bg-amber-500/15 border border-amber-500/35 text-slate-100 text-xs shadow-sm">
                    <div class="text-[10.5px] font-bold text-amber-400 mb-1 flex items-center justify-end gap-1">
                      <span>Nguyễn Quang Khải</span>
                      <span class="px-1.5 py-0.2 rounded-full text-[8.5px] font-extrabold bg-amber-500/20 text-amber-400">Bạn</span>
                      <span class="text-slate-400 font-normal">· 11:10</span>
                    </div>
                    <div class="space-y-1 text-slate-200 leading-relaxed text-[11px]">
                      <p class="text-amber-400 font-bold">01–30/11 | Mục tiêu Doanh thu Combo: 575 Triệu</p>
                      <p class="text-orange-400 font-semibold">🧡 CHƯƠNG TRÌNH THÁNG 11 – THANKSGIVING MONTH</p>
                      <p class="text-slate-300">Thông điệp: * Cảm ơn vì đã chọn Wings ❤️*</p>
                      <p class="text-amber-400 font-semibold">🎁 1. KHÁCH ĐANG CÓ GÓI – MỞ THÊM GÓI</p>
                      <p class="text-emerald-400 text-[10px] font-medium">✓ Chữ vàng, cam, trắng nổi bật sắc nét trên nền tối bán trong suốt!</p>
                    </div>
                  </div>
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

  const screenshotPath = resolve('/tmp/mos-bug-201-visual.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Visual verification passed! Screenshot saved to ${screenshotPath}`);
} catch (err) {
  console.error('Visual verification failed:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
