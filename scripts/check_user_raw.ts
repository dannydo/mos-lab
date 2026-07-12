import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client';

const legacy = new LegacyPrismaClient({
  datasources: {
    db: {
      url: "mysql://root:chickisslove@127.0.0.1:3306/management"
    }
  }
});

async function main() {
  try {
    await legacy.$connect();
    
    const orders = await legacy.$queryRaw<any[]>`
      SELECT id, user_id, date_created, order_state, booking_date_start
      FROM \`order\`
      WHERE user_id = 25047
      ORDER BY date_created DESC
    `;
    
    console.log("Raw SQL orders count:", orders.length);
    for (const o of orders) {
      console.log(`Order: ${o.id} | User: ${o.user_id} | Created: ${o.date_created} | State: ${o.order_state}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
