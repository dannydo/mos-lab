import dotenv from 'dotenv';
import path from 'node:path';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';

interface DiscrepancyRow {
  userId: number;
  currentLastOrderBooking: Date | null;
  canonicalLastOrderBooking: Date | null;
  currentDays: number | null;
  canonicalDays: number | null;
}

const args = new Set(process.argv.slice(2));
const getArg = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const apply = args.has('--apply');
const targetUserId = getArg('--user-id') ? parseInt(getArg('--user-id')!, 10) : undefined;

async function main() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  const legacy = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL } },
  });

  try {
    const userFilterSql = targetUserId ? `AND up.user_id = ${targetUserId}` : '';

    console.log(`[reconcile-last-order-booking] Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
    if (targetUserId) {
      console.log(`[reconcile-last-order-booking] Targeting user: ${targetUserId}`);
    }

    // Find discrepancies between user_profile.last_order_booking and completed orders
    const discrepancies = await legacy.$queryRawUnsafe<DiscrepancyRow[]>(`
      SELECT 
        up.user_id AS userId,
        up.last_order_booking AS currentLastOrderBooking,
        canonical.max_completed_booking AS canonicalLastOrderBooking,
        DATEDIFF(NOW(), up.last_order_booking) AS currentDays,
        DATEDIFF(NOW(), canonical.max_completed_booking) AS canonicalDays
      FROM user_profile up
      LEFT JOIN (
        SELECT o.user_id, MAX(COALESCE(ro.actual_booking_date_start, o.booking_date_start)) AS max_completed_booking
        FROM \`order\` o
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
        GROUP BY o.user_id
      ) canonical ON up.user_id = canonical.user_id
      WHERE (
        (canonical.max_completed_booking IS NULL AND up.last_order_booking IS NOT NULL)
        OR
        (canonical.max_completed_booking IS NOT NULL AND (
          up.last_order_booking IS NULL 
          OR up.last_order_booking != canonical.max_completed_booking
        ))
      )
      ${userFilterSql}
      ORDER BY up.user_id ASC
      LIMIT 1000
    `);

    console.log(`[reconcile-last-order-booking] Found ${discrepancies.length} discrepancy records.`);
    if (discrepancies.length > 0) {
      console.log('Sample discrepancies (first 10):');
      console.table(
        discrepancies.slice(0, 10).map((d) => ({
          userId: d.userId,
          current: d.currentLastOrderBooking ? new Date(d.currentLastOrderBooking).toISOString() : 'NULL',
          canonical: d.canonicalLastOrderBooking ? new Date(d.canonicalLastOrderBooking).toISOString() : 'NULL',
          currentDays: d.currentDays,
          canonicalDays: d.canonicalDays,
        }))
      );
    }

    if (apply && discrepancies.length > 0) {
      console.log('[reconcile-last-order-booking] Applying corrections...');

      // 1. Update user_profiles that have completed orders
      const updateCompletedSql = `
        UPDATE user_profile up
        JOIN (
          SELECT o.user_id, MAX(COALESCE(ro.actual_booking_date_start, o.booking_date_start)) AS max_completed_booking
          FROM \`order\` o
          LEFT JOIN report_order ro ON o.id = ro.order_id
          WHERE o.order_state = 'Completed'
          GROUP BY o.user_id
        ) canonical ON up.user_id = canonical.user_id
        SET up.last_order_booking = canonical.max_completed_booking
        WHERE (up.last_order_booking IS NULL OR up.last_order_booking != canonical.max_completed_booking)
        ${userFilterSql}
      `;
      const updatedWithOrders = await legacy.$executeRawUnsafe(updateCompletedSql);
      console.log(`[reconcile-last-order-booking] Updated ${updatedWithOrders} profiles with canonical completed order date.`);

      // 2. Set last_order_booking = NULL for profiles that have never had completed orders
      const updateNoOrdersSql = `
        UPDATE user_profile up
        LEFT JOIN (
          SELECT DISTINCT user_id FROM \`order\` WHERE order_state = 'Completed'
        ) has_completed ON up.user_id = has_completed.user_id
        SET up.last_order_booking = NULL
        WHERE has_completed.user_id IS NULL AND up.last_order_booking IS NOT NULL
        ${userFilterSql}
      `;
      const clearedNoOrders = await legacy.$executeRawUnsafe(updateNoOrdersSql);
      console.log(`[reconcile-last-order-booking] Cleared ${clearedNoOrders} profiles without completed orders.`);

      console.log('[reconcile-last-order-booking] Reconciliation finished successfully.');
    } else if (!apply) {
      console.log('[reconcile-last-order-booking] Dry-run complete. Re-run with --apply to execute updates.');
    }
  } finally {
    await legacy.$disconnect();
  }
}

main().catch((err) => {
  console.error('[reconcile-last-order-booking] Error:', err);
  process.exit(1);
});
