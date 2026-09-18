/**
 * report-generator.mjs
 * Tổng hợp dữ liệu từ raw-metrics.json thành Báo cáo kép:
 * 1. report.html: Dashboard HTML tương tác có biểu đồ, screenshot, slow queries và phân loại màu.
 * 2. BENCHMARK_REPORT.md: Báo cáo tóm tắt Markdown để xem nhanh.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../..');
const outputDir = path.resolve(workspaceRoot, 'output', 'benchmark');
const rawMetricsPath = path.join(outputDir, 'raw-metrics.json');
const htmlReportPath = path.join(outputDir, 'report.html');
const mdReportPath = path.join(outputDir, 'BENCHMARK_REPORT.md');

export function generateReports() {
  if (!fs.existsSync(rawMetricsPath)) {
    console.error(`[Reporter] Raw metrics not found at ${rawMetricsPath}. Run crawler first.`);
    return;
  }

  const raw = fs.readFileSync(rawMetricsPath, 'utf-8');
  const data = JSON.parse(raw);
  const { summary, results, backendSlowQueries, globalSlowApiRequests, globalFailedRequests, globalConsoleErrors } =
    data;

  // 1. Sinh Báo cáo Markdown
  const sortedByDuration = [...results].sort((a, b) => b.totalElapsedMs - a.totalElapsedMs);
  const slowest5 = sortedByDuration.slice(0, 5);

  let mdContent = `# 🚀 Báo Cáo Benchmark & Slow Queries mos-lab\n\n`;
  mdContent += `> Thời gian thực hiện: **${new Date(data.executedAt).toLocaleString('vi-VN')}**  \n`;
  mdContent += `> Chế độ kiểm tra: **${data.profile.toUpperCase()}** | Web URL: \`${data.baseUrl}\` | API URL: \`${data.apiUrl}\`\n\n`;

  mdContent += `## 📊 1. Tổng quan Hiệu năng (Executive Summary)\n\n`;
  mdContent += `| Chỉ số | Kết quả | Trạng thái |\n`;
  mdContent += `| :--- | :--- | :--- |\n`;
  mdContent += `| Tổng số Route kiểm tra | **${summary.totalRoutes}** trang | ${summary.successfulRoutes === summary.totalRoutes ? '✅ Hoàn thành 100%' : '⚠️ Có lỗi'} |\n`;
  mdContent += `| Thời gian tải trung bình | **${summary.averagePageDurationMs}ms** | ${summary.averagePageDurationMs < 2000 ? '🟢 Nhanh' : '🟡 Cần tối ưu'} |\n`;
  mdContent += `| Số API trễ (>1.000ms) | **${summary.totalSlowApiRequests}** request | ${summary.totalSlowApiRequests === 0 ? '🟢 Tốt' : '🔴 Cảnh báo'} |\n`;
  mdContent += `| Câu SQL Prisma chậm (>500ms) | **${summary.totalPrismaSlowQueries}** câu | ${summary.totalPrismaSlowQueries === 0 ? '🟢 Tốt' : '🔴 Cần tạo Index'} |\n`;
  mdContent += `| Lỗi Console JavaScript | **${summary.totalConsoleErrors}** lỗi | ${summary.totalConsoleErrors === 0 ? '🟢 Không có lỗi' : '🔴 Cần sửa code'} |\n\n`;

  mdContent += `## 🐢 2. Top 5 Trang Chậm Nhất (Slowest Pages)\n\n`;
  mdContent += `| Trang / Tính năng | Đường dẫn | Nhóm | Thời gian tải | FCP | TTFB |\n`;
  mdContent += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
  slowest5.forEach((r) => {
    mdContent += `| **${r.title}** | \`${r.path}\` | ${r.group} | **${r.totalElapsedMs}ms** | ${r.browserTimings?.fcpMs ? `${r.browserTimings.fcpMs}ms` : 'N/A'} | ${r.browserTimings?.ttfbMs ? `${r.browserTimings.ttfbMs}ms` : 'N/A'} |\n`;
  });
  mdContent += `\n`;

  if (backendSlowQueries && backendSlowQueries.length > 0) {
    mdContent += `## 🗄️ 3. Danh sách Slow Queries (SQL > 500ms)\n\n`;
    backendSlowQueries.forEach((q, idx) => {
      mdContent += `### #${idx + 1} [${q.source?.toUpperCase() || 'DB'}] Thời gian: **${q.durationMs}ms**\n`;
      mdContent += `\`\`\`sql\n${q.query || q.url || 'N/A'}\n\`\`\`\n\n`;
    });
  } else {
    mdContent += `## 🗄️ 3. Danh sách Slow Queries\n\n*Không phát hiện câu truy vấn SQL nào chạy quá 500ms.* ✅\n\n`;
  }

  if (globalSlowApiRequests && globalSlowApiRequests.length > 0) {
    mdContent += `## 🌐 4. Danh sách API trễ mạng (> 1.000ms)\n\n`;
    mdContent += `| Endpoint API | Thời gian | Trang gọi |\n`;
    mdContent += `| :--- | :--- | :--- |\n`;
    globalSlowApiRequests.forEach((req) => {
      mdContent += `| \`${req.url}\` | **${req.durationMs}ms** | \`${req.route}\` |\n`;
    });
    mdContent += `\n`;
  }

  fs.writeFileSync(mdReportPath, mdContent, 'utf-8');
  console.log(`[Reporter] Markdown report generated at: ${mdReportPath}`);

  // 2. Sinh Báo cáo HTML Dashboard
  const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>mos-lab Benchmark & Slow Queries Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .badge-fast { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-medium { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-slow { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-8">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <header class="flex justify-between items-center pb-6 border-b border-slate-800 mb-8">
      <div>
        <h1 class="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          mos-lab Performance & Slow Queries Dashboard
        </h1>
        <p class="text-slate-400 text-sm mt-1">
          Thời gian quét: <span class="font-medium text-slate-200">${new Date(data.executedAt).toLocaleString('vi-VN')}</span> | Chế độ: <span class="uppercase font-semibold text-emerald-400">${data.profile}</span>
        </p>
      </div>
      <div class="text-right text-xs text-slate-400">
        <div>Web: <code class="text-emerald-400">${data.baseUrl}</code></div>
        <div>API: <code class="text-cyan-400">${data.apiUrl}</code></div>
      </div>
    </header>

    <!-- Stat Cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div class="text-xs text-slate-400 uppercase font-medium">Tổng số trang</div>
        <div class="text-2xl font-bold mt-1 text-white">${summary.totalRoutes}</div>
        <div class="text-xs text-emerald-400 mt-1">✓ ${summary.successfulRoutes} thành công</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div class="text-xs text-slate-400 uppercase font-medium">Thời gian tải TB</div>
        <div class="text-2xl font-bold mt-1 text-white">${summary.averagePageDurationMs}ms</div>
        <div class="text-xs ${summary.averagePageDurationMs < 2000 ? 'text-emerald-400' : 'text-amber-400'} mt-1">
          ${summary.averagePageDurationMs < 2000 ? 'Rất mượt mà' : 'Cần tối ưu thêm'}
        </div>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div class="text-xs text-slate-400 uppercase font-medium">Slow API (>1s)</div>
        <div class="text-2xl font-bold mt-1 ${summary.totalSlowApiRequests > 0 ? 'text-red-400' : 'text-emerald-400'}">
          ${summary.totalSlowApiRequests}
        </div>
        <div class="text-xs text-slate-400 mt-1">Endpoint bị chậm</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div class="text-xs text-slate-400 uppercase font-medium">Slow SQL (>500ms)</div>
        <div class="text-2xl font-bold mt-1 ${summary.totalPrismaSlowQueries > 0 ? 'text-red-400' : 'text-emerald-400'}">
          ${summary.totalPrismaSlowQueries}
        </div>
        <div class="text-xs text-slate-400 mt-1">Prisma query log</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div class="text-xs text-slate-400 uppercase font-medium">Lỗi Console</div>
        <div class="text-2xl font-bold mt-1 ${summary.totalConsoleErrors > 0 ? 'text-red-400' : 'text-emerald-400'}">
          ${summary.totalConsoleErrors}
        </div>
        <div class="text-xs text-slate-400 mt-1">Errors trên browser</div>
      </div>
    </div>

    <!-- Routes Table -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
      <h2 class="text-xl font-bold text-slate-100 mb-4 flex items-center justify-between">
        <span>Chi tiết Hiệu năng Từng Trang & Popup</span>
        <span class="text-xs font-normal text-slate-400">Đã kiểm tra an toàn (Không submit dữ liệu)</span>
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-300">
          <thead class="text-xs uppercase bg-slate-800/60 text-slate-400 border-b border-slate-700">
            <tr>
              <th class="py-3 px-4">Tên màn hình</th>
              <th class="py-3 px-4">Đường dẫn</th>
              <th class="py-3 px-4">Phân nhóm</th>
              <th class="py-3 px-4">Thời gian</th>
              <th class="py-3 px-4">FCP</th>
              <th class="py-3 px-4">TTFB</th>
              <th class="py-3 px-4">Tabs / Popups</th>
              <th class="py-3 px-4">Trạng thái</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            ${results
              .map((r) => {
                const badgeClass =
                  r.totalElapsedMs < 1500 ? 'badge-fast' : r.totalElapsedMs < 3000 ? 'badge-medium' : 'badge-slow';
                return `
              <tr class="hover:bg-slate-800/30 transition">
                <td class="py-3 px-4 font-medium text-white">${r.title}</td>
                <td class="py-3 px-4 font-mono text-xs text-slate-400">${r.path}</td>
                <td class="py-3 px-4 text-xs text-slate-400">${r.group}</td>
                <td class="py-3 px-4 font-semibold text-white">${r.totalElapsedMs}ms</td>
                <td class="py-3 px-4 text-xs">${r.browserTimings?.fcpMs ? `${r.browserTimings.fcpMs}ms` : '-'}</td>
                <td class="py-3 px-4 text-xs">${r.browserTimings?.ttfbMs ? `${r.browserTimings.ttfbMs}ms` : '-'}</td>
                <td class="py-3 px-4 text-xs">
                  ${r.tabs?.length ? `<span class="bg-slate-800 px-2 py-0.5 rounded text-cyan-400 mr-1">${r.tabs.length} tabs</span>` : ''}
                  ${r.popups?.length ? `<span class="bg-slate-800 px-2 py-0.5 rounded text-emerald-400">${r.popups.length} popups</span>` : '<span class="text-slate-500">-</span>'}
                </td>
                <td class="py-3 px-4">
                  <span class="inline-block px-2.5 py-1 text-xs rounded-full font-medium ${badgeClass}">
                    ${r.status}
                  </span>
                </td>
              </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Slow Queries & Slow APIs -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <!-- Slow Queries -->
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 class="text-lg font-bold text-slate-100 mb-4 flex items-center justify-between">
          <span>Backend Slow Queries (>500ms)</span>
          <span class="text-xs bg-red-950 text-red-400 px-2 py-0.5 rounded">${backendSlowQueries.length} detected</span>
        </h2>
        ${
          backendSlowQueries.length === 0
            ? `<div class="p-6 text-center text-slate-500 text-sm">Không có câu lệnh SQL nào chạy chậm hơn 500ms. Rất tốt! 🎉</div>`
            : `<div class="space-y-4 max-h-96 overflow-y-auto pr-2">
            ${backendSlowQueries
              .map(
                (q, idx) => `
              <div class="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                <div class="flex justify-between items-center text-xs mb-2">
                  <span class="font-semibold text-amber-400">[${q.source?.toUpperCase() || 'SQL'}] #${idx + 1}</span>
                  <span class="font-mono font-bold text-red-400">${q.durationMs}ms</span>
                </div>
                <pre class="text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap bg-slate-900 p-2 rounded">${q.query || q.url || 'N/A'}</pre>
              </div>`
              )
              .join('')}
          </div>`
        }
      </div>

      <!-- Slow API Calls -->
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 class="text-lg font-bold text-slate-100 mb-4 flex items-center justify-between">
          <span>Browser Slow API Responses (>1.000ms)</span>
          <span class="text-xs bg-amber-950 text-amber-400 px-2 py-0.5 rounded">${globalSlowApiRequests.length} requests</span>
        </h2>
        ${
          globalSlowApiRequests.length === 0
            ? `<div class="p-6 text-center text-slate-500 text-sm">Toàn bộ API đều phản hồi dưới 1 giây. Tuyệt vời! ⚡</div>`
            : `<div class="space-y-4 max-h-96 overflow-y-auto pr-2">
            ${globalSlowApiRequests
              .map(
                (api) => `
              <div class="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <div class="flex justify-between items-center text-xs mb-1">
                  <span class="font-mono text-cyan-400 truncate max-w-xs" title="${api.url}">${api.url}</span>
                  <span class="font-mono font-bold text-red-400">${api.durationMs}ms</span>
                </div>
                <div class="text-xs text-slate-500">Gọi từ màn hình: <code class="text-slate-400">${api.route}</code></div>
              </div>`
              )
              .join('')}
          </div>`
        }
      </div>
    </div>

    <!-- Popup Screenshot Gallery -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h2 class="text-xl font-bold text-slate-100 mb-4">Ảnh Chụp Popups & Modals Đã Mở</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${results
          .flatMap((r) => r.popups || [])
          .map(
            (p) => `
          <div class="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div class="text-xs font-semibold text-white mb-1 truncate" title="${p.triggerButton}">
              Nút: "${p.triggerButton}" (${p.type})
            </div>
            <div class="text-xs text-slate-400 mb-2">Độ trễ mở: ${p.openDurationMs}ms</div>
            <img src="screenshots/${p.screenshot}" alt="${p.triggerButton}" class="rounded border border-slate-800 w-full object-cover h-48 hover:scale-105 transition duration-300" onerror="this.style.display='none'" />
          </div>`
          )
          .join('')}
      </div>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(htmlReportPath, htmlContent, 'utf-8');
  console.log(`[Reporter] HTML Dashboard generated at: ${htmlReportPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateReports();
}
