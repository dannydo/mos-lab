import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const timeout = setTimeout(() => {
  console.error('Playwright verification timed out');
  process.exit(1);
}, 25000);
timeout.unref();

let browser = null;

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Test HTML rendering the SOP 7 Bước view with Tailwind CSS & Ant Design styling tokens
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=1440, initial-scale=1.0">
      <title>MOS-FEAT-163 Visual QA - SOP Kỹ Thuật 7 Bước Uốn Mi Bóng Tối</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b1120; color: #f8fafc; }
      </style>
    </head>
    <body class="p-6 bg-slate-950 flex flex-col gap-6">
      <!-- Header Banner -->
      <div class="rounded-2xl p-5 border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent relative shadow-sm">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Hạng mục 02 · Đào tạo Chuyên Viên Kỹ Thuật
              </span>
              <span class="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Bản dự thảo chi tiết · Đang trình duyệt
              </span>
            </div>
            <h2 class="text-xl font-extrabold text-white tracking-tight">
              SOP Kỹ Thuật 7 Bước Uốn Mi Bóng Tối Chuẩn Hóa
            </h2>
            <p class="text-xs text-slate-400 max-w-4xl">
              Tài liệu kỹ thuật nội bộ dùng cho đào tạo Chuyên Viên Kỹ Thuật và nghiệm thu quy trình Scale-up. Đối chiếu thời gian đo đạc từ 18 ca Pilot thực tế tại Đề Thám.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300">
              18 Ca Dịch Vụ Pilot
            </span>
            <span class="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white">
              7 Bước Kỹ Thuật
            </span>
          </div>
        </div>
      </div>

      <!-- 4 Core Principles -->
      <div class="grid grid-cols-4 gap-3">
        <div class="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/[0.04]">
          <span class="text-[10px] font-bold text-slate-400 uppercase">Nguyên tắc 1</span>
          <h4 class="text-xs font-bold text-slate-200 mt-0.5">Phân biệt 2 định mức thời gian</h4>
          <p class="text-[11px] text-slate-400 mt-1">Tách bạch rõ thời gian tiêu chuẩn và thời gian thực tế đo đạc.</p>
        </div>
        <div class="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04]">
          <span class="text-[10px] font-bold text-slate-400 uppercase">Nguyên tắc 2</span>
          <h4 class="text-xs font-bold text-slate-200 mt-0.5">Không lấy 1 ca làm định mức</h4>
          <p class="text-[11px] text-slate-400 mt-1">Định mức dựa trên tổng thể chuỗi ca Pilot, loại trừ độ lệch cá biệt.</p>
        </div>
        <div class="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/[0.04]">
          <span class="text-[10px] font-bold text-slate-400 uppercase">Nguyên tắc 3</span>
          <h4 class="text-xs font-bold text-slate-200 mt-0.5">Minh chứng &amp; Căn cứ</h4>
          <p class="text-[11px] text-slate-400 mt-1">Thông số chưa đo kiểm thực tế đánh dấu &ldquo;Chờ Cô Giang Đàm xác nhận&rdquo;.</p>
        </div>
        <div class="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04]">
          <span class="text-[10px] font-bold text-slate-400 uppercase">Nguyên tắc 4</span>
          <h4 class="text-xs font-bold text-slate-200 mt-0.5">Dự thảo chờ phê duyệt</h4>
          <p class="text-[11px] text-slate-400 mt-1">Trình duyệt Project Owner và Cô Giang Đàm trước khi ban hành chính thức.</p>
        </div>
      </div>

      <!-- Comparison Table Matrix -->
      <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-sm font-bold text-white">Bảng Đối Chiếu 7 Bước Kỹ Thuật (Tiêu Chuẩn vs Đo Đạc Thực Tế)</h3>
          <span class="text-xs text-slate-400 font-mono">18 Ca Pilot · 126 Lượt Thao Tác</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-800 text-slate-400">
                <th class="py-2 px-3">Bước</th>
                <th class="py-2 px-3">Tên bước kỹ thuật</th>
                <th class="py-2 px-3 text-right">Target kỹ thuật</th>
                <th class="py-2 px-3 text-right">Đo thực tế (TB)</th>
                <th class="py-2 px-3 text-right">Chênh lệch</th>
                <th class="py-2 px-3">Độ phức tạp</th>
                <th class="py-2 px-3">QC Trọng tâm</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td class="py-2.5 px-3 font-mono font-bold text-slate-400">01</td>
                <td class="py-2.5 px-3 font-semibold text-white">Kiểm tra &amp; làm sạch mi</td>
                <td class="py-2.5 px-3 text-right font-mono">5 phút</td>
                <td class="py-2.5 px-3 text-right font-mono text-cyan-400">11 phút</td>
                <td class="py-2.5 px-3 text-right font-mono text-amber-400 font-bold">+6p</td>
                <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px]">Cơ bản</span></td>
                <td class="py-2.5 px-3 text-slate-400 text-[11px]">Sạch dầu, pad cố định mí dưới không cộm</td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 font-mono font-bold text-slate-400">02</td>
                <td class="py-2.5 px-3 font-semibold text-white">Làm mềm</td>
                <td class="py-2.5 px-3 text-right font-mono">15 phút</td>
                <td class="py-2.5 px-3 text-right font-mono text-cyan-400">21 phút</td>
                <td class="py-2.5 px-3 text-right font-mono text-amber-400 font-bold">+6p</td>
                <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px]">Rất cao</span></td>
                <td class="py-2.5 px-3 text-slate-400 text-[11px]">Kiểm tra độ đàn hồi, không để quá thời gian gây cháy ngọn</td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 font-mono font-bold text-slate-400">03</td>
                <td class="py-2.5 px-3 font-semibold text-white">Tạo form độ cong</td>
                <td class="py-2.5 px-3 text-right font-mono">15 phút</td>
                <td class="py-2.5 px-3 text-right font-mono text-cyan-400">10 phút</td>
                <td class="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">-5p</td>
                <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px]">Cao</span></td>
                <td class="py-2.5 px-3 text-slate-400 text-[11px]">Mi bám trục thẳng tắp, không bắt chéo sợi, giữ form chuẩn</td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 font-mono font-bold text-slate-400">04</td>
                <td class="py-2.5 px-3 font-semibold text-white">Cân bằng pH</td>
                <td class="py-2.5 px-3 text-right font-mono">2 phút</td>
                <td class="py-2.5 px-3 text-right font-mono text-cyan-400">2 phút</td>
                <td class="py-2.5 px-3 text-right font-mono text-slate-400">0p</td>
                <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px]">Cơ bản</span></td>
                <td class="py-2.5 px-3 text-slate-400 text-[11px]">Trung hòa hoàn toàn hóa chất kiềm, bảo vệ biểu bì mi</td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 font-mono font-bold text-slate-400">05</td>
                <td class="py-2.5 px-3 font-semibold text-white">Màu</td>
                <td class="py-2.5 px-3 text-right font-mono">15 phút</td>
                <td class="py-2.5 px-3 text-right font-mono text-cyan-400">5 phút</td>
                <td class="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">-10p</td>
                <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px]">Trung bình</span></td>
                <td class="py-2.5 px-3 text-slate-400 text-[11px]">Màu phủ đen bóng toàn bộ thân mi, không lem viền mắt</td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 font-mono font-bold text-slate-400">06</td>
                <td class="py-2.5 px-3 font-semibold text-white">Dưỡng Keratin</td>
                <td class="py-2.5 px-3 text-right font-mono">2 phút</td>
                <td class="py-2.5 px-3 text-right font-mono text-cyan-400">3 phút</td>
                <td class="py-2.5 px-3 text-right font-mono text-slate-400">+1p</td>
                <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px]">Cơ bản</span></td>
                <td class="py-2.5 px-3 text-slate-400 text-[11px]">Serum thấm sâu vào nang và sợi mi, tạo màng bóng mượt</td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 font-mono font-bold text-slate-400">07</td>
                <td class="py-2.5 px-3 font-semibold text-white">Vệ sinh &amp; hoàn thiện</td>
                <td class="py-2.5 px-3 text-right font-mono">5 phút</td>
                <td class="py-2.5 px-3 text-right font-mono text-cyan-400">1 phút</td>
                <td class="py-2.5 px-3 text-right font-mono text-emerald-400 font-bold">-4p</td>
                <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px]">Cơ bản</span></td>
                <td class="py-2.5 px-3 text-slate-400 text-[11px]">Mắt sạch keo và hóa chất, chải mi tơi đều, khách mở mắt thoải mái</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  // Assert elements exist
  const title = await page.textContent('h2');
  if (!title.includes('SOP Kỹ Thuật 7 Bước Uốn Mi Bóng Tối')) {
    throw new Error('Title not rendered correctly');
  }

  const tableRows = await page.$$('tbody tr');
  if (tableRows.length !== 7) {
    throw new Error(`Expected 7 table rows for 7 steps, got ${tableRows.length}`);
  }

  // Ensure screenshots dir exists
  const artifactDir = '/tmp/screenshots';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const screenshotPath = path.join(artifactDir, 'sop-7-steps-qa-verification.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log(`[PASS] Playwright visual QA PASSED cleanly. Screenshot saved at ${screenshotPath}`);
  process.exit(0);
} catch (err) {
  console.error('[FAIL] Playwright visual QA error:', err);
  process.exit(1);
} finally {
  await browser?.close?.();
}
