import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const legacy = new LegacyPrismaClient();

async function run() {
  const legacyUserId = 43554;
  
  const allOrders = await legacy.order.findMany({
    where: {
      created_staff_id: legacyUserId,
    },
    orderBy: { booking_date_start: 'asc' },
    select: {
      id: true,
      booking_date_start: true,
      date_created: true,
      order_state: true
    }
  });

  console.log(`Found ${allOrders.length} orders total for created_staff_id ${legacyUserId}`);
  
  // Group by booking_date_start date part (YYYY-MM-DD)
  const groups: Record<string, number> = {};
  allOrders.forEach(o => {
    if (o.booking_date_start) {
      const datePart = o.booking_date_start.toISOString().slice(0, 10);
      groups[datePart] = (groups[datePart] || 0) + 1;
    }
  });
  console.log('Orders by booking_date_start:', groups);

  await legacy.$disconnect();
}

run();
