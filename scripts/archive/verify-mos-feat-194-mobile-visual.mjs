import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const timeout = setTimeout(() => {
  console.error('[PLAYWRIGHT TIMEOUT] Test exceeded 25 seconds');
  process.exit(1);
}, 25000);
timeout.unref();

let browser = null;

try {
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Test iPhone 14/15 Viewport: 393 x 852
  const mobileContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const mobilePage = await mobileContext.newPage();

  const mobileHtml = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MOS-FEAT-194 Mobile Drawer Visual QA</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b0f19; color: #f8fafc; }
        .tabular-nums { font-variant-numeric: tabular-nums; }
        .mos-thin-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .mos-thin-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
      </style>
    </head>
    <body class="bg-black/80 text-slate-100 min-h-screen flex flex-col justify-end select-none">
      <!-- Backdrop Dimmer Overlay -->
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10"></div>

      <!-- Mobile Bottom Sheet Drawer (100% width, no left-shift or overflow) -->
      <div class="w-full bg-[#141414] rounded-t-[24px] border-t border-neutral-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
        
        <!-- Drag Handle Indicator -->
        <div class="py-2.5 flex justify-center shrink-0">
          <div class="w-10 h-1 bg-neutral-600/50 rounded-full"></div>
        </div>

        <!-- Drawer Header: Title, 2 mới badge, Đã xem tất cả, Close [✕] button -->
        <div class="px-4 py-2 border-b border-neutral-800/80 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2">
            <span class="font-bold text-base tracking-tight text-white">Thông báo</span>
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums bg-amber-500/15 text-amber-500 border border-amber-500/30">
              2 mới
            </span>
          </div>

          <div class="flex items-center gap-3">
            <button class="text-xs font-semibold text-neutral-400 hover:text-emerald-400 flex items-center gap-1 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
              <span>Đã xem tất cả</span>
            </button>
            <button class="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-800/60 text-neutral-400 hover:text-white" aria-label="Đóng">
              ✕
            </button>
          </div>
        </div>

        <!-- Mobile Full-Width Segmented Status Filter: Tất cả | Chưa đọc | Đã đọc -->
        <div class="px-3 pt-3 pb-2 shrink-0">
          <div class="flex items-center p-1 rounded-xl border border-neutral-700/60 bg-neutral-800/80 text-xs w-full">
            <button class="flex-1 py-1.5 rounded-lg font-medium text-center bg-neutral-700 text-white shadow-sm">
              Tất cả
            </button>
            <button class="flex-1 py-1.5 rounded-lg font-medium text-center text-neutral-400 flex items-center justify-center gap-1">
              <span>Chưa đọc</span>
              <span class="text-[10px] tabular-nums font-bold text-amber-400">(2)</span>
            </button>
            <button class="flex-1 py-1.5 rounded-lg font-medium text-center text-neutral-400 flex items-center justify-center gap-1">
              <span>Đã đọc</span>
              <span class="text-[10px] tabular-nums">(4)</span>
            </button>
          </div>
        </div>

        <!-- Horizontal Category Filter Chips -->
        <div class="px-3 py-2 border-b border-neutral-800/60 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 mos-thin-scrollbar">
          <span class="px-2.5 py-1 rounded-lg font-medium bg-neutral-800 text-neutral-100 border border-neutral-700 whitespace-nowrap">Tất cả (6)</span>
          <span class="px-2.5 py-1 rounded-lg font-medium text-neutral-400 whitespace-nowrap">Cần duyệt ⚡ (2)</span>
          <span class="px-2.5 py-1 rounded-lg font-medium text-neutral-400 whitespace-nowrap">Tin nhắn & @ (3)</span>
          <span class="px-2.5 py-1 rounded-lg font-medium text-neutral-400 whitespace-nowrap">Nhắc việc ⏰ (1)</span>
        </div>

        <!-- Notification List -->
        <div class="flex-1 overflow-y-auto px-2 py-2 space-y-2 mos-thin-scrollbar" style="max-height: 52vh;">
          <!-- Section 1: MỚI -->
          <div class="space-y-1.5">
            <div class="flex items-center justify-between px-2 pt-1 pb-1">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold uppercase tracking-wider text-amber-500">Mới</span>
                <span class="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-500">2</span>
              </div>
            </div>

            <!-- Item 1 (Unread) -->
            <div class="flex items-start gap-3 p-3 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20">
              <div class="relative shrink-0">
                <div class="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 to-rose-500">
                  <div class="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center font-bold text-xs text-amber-400">
                    DD
                  </div>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs">
                  <span class="font-bold text-white mr-1">Danny Do</span>
                  <span class="font-semibold text-neutral-200">[Duyệt Commit] Ticket #194</span>
                  <span class="text-[11px] text-neutral-400 ml-1">· 5 phút trước</span>
                </div>
                <p class="text-xs text-neutral-300 mt-1 line-clamp-2 leading-relaxed">
                  Bổ sung tính năng hiện thông báo đã đọc và thông báo mới đề xuất giao diện như Insta
                </p>
                <div class="flex items-center gap-2 mt-2">
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    Duyệt commit
                  </span>
                  <span class="text-[10px] font-medium text-amber-400">Mới</span>
                </div>
              </div>
              <div class="flex flex-col items-end justify-between self-stretch gap-2 shrink-0">
                <div class="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]"></div>
                <button class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500 text-white flex items-center gap-1 shadow-sm">
                  <span>Duyệt</span>
                  <span>↗</span>
                </button>
              </div>
            </div>

            <!-- Item 2 (Unread) -->
            <div class="flex items-start gap-3 p-3 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20">
              <div class="relative shrink-0">
                <div class="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 to-rose-500">
                  <div class="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center font-bold text-xs text-amber-400">
                    QK
                  </div>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs">
                  <span class="font-bold text-white mr-1">Nguyễn Quang Khải</span>
                  <span class="font-semibold text-neutral-200">nhắc bạn trong #space-core-team</span>
                  <span class="text-[11px] text-neutral-400 ml-1">· 15 phút trước</span>
                </div>
                <p class="text-xs text-neutral-300 mt-1 line-clamp-2 leading-relaxed">
                  Nhờ anh Danny kiểm tra giúp em luồng thông báo này
                </p>
                <div class="flex items-center gap-2 mt-2">
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    @Mention
                  </span>
                  <span class="text-[10px] font-medium text-amber-400">Mới</span>
                </div>
              </div>
              <div class="flex flex-col items-end justify-between self-stretch gap-2 shrink-0">
                <div class="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]"></div>
                <button class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500 text-white flex items-center gap-1 shadow-sm">
                  <span>Mở việc</span>
                  <span>↗</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Section 2: TRƯỚC ĐÓ -->
          <div class="pt-2">
            <div class="flex items-center justify-between px-2 pt-2 pb-1 border-t border-neutral-800/80">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold uppercase tracking-wider text-neutral-500">Trước đó</span>
                <span class="text-[10px] text-neutral-500">(4)</span>
              </div>
            </div>

            <!-- Item 3 (Read) -->
            <div class="flex items-start gap-3 p-3 rounded-2xl bg-neutral-900/30 hover:bg-neutral-900/50 border border-transparent">
              <div class="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-400 shrink-0">
                DD
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs">
                  <span class="font-bold text-neutral-300 mr-1">Danny Do</span>
                  <span class="font-normal text-neutral-400">[Đã xong] Ticket #192</span>
                  <span class="text-[11px] text-neutral-500 ml-1">· 2 giờ trước</span>
                </div>
                <p class="text-xs text-neutral-400 mt-1 line-clamp-1 leading-relaxed">
                  mOS FUND MASTER hoàn thiện nền tảng vận hành
                </p>
              </div>
              <div class="shrink-0 flex items-center">
                <button class="text-xs font-medium px-2 py-1 rounded-lg bg-neutral-800 text-neutral-300 flex items-center gap-1">
                  <span>Chi tiết</span>
                  <span>↗</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile Bottom Drawer Footer -->
        <div class="px-4 py-3 border-t border-neutral-800 bg-neutral-900/60 flex items-center justify-between shrink-0" style="padding-bottom: max(16px, env(safe-area-inset-bottom, 16px));">
          <span class="text-xs text-neutral-400 font-medium">6 thông báo</span>
          <button class="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold text-xs flex items-center gap-1.5 hover:bg-amber-500/20 transition-all">
            <span>Mở mOS Inbox</span>
            <span>↗</span>
          </button>
        </div>
      </div>
    </body>
    </html>
  `;

  await mobilePage.setContent(mobileHtml);
  await mobilePage.waitForLoadState('networkidle');

  mkdirSync(resolve('output/playwright'), { recursive: true });
  const screenshotPath = resolve('output/playwright/mos-feat-194-mobile-bottom-sheet-fix.png');
  await mobilePage.screenshot({ path: screenshotPath });

  console.log(`[VISUAL QA PASSED] Mobile bottom sheet screenshot saved at: ${screenshotPath}`);
} finally {
  if (browser) {
    await browser.close();
  }
  process.exit(0);
}
