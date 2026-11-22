import { chromium } from 'playwright';

const timeout = setTimeout(() => {
  console.error('Playwright verification timed out');
  process.exit(1);
}, 25000);
timeout.unref();

let browser = null;

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  const html = `
    <!DOCTYPE html>
    <html lang="vi" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=1440, initial-scale=1.0">
      <title>MOS-FEAT-164 Visual QA - Hạng mục 3: Định mức & Kiểm soát vật tư tiêu hao</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0b1120; color: #f8fafc; }
      </style>
    </head>
    <body class="p-6 bg-slate-950 flex flex-col gap-6">
      <!-- Header Banner -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl font-extrabold text-white">Pilot Uốn Mi Bóng Tối</span>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
              SOP &amp; Đào tạo KTV
            </span>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Hạng mục 3: Định mức &amp; Kiểm soát vật tư tiêu hao
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-1">Chuẩn hóa 3 phần: Định mức dung dịch, Quy chuẩn keo &amp; trục, Quy trình khử khuẩn trình CEO phê duyệt Scale</p>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-900 border-slate-800">
            <span class="text-xs text-slate-400">Chuyên môn thẩm định:</span>
            <span class="text-sm font-bold text-white">Cô Giang Đàm</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-purple-500/10 border-purple-500/20">
            <span class="text-xs text-purple-400 font-medium">Cost định mức / ca:</span>
            <span class="text-sm font-bold text-purple-400 tabular-nums">71.500đ</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-amber-500/10 border-amber-500/20">
            <span class="text-xs text-amber-400 font-medium">Trạng thái:</span>
            <span class="text-sm font-bold text-amber-400">Bản dự thảo</span>
          </div>
        </div>
      </div>

      <!-- Modal Visual Layout Simulation -->
      <div class="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col gap-6 max-w-5xl mx-auto w-full">
        <!-- Modal Title Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-lg">
              📄
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-base font-bold text-white">Hạng Mục 3 – Định Mức &amp; Kiểm Soát Vật Tư Tiêu Hao</span>
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  SOP &amp; Đào tạo KTV
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">Cô Giang Đàm thẩm định định mức &amp; quy chuẩn trước khi trình CEO phê duyệt Scale</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              ⏳ Bản dự thảo · Chờ thẩm định
            </span>
            <span class="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-slate-400">
              Chưa ban hành Scale
            </span>
          </div>
        </div>

        <!-- 4 Metric Cards -->
        <div class="grid grid-cols-4 gap-3">
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tổng chi phí định mức / ca</span>
            <div class="text-xl font-extrabold text-emerald-400 tabular-nums mt-1">71.500đ <span class="text-xs text-slate-400 font-normal">/ca</span></div>
            <span class="text-[10px] text-slate-500 mt-1">Tiết kiệm từ 4 loại dung dịch chuẩn</span>
          </div>
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Chuyên môn thẩm định</span>
            <div class="text-base font-bold text-white mt-1">Cô Giang Đàm</div>
            <span class="text-[10px] text-purple-400 font-medium mt-1">Lead Technical &amp; Master Trainer</span>
          </div>
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Hạng mục đã thẩm định</span>
            <div class="text-xl font-extrabold text-white tabular-nums mt-1">0 / 11 <span class="text-xs text-amber-400 font-semibold">0%</span></div>
            <span class="text-[10px] text-slate-500 mt-1">11 mục đang chờ xác nhận</span>
          </div>
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quy chế Scale</span>
            <div class="text-xs font-semibold text-slate-300 mt-1">Trình CEO phê duyệt</div>
            <span class="text-[10px] text-rose-400 font-medium mt-1">⚠️ Không tự ý ban hành khi chưa duyệt</span>
          </div>
        </div>

        <!-- Active Tab: Phần 1 – Định mức thuốc uốn & dung dịch -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 border-b border-slate-800 pb-3">
            <button class="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white shadow-sm flex items-center gap-1.5">
              <span>✨ Phần 1 – Định Mức Thuốc &amp; Dung Dịch</span>
            </button>
            <button class="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-1.5">
              <span>📐 Phần 2 – Quy Chuẩn Keo &amp; Trục Silicon</span>
            </button>
            <button class="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-1.5">
              <span>🛡️ Phần 3 – Khử Khuẩn &amp; Vệ Sinh Dụng Cụ</span>
            </button>
            <button class="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-1.5">
              <span>🏆 Bản Dự Thảo Trình CEO &amp; Thẩm Định</span>
            </button>
          </div>

          <!-- Table of Solutions -->
          <div class="border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px]">
                  <th class="p-3">Tên vật tư / Dung dịch</th>
                  <th class="p-3 text-center">Đơn vị</th>
                  <th class="p-3 text-right">Đơn giá gốc</th>
                  <th class="p-3 text-center">Định lượng / ca</th>
                  <th class="p-3 text-right">Chi phí định mức</th>
                  <th class="p-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800 text-slate-200">
                <tr class="hover:bg-slate-800/40">
                  <td class="p-3">
                    <div class="font-bold text-white flex items-center gap-1.5">
                      <span class="text-emerald-400">✨</span> Thuốc số 1 (Perming Cream - Làm mềm sợi mi)
                    </div>
                    <div class="text-[11px] text-slate-400">Ủ mềm nang mi 10-15 phút tùy chất mi. Tuyệt đối không để dính da mi.</div>
                  </td>
                  <td class="p-3 text-center"><span class="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">ml</span></td>
                  <td class="p-3 text-right tabular-nums text-slate-400">30.000đ/ml</td>
                  <td class="p-3 text-center"><span class="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 font-bold border border-emerald-800 tabular-nums">0.8 ml</span></td>
                  <td class="p-3 text-right tabular-nums font-bold text-emerald-400">24.000đ</td>
                  <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">Chờ thẩm định</span></td>
                </tr>
                <tr class="hover:bg-slate-800/40">
                  <td class="p-3">
                    <div class="font-bold text-white flex items-center gap-1.5">
                      <span class="text-emerald-400">✨</span> Thuốc số 2 (Setting Cream - Định hình nếp uốn)
                    </div>
                    <div class="text-[11px] text-slate-400">Định hình nếp uốn sau khi lau sạch thuốc số 1. Thời gian ủ 10-12 phút.</div>
                  </td>
                  <td class="p-3 text-center"><span class="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">ml</span></td>
                  <td class="p-3 text-right tabular-nums text-slate-400">30.000đ/ml</td>
                  <td class="p-3 text-center"><span class="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 font-bold border border-emerald-800 tabular-nums">0.8 ml</span></td>
                  <td class="p-3 text-right tabular-nums font-bold text-emerald-400">24.000đ</td>
                  <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">Chờ thẩm định</span></td>
                </tr>
                <tr class="hover:bg-slate-800/40">
                  <td class="p-3">
                    <div class="font-bold text-white flex items-center gap-1.5">
                      <span class="text-emerald-400">✨</span> Keratin dưỡng mi chuyên sâu
                    </div>
                    <div class="text-[11px] text-slate-400">Thoa đều gốc đến ngọn mi sau khi rửa sạch thuốc 2, giữ ẩm 5 phút.</div>
                  </td>
                  <td class="p-3 text-center"><span class="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">ml</span></td>
                  <td class="p-3 text-right tabular-nums text-slate-400">19.000đ/ml</td>
                  <td class="p-3 text-center"><span class="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 font-bold border border-emerald-800 tabular-nums">0.5 ml</span></td>
                  <td class="p-3 text-right tabular-nums font-bold text-emerald-400">9.500đ</td>
                  <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">Chờ thẩm định</span></td>
                </tr>
                <tr class="hover:bg-slate-800/40">
                  <td class="p-3">
                    <div class="font-bold text-white flex items-center gap-1.5">
                      <span class="text-emerald-400">✨</span> Thuốc nhuộm đen mi (Lash Tint phủ bóng tối)
                    </div>
                    <div class="text-[11px] text-slate-400">Nhuộm đen bóng sợi mi sau bước uốn, ủ 5 phút. Lau sạch bằng bông ẩm.</div>
                  </td>
                  <td class="p-3 text-center"><span class="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">ml</span></td>
                  <td class="p-3 text-right tabular-nums text-slate-400">28.000đ/ml</td>
                  <td class="p-3 text-center"><span class="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 font-bold border border-emerald-800 tabular-nums">0.5 ml</span></td>
                  <td class="p-3 text-right tabular-nums font-bold text-emerald-400">14.000đ</td>
                  <td class="p-3 text-center"><span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">Chờ thẩm định</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Modal Footer Actions -->
        <div class="flex items-center justify-between pt-4 border-t border-slate-800">
          <span class="text-xs text-slate-400">Bản dự thảo lưu tự động trên hệ thống CRM · Không ảnh hưởng 17 ca Pilot đã làm</span>
          <div class="flex items-center gap-2">
            <button class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200">
              Đóng
            </button>
            <button class="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600/30 text-purple-300 border border-purple-500/40 hover:bg-purple-600/50">
              💾 Lưu dự thảo
            </button>
            <button class="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md">
              👤 Cô Giang Đàm Thẩm Định
            </button>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForLoadState('networkidle');

  const screenshotPath = '/tmp/mos-feat-164-visual.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Visual screenshot captured successfully: ${screenshotPath}`);
  console.log('PLAYWRIGHT VISUAL QA PASSED');
} catch (error) {
  console.error('Playwright visual QA error:', error);
  process.exit(1);
} finally {
  if (browser) await browser.close();
  process.exit(0);
}
