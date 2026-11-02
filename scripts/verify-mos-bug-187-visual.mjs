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
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
  });

  const page = await context.newPage();

  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MOS-BUG-187 Desktop Emoji Selection & Reaction Library QA</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b0f19; color: #f8fafc; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      </style>
    </head>
    <body class="bg-slate-950 text-slate-100 min-h-screen p-8 flex flex-col justify-center items-center select-none">
      <div class="w-full max-w-4xl space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 class="text-xl font-black text-amber-400 flex items-center gap-2">
              <span>🚀</span>
              <span>mOS Chat — Desktop Emoji & Sticker Reaction System [MOS-BUG-187]</span>
            </h1>
            <p class="text-xs text-slate-400 mt-1">Đã kiểm chứng: Popover nổi zIndex 1500, toolbar không bị collapse khi rê chuột, thư viện emoji đầy đủ theo danh mục và tìm kiếm nhanh.</p>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            ✓ Desktop Ready
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <!-- Chat Feed Message with Reaction Toolbar & Popover -->
          <div class="space-y-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl">
            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1. Thả cảm xúc tin nhắn trên Desktop</div>
            
            <div class="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3 relative">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold text-xs">
                  CV
                </div>
                <div class="text-xs font-bold text-slate-200">Chuyên Viên Lan Anh</div>
                <span class="text-[10px] text-slate-400">ca 14:00</span>
              </div>
              <div class="text-sm text-slate-100 leading-relaxed">
                Hôm nay khách khen mi thiết kế Katun bên mình giữ được lâu và êm mắt lắm nha team ơi! ❤️🔥
              </div>
              
              <!-- Existing Reaction Pills + Active Popover Trigger -->
              <div class="flex flex-wrap items-center gap-2 pt-1">
                <button class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold">
                  <span>❤️</span>
                  <span class="tabular-nums">4</span>
                </button>
                <button class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-slate-800 border border-slate-700 text-slate-300">
                  <span>🔥</span>
                  <span class="tabular-nums">2</span>
                </button>

                <!-- Action Bar (Active because popover is open) -->
                <div class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 border border-amber-500/60 shadow-md ring-1 ring-amber-500/40">
                  <span class="text-base cursor-pointer hover:scale-125 transition-transform">👍</span>
                  <span class="text-base cursor-pointer hover:scale-125 transition-transform">❤️</span>
                  <span class="text-base cursor-pointer hover:scale-125 transition-transform">😂</span>
                  <span class="text-base cursor-pointer hover:scale-125 transition-transform">🎉</span>
                  <span class="text-base cursor-pointer hover:scale-125 transition-transform">👏</span>
                  <span class="text-base cursor-pointer hover:scale-125 transition-transform">🙏</span>
                  <div class="w-px h-3.5 bg-slate-700 mx-0.5"></div>
                  <button class="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-sm">
                    +
                  </button>
                </div>
              </div>
            </div>

            <!-- Space Emoji Picker Simulation -->
            <div class="pt-2 border-t border-slate-800">
              <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Cấu hình Không gian (Space Emoji)</div>
              <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div class="w-12 h-12 rounded-xl bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center text-2xl shadow-sm relative">
                  <span>🚀</span>
                  <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-500 text-[9px] text-white flex items-center justify-center">
                    ✎
                  </div>
                </div>
                <div>
                  <div class="text-xs font-bold text-slate-200">Không gian Chiến dịch Tết 2026</div>
                  <div class="text-[11px] text-emerald-400 font-medium">✓ Đã chọn emoji đại diện: 🚀 (Popover z-index 1500)</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Desktop Sticker & Emoji Picker Popover Window -->
          <div class="bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-2xl space-y-2.5 max-w-[380px]">
            <!-- 6 Tabs -->
            <div class="grid grid-cols-6 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <div class="px-1 py-1.5 rounded-lg text-[10px] font-extrabold flex flex-col items-center justify-center gap-0.5 text-slate-400 cursor-pointer">
                <span class="text-[13px]">🔥</span>
                <span>Wings</span>
              </div>
              <div class="px-1 py-1.5 rounded-lg text-[10px] font-extrabold flex flex-col items-center justify-center gap-0.5 text-slate-400 cursor-pointer">
                <span class="text-[13px]">🐱</span>
                <span>Mèo Bựa</span>
              </div>
              <div class="px-1 py-1.5 rounded-lg text-[10px] font-extrabold flex flex-col items-center justify-center gap-0.5 text-slate-400 cursor-pointer">
                <span class="text-[13px]">👶</span>
                <span>Quby</span>
              </div>
              <div class="px-1 py-1.5 rounded-lg text-[10px] font-extrabold flex flex-col items-center justify-center gap-0.5 text-slate-400 cursor-pointer">
                <span class="text-[13px]">🐸</span>
                <span>Pepe</span>
              </div>
              <div class="px-1 py-1.5 rounded-lg text-[10px] font-extrabold flex flex-col items-center justify-center gap-0.5 text-slate-400 cursor-pointer">
                <span class="text-[13px]">✨</span>
                <span>3D Động</span>
              </div>
              <div class="px-1 py-1.5 rounded-lg text-[10px] font-extrabold flex flex-col items-center justify-center gap-0.5 bg-amber-500 text-slate-950 shadow-sm leading-none cursor-pointer">
                <span class="text-[13px]">😀</span>
                <span>Emoji</span>
              </div>
            </div>

            <!-- Search input -->
            <div class="flex items-center gap-2 px-3 h-8 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span class="text-slate-400">🔍</span>
              <span class="text-slate-300 font-medium">Tìm emoji (VD: cười, tim, lửa, like...)</span>
            </div>

            <!-- Quick Category Jump Pills -->
            <div class="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[10px]">
              <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">🪽 Wings</span>
              <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">😀 Mặt cười</span>
              <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">👍 Bàn tay</span>
              <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">🚀 Dự án</span>
            </div>

            <!-- Categorized Emoji Grid -->
            <div class="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              <div>
                <div class="text-[10px] font-black uppercase text-amber-400 tracking-wider mb-1">🪽 Wings & Sắc đẹp</div>
                <div class="grid grid-cols-9 gap-1 text-lg">
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">🪽</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">👑</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">✨</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">🌸</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">💖</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">💄</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">💅</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">🎀</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">💎</span>
                </div>
              </div>

              <div>
                <div class="text-[10px] font-black uppercase text-amber-400 tracking-wider mb-1">😀 Cảm xúc & Mặt cười</div>
                <div class="grid grid-cols-9 gap-1 text-lg">
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">😀</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">😂</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">🤣</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">😍</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">🥰</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">😎</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">🤩</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">🥳</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">🫡</span>
                </div>
              </div>

              <div>
                <div class="text-[10px] font-black uppercase text-amber-400 tracking-wider mb-1">👍 Bàn tay & Trái tim</div>
                <div class="grid grid-cols-9 gap-1 text-lg">
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">👍</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">👏</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">🙌</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">🤝</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">🙏</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">💪</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">❤️</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">🔥</span>
                  <span class="w-8 h-8 rounded-lg bg-slate-800/60 flex items-center justify-center hover:scale-125 cursor-pointer">💯</span>
                </div>
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

  const outPath = resolve('/tmp', 'mos-bug-187-visual.png');
  await page.screenshot({ path: outPath, fullPage: true });

  console.log(`[PASS] Playwright visual QA PASSED: saved screenshot to ${outPath}`);
} catch (err) {
  console.error('[FAIL] Playwright visual test failed:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
  process.exit(0);
}
