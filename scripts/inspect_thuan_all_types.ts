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
    
    const services = await legacy.$queryRaw<any[]>`
      SELECT os.order_id, o.date_created, os.user_service_type, os.service_id, sl.service_name, o.order_state
      FROM order_service os
      JOIN \`order\` o ON o.id = os.order_id
      LEFT JOIN service_language sl ON sl.service_id = os.service_id AND sl.language_id = 1
      WHERE o.user_id = 25047 AND o.date_created >= '2023-01-01 00:00:00'
      ORDER BY o.date_created DESC
    `;

    console.log(`Found ${services.length} services:`);
    for (const s of services) {
      console.log(`Order: ${s.order_id} | Created: ${s.date_created} | Service: ${s.service_name} | Type: ${s.user_service_type} | State: ${s.order_state}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
