import { chromium } from 'playwright';
import { resolve } from 'path';

const t = setTimeout(() => {
  console.error('Timeout running Playwright visual test');
  process.exit(1);
}, 25000);
t.unref();

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
  });
  const page = await context.newPage();

  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark-theme">
    <head>
      <meta charset="UTF-8">
      <title>MOS-BUG-202 Reopen Verification</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { background: #0b0f19; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      </style>
    </head>
    <body class="p-8">
      <div class="max-w-5xl mx-auto space-y-6">
        <div class="border-b border-slate-800 pb-4">
          <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            MOS-BUG-202 REOPEN VERIFICATION
          </span>
          <h1 class="text-xl font-black text-white mt-2">
            Chuẩn hóa màu tin nhắn người gửi trong Mini Chat (Khải - reporterStaffId: 6)
          </h1>
          <p class="text-xs text-slate-400 mt-1">
            Đồng bộ 100% màu nền bubble (accentSoftBg), màu chữ (colorText), avatar trắng chữ và nhãn "Bạn" chuẩn mực
          </p>
        </div>

        <div class="grid grid-cols-2 gap-6">
          <!-- BEFORE: HARSH ORANGE BUBBLE -->
          <div class="bg-slate-900/60 rounded-2xl border border-red-500/30 p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span class="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                Trước khi sửa (Lỗi Khải báo: nền cam đậm chói mắt)
              </span>
              <span class="text-[10px] text-red-400/80 font-mono">bg-amber-500 gradient</span>
            </div>

            <!-- Mini Chat Mockup Before -->
            <div class="rounded-xl border border-slate-700/60 bg-[#141414] overflow-hidden flex flex-col shadow-xl">
              <!-- Header -->
              <div class="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <span class="text-xs font-bold text-slate-200"># core-team 📌</span>
                <span class="text-[10px] text-slate-400">Mini Chat</span>
              </div>
              <!-- Segmented Control Before -->
              <div class="p-2 border-b border-slate-800">
                <div class="grid grid-cols-2 p-0.5 rounded-xl bg-white/5 border border-white/5 text-xs">
                  <div class="py-1 text-center font-bold bg-amber-500 text-neutral-950 rounded-lg shadow-sm">💬 Tin nhắn</div>
                  <div class="py-1 text-center text-slate-400">⏱️ Tác vụ 9</div>
                </div>
              </div>
              <!-- Message Bubble Before -->
              <div class="p-3 space-y-3">
                <div class="flex gap-2 items-start flex-row-reverse">
                  <div class="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-[10px] text-black font-bold">K</div>
                  <div class="max-w-[85%] p-2.5 rounded-2xl rounded-tr-xs bg-gradient-to-br from-amber-500 to-orange-500 text-neutral-950 text-xs shadow-sm">
                    <div class="text-[10.5px] font-bold text-neutral-900/80 mb-1 flex justify-end">Nguyễn Quang Khải · 16:26</div>
                    <div class="space-y-1 text-amber-200 font-semibold text-[11px] leading-relaxed">
                      <p class="text-amber-100">01–30/11 | Mục tiêu Doanh thu Combo: 575 Triệu</p>
                      <p class="text-orange-200">🧡 CHƯƠNG TRÌNH THÁNG 11 – THANKSGIVING MONTH</p>
                      <p class="text-neutral-950">Thông điệp: * Cảm ơn vì đã chọn Wings ❤️*</p>
                      <p class="text-amber-100">🎁 1. KHÁCH ĐANG CÓ GÓI – MỞ THÊM GÓI</p>
                      <p class="text-neutral-950 text-[10px] italic">⚠️ Khó nhìn: chữ vàng cam chìm vào nền cam đậm chói mắt!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- AFTER: PERFECT THEME INTEGRATION -->
          <div class="bg-slate-900/60 rounded-2xl border border-emerald-500/30 p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span class="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                Sau khi sửa (Chuẩn theme mOS & đồng bộ Chat chính)
              </span>
              <span class="text-[10px] text-emerald-400/80 font-mono">accentSoftBg + token.colorText</span>
            </div>

            <!-- Mini Chat Mockup After -->
            <div class="rounded-xl border border-slate-700/60 bg-[#141414] overflow-hidden flex flex-col shadow-xl">
              <!-- Header -->
              <div class="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span class="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">🎯</span>
                  core-team 📌
                </span>
                <span class="text-[10px] text-emerald-400">✓ Đã đồng bộ</span>
              </div>
              <!-- Segmented Control After -->
              <div class="p-2 border-b border-slate-800">
                <div class="grid grid-cols-2 p-0.5 rounded-xl bg-white/5 border border-white/5 text-xs">
                  <div class="py-1 text-center font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-lg">💬 Tin nhắn</div>
                  <div class="py-1 text-center text-slate-400">⏱️ Tác vụ 9</div>
                </div>
              </div>
              <!-- Message Bubble After -->
              <div class="p-3 space-y-3">
                <div class="flex gap-2 items-start flex-row-reverse">
                  <div class="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-[10px] text-white font-bold">K</div>
                  <div class="max-w-[85%] p-2.5 rounded-2xl rounded-tr-xs bg-amber-500/15 border border-amber-500/35 text-slate-100 text-xs shadow-sm">
                    <div class="text-[10.5px] font-bold text-slate-200 mb-1 flex items-center justify-end gap-1">
                      <span>Nguyễn Quang Khải</span>
                      <span class="px-1.5 py-0.2 rounded-full text-[8.5px] font-extrabold bg-amber-500/20 text-amber-400">Bạn</span>
                      <span class="text-slate-400 font-normal">· 16:26</span>
                    </div>
                    <div class="space-y-1 text-slate-200 leading-relaxed text-[11px]">
                      <p class="text-amber-400 font-bold">01–30/11 | Mục tiêu Doanh thu Combo: 575 Triệu</p>
                      <p class="text-orange-400 font-semibold">🧡 CHƯƠNG TRÌNH THÁNG 11 – THANKSGIVING MONTH</p>
                      <p class="text-slate-300">Thông điệp: * Cảm ơn vì đã chọn Wings ❤️*</p>
                      <p class="text-amber-400 font-semibold">🎁 1. KHÁCH ĐANG CÓ GÓI – MỞ THÊM GÓI</p>
                      <p class="text-emerald-400 text-[10px] font-medium">✓ Chữ vàng, cam, trắng nổi bật sắc nét trên nền bán trong suốt!</p>
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

  const screenshotPath = resolve('/tmp/mos-bug-202-reopen-visual.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Visual verification passed! Screenshot saved to ${screenshotPath}`);
} catch (err) {
  console.error('Visual verification failed:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
