import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const legacy = new LegacyPrismaClient();

async function run() {
  const start = new Date('2026-06-01T00:00:00.000Z');
  const end = new Date('2026-06-30T23:59:59.999Z');

  const legacyUserId = 48791; // Tâm Nguyễn

  console.log(`Checking data from ${start.toISOString()} to ${end.toISOString()}`);

  // Count calls in June 2026
  const callsRes = await legacy.$queryRawUnsafe<any[]>(
    `
    SELECT COUNT(*) as count
    FROM \`user_call\`
    WHERE created_staff_id = ? AND date_created >= ? AND date_created <= ?
  `,
    legacyUserId,
    start,
    end
  );
  const callsCount = Number(callsRes[0]?.count || 0);

  // Count calls with duration > 0 (pickups)
  const pickupsRes = await legacy.$queryRawUnsafe<any[]>(
    `
    SELECT COUNT(*) as count
    FROM \`user_call\`
    WHERE created_staff_id = ? AND date_created >= ? AND date_created <= ? AND conversation_duration_second > 0
  `,
    legacyUserId,
    start,
    end
  );
  const pickupsCount = Number(pickupsRes[0]?.count || 0);

  // Count booked orders where date_created is in June 2026
  const bookedDateCreated = await legacy.order.count({
    where: {
      created_staff_id: legacyUserId,
      date_created: { gte: start, lte: end },
      order_state: { not: 'Cancelled' },
    },
  });

  // Count booked orders where booking_date_start is in June 2026
  const bookedBookingStart = await legacy.order.count({
    where: {
      created_staff_id: legacyUserId,
      booking_date_start: { gte: start, lte: end },
      order_state: { not: 'Cancelled' },
    },
  });

  // Count completed orders in June 2026
  const completedBookingStart = await legacy.order.count({
    where: {
      created_staff_id: legacyUserId,
      booking_date_start: { gte: start, lte: end },
      order_state: 'Completed',
    },
  });

  console.log(`User ID ${legacyUserId} (Tâm Nguyễn):`);
  console.log(`  Calls: ${callsCount}`);
  console.log(`  Pickups: ${pickupsCount}`);
  console.log(`  Booked (by date_created): ${bookedDateCreated}`);
  console.log(`  Booked (by booking_date_start): ${bookedBookingStart}`);
  console.log(`  Completed (by booking_date_start): ${completedBookingStart}`);

  // Let's check how many calls exist for any staff in June 2026
  const allStaffCalls = await legacy.$queryRawUnsafe<any[]>(
    `
    SELECT created_staff_id as created_staff_id, COUNT(*) as count
    FROM \`user_call\`
    WHERE date_created >= ? AND date_created <= ?
    GROUP BY created_staff_id
  `,
    start,
    end
  );
  console.log('June Calls count by staff:', allStaffCalls);

  // Let's check how many orders exist for any staff in June 2026 (by booking_date_start)
  const allStaffOrders = await legacy.order.groupBy({
    by: ['created_staff_id'],
    where: {
      booking_date_start: { gte: start, lte: end },
      order_state: { not: 'Cancelled' },
    },
    _count: true,
  });
  console.log('June Orders count by staff (booking_date_start):', allStaffOrders);

  await legacy.$disconnect();
}

run();
