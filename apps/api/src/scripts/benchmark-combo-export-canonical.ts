import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
import path from 'node:path';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

type Row = Record<string, unknown>;

const legacy = new LegacyPrismaClient({
  datasources: {
    db: {
      url: process.env.LEGACY_DATABASE_URL || 'mysql://root:chickisslove@127.0.0.1:3306/management',
    },
  },
});

const dateFromTs = '2026-06-15 00:00:00';
const dateToTs = '2026-07-15 00:00:00';

const canonicalSql = `
  SELECT
      o.id AS order_id,
      o.user_id AS client_id,
      TRIM(COALESCE(NULLIF(up.full_name, ''), CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')))) AS client_name,
      CASE WHEN EXISTS (
          SELECT 1 FROM user_service_balance usb
          WHERE usb.user_id = o.user_id
            AND usb.date_created < COALESCE(ro.actual_booking_date_start, o.booking_date_start)
            AND (
                COALESCE(
                    (
                        SELECT usbt.date_expired
                        FROM user_service_balance_transaction usbt
                        LEFT JOIN report_order ro_txn ON ro_txn.order_id = usbt.order_id
                        LEFT JOIN \`order\` o_txn ON o_txn.id = usbt.order_id
                        WHERE usbt.user_service_balance_id = usb.id
                          AND COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) < COALESCE(ro.actual_booking_date_start, o.booking_date_start)
                        ORDER BY COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) DESC, usbt.id DESC
                        LIMIT 1
                    ),
                    usb.date_expired
                ) IS NULL
                OR
                COALESCE(
                    (
                        SELECT usbt.date_expired
                        FROM user_service_balance_transaction usbt
                        LEFT JOIN report_order ro_txn ON ro_txn.order_id = usbt.order_id
                        LEFT JOIN \`order\` o_txn ON o_txn.id = usbt.order_id
                        WHERE usbt.user_service_balance_id = usb.id
                          AND COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) < COALESCE(ro.actual_booking_date_start, o.booking_date_start)
                        ORDER BY COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) DESC, usbt.id DESC
                        LIMIT 1
                    ),
                    usb.date_expired
                ) >= DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start))
            )
            AND LEAST(
                COALESCE(
                    (
                        SELECT usbt.total_normal_count_left + usbt.total_retain_count_left
                        FROM user_service_balance_transaction usbt
                        LEFT JOIN report_order ro_txn ON ro_txn.order_id = usbt.order_id
                        LEFT JOIN \`order\` o_txn ON o_txn.id = usbt.order_id
                        WHERE usbt.user_service_balance_id = usb.id
                          AND COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) < COALESCE(ro.actual_booking_date_start, o.booking_date_start)
                        ORDER BY COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) DESC, usbt.id DESC
                        LIMIT 1
                    ),
                    999999
                ),
                usb.normal_count + usb.retain_count + (
                    SELECT COALESCE(SUM(usbt2.normal_count + usbt2.retain_count), 0)
                    FROM user_service_balance_transaction usbt2
                    LEFT JOIN report_order ro_txn2 ON ro_txn2.order_id = usbt2.order_id
                    LEFT JOIN \`order\` o_txn2 ON o_txn2.id = usbt2.order_id
                    WHERE usbt2.user_service_balance_id = usb.id
                      AND COALESCE(ro_txn2.actual_booking_date_start, o_txn2.booking_date_start, usbt2.date_created) >= COALESCE(ro.actual_booking_date_start, o.booking_date_start)
                      AND usbt2.used_staff_id IS NOT NULL
                )
            ) > 0
      ) THEN 'Live' ELSE 'Not Live' END AS combo_state
  FROM \`order\` o
  LEFT JOIN report_order ro ON ro.order_id = o.id
  JOIN order_service os ON os.order_id = o.id
  LEFT JOIN user_profile up ON up.user_id = o.user_id
  WHERE 1 = 1
    AND o.date_created >= ?
    AND o.date_created < ?
  GROUP BY o.id, o.user_id
  ORDER BY o.id DESC
`;

