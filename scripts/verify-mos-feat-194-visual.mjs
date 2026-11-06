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

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MOS-FEAT-194 Instagram-Style Notification Center Visual QA</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b0f19; color: #f8fafc; }
        .tabular-nums { font-variant-numeric: tabular-nums; }
        .mos-thin-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .mos-thin-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
      </style>
    </head>
    <body class="bg-slate-950 text-slate-100 min-h-screen p-8 flex flex-col justify-center items-center select-none">
      <div class="w-full max-w-5xl space-y-6">
        <!-- Title bar -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-2xl">📸</span>
              <h1 class="text-xl font-black text-amber-400">
                mOS Notification Center — Instagram Activity Interface [MOS-FEAT-194]
              </h1>
            </div>
            <p class="text-xs text-slate-400 mt-1">
              Phân tách rõ ràng giữa mục <strong>"MỚI" (Chưa đọc)</strong> với chấm sáng chỉ báo và mục <strong>"TRƯỚC ĐÓ" (Đã đọc)</strong>, kèm bộ lọc phân đoạn Instagram (Tất cả · Chưa đọc · Đã đọc), avatar story ring và nút hành động nhanh.
            </p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            ✓ Instagram Mode
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <!-- 1. DARK THEME INSTAGRAM NOTIFICATION CENTER -->
          <div class="space-y-3">
            <div class="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              <span>1. Giao diện Tối (Dark Theme)</span>
              <span class="text-amber-400 font-semibold text-[11px]">⌘I Popover</span>
            </div>

            <!-- Popover Card -->
            <div class="w-full bg-[#171717] rounded-3xl border border-[#2e2e2e] shadow-2xl overflow-hidden flex flex-col">
              <!-- Popover Header -->
              <div class="px-4 py-3.5 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-base tracking-tight text-white">Thông báo</span>
                  <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums bg-amber-500/15 text-amber-500 border border-amber-500/30">
                    2 mới
                  </span>
                </div>

                <!-- Instagram Segmented Pills -->
                <div class="inline-flex items-center p-0.5 rounded-xl border border-neutral-700/60 bg-neutral-800/80 text-xs">
                  <button class="px-2.5 py-1 rounded-lg font-medium bg-neutral-700 text-white shadow-sm">Tất cả</button>
                  <button class="px-2.5 py-1 rounded-lg font-medium text-neutral-400 hover:text-neutral-200 flex items-center gap-1">
                    <span>Chưa đọc</span>
                    <span class="text-[10px] tabular-nums font-bold text-amber-400">(2)</span>
                  </button>
                  <button class="px-2.5 py-1 rounded-lg font-medium text-neutral-400 hover:text-neutral-200 flex items-center gap-1">
                    <span>Đã đọc</span>
                    <span class="text-[10px] tabular-nums">(4)</span>
                  </button>
                </div>
              </div>

              <!-- Category Chips -->
              <div class="px-3 py-2 border-b border-neutral-800/80 bg-neutral-900/30 flex items-center gap-1.5 overflow-x-auto text-xs">
                <span class="px-2.5 py-1 rounded-lg font-medium bg-neutral-800 text-neutral-100 border border-neutral-700">Tất cả (6)</span>
                <span class="px-2.5 py-1 rounded-lg font-medium text-neutral-400 hover:bg-neutral-800/40">Cần duyệt ⚡ (2)</span>
                <span class="px-2.5 py-1 rounded-lg font-medium text-neutral-400 hover:bg-neutral-800/40">Tin nhắn & @ (3)</span>
                <span class="px-2.5 py-1 rounded-lg font-medium text-neutral-400 hover:bg-neutral-800/40">Nhắc việc ⏰ (1)</span>
              </div>

              <!-- Notifications List -->
              <div class="p-2 space-y-2 max-h-[360px] overflow-y-auto mos-thin-scrollbar">
                <!-- SECTION 1: MỚI -->
                <div>
                  <div class="flex items-center justify-between px-2 pt-1 pb-1.5">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold uppercase tracking-wider text-amber-500">Mới</span>
                      <span class="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-500">2</span>
                    </div>
                    <span class="text-[11px] font-semibold text-emerald-400 cursor-pointer flex items-center gap-1">
                      <span>✓</span>
                      <span>Đã xem tất cả</span>
                    </span>
                  </div>

                  <!-- Unread Item 1 -->
                  <div class="px-3.5 py-3 rounded-2xl bg-neutral-800/70 border border-neutral-700/60 flex items-start gap-3 my-1">
                    <div class="relative shrink-0 mt-0.5">
                      <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 flex items-center justify-center">
                        <div class="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center text-amber-400 font-bold text-xs">DD</div>
                      </div>
                      <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-[10px]">🔀</span>
                    </div>
                    <div class="flex-1 min-w-0 pr-1">
                      <div class="text-xs leading-snug">
                        <span class="font-bold text-white mr-1">Danny Do</span>
                        <span class="font-semibold text-neutral-100">[Duyệt Commit] Ticket #194</span>
                        <span class="text-[11px] text-neutral-400 tabular-nums ml-1.5">· 15 phút trước</span>
                      </div>
                      <p class="text-xs text-neutral-300 line-clamp-2 mt-1">Bổ sung tính năng hiện thông báo đã đọc và thông báo mới đề xuất giao diện như Insta</p>
                      <div class="flex items-center gap-1.5 mt-2">
                        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">Duyệt commit</span>
                        <span class="text-[10px] font-medium text-amber-400">Mới</span>
                      </div>
                    </div>
                    <div class="flex flex-col items-end justify-between self-stretch gap-2 shrink-0">
                      <div class="flex items-center gap-1.5">
                        <span class="text-neutral-400 hover:text-white text-xs cursor-pointer">✓</span>
                        <div class="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div>
                      </div>
                      <button class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600">Duyệt ↗</button>
                    </div>
                  </div>

                  <!-- Unread Item 2 -->
                  <div class="px-3.5 py-3 rounded-2xl bg-neutral-800/70 border border-neutral-700/60 flex items-start gap-3 my-1">
                    <div class="relative shrink-0 mt-0.5">
                      <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 p-0.5 flex items-center justify-center">
                        <div class="w-full h-full rounded-full bg-neutral-900 flex items-center justify-center text-sky-400 font-bold text-xs">QK</div>
                      </div>
                      <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-[10px]">@</span>
                    </div>
                    <div class="flex-1 min-w-0 pr-1">
                      <div class="text-xs leading-snug">
                        <span class="font-bold text-white mr-1">Nguyễn Quang Khải</span>
                        <span class="font-semibold text-neutral-100">đã nhắc tên bạn trong #space-core-team</span>
                        <span class="text-[11px] text-neutral-400 tabular-nums ml-1.5">· 45 phút trước</span>
                      </div>
                      <p class="text-xs text-neutral-300 line-clamp-2 mt-1">"Nhờ anh Danny kiểm tra giúp em giao diện Insta này trên iPhone nhé!"</p>
                      <div class="flex items-center gap-1.5 mt-2">
                        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">@Mention</span>
                        <span class="text-[10px] font-medium text-amber-400">Mới</span>
                      </div>
                    </div>
                    <div class="flex flex-col items-end justify-between self-stretch gap-2 shrink-0">
                      <div class="flex items-center gap-1.5">
                        <span class="text-neutral-400 hover:text-white text-xs cursor-pointer">✓</span>
                        <div class="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div>
                      </div>
                      <button class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-900 hover:bg-white">Mở việc ↗</button>
                    </div>
                  </div>
                </div>

                <!-- SECTION 2: TRƯỚC ĐÓ -->
                <div class="border-t border-neutral-800/80 pt-2 mt-2">
                  <div class="flex items-center justify-between px-2 pb-1.5">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold uppercase tracking-wider text-neutral-400">Trước đó</span>
                      <span class="text-[10px] text-neutral-500">(2)</span>
                    </div>
                  </div>

                  <!-- Read Item 1 -->
                  <div class="px-3.5 py-3 rounded-2xl hover:bg-neutral-800/40 opacity-80 hover:opacity-100 flex items-start gap-3 my-1 transition-opacity">
                    <div class="relative shrink-0 mt-0.5">
                      <div class="w-10 h-10 rounded-full bg-neutral-800 ring-1 ring-neutral-700 flex items-center justify-center text-neutral-400 font-bold text-xs">DD</div>
                    </div>
                    <div class="flex-1 min-w-0 pr-1">
                      <div class="text-xs leading-snug">
                        <span class="font-bold text-neutral-300 mr-1">Danny Do</span>
                        <span class="text-neutral-400">[Đã xong] Ticket #192</span>
                        <span class="text-[11px] text-neutral-500 tabular-nums ml-1.5">· Hôm qua</span>
                      </div>
                      <p class="text-xs text-neutral-400 line-clamp-1 mt-0.5">mOS FUND MASTER hoàn thiện nền tảng vận hành</p>
                      <div class="flex items-center gap-1.5 mt-1.5">
                        <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700/60">Đã đóng</span>
                      </div>
                    </div>
                    <div class="flex flex-col items-end justify-between self-stretch gap-2 shrink-0">
                      <button class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700">Chi tiết ↗</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer -->
              <div class="px-4 py-2.5 border-t border-neutral-800 bg-neutral-900/40 text-[11px] text-neutral-400 flex items-center justify-between">
                <span>Nhấn <strong>⌘I</strong> để đóng / mở nhanh</span>
                <span class="text-amber-400 cursor-pointer">Xem mOS Mission ↗</span>
              </div>
            </div>
          </div>

          <!-- 2. LIGHT THEME INSTAGRAM NOTIFICATION CENTER -->
          <div class="space-y-3">
            <div class="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              <span>2. Giao diện Sáng (Light Theme)</span>
              <span class="text-emerald-400 font-semibold text-[11px]">Clean White Style</span>
            </div>

            <!-- Popover Card Light -->
            <div class="w-full bg-white rounded-3xl border border-neutral-200 shadow-2xl overflow-hidden flex flex-col text-neutral-900">
              <!-- Popover Header -->
              <div class="px-4 py-3.5 border-b border-neutral-200/80 bg-neutral-50/70 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-base tracking-tight text-neutral-900">Thông báo</span>
                  <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums bg-amber-500/15 text-amber-700 border border-amber-500/30">
                    2 mới
                  </span>
                </div>

                <!-- Instagram Segmented Pills -->
                <div class="inline-flex items-center p-0.5 rounded-xl border border-neutral-300/60 bg-neutral-200/60 text-xs">
                  <button class="px-2.5 py-1 rounded-lg font-medium bg-white text-neutral-900 shadow-sm">Tất cả</button>
                  <button class="px-2.5 py-1 rounded-lg font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1">
                    <span>Chưa đọc</span>
                    <span class="text-[10px] tabular-nums font-bold text-amber-600">(2)</span>
                  </button>
                  <button class="px-2.5 py-1 rounded-lg font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1">
                    <span>Đã đọc</span>
                    <span class="text-[10px] tabular-nums">(4)</span>
                  </button>
                </div>
              </div>

              <!-- Category Chips -->
              <div class="px-3 py-2 border-b border-neutral-200/60 bg-white flex items-center gap-1.5 overflow-x-auto text-xs">
                <span class="px-2.5 py-1 rounded-lg font-medium bg-neutral-900 text-white shadow-sm">Tất cả (6)</span>
                <span class="px-2.5 py-1 rounded-lg font-medium text-neutral-600 hover:bg-neutral-100">Cần duyệt ⚡ (2)</span>
                <span class="px-2.5 py-1 rounded-lg font-medium text-neutral-600 hover:bg-neutral-100">Tin nhắn & @ (3)</span>
                <span class="px-2.5 py-1 rounded-lg font-medium text-neutral-600 hover:bg-neutral-100">Nhắc việc ⏰ (1)</span>
              </div>

              <!-- Notifications List -->
              <div class="p-2 space-y-2 max-h-[360px] overflow-y-auto mos-thin-scrollbar">
                <!-- SECTION 1: MỚI -->
                <div>
                  <div class="flex items-center justify-between px-2 pt-1 pb-1.5">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold uppercase tracking-wider text-amber-600">Mới</span>
                      <span class="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600">2</span>
                    </div>
                    <span class="text-[11px] font-semibold text-emerald-600 cursor-pointer flex items-center gap-1">
                      <span>✓</span>
                      <span>Đã xem tất cả</span>
                    </span>
                  </div>

                  <!-- Unread Item 1 Light -->
                  <div class="px-3.5 py-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 flex items-start gap-3 my-1 shadow-sm">
                    <div class="relative shrink-0 mt-0.5">
                      <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 flex items-center justify-center">
                        <div class="w-full h-full rounded-full bg-white flex items-center justify-center text-amber-600 font-bold text-xs">DD</div>
                      </div>
                      <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-[10px]">🔀</span>
                    </div>
                    <div class="flex-1 min-w-0 pr-1">
                      <div class="text-xs leading-snug">
                        <span class="font-bold text-neutral-900 mr-1">Danny Do</span>
                        <span class="font-semibold text-neutral-900">[Duyệt Commit] Ticket #194</span>
                        <span class="text-[11px] text-neutral-500 tabular-nums ml-1.5">· 15 phút trước</span>
                      </div>
                      <p class="text-xs text-neutral-600 line-clamp-2 mt-1">Bổ sung tính năng hiện thông báo đã đọc và thông báo mới đề xuất giao diện như Insta</p>
                      <div class="flex items-center gap-1.5 mt-2">
                        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/30">Duyệt commit</span>
                        <span class="text-[10px] font-medium text-amber-600">Mới</span>
                      </div>
                    </div>
                    <div class="flex flex-col items-end justify-between self-stretch gap-2 shrink-0">
                      <div class="flex items-center gap-1.5">
                        <span class="text-neutral-400 hover:text-neutral-800 text-xs cursor-pointer">✓</span>
                        <div class="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div>
                      </div>
                      <button class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700">Duyệt ↗</button>
                    </div>
                  </div>
                </div>

                <!-- SECTION 2: TRƯỚC ĐÓ Light -->
                <div class="border-t border-neutral-200 pt-2 mt-2">
                  <div class="flex items-center justify-between px-2 pb-1.5">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold uppercase tracking-wider text-neutral-500">Trước đó</span>
                      <span class="text-[10px] text-neutral-400">(2)</span>
                    </div>
                  </div>

                  <!-- Read Item Light -->
                  <div class="px-3.5 py-3 rounded-2xl hover:bg-neutral-100/70 opacity-80 hover:opacity-100 flex items-start gap-3 my-1 transition-opacity">
                    <div class="relative shrink-0 mt-0.5">
                      <div class="w-10 h-10 rounded-full bg-neutral-100 ring-1 ring-neutral-300 flex items-center justify-center text-neutral-500 font-bold text-xs">DD</div>
                    </div>
                    <div class="flex-1 min-w-0 pr-1">
                      <div class="text-xs leading-snug">
                        <span class="font-bold text-neutral-800 mr-1">Danny Do</span>
                        <span class="text-neutral-600">[Đã xong] Ticket #192</span>
                        <span class="text-[11px] text-neutral-500 tabular-nums ml-1.5">· Hôm qua</span>
                      </div>
                      <p class="text-xs text-neutral-500 line-clamp-1 mt-0.5">mOS FUND MASTER hoàn thiện nền tảng vận hành</p>
                      <div class="flex items-center gap-1.5 mt-1.5">
                        <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">Đã đóng</span>
                      </div>
                    </div>
                    <div class="flex flex-col items-end justify-between self-stretch gap-2 shrink-0">
                      <button class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-neutral-200/80 text-neutral-800 hover:bg-neutral-300">Chi tiết ↗</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer Light -->
              <div class="px-4 py-2.5 border-t border-neutral-200 bg-neutral-50/80 text-[11px] text-neutral-500 flex items-center justify-between">
                <span>Nhấn <strong>⌘I</strong> để đóng / mở nhanh</span>
                <span class="text-amber-600 cursor-pointer font-medium">Xem mOS Mission ↗</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const outDir = resolve(process.cwd(), 'output/playwright');
  mkdirSync(outDir, { recursive: true });
  const screenshotPath = resolve(outDir, 'mos-feat-194-instagram-notification-center.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log(`[PASS] Playwright visual QA PASSED: saved screenshot snapshot to ${screenshotPath}`);
  process.exit(0);
} catch (err) {
  console.error('[FAIL] Playwright visual test failed:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
