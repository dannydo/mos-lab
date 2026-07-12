import { FastifyInstance } from 'fastify';
import { kpiRoutes } from '../apps/api/src/modules/kpi/routes';
import { customerRoutes } from '../apps/api/src/modules/customers/routes';
import fastify from 'fastify';
import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client';
import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client';

async function main() {
  const app = fastify();
  
  // Create mock prisma instances
  const legacy = new LegacyPrismaClient({
    datasources: {
      db: {
        url: "mysql://root:chickisslove@127.0.0.1:3306/management"
      }
    }
  });

  const crm = new CrmPrismaClient({
    datasources: {
      db: {
        url: "mysql://root:chickisslove@127.0.0.1:3306/crm"
      }
    }
  });

  app.decorate('prisma', { legacy, crm });
  
  // Register routes
  app.register(customerRoutes, { prefix: '/api' });

  try {
    await app.ready();
    const response = await app.inject({
      method: 'GET',
      url: '/api/dashboard/today?date=2026-07-12'
    });

    console.log("Status Code:", response.statusCode);
    const data = JSON.parse(response.body);
    
    console.log("bookingsCombo length:", data.bookingsCombo.length);
    console.log("bookingsOc length:", data.bookingsOc.length);
    console.log("bookingsOther length:", data.bookingsOther.length);
    console.log("Total Bookings:", data.bookingsCombo.length + data.bookingsOc.length + data.bookingsOther.length);

    console.log("Example bookingsCombo names:", data.bookingsCombo.slice(0, 5).map((x: any) => x.customer));

  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
    await crm.$disconnect();
  }
}

main();