// Candidate 1: Eliminate unnecessary GROUP BY and filesort by using EXISTS for order_service
const candidate1Sql = `
  SELECT
      o.id AS order_id,
      o.user_id AS client_id,
      TRIM(COALESCE(NULLIF(up.full_name, ''), CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')))) AS client_name,
      CASE WHEN EXISTS (
          SELECT 1 FROM user_service_balance usb
          WHERE usb.user_id = o.user_id
            AND usb.date_created < COALESCE(ro.actual_booking_date_start, o.booking_date_start)
            AND (
                COALESCE(
                    (
                        SELECT usbt.date_expired
                        FROM user_service_balance_transaction usbt
                        LEFT JOIN report_order ro_txn ON ro_txn.order_id = usbt.order_id
                        LEFT JOIN \`order\` o_txn ON o_txn.id = usbt.order_id
                        WHERE usbt.user_service_balance_id = usb.id
                          AND COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) < COALESCE(ro.actual_booking_date_start, o.booking_date_start)
                        ORDER BY COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) DESC, usbt.id DESC
                        LIMIT 1
                    ),
                    usb.date_expired
                ) IS NULL
                OR
                COALESCE(
                    (
                        SELECT usbt.date_expired
                        FROM user_service_balance_transaction usbt
                        LEFT JOIN report_order ro_txn ON ro_txn.order_id = usbt.order_id
                        LEFT JOIN \`order\` o_txn ON o_txn.id = usbt.order_id
                        WHERE usbt.user_service_balance_id = usb.id
                          AND COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) < COALESCE(ro.actual_booking_date_start, o.booking_date_start)
                        ORDER BY COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) DESC, usbt.id DESC
                        LIMIT 1
                    ),
                    usb.date_expired
                ) >= DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start))
            )
            AND LEAST(
                COALESCE(
                    (
                        SELECT usbt.total_normal_count_left + usbt.total_retain_count_left
                        FROM user_service_balance_transaction usbt
                        LEFT JOIN report_order ro_txn ON ro_txn.order_id = usbt.order_id
                        LEFT JOIN \`order\` o_txn ON o_txn.id = usbt.order_id
                        WHERE usbt.user_service_balance_id = usb.id
                          AND COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) < COALESCE(ro.actual_booking_date_start, o.booking_date_start)
                        ORDER BY COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) DESC, usbt.id DESC
                        LIMIT 1
                    ),
                    999999
                ),
                usb.normal_count + usb.retain_count + (
                    SELECT COALESCE(SUM(usbt2.normal_count + usbt2.retain_count), 0)
                    FROM user_service_balance_transaction usbt2
                    LEFT JOIN report_order ro_txn2 ON ro_txn2.order_id = usbt2.order_id
                    LEFT JOIN \`order\` o_txn2 ON o_txn2.id = usbt2.order_id
                    WHERE usbt2.user_service_balance_id = usb.id
                      AND COALESCE(ro_txn2.actual_booking_date_start, o_txn2.booking_date_start, usbt2.date_created) >= COALESCE(ro.actual_booking_date_start, o.booking_date_start)
                      AND usbt2.used_staff_id IS NOT NULL
                )
            ) > 0
      ) THEN 'Live' ELSE 'Not Live' END AS combo_state
  FROM \`order\` o
  LEFT JOIN report_order ro ON ro.order_id = o.id
  LEFT JOIN user_profile up ON up.user_id = o.user_id
  WHERE o.date_created >= ?
    AND o.date_created < ?
    AND EXISTS (SELECT 1 FROM order_service os WHERE os.order_id = o.id)
  ORDER BY o.id DESC
`;

// Candidate 2: Short-circuit depleted balances (96.6% of balances) and eliminate duplicate filesort subqueries
const candidate2Sql = `
  SELECT
      o.id AS order_id,
      o.user_id AS client_id,
      TRIM(COALESCE(NULLIF(up.full_name, ''), CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')))) AS client_name,
      CASE WHEN EXISTS (
          SELECT 1 FROM user_service_balance usb
          WHERE usb.user_id = o.user_id
            AND usb.date_created < COALESCE(ro.actual_booking_date_start, o.booking_date_start)
            -- Short-circuit 1: If current balance + future uses <= 0, balance can never be live!
            AND (
                usb.normal_count + usb.retain_count + (
                    SELECT COALESCE(SUM(usbt2.normal_count + usbt2.retain_count), 0)
                    FROM user_service_balance_transaction usbt2
                    LEFT JOIN report_order ro_txn2 ON ro_txn2.order_id = usbt2.order_id
                    LEFT JOIN \`order\` o_txn2 ON o_txn2.id = usbt2.order_id
                    WHERE usbt2.user_service_balance_id = usb.id
                      AND COALESCE(ro_txn2.actual_booking_date_start, o_txn2.booking_date_start, usbt2.date_created) >= COALESCE(ro.actual_booking_date_start, o.booking_date_start)
                      AND usbt2.used_staff_id IS NOT NULL
                )
            ) > 0
            -- Short-circuit 2: Expiration check (null or >= booking date)
            AND (
                COALESCE(
                    (
                        SELECT usbt.date_expired
                        FROM user_service_balance_transaction usbt
                        LEFT JOIN report_order ro_txn ON ro_txn.order_id = usbt.order_id
                        LEFT JOIN \`order\` o_txn ON o_txn.id = usbt.order_id
                        WHERE usbt.user_service_balance_id = usb.id
                          AND COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) < COALESCE(ro.actual_booking_date_start, o.booking_date_start)
                        ORDER BY COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) DESC, usbt.id DESC
                        LIMIT 1
                    ),
                    usb.date_expired
                ) IS NULL
                OR
                COALESCE(
                    (
                        SELECT usbt.date_expired
                        FROM user_service_balance_transaction usbt
                        LEFT JOIN report_order ro_txn ON ro_txn.order_id = usbt.order_id
                        LEFT JOIN \`order\` o_txn ON o_txn.id = usbt.order_id
                        WHERE usbt.user_service_balance_id = usb.id
                          AND COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) < COALESCE(ro.actual_booking_date_start, o.booking_date_start)
                        ORDER BY COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) DESC, usbt.id DESC
                        LIMIT 1
                    ),
                    usb.date_expired
                ) >= DATE(COALESCE(ro.actual_booking_date_start, o.booking_date_start))
            )
            -- Short-circuit 3: Remaining count at last transaction (or fallback 999999) > 0
            AND COALESCE(
                (
                    SELECT usbt.total_normal_count_left + usbt.total_retain_count_left
                    FROM user_service_balance_transaction usbt
                    LEFT JOIN report_order ro_txn ON ro_txn.order_id = usbt.order_id
                    LEFT JOIN \`order\` o_txn ON o_txn.id = usbt.order_id
                    WHERE usbt.user_service_balance_id = usb.id
                      AND COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) < COALESCE(ro.actual_booking_date_start, o.booking_date_start)
                    ORDER BY COALESCE(ro_txn.actual_booking_date_start, o_txn.booking_date_start, usbt.date_created) DESC, usbt.id DESC
                    LIMIT 1
                ),
                999999
            ) > 0
      ) THEN 'Live' ELSE 'Not Live' END AS combo_state
  FROM \`order\` o
  LEFT JOIN report_order ro ON ro.order_id = o.id
  LEFT JOIN user_profile up ON up.user_id = o.user_id
  WHERE o.date_created >= ?
    AND o.date_created < ?
    AND EXISTS (SELECT 1 FROM order_service os WHERE os.order_id = o.id)
  ORDER BY o.id DESC
`;

