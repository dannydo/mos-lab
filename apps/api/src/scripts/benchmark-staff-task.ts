import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
import path from 'node:path';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const legacy = new LegacyPrismaClient({
  datasources: {
    db: {
      url: process.env.LEGACY_DATABASE_URL || 'mysql://root:chickisslove@127.0.0.1:3306/management',
    },
  },
});

interface ProfileRow {
  user_id: number;
  client_store_id: number;
}

interface ScheduleRow {
  id: number;
  staff_task_rule_id: number;
}

interface TaskResult {
  id: number;
  date_start: Date;
  date_end: Date;
  date_completed: Date | null;
}

async function main() {
  console.log('=== BENCHMARK P1-B: STAFF TASK GENERATOR QUERY ===');

  // Ensure index exists for the test
  console.log('Ensuring index idx_staff_task_rule_user_store_id exists...');
  await legacy.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_staff_task_rule_user_store_id 
    ON staff_task (staff_task_rule_id, from_user_id, from_client_store_id, id)
  `);

  // 1. Load active schedules
  const schedules = await legacy.$queryRawUnsafe<ScheduleRow[]>(`
    SELECT id, staff_task_rule_id 
    FROM staff_task_rule_schedule 
    WHERE is_disabled = 0
    ORDER BY position ASC, id ASC
  `);
  console.log(`Loaded ${schedules.length} active schedules for sample benchmark.`);

  // 2. Load active staff profiles
  const profiles = await legacy.$queryRawUnsafe<ProfileRow[]>(`
    SELECT DISTINCT user_id, client_store_id 
    FROM user_profile 
    WHERE is_disabled = 0 AND user_group_id NOT IN (1, 3, 24)
  `);
  console.log(`Loaded ${profiles.length} active staff profiles.`);

  const totalPairs = schedules.length * profiles.length;
  console.log(
    `Total query iterations to simulate: ${totalPairs} (${schedules.length} schedules x ${profiles.length} staff)\n`
  );

  // --- RUN BASELINE (Without index: IGNORE INDEX) ---
  console.log('Running Baseline (WITHOUT composite index)...');
  const baselineResults = new Map<string, TaskResult | null>();
  const baselineTimes: number[] = [];
  const t0Baseline = performance.now();

  for (const schedule of schedules) {
    for (const profile of profiles) {
      const q0 = performance.now();
      const rows = await legacy.$queryRawUnsafe<TaskResult[]>(
        `
        SELECT id, date_start, date_end, date_completed 
        FROM staff_task 
        IGNORE INDEX (idx_staff_task_rule_user_store_id, idx_staff_task_user_rule_store_id)
        WHERE from_client_store_id = ? 
          AND from_user_id = ? 
          AND staff_task_rule_id = ? 
        ORDER BY id DESC 
        LIMIT 1
      `,
        profile.client_store_id,
        profile.user_id,
        schedule.staff_task_rule_id
      );
      const q1 = performance.now();
      baselineTimes.push(q1 - q0);

      const key = `${schedule.staff_task_rule_id}_${profile.client_store_id}_${profile.user_id}`;
      baselineResults.set(key, rows.length > 0 ? rows[0] : null);
    }
  }
  const t1Baseline = performance.now();
  const totalBaselineMs = t1Baseline - t0Baseline;

  // --- RUN OPTIMIZED (WITH composite index) ---
  console.log('Running Optimized (WITH composite index)...');
  const optimizedResults = new Map<string, TaskResult | null>();
  const optimizedTimes: number[] = [];
  const t0Optimized = performance.now();

  for (const schedule of schedules) {
    for (const profile of profiles) {
      const q0 = performance.now();
      const rows = await legacy.$queryRawUnsafe<TaskResult[]>(
        `
        SELECT id, date_start, date_end, date_completed 
        FROM staff_task 
        FORCE INDEX (idx_staff_task_rule_user_store_id)
        WHERE from_client_store_id = ? 
          AND from_user_id = ? 
          AND staff_task_rule_id = ? 
        ORDER BY id DESC 
        LIMIT 1
      `,
        profile.client_store_id,
        profile.user_id,
        schedule.staff_task_rule_id
      );
      const q1 = performance.now();
      optimizedTimes.push(q1 - q0);

      const key = `${schedule.staff_task_rule_id}_${profile.client_store_id}_${profile.user_id}`;
      optimizedResults.set(key, rows.length > 0 ? rows[0] : null);
    }
  }
  const t1Optimized = performance.now();
  const totalOptimizedMs = t1Optimized - t0Optimized;

  // --- VERIFY DATA PARITY ---
  let matches = 0;
  let mismatches = 0;
  for (const [key, baseVal] of baselineResults.entries()) {
    const optVal = optimizedResults.get(key);
    if (!baseVal && !optVal) {
      matches++;
    } else if (baseVal && optVal && baseVal.id === optVal.id) {
      matches++;
    } else {
      mismatches++;
      console.error(`Mismatch for key ${key}:`, { baseVal, optVal });
    }
  }

  const stringifyBigInt = (obj: unknown) => JSON.stringify(obj, (k, v) => (typeof v === 'bigint' ? v.toString() : v));

  const hashBase = createHash('sha256')
    .update(stringifyBigInt([...baselineResults]))
    .digest('hex');
  const hashOpt = createHash('sha256')
    .update(stringifyBigInt([...optimizedResults]))
    .digest('hex');

  // Compute percentiles
  baselineTimes.sort((a, b) => a - b);
  optimizedTimes.sort((a, b) => a - b);

  const p50Base = baselineTimes[Math.floor(baselineTimes.length * 0.5)];
  const p95Base = baselineTimes[Math.floor(baselineTimes.length * 0.95)];
  const p99Base = baselineTimes[Math.floor(baselineTimes.length * 0.99)];

  const p50Opt = optimizedTimes[Math.floor(optimizedTimes.length * 0.5)];
  const p95Opt = optimizedTimes[Math.floor(optimizedTimes.length * 0.95)];
  const p99Opt = optimizedTimes[Math.floor(optimizedTimes.length * 0.99)];

  const speedup = ((totalBaselineMs - totalOptimizedMs) / totalBaselineMs) * 100;
  const factor = totalBaselineMs / totalOptimizedMs;

  console.log('\n================== BENCHMARK RESULTS ==================');
  console.log(`Simulated Iterations: ${totalPairs} queries`);
  console.log('-------------------------------------------------------');
  console.log(
    `Baseline (No Index):  Total = ${totalBaselineMs.toFixed(2)} ms | Avg = ${(totalBaselineMs / totalPairs).toFixed(2)} ms | p50 = ${p50Base.toFixed(2)} ms | p95 = ${p95Base.toFixed(2)} ms | p99 = ${p99Base.toFixed(2)} ms`
  );
  console.log(
    `Optimized (Indexed):  Total = ${totalOptimizedMs.toFixed(2)} ms | Avg = ${(totalOptimizedMs / totalPairs).toFixed(2)} ms | p50 = ${p50Opt.toFixed(2)} ms | p95 = ${p95Opt.toFixed(2)} ms | p99 = ${p99Opt.toFixed(2)} ms`
  );
  console.log('-------------------------------------------------------');
  console.log(`Performance Gain:     ${speedup.toFixed(1)}% faster (${factor.toFixed(2)}x speedup)`);
  console.log(`Total Time Saved:     ${((totalBaselineMs - totalOptimizedMs) / 1000).toFixed(2)} seconds per run`);
  console.log('-------------------------------------------------------');
  console.log(`Data Parity Check:    ${matches}/${totalPairs} matched (${mismatches} mismatches)`);
  console.log(`Baseline SHA-256:     ${hashBase}`);
  console.log(`Optimized SHA-256:    ${hashOpt}`);
  console.log(
    `Parity Verdict:       ${hashBase === hashOpt ? '✅ 100% EXACT MATCH (PARITY CONFIRMED)' : '❌ MISMATCH'}`
  );
  console.log('=======================================================\n');

  await legacy.$disconnect();
}

main().catch(console.error);
