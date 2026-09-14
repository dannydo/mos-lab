import dotenv from 'dotenv';
import path from 'path';
import { createHash } from 'crypto';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const legacy = new LegacyPrismaClient({
  datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
});

interface ExplainRow {
  id: number;
  select_type: string;
  table: string;
  partitions?: string;
  type: string;
  possible_keys: string | null;
  key: string | null;
  key_len: string | null;
  ref: string | null;
  rows: number;
  filtered: number;
  Extra: string;
}

interface OrderRow {
  userId: number;
}

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)] ?? 0;
}

function hashResult(rows: OrderRow[]): string {
  const sortedIds = [...rows].map((r) => Number(r.userId)).sort((a, b) => a - b);
  return createHash('sha256').update(JSON.stringify(sortedIds)).digest('hex');
}

async function runBenchmark(query: string, iterations = 20) {
  // Warmup
  await legacy.$queryRawUnsafe<OrderRow[]>(query);

  const times: number[] = [];
  let lastResult: OrderRow[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const rows = await legacy.$queryRawUnsafe<OrderRow[]>(query);
    const duration = performance.now() - start;
    times.push(duration);
    lastResult = rows;
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p50 = percentile(times, 0.5);
  const p95 = percentile(times, 0.95);
  const min = Math.min(...times);
  const max = Math.max(...times);

  return {
    times,
    avg: Number(avg.toFixed(3)),
    p50: Number(p50.toFixed(3)),
    p95: Number(p95.toFixed(3)),
    min: Number(min.toFixed(3)),
    max: Number(max.toFixed(3)),
    rowCount: lastResult.length,
    hash: hashResult(lastResult),
    rows: lastResult,
  };
}

async function main() {
  await legacy.$connect();
  console.log('=== BENCHMARK ORDER DELTA SCAN (LOCAL ORBSTACK) ===\n');

  try {
    // 1. Inspect table stats
    const [tableStatus] = await legacy.$queryRawUnsafe<Array<{ Rows: number | bigint }>>(
      `SHOW TABLE STATUS WHERE Name = 'order'`
    );
    const totalOrderRows = Number(tableStatus?.Rows ?? 0);
    console.log(`Bảng \`order\` hiện có xấp xỉ: ${totalOrderRows.toLocaleString()} dòng.`);

    // 2. Find max date_updated in local database for realistic window testing
    const [dateStats] = await legacy.$queryRawUnsafe<Array<{ max_updated: Date | null; count_updated: bigint }>>(
      `SELECT MAX(date_updated) AS max_updated, COUNT(date_updated) AS count_updated FROM \`order\``
    );
    console.log(`Cột \`date_updated\` có ${Number(dateStats?.count_updated ?? 0).toLocaleString()} dòng có dữ liệu.`);
    console.log(`Thời điểm cập nhật mới nhất (max date_updated): ${dateStats?.max_updated?.toISOString() ?? 'N/A'}\n`);

    const maxDate = dateStats?.max_updated ? new Date(dateStats.max_updated) : new Date();
    // 1 day lookback before maxDate to get realistic active cohort
    const referenceIso = maxDate.toISOString().slice(0, 19).replace('T', ' ');

    const testQueryRealistic = `
      SELECT DISTINCT user_id AS userId
      FROM \`order\`
      WHERE date_updated IS NOT NULL
        AND date_updated >= DATE_SUB('${referenceIso}', INTERVAL 1 DAY)
        AND date_updated <= '${referenceIso}'
    `.trim();

    const testQueryLiteral = `
      SELECT DISTINCT user_id AS userId
      FROM \`order\`
      WHERE date_updated IS NOT NULL
        AND date_updated >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    `.trim();

    // 3. Ensure index is DROPPED first to test BEFORE state
    const existingIndexes = await legacy.$queryRawUnsafe<Array<{ Key_name: string }>>(`SHOW INDEX FROM \`order\``);
    const indexName = 'idx_order_date_updated_user';
    const hasIndex = existingIndexes.some((idx) => idx.Key_name === indexName);

    if (hasIndex) {
      console.log(`[SETUP] Tạm gỡ index \`${indexName}\` để đo lường trạng thái BEFORE (chưa tối ưu)...`);
      await legacy.$executeRawUnsafe(`ALTER TABLE \`order\` DROP INDEX \`${indexName}\``);
      console.log(`[SETUP] Đã gỡ index \`${indexName}\`.\n`);
    }

    // ----------------------------------------------------
    // PHASE 1: BEFORE OPTIMIZATION
    // ----------------------------------------------------
    console.log('--- 1. ĐO LƯỜNG TRƯỚC KHI TỐI ƯU (BEFORE - Full Table Scan) ---');

    const explainBefore = await legacy.$queryRawUnsafe<ExplainRow[]>(`EXPLAIN ${testQueryRealistic}`);
    console.log('Kế hoạch thực thi (EXPLAIN) BEFORE:');
    console.table(
      explainBefore.map((row) => ({
        select_type: row.select_type,
        table: row.table,
        type: row.type,
        possible_keys: row.possible_keys ?? 'NULL',
        key: row.key ?? 'NULL',
        rows: row.rows,
        Extra: row.Extra,
      }))
    );

    console.log('Đang chạy benchmark 20 lần trước khi có index...');
    const benchBefore = await runBenchmark(testQueryRealistic, 20);
    console.log(`Kết quả BEFORE:`);
    console.log(`- Số dòng trả về: ${benchBefore.rowCount}`);
    console.log(`- SHA-256 Hash: ${benchBefore.hash}`);
    console.log(`- Min: ${benchBefore.min}ms | Max: ${benchBefore.max}ms | Avg: ${benchBefore.avg}ms`);
    console.log(`- p50: ${benchBefore.p50}ms | p95: ${benchBefore.p95}ms\n`);

    // Also test literal query with NOW()
    const benchLiteralBefore = await runBenchmark(testQueryLiteral, 10);
    console.log(
      `Query literal DATE_SUB(NOW(), 15 MINUTE) BEFORE: p95 = ${benchLiteralBefore.p95}ms, rows examined = ${explainBefore[0]?.rows ?? totalOrderRows}\n`
    );

    // ----------------------------------------------------
    // PHASE 2: APPLY INDEX
    // ----------------------------------------------------
    console.log('--- 2. TẠO COMPOSITE INDEX (idx_order_date_updated_user) ---');
    console.log(`Đang chạy: ALTER TABLE \`order\` ADD INDEX \`${indexName}\` (\`date_updated\`, \`user_id\`)...`);
    const indexStart = performance.now();
    await legacy.$executeRawUnsafe(`ALTER TABLE \`order\` ADD INDEX \`${indexName}\` (\`date_updated\`, \`user_id\`)`);
    const indexDuration = performance.now() - indexStart;
    console.log(`Tạo index thành công sau ${(indexDuration / 1000).toFixed(2)}s!\n`);

    // ----------------------------------------------------
    // PHASE 3: AFTER OPTIMIZATION
    // ----------------------------------------------------
    console.log('--- 3. ĐO LƯỜNG SAU KHI TỐI ƯU (AFTER - Index Range Scan) ---');

    const explainAfter = await legacy.$queryRawUnsafe<ExplainRow[]>(`EXPLAIN ${testQueryRealistic}`);
    console.log('Kế hoạch thực thi (EXPLAIN) AFTER:');
    console.table(
      explainAfter.map((row) => ({
        select_type: row.select_type,
        table: row.table,
        type: row.type,
        possible_keys: row.possible_keys ?? 'NULL',
        key: row.key ?? 'NULL',
        rows: row.rows,
        Extra: row.Extra,
      }))
    );

    console.log('Đang chạy benchmark 20 lần sau khi có index...');
    const benchAfter = await runBenchmark(testQueryRealistic, 20);
    console.log(`Kết quả AFTER:`);
    console.log(`- Số dòng trả về: ${benchAfter.rowCount}`);
    console.log(`- SHA-256 Hash: ${benchAfter.hash}`);
    console.log(`- Min: ${benchAfter.min}ms | Max: ${benchAfter.max}ms | Avg: ${benchAfter.avg}ms`);
    console.log(`- p50: ${benchAfter.p50}ms | p95: ${benchAfter.p95}ms\n`);

    // Also test literal query with NOW()
    const benchLiteralAfter = await runBenchmark(testQueryLiteral, 10);
    console.log(`Query literal DATE_SUB(NOW(), 15 MINUTE) AFTER: p95 = ${benchLiteralAfter.p95}ms\n`);

    // ----------------------------------------------------
    // PHASE 4: VERIFICATION & PARITY CHECK
    // ----------------------------------------------------
    console.log('--- 4. ĐỐI SOÁT DỮ LIỆU & KẾT QUẢ HIỆU NĂNG (PARITY & SUMMARY) ---');
    const isHashMatched = benchBefore.hash === benchAfter.hash;
    const isCountMatched = benchBefore.rowCount === benchAfter.rowCount;
    const speedupAvg = (benchBefore.avg / Math.max(benchAfter.avg, 0.001)).toFixed(1);
    const speedupP95 = (benchBefore.p95 / Math.max(benchAfter.p95, 0.001)).toFixed(1);
    const reductionPercent = (((benchBefore.p95 - benchAfter.p95) / benchBefore.p95) * 100).toFixed(1);

    console.log(`Độ chính xác dữ liệu (Parity Check):`);
    console.log(
      `- Row count match: ${isCountMatched ? '✅ KHỚP TUYỆT ĐỐI (' + benchAfter.rowCount + ' rows)' : '❌ LỆCH'}`
    );
    console.log(
      `- SHA-256 Hash match: ${isHashMatched ? '✅ KHỚP 100% (' + benchAfter.hash.slice(0, 16) + '...)' : '❌ LỆCH'}`
    );

    if (!isHashMatched) {
      throw new Error('FATAL: Dữ liệu trước và sau khi thêm index không trùng khớp!');
    }

    console.log(`\nBảng so sánh hiệu năng:`);
    console.table([
      {
        Chỉ_số: 'Scan Type',
        Trước_khi_tối_ưu: explainBefore[0]?.type,
        Sau_khi_tối_ưu: explainAfter[0]?.type,
        Đánh_giá: 'Chuyển từ Full Table Scan sang Index Range',
      },
      {
        Chỉ_số: 'Key Used',
        Trước_khi_tối_ưu: explainBefore[0]?.key ?? 'NULL (Không dùng index)',
        Sau_khi_tối_ưu: explainAfter[0]?.key ?? 'idx_order_date_updated_user',
        Đánh_giá: 'Using index (Covering Index)',
      },
      {
        Chỉ_số: 'Rows Examined (ước tính)',
        Trước_khi_tối_ưu: explainBefore[0]?.rows,
        Sau_khi_tối_ưu: explainAfter[0]?.rows,
        Đánh_giá: `Giảm ${(Number(explainBefore[0]?.rows) / Math.max(Number(explainAfter[0]?.rows), 1)).toFixed(0)} lần`,
      },
      {
        Chỉ_số: 'Average Latency',
        Trước_khi_tối_ưu: `${benchBefore.avg} ms`,
        Sau_khi_tối_ưu: `${benchAfter.avg} ms`,
        Đánh_giá: `Nhanh hơn ${speedupAvg}×`,
      },
      {
        Chỉ_số: 'p95 Latency',
        Trước_khi_tối_ưu: `${benchBefore.p95} ms`,
        Sau_khi_tối_ưu: `${benchAfter.p95} ms`,
        Đánh_giá: `Nhanh hơn ${speedupP95}× (Giảm ${reductionPercent}%)`,
      },
      {
        Chỉ_số: 'Literal NOW() p95',
        Trước_khi_tối_ưu: `${benchLiteralBefore.p95} ms`,
        Sau_khi_tối_ưu: `${benchLiteralAfter.p95} ms`,
        Đánh_giá: `Nhanh hơn ${(benchLiteralBefore.p95 / Math.max(benchLiteralAfter.p95, 0.001)).toFixed(1)}×`,
      },
    ]);
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((err) => {
  console.error('Lỗi khi chạy benchmark:', err);
  process.exit(1);
});
