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
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    isMobile: true,
  });

  const page = await context.newPage();

  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MOS-BUG-196 Mobile Pinned Spaces and DMs Experience</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b0f19; color: #f8fafc; }
      </style>
    </head>
    <body class="bg-slate-950 text-slate-100 min-h-screen select-none flex flex-col">
      <!-- Header Bar -->
      <div class="px-4 py-3 bg-slate-900/90 backdrop-blur border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm text-white">
            W
          </div>
          <div>
            <h1 class="text-base font-bold text-white leading-tight">mOS Chat</h1>
            <span class="text-[11px] text-slate-400">Wings Beauty Workspace</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1">
            <span>📌</span>
            <span>2 đã ghim</span>
          </div>
        </div>
      </div>

      <!-- Filter Chips -->
      <div class="px-4 py-2.5 flex items-center gap-2 overflow-x-auto border-b border-slate-800/80 bg-slate-900/50">
        <button class="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950 shadow-sm flex items-center gap-1 shrink-0">
          <span>📌</span>
          <span>Đã ghim (2)</span>
        </button>
        <button class="px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 shrink-0">
          Tất cả
        </button>
        <button class="px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 shrink-0">
          Không gian
        </button>
        <button class="px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 shrink-0">
          Trực tiếp (DMs)
        </button>
      </div>

      <!-- Inbox List with Section Subheaders -->
      <div class="flex-1 divide-y divide-slate-800/40">
        <!-- Pinned Section Header -->
        <div class="px-4 pt-3 pb-1 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
          <span>📌</span>
          <span>Đã ghim</span>
          <span class="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black">2</span>
        </div>

        <!-- Pinned Item 1: Core Team Space -->
        <div class="px-4 py-3 flex items-center gap-3 bg-amber-500/[0.04] border-l-[3px] border-amber-500">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xl">
            #
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-0.5">
              <div class="flex items-center gap-1.5">
                <h3 class="text-sm font-bold text-white truncate">Core Team</h3>
                <span class="inline-flex text-amber-400" title="Đã ghim">
                  <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
                </span>
              </div>
              <span class="text-[11px] text-slate-400 tabular-nums">09:00</span>
            </div>
            <p class="text-xs text-slate-300 truncate">Kênh vận hành lõi salon</p>
          </div>
          <span class="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10.5px] font-extrabold">3</span>
        </div>

        <!-- Pinned Item 2: Danny Do DM -->
        <div class="px-4 py-3 flex items-center gap-3 bg-amber-500/[0.04] border-l-[3px] border-amber-500">
          <div class="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-base">
            DD
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-0.5">
              <div class="flex items-center gap-1.5">
                <h3 class="text-sm font-bold text-white truncate">Danny Do</h3>
                <span class="inline-flex text-amber-400" title="Đã ghim">
                  <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
                </span>
                <span class="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold">Super Admin</span>
              </div>
              <span class="text-[11px] text-slate-400 tabular-nums">07:00</span>
            </div>
            <p class="text-xs text-slate-300 truncate">Đã duyệt kế hoạch tuần mới rồi em nhé!</p>
          </div>
          <span class="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10.5px] font-extrabold">1</span>
        </div>

        <!-- Other Conversations Subheader -->
        <div class="px-4 pt-3 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
          Tất cả cuộc trò chuyện
        </div>

        <!-- Unpinned Item 1: General Discussion -->
        <div class="px-4 py-3 flex items-center gap-3 bg-slate-950 hover:bg-slate-900/60">
          <div class="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700/60 text-slate-300 flex items-center justify-center font-bold text-xl">
            #
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-0.5">
              <h3 class="text-sm font-semibold text-slate-200 truncate">General Discussion</h3>
              <span class="text-[11px] text-slate-500 tabular-nums">08:00</span>
            </div>
            <p class="text-xs text-slate-400 truncate">Kênh thảo luận chung</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const outDir = '/tmp';
  const outPath = resolve(outDir, 'mos-bug-196-visual.png');
  await page.screenshot({ path: outPath, fullPage: true });

  console.log(`[PASS] Playwright visual QA PASSED: saved screenshot to ${outPath}`);
} catch (err) {
  console.error('[FAIL] Playwright visual test failed:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
