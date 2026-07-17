import { PrismaClient } from '../generated/legacy-client/index.js';

const prisma = new PrismaClient();

async function run() {
  try {
    const targetDateStr = '2026-07-16';
    const startOfDay = new Date(targetDateStr + 'T00:00:00.000Z');
    const endOfDay = new Date(targetDateStr + 'T23:59:59.999Z');
    const bookingDateOnlyDate = new Date(targetDateStr + 'T00:00:00.000Z');

    console.log(`Querying ALL orders in database for ${targetDateStr}...`);

    const orders = await prisma.$queryRawUnsafe<SafeAny[]>(`
      SELECT id, order_state, total_price, client_store_id,
             CAST(booking_date_start AS CHAR) as startStr, 
             CAST(booking_date_end AS CHAR) as endStr,
             CAST(booking_date_only AS CHAR) as dateOnlyStr,
             CAST(date_created AS CHAR) as createdStr
      FROM \`order\`
      WHERE booking_date_only = '2026-07-16' 
         OR (booking_date_start >= '2026-07-16 00:00:00' AND booking_date_start <= '2026-07-16 23:59:59')
    `);

    console.log(`Total orders found with raw SQL: ${orders.length}`);

    const stateCounts: Record<string, number> = {};
    orders.forEach((o) => {
      stateCounts[o.order_state] = (stateCounts[o.order_state] || 0) + 1;
      console.log(
        `Order ID: ${o.id}, state: ${o.order_state}, price: ${o.total_price}, store_id: ${o.client_store_id}, startStr: ${o.startStr}, dateOnlyStr: ${o.dateOnlyStr}`
      );
    });
    console.log('\nState counts:', stateCounts);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(console.error);
