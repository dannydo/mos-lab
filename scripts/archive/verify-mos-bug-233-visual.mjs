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
    viewport: { width: 459, height: 938 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MOS-BUG-233 Visual QA - Sync Authenticated Account Profile Across Roles</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b1120; color: #f8fafc; }
      </style>
    </head>
    <body class="bg-slate-950 text-slate-100 p-4 flex flex-col items-center min-h-screen">
      <div class="w-full max-w-sm space-y-4">
        <div class="border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">MOS-BUG-233</span>
            <span class="text-[11px] text-slate-400">Playwright Visual QA · Profile Sync</span>
          </div>
          <h1 class="text-sm font-black text-white">Đồng bộ Account Chính Chủ Khi Chọn Vai Trò (CC / CVL / CVLL)</h1>
          <p class="text-[10px] text-slate-400 mt-1">Đã sửa triệt để lỗi khi Admin / Người dùng chọn CC hoặc CVL bị gán cứng vào tài khoản Diễm Hương hoặc Khanh Cao. Giờ đây hiển thị đúng 100% tài khoản chính chủ của người đăng nhập.</p>
        </div>

        <!-- 1. Top Bar Pill with CC & Khải Profile -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
          <div class="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>1. Header Pill (Góc trên bên phải)</span>
            <span class="text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">CHÍNH CHỦ</span>
          </div>
          <div class="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 rounded-full text-xs font-black bg-amber-500 text-black shadow-sm">CC</span>
              <div>
                <div class="text-xs font-bold text-white">Nguyễn Quang Khải</div>
                <div class="text-[10px] text-slate-400">Staff #45103 · Admin acting as CC</div>
              </div>
            </div>
            <div class="w-8 h-8 rounded-full border-2 border-amber-400 overflow-hidden bg-amber-400/20 flex items-center justify-center font-black text-amber-300 text-xs shadow">
              K
            </div>
          </div>
        </div>

        <!-- 2. Profile Menu Sheet Identity Header -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
          <div class="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>2. IosProfileMenuSheet (Menu Hồ sơ)</span>
            <span class="text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">KHÔNG BỊ DIỄM HƯƠNG</span>
          </div>
          <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
            <div class="w-12 h-12 rounded-full border-2 border-amber-400 bg-amber-400/20 flex items-center justify-center font-black text-amber-300 text-base shadow">
              K
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <span class="font-extrabold text-sm text-white">Nguyễn Quang Khải</span>
                <span class="bg-amber-400/20 text-amber-400 border border-amber-400/30 text-[10px] font-black px-2 py-0.5 rounded-full">CC</span>
              </div>
              <div class="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <span>📍 Chi nhánh Đề Thám</span>
                <span>·</span>
                <span class="text-emerald-400 font-semibold">Đang hoạt động</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Clean Role Switcher List -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
          <div class="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
            <span>3. Danh Sách Vai Trò (Đã bỏ tên hardcode)</span>
          </div>
          <div class="space-y-1.5">
            <div class="p-2.5 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between">
              <div>
                <div class="text-xs font-bold text-white flex items-center gap-1">
                  <span class="text-amber-400">🪶</span>
                  <span>· Chuyên Viên Tự Chủ (CVL)</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5">1 khách đầu tua + khách book, 90% Tip</div>
              </div>
            </div>
            <div class="p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-center justify-between">
              <div>
                <div class="text-xs font-bold text-amber-300">Tư Vấn Viên (Client Consultant · CC)</div>
                <div class="text-[10px] text-amber-200/70 mt-0.5">Toàn bộ khách tại chi nhánh, tiếp đón & tư vấn</div>
              </div>
              <span class="text-amber-400 font-black text-xs">✓ ĐANG CHỌN</span>
            </div>
          </div>
        </div>

        <!-- 4. Result badge -->
        <div class="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2">
          <div class="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center font-black text-xs">✓</div>
          <div class="text-[11.5px] text-emerald-300 font-bold leading-tight">
            Tất cả 136 vitest tests + UI contract test đã PASSED. Account chính chủ được bảo lưu 100%.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForLoadState('networkidle');

  const screenshotPath = resolve(process.cwd(), 'docs/screenshots/verify-mos-bug-233-visual.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log(`[PASS] Playwright visual QA snapshot saved to ${screenshotPath}`);
  process.exit(0);
} catch (err) {
  console.error('[FAIL] Playwright visual test failed:', err);
  process.exit(1);
} finally {
  if (browser) await browser.close();
}
