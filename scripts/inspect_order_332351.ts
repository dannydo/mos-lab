import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client';

const legacy = new LegacyPrismaClient({
  datasources: {
    db: {
      url: 'mysql://root:chickisslove@127.0.0.1:3306/management',
    },
  },
});

async function main() {
  try {
    await legacy.$connect();

    const o = await legacy.order.findUnique({
      where: { id: 332351 },
    });

    if (!o) {
      console.log('Order 332351 not found!');
      return;
    }

    console.log('Order 332351 info:');
    console.log(`  User ID: ${o.user_id}`);
    console.log(`  Date Created: ${o.date_created}`);
    console.log(`  Booking Date Start: ${o.booking_date_start}`);
    console.log(`  Order State: ${o.order_state}`);

    const services = await legacy.order_service.findMany({
      where: { order_id: 332351 },
    });

    console.log('\nServices inside Order 332351:');
    for (const s of services) {
      console.log(`  Order Service ID: ${s.id}`);
      console.log(`  Service ID: ${s.service_id}`);
      console.log(`  Service Price: ${s.service_price}`);
      console.log(`  User Service Type (this is client_type!): ${s.user_service_type}`);
      console.log(`  User Service Balance ID: ${s.user_service_balance_id}`);
      console.log(`  User Service Balance Transaction ID: ${s.user_service_balance_transaction_id}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