function hash(rows: Row[]): string {
  return createHash('sha256')
    .update(JSON.stringify(rows, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)))
    .digest('hex');
}

async function measure(name: string, sql: string, params: unknown[], samples: number) {
  console.log(`[${name}] Warming up...`);
  await legacy.$queryRawUnsafe<Row[]>(sql, ...params);

  console.log(`[${name}] Measuring over ${samples} runs...`);
  const durations: number[] = [];
  let rows: Row[] = [];
  for (let index = 0; index < samples; index += 1) {
    const startedAt = performance.now();
    rows = await legacy.$queryRawUnsafe<Row[]>(sql, ...params);
    const duration = performance.now() - startedAt;
    durations.push(duration);
    console.log(`  Run ${index + 1}/${samples}: ${duration.toFixed(2)} ms (rows: ${rows.length})`);
  }

  durations.sort((left, right) => left - right);
  const p50 = durations[Math.floor(durations.length / 2)];
  const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;

  return {
    name,
    p50Ms: Number(p50.toFixed(2)),
    p95Ms: Number(p95.toFixed(2)),
    avgMs: Number(avg.toFixed(2)),
    minMs: Number(durations[0].toFixed(2)),
    maxMs: Number(durations[durations.length - 1].toFixed(2)),
    rows: rows.length,
    hash: hash(rows),
  };
}

async function main() {
  const samples = Number(process.env.BENCHMARK_SAMPLES || 5);
  try {
    await legacy.$connect();
    console.log(`=== COMBO EXPORT CANONICAL BENCHMARK (ORBSTACK MARIADB) ===`);
    console.log(`Window: ${dateFromTs} -> ${dateToTs}`);
    console.log(`Samples: ${samples}\n`);

    const baseline = await measure('CANONICAL BASELINE', canonicalSql, [dateFromTs, dateToTs], samples);
    const candidate1 = await measure('CANDIDATE 1 (NO GROUP BY)', candidate1Sql, [dateFromTs, dateToTs], samples);
    const candidate2 = await measure('CANDIDATE 2 (SHORT-CIRCUIT)', candidate2Sql, [dateFromTs, dateToTs], samples);

    console.log('\n=== EXPLAIN CANDIDATE 2 ===');
    const plan2 = await legacy.$queryRawUnsafe(`EXPLAIN ${candidate2Sql}`, dateFromTs, dateToTs);
    console.table(plan2);

    const isMatch1 = baseline.rows === candidate1.rows && baseline.hash === candidate1.hash;
    const isMatch2 = baseline.rows === candidate2.rows && baseline.hash === candidate2.hash;

    console.log('\n=== SUMMARY COMPARISON ===');
    console.log(`Candidate 1 Parity: ${isMatch1 ? '✅ 100% EXACT MATCH' : '❌ MISMATCH'}`);
    console.log(`Candidate 2 Parity: ${isMatch2 ? '✅ 100% EXACT MATCH' : '❌ MISMATCH'}`);
    console.log(`Canonical Baseline p95: ${baseline.p95Ms} ms`);
    console.log(
      `Candidate 1 p95:        ${candidate1.p95Ms} ms (${((1 - candidate1.p95Ms / baseline.p95Ms) * 100).toFixed(1)}% faster)`
    );
    console.log(
      `Candidate 2 p95:        ${candidate2.p95Ms} ms (${((1 - candidate2.p95Ms / baseline.p95Ms) * 100).toFixed(1)}% faster)`
    );
    console.log(JSON.stringify({ baseline, candidate1, candidate2, isMatch1, isMatch2 }, null, 2));
  } catch (err) {
    console.error('Benchmark error:', err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
