import { PrismaClient } from '../generated/legacy-client/index.js';

const prisma = new PrismaClient();

async function run() {
  try {
    const targetDateStr = '2026-07-16';
    const startOfDay = new Date(targetDateStr + 'T00:00:00.000Z');
    const endOfDay = new Date(targetDateStr + 'T23:59:59.999Z');
    const bookingDateOnlyDate = new Date(targetDateStr + 'T00:00:00.000Z');

    console.log(`Querying orders for date ${targetDateStr}...`);

    const comingOrders = await prisma.order.findMany({
      where: {
        OR: [{ booking_date_only: bookingDateOnlyDate }, { booking_date_start: { gte: startOfDay, lte: endOfDay } }],
        order_state: { not: 'Cancelled' },
      },
    });

    console.log(`Total orders found: ${comingOrders.length}`);

    const stateCounts: Record<string, number> = {};
    const storeCounts: Record<
      number,
      { count: number; completedCount: number; completedRevenue: number; totalRevenue: number }
    > = {};

    comingOrders.forEach((o) => {
      stateCounts[o.order_state] = (stateCounts[o.order_state] || 0) + 1;

      const sid = o.client_store_id || 0;
      if (!storeCounts[sid]) {
        storeCounts[sid] = { count: 0, completedCount: 0, completedRevenue: 0, totalRevenue: 0 };
      }
      storeCounts[sid].count += 1;
      storeCounts[sid].totalRevenue += Number(o.total_price || 0);

      if (o.order_state === 'Completed') {
        storeCounts[sid].completedCount += 1;
        storeCounts[sid].completedRevenue += Number(o.total_price || 0);
      }
    });

    console.log('\nOrder states counts:', stateCounts);
    console.log('\nStore break down:');
    Object.keys(storeCounts).forEach((sid) => {
      console.log(`Store ID ${sid}:`);
      console.log(`  Total Orders: ${storeCounts[Number(sid)].count}`);
      console.log(`  Total Revenue (all states): ${storeCounts[Number(sid)].totalRevenue}`);
      console.log(`  Completed Orders: ${storeCounts[Number(sid)].completedCount}`);
      console.log(`  Completed Revenue: ${storeCounts[Number(sid)].completedRevenue}`);
    });

    console.log('\nDetail of all orders today:');
    comingOrders.forEach((o) => {
      console.log(
        `Order ID: ${o.id}, store_id: ${o.client_store_id}, state: ${o.order_state}, price: ${o.total_price}, booking_date_start: ${o.booking_date_start}`
      );
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(console.error);
