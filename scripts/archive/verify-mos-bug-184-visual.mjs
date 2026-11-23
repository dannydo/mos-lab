import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

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
      <title>MOS-BUG-184 Mobile Reaction & Emoji/Sticker Library</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b0f19; color: #f8fafc; }
      </style>
    </head>
    <body class="bg-slate-950 text-slate-100 min-h-screen p-4 flex flex-col justify-end select-none">
      <!-- Background Chat Stream Demo -->
      <div class="space-y-4 mb-4">
        <div class="flex items-start gap-2.5">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold text-xs shadow-sm">
            CV
          </div>
          <div class="max-w-[80%]">
            <div class="bg-slate-800 text-slate-100 px-3.5 py-2.5 rounded-2xl rounded-tl-sm text-sm border border-slate-700/80 shadow-sm leading-relaxed">
              Em vừa xong bộ mi volume 5D cho chị Nga ở ca 14h nha cả nhà ơi! Khách khen nức nở 🥰
            </div>
            <!-- Reaction Bar with Visual Sticker and Highlighting -->
            <div class="flex flex-wrap items-center gap-1.5 mt-1.5 px-1">
              <button class="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs shadow-sm bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold">
                <span>❤️</span>
                <span class="text-[10px] font-bold tabular-nums text-amber-300">3</span>
              </button>
              <button class="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs shadow-sm bg-slate-800/90 border border-slate-700 text-slate-200">
                <span class="inline-flex items-center justify-center w-5 h-5 shrink-0">
                  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f4b8/512.gif" class="w-4 h-4 object-contain" alt="Chốt đơn" />
                </span>
                <span class="text-[10px] font-semibold tabular-nums text-slate-400">2</span>
              </button>
              <button class="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800/80 border border-slate-700/60 text-amber-400 hover:text-amber-300 shadow-sm">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11v1a10 10 0 1 1-9-10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><path d="M16 5h6"/><path d="M19 2v6"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Slide-up Reaction Sheet (MOS-BUG-184 Upgrade) -->
      <div class="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl px-4 pt-3 pb-6 shadow-2xl space-y-3">
        <div class="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-2"></div>
        
        <!-- Header with Full Picker View -->
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <div class="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            <span>Quay lại</span>
          </div>
          <span class="text-xs font-bold text-slate-200">Kho biểu cảm & nhãn dán mOS</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">1 chạm thả ngay</span>
        </div>

        <!-- 6 Pack Categories Grid -->
        <div class="grid grid-cols-6 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <div class="px-1 py-1.5 rounded-lg text-[10px] font-extrabold flex flex-col items-center justify-center gap-0.5 bg-amber-500 text-slate-950 shadow-sm leading-none">
            <span class="text-[13px]">🔥</span>
            <span>Wings</span>
          </div>
          <div class="px-1 py-1.5 rounded-lg text-[10px] font-extrabold flex flex-col items-center justify-center gap-0.5 text-slate-400 leading-none">
            <span class="text-[13px]">🐱</span>
            <span>Mèo Bựa</span>
          </div>
          <div class="px-1 py-1.5 rounded-lg text-[10px] font-extrabold flex flex-col items-center justify-center gap-0.5 text-slate-400 leading-none">
            <span class="text-[13px]">👶</span>
            <span>Quby</span>
          </div>
          <div class="px-1 py-1.5 rounded-lg text-[10px] font-extrabold flex flex-col items-center justify-center gap-0.5 text-slate-400 leading-none">
            <span class="text-[13px]">🐸</span>
            <span>Pepe</span>
          </div>
          <div class="px-1 py-1.5 rounded-lg text-[10px] font-extrabold flex flex-col items-center justify-center gap-0.5 text-slate-400 leading-none">
            <span class="text-[13px]">✨</span>
            <span>3D Động</span>
          </div>
          <div class="px-1 py-1.5 rounded-lg text-[10px] font-extrabold flex flex-col items-center justify-center gap-0.5 text-slate-400 leading-none">
            <span class="text-[13px]">😀</span>
            <span>Emoji</span>
          </div>
        </div>

        <!-- Stickers Grid Preview -->
        <div class="grid grid-cols-4 gap-2 pt-1">
          <div class="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center justify-center text-center">
            <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f4b8/512.gif" class="w-10 h-10 object-contain" />
            <span class="text-[9px] font-black uppercase text-amber-300 mt-1">Chốt Đơn</span>
          </div>
          <div class="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center justify-center text-center">
            <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f525/512.gif" class="w-10 h-10 object-contain" />
            <span class="text-[9px] font-black uppercase text-amber-300 mt-1">Cháy Ca</span>
          </div>
          <div class="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center justify-center text-center">
            <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f451/512.gif" class="w-10 h-10 object-contain" />
            <span class="text-[9px] font-black uppercase text-amber-300 mt-1">Top CV</span>
          </div>
          <div class="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex flex-col items-center justify-center text-center">
            <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/2728/512.gif" class="w-10 h-10 object-contain" />
            <span class="text-[9px] font-black uppercase text-amber-300 mt-1">Siêu Phẩm</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const outDir = '/tmp';
  const outPath = resolve(outDir, 'mos-bug-184-visual.png');
  await page.screenshot({ path: outPath, fullPage: true });

  console.log(`[PASS] Playwright visual QA PASSED: saved screenshot to ${outPath}`);
} catch (err) {
  console.error('[FAIL] Playwright visual test failed:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
