import { createHash } from 'node:crypto';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';

type Row = Record<string, unknown>;

const legacy = new LegacyPrismaClient({
  datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
});

const canonicalSql = `
  SELECT
    o.id AS orderId,
    o.user_id AS customerId,
    COALESCE(ro.actual_booking_date_start, o.booking_date_start) AS checkoutDate,
    (SELECT os.check_in_staff_id FROM order_service os WHERE os.order_id = o.id AND os.check_in_staff_id IS NOT NULL LIMIT 1) AS ccInStaffId,
    (SELECT os.check_out_staff_id FROM order_service os WHERE os.order_id = o.id AND os.check_out_staff_id IS NOT NULL LIMIT 1) AS ccOutStaffId,
    o.created_staff_id AS bookerStaffId,
    (SELECT os2.assigned_staff_id FROM order_service os2 WHERE os2.order_id = o.id AND os2.assigned_staff_id IS NOT NULL LIMIT 1) AS technicianId
  FROM \`order\` o
  LEFT JOIN report_order ro ON o.id = ro.order_id
  WHERE o.order_state = 'Completed'
    AND COALESCE(ro.actual_booking_date_start, o.booking_date_start) >= DATE_SUB(NOW(), INTERVAL 14 DAY)
  ORDER BY o.id DESC
`;

// The two date branches are mutually exclusive and preserve the COALESCE rule.
// Staff lookups deliberately remain byte-for-byte equivalent to the canonical
// LIMIT 1 semantics; this benchmark must not trade speed for changed owners.
const candidateSql = `
  WITH eligible_orders AS (
    SELECT o.id, o.user_id, o.created_staff_id, ro.actual_booking_date_start AS checkout_date
    FROM report_order ro
    INNER JOIN \`order\` o ON o.id = ro.order_id
    WHERE o.order_state = 'Completed'
      AND ro.actual_booking_date_start >= DATE_SUB(NOW(), INTERVAL 14 DAY)
    UNION ALL
    SELECT o.id, o.user_id, o.created_staff_id, o.booking_date_start AS checkout_date
    FROM \`order\` o
    LEFT JOIN report_order ro ON ro.order_id = o.id
    WHERE o.order_state = 'Completed'
      AND ro.actual_booking_date_start IS NULL
      AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 14 DAY)
  )
  SELECT
    eo.id AS orderId,
    eo.user_id AS customerId,
    eo.checkout_date AS checkoutDate,
    (SELECT os.check_in_staff_id FROM order_service os WHERE os.order_id = eo.id AND os.check_in_staff_id IS NOT NULL LIMIT 1) AS ccInStaffId,
    (SELECT os.check_out_staff_id FROM order_service os WHERE os.order_id = eo.id AND os.check_out_staff_id IS NOT NULL LIMIT 1) AS ccOutStaffId,
    eo.created_staff_id AS bookerStaffId,
    (SELECT os2.assigned_staff_id FROM order_service os2 WHERE os2.order_id = eo.id AND os2.assigned_staff_id IS NOT NULL LIMIT 1) AS technicianId
  FROM eligible_orders eo
  ORDER BY eo.id DESC
`;

function hash(rows: Row[]): string {
  return createHash('sha256')
    .update(JSON.stringify(rows, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)))
    .digest('hex');
}

async function measure(sql: string, samples: number) {
  await legacy.$queryRawUnsafe<Row[]>(sql);
  const durations: number[] = [];
  let rows: Row[] = [];
  for (let index = 0; index < samples; index += 1) {
    const startedAt = performance.now();
    rows = await legacy.$queryRawUnsafe<Row[]>(sql);
    durations.push(performance.now() - startedAt);
  }
  durations.sort((left, right) => left - right);
  return {
    p50Ms: Number(durations[Math.floor(durations.length / 2)].toFixed(2)),
    p95Ms: Number(durations[Math.ceil(durations.length * 0.95) - 1].toFixed(2)),
    rows: rows.length,
    hash: hash(rows),
  };
}

async function main() {
  const samples = Number(process.env.HAPPY_CALL_BENCHMARK_SAMPLES || 10);
  try {
    const canonical = await measure(canonicalSql, samples);
    const candidate = await measure(candidateSql, samples);
    console.log(
      JSON.stringify(
        {
          window: 'rolling 14 days',
          samples,
          canonical,
          candidate,
          parity: canonical.rows === candidate.rows && canonical.hash === candidate.hash,
        },
        null,
        2
      )
    );
  } finally {
    await legacy.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
