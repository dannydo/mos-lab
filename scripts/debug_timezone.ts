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

    const targetDateStr = '2026-07-12';
    const startOfDay = new Date(targetDateStr + 'T00:00:00.000Z');
    const endOfDay = new Date(targetDateStr + 'T23:59:59.999Z');

    console.log('Prisma startOfDay:', startOfDay.toISOString());
    console.log('Prisma endOfDay:', endOfDay.toISOString());

    // Prisma query
    const prismaOrders = await legacy.order.findMany({
      where: {
        date_created: {
          gte: startOfDay,
          lte: endOfDay,
        },
        order_state: { not: 'Cancelled' },
      },
    });

    console.log(`Prisma found ${prismaOrders.length} orders`);

    // Raw SQL query
    const rawOrders = await legacy.$queryRaw<any[]>`
      SELECT id, date_created FROM \`order\`
      WHERE date_created >= ${targetDateStr + ' 00:00:00'} AND date_created <= ${targetDateStr + ' 23:59:59'}
        AND order_state <> 'Cancelled'
    `;

    console.log(`Raw SQL found ${rawOrders.length} orders`);

    // Let's print the IDs of prismaOrders and rawOrders to see the difference
    const prismaIds = prismaOrders.map((o) => Number(o.id)).sort((a, b) => a - b);
    const rawIds = rawOrders.map((o) => Number(o.id)).sort((a, b) => a - b);

    const onlyInPrisma = prismaIds.filter((id) => !rawIds.includes(id));
    const onlyInRaw = rawIds.filter((id) => !prismaIds.includes(id));

    console.log('Only in Prisma:', onlyInPrisma);
    console.log('Only in Raw:', onlyInRaw);
  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
