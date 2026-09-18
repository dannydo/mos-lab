/**
 * index.mjs
 * Điểm khởi chạy trung tâm của hệ thống Crawler & Benchmark mos-lab.
 * Thực hiện: Lập Manifest -> Chạy Crawler đo đạc -> Xuất Báo cáo Kép (HTML + Markdown).
 */

import { generateManifest } from './manifest-generator.mjs';
import { runCrawler } from './crawler-runner.mjs';
import { generateReports } from './report-generator.mjs';

async function main() {
  const startTime = Date.now();
  console.log('======================================================');
  console.log('🚀 MOS-LAB AUTOMATED E2E CRAWLER & BENCHMARK SUITE');
  console.log('======================================================');

  console.log('\n[1/3] Khám phá & Lập danh mục (Manifest Generation)...');
  generateManifest();

  console.log('\n[2/3] Khởi chạy Bot Crawler Giả lập Người dùng (Playwright)...');
  await runCrawler();

  console.log('\n[3/3] Xuất Báo cáo Kép (HTML Dashboard & Markdown Summary)...');
  generateReports();

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log('\n======================================================');
  console.log(`✅ BENCHMARK HOÀN THÀNH trong ${durationSec} giây!`);
  console.log('📂 Dashboard HTML: output/benchmark/report.html');
  console.log('📄 Báo cáo Markdown: output/benchmark/BENCHMARK_REPORT.md');
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('[Benchmark Suite] Lỗi nghiêm trọng:', err);
  process.exit(1);
});
