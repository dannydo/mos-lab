import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from apps/api/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

async function runPerformanceBenchmark() {
  console.log('🚀 [PERF TEST] Starting Performance Benchmark for CV Speed Detail Modal API...\n');

  const legacyPrisma = new LegacyPrismaClient({
    datasources: {
      db: {
        url: process.env.LEGACY_DATABASE_URL,
      },
    },
  });

  try {
    await legacyPrisma.$connect();
    console.log('✅ Connected to Legacy Database successfully.');

    // 1. Fetch a sample KTV staffId from order_service
    const sampleStaff = (await legacyPrisma.$queryRawUnsafe(`
      SELECT assigned_staff_id as staff_id, COUNT(*) as cnt
      FROM order_service
      WHERE assigned_staff_id IS NOT NULL AND assigned_staff_id > 0
      GROUP BY assigned_staff_id
      ORDER BY cnt DESC
      LIMIT 1
    `)) as Array<{ staff_id: number; cnt: number }>;

    if (!sampleStaff || sampleStaff.length === 0) {
      console.error('❌ No valid staff ID found in order_service table.');
      process.exit(1);
    }

    const testStaffId = Number(sampleStaff[0].staff_id);
    console.log(`📌 Selected Test Staff ID: ${testStaffId} (${sampleStaff[0].cnt} total order services)\n`);

    // -------------------------------------------------------------
    // TEST 1: Original SQL Query (with LEFT JOIN staff_bonus & GROUP BY os.id)
    // -------------------------------------------------------------
    console.log('--- 1. BENCHMARKING ORIGINAL SQL QUERY ---');
    const origRecentQuery = `
      SELECT
        os.id as order_service_id,
        o.id as order_id,
        o.user_id,
        DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d %H:%i') as date_str,
        s.service_key,
        COALESCE(sl.service_name, s.service_key) as service_name,
        s.service_type,
        COALESCE(ros.cleaning_minute, 0) as cleaning_minute,
        COALESCE(ros.servicing_minute, 0) as servicing_minute,
        COALESCE(ros.preparation_minute, 0) as preparation_minute,
        COALESCE(ros.pre_servicing_minute, 0) as pre_servicing_minute
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN service s ON os.service_id = s.id
      JOIN report_order_service ros ON os.id = ros.order_service_id
      LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
      LEFT JOIN report_order ro ON o.id = ro.order_id
      LEFT JOIN staff_bonus sb ON sb.order_service_id = os.id
      WHERE o.order_state = 'Completed'
        AND (os.assigned_staff_id = ${testStaffId} OR sb.user_id = ${testStaffId})
        AND (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) > 15
        AND (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) < 200
      GROUP BY os.id
      ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC
      LIMIT 50
    `;

    const origMonthlyQuery = `
      SELECT
        DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m') as month_str,
        ROUND(AVG(COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0))) as avg_time
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN report_order_service ros ON os.id = ros.order_service_id
      LEFT JOIN report_order ro ON o.id = ro.order_id
      LEFT JOIN staff_bonus sb ON sb.order_service_id = os.id
      WHERE o.order_state = 'Completed'
        AND (os.assigned_staff_id = ${testStaffId} OR sb.user_id = ${testStaffId})
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY month_str
      ORDER BY month_str ASC
    `;

    const origTimes: number[] = [];
    for (let i = 0; i < 2; i++) {
      const start = performance.now();
      await Promise.all([
        legacyPrisma.$queryRawUnsafe(origRecentQuery),
        legacyPrisma.$queryRawUnsafe(origMonthlyQuery),
      ]);
      const end = performance.now();
      origTimes.push(end - start);
    }
    const origAvg = origTimes.reduce((a, b) => a + b, 0) / origTimes.length;
    console.log(`Original SQL Execution Time (2 runs avg): ${origAvg.toFixed(2)} ms`);

    // -------------------------------------------------------------
    // TEST 2: Optimized SQL Query (EXISTS subquery, no GROUP BY os.id)
    // -------------------------------------------------------------
    console.log('\n--- 2. BENCHMARKING OPTIMIZED SQL QUERY ---');
    const optRecentQuery = `
      SELECT
        os.id as order_service_id,
        o.id as order_id,
        o.user_id,
        DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m-%d %H:%i') as date_str,
        s.service_key,
        COALESCE(sl.service_name, s.service_key) as service_name,
        s.service_type,
        COALESCE(ros.cleaning_minute, 0) as cleaning_minute,
        COALESCE(ros.servicing_minute, 0) as servicing_minute,
        COALESCE(ros.preparation_minute, 0) as preparation_minute,
        COALESCE(ros.pre_servicing_minute, 0) as pre_servicing_minute
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN service s ON os.service_id = s.id
      JOIN report_order_service ros ON os.id = ros.order_service_id
      LEFT JOIN service_language sl ON s.id = sl.service_id AND sl.language_id = 1
      LEFT JOIN report_order ro ON o.id = ro.order_id
      WHERE o.order_state = 'Completed'
        AND (
          os.assigned_staff_id = ${testStaffId}
          OR EXISTS (SELECT 1 FROM staff_bonus sb WHERE sb.order_service_id = os.id AND sb.user_id = ${testStaffId})
        )
        AND (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) > 15
        AND (COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0)) < 200
      ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC
      LIMIT 50
    `;

    const optMonthlyQuery = `
      SELECT
        DATE_FORMAT(COALESCE(ro.actual_booking_date_start, o.booking_date_start), '%Y-%m') as month_str,
        ROUND(AVG(COALESCE(ros.cleaning_minute, 0) + COALESCE(ros.servicing_minute, 0) + COALESCE(ros.preparation_minute, 0) + COALESCE(ros.pre_servicing_minute, 0))) as avg_time
      FROM order_service os
      JOIN \`order\` o ON os.order_id = o.id
      JOIN report_order_service ros ON os.id = ros.order_service_id
      LEFT JOIN report_order ro ON o.id = ro.order_id
      WHERE o.order_state = 'Completed'
        AND (
          os.assigned_staff_id = ${testStaffId}
          OR EXISTS (SELECT 1 FROM staff_bonus sb WHERE sb.order_service_id = os.id AND sb.user_id = ${testStaffId})
        )
        AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY month_str
      ORDER BY month_str ASC
    `;

    console.log('\n--- 2. BENCHMARKING OPTIMIZED SQL QUERY & EXPLAIN ---');
    const explainPlan = await legacyPrisma.$queryRawUnsafe(`EXPLAIN ${optRecentQuery}`);
    console.log(
      'SQL Explain Plan:',
      JSON.stringify(explainPlan, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2)
    );

    const optTimes: number[] = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      await Promise.all([legacyPrisma.$queryRawUnsafe(optRecentQuery), legacyPrisma.$queryRawUnsafe(optMonthlyQuery)]);
      const end = performance.now();
      optTimes.push(end - start);
    }
    const optAvg = optTimes.reduce((a, b) => a + b, 0) / optTimes.length;
    console.log(`Optimized SQL Execution Time (10 runs avg): ${optAvg.toFixed(2)} ms`);

    const improvementPercent = (((origAvg - optAvg) / origAvg) * 100).toFixed(1);
    console.log(`⚡ Speedup Improvement: ${improvementPercent}% faster!`);

    // -------------------------------------------------------------
    // TEST 3: Concurrent API Latency Test (Simulating 50 concurrent requests)
    // -------------------------------------------------------------
    console.log('\n--- 3. CONCURRENT LOAD TEST (50 Concurrent Requests) ---');
    const apiUrl = process.env.API_URL || 'http://localhost:4001';
    console.log(`Testing against endpoint: ${apiUrl}/api/kpi/cv-speed/detail/${testStaffId}`);

    try {
      const requests = Array.from({ length: 50 }).map(async () => {
        const start = performance.now();
        const res = await fetch(`${apiUrl}/api/kpi/cv-speed/detail/${testStaffId}`);
        const end = performance.now();
        return { status: res.status, duration: end - start };
      });

      const results = await Promise.all(requests);
      const durations = results.map((r) => r.duration).sort((a, b) => a - b);
      const p50 = durations[Math.floor(durations.length * 0.5)];
      const p95 = durations[Math.floor(durations.length * 0.95)];
      const p99 = durations[Math.floor(durations.length * 0.99)];
      const mean = durations.reduce((a, b) => a + b, 0) / durations.length;

      console.log(`Total Requests: ${results.length}`);
      console.log(`Success Rate: ${results.filter((r) => r.status === 200).length}/${results.length}`);
      console.log(`Latency Stats:`);
      console.log(`  Min:  ${durations[0].toFixed(2)} ms`);
      console.log(`  Mean: ${mean.toFixed(2)} ms`);
      console.log(`  p50:  ${p50.toFixed(2)} ms`);
      console.log(`  p95:  ${p95.toFixed(2)} ms`);
      console.log(`  p99:  ${p99.toFixed(2)} ms`);
      console.log(`  Max:  ${durations[durations.length - 1].toFixed(2)} ms`);
    } catch (err) {
      console.log(
        `⚠️ HTTP server load test skipped or server not reachable on ${apiUrl}. Direct SQL metrics recorded above.`
      );
    }

    console.log('\n✅ Performance Benchmark Completed!');
  } catch (err) {
    console.error('❌ Benchmark error:', err);
  } finally {
    await legacyPrisma.$disconnect();
  }
}

runPerformanceBenchmark();
