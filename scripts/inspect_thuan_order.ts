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
    
    // Find all orders for user 25047
    const orders = await legacy.order.findMany({
      where: { user_id: 25047 },
      orderBy: { date_created: 'desc' }
    });

    console.log(`Found ${orders.length} orders for Thuận (25047):`);
    
    for (const o of orders) {
      console.log(`Order ID: ${o.id} | Date Created: ${o.date_created} | State: ${o.order_state} | Date Booked: ${o.booking_date_start}`);
      
      const services = await legacy.order_service.findMany({
        where: { order_id: o.id }
      });
      
      for (const s of services) {
        console.log(`  Service ID: ${s.service_id} | Type: ${s.user_service_type} | Balance Price: ${s.balance_price} | Balance Tx ID: ${s.user_service_balance_transaction_id}`);
      }
    }

    // Also check the user_service_balance for user 25047
    const balances = await legacy.user_service_balance.findMany({
      where: { user_id: 25047 }
    });
    console.log(`\nUser Service Balances for Thuận (25047):`);
    for (const b of balances) {
      console.log(`Balance ID: ${b.id} | Date Created: ${b.date_created} | Normal Count: ${b.normal_count} | Retain Count: ${b.retain_count} | Expired: ${b.date_expired}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
