import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client/index.js';
import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const crm = new CrmPrismaClient();
const legacy = new LegacyPrismaClient();

async function run() {
  const startRange = new Date('2026-06-01T00:00:00.000Z');
  const endRange = new Date('2026-06-30T23:59:59.999Z');

  // Fetch active telesales
  const staffList = await crm.crmStaff.findMany({
    where: { role: 'telesales', isActive: true }
  });
  const staffNames = staffList.map(s => s.displayName);

  // Map legacy profiles
  const profiles = await legacy.$queryRawUnsafe<any[]>(`
    SELECT up.user_id as userId, up.full_name as fullName
    FROM \`staff_profile\` sp
    JOIN \`user_profile\` up ON sp.user_id = up.user_id
    WHERE up.provider = 'Staff' AND up.is_disabled = 0
      AND up.full_name IN (${staffNames.map(() => '?').join(',')})
  `, ...staffNames);
  const activeLegacyUserIds = profiles.map(p => Number(p.userId));

  if (activeLegacyUserIds.length === 0) {
    console.error('No legacy user IDs found.');
    return;
  }

  // Fetch orders
  const allOrders = await legacy.order.findMany({
    where: {
      created_staff_id: { in: activeLegacyUserIds },
      booking_date_start: { gte: startRange, lte: endRange },
      order_state: { not: 'Cancelled' }
    },
    select: { user_id: true }
  });

  const userIds = Array.from(new Set(allOrders.map(o => o.user_id).filter(id => id !== null))) as number[];
  const userBalances = userIds.length > 0 ? await legacy.user_service_balance.findMany({
    where: { user_id: { in: userIds } }
  }) : [];
  const balanceIds = userBalances.map(b => b.id);

  console.log(`Profiling with ${balanceIds.length} balance IDs...`);

  if (balanceIds.length > 0) {
    // Test 1: Original Query
    const t0 = performance.now();
    const res1 = await legacy.$queryRawUnsafe<any[]>(`
      SELECT usbt.*, o.booking_date_start as o_booking_date_start
      FROM user_service_balance_transaction usbt
      LEFT JOIN \`order\` o ON o.id = usbt.order_id
      WHERE usbt.user_service_balance_id IN (${balanceIds.join(',')})
    `);
    const t1 = performance.now();
    const origTime = t1 - t0;
    console.log(`Original query: ${origTime.toFixed(2)} ms (Returned ${res1.length} rows)`);

    // Test 2: Column-Optimized Query
    const t2 = performance.now();
    const res2 = await legacy.$queryRawUnsafe<any[]>(`
      SELECT usbt.id, usbt.user_service_balance_id, usbt.date_created, usbt.date_expired, 
             usbt.total_normal_count_left, usbt.total_retain_count_left, usbt.normal_count, 
             usbt.retain_count, usbt.used_staff_id, usbt.order_id, 
             o.booking_date_start as o_booking_date_start
      FROM user_service_balance_transaction usbt
      LEFT JOIN \`order\` o ON o.id = usbt.order_id
      WHERE usbt.user_service_balance_id IN (${balanceIds.join(',')})
    `);
    const t3 = performance.now();
    const optTime = t3 - t2;
    console.log(`Optimized columns query: ${optTime.toFixed(2)} ms (Returned ${res2.length} rows)`);

    const improvement = ((origTime - optTime) / origTime) * 100;
    console.log(`Performance Gain (Columns only): ${improvement.toFixed(1)}%`);
  }

  await crm.$disconnect();
  await legacy.$disconnect();
}

run();
