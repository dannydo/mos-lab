import fs from 'fs';
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

    // Parse wingslashes CSV
    const csvContent = fs.readFileSync(
      '/Users/dannydo/.gemini/antigravity/brain/4893a0c8-03db-4ada-9004-b01b5bb90d78/.system_generated/steps/654/content.md',
      'utf8'
    );
    const csvLines = csvContent.split('\n');
    const csvOrderIds: number[] = [];

    for (let i = 8; i < csvLines.length; i++) {
      const line = csvLines[i];
      if (!line || !line.trim()) continue;
      const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (cols.length < 20) continue;

      // Order ID is not in columns directly? Wait, first column is STORE, let's look at the header:
      // STORE, DATE BOOKED, TIME BOOKED, BOOKED BY, BOOKED AT DATE, BOOKED AT TIME, CHANNEL, PROMOTION CODE, PROMOTION NAME, BOOKING NOTE, DATE CHECK-IN, TIME CHECK-IN, TIME CHECK-OUT, CC IN, CC OUT, CV, CLIENT ID, CLIENT NAME, CLIENT PHONE, COMBO STATE, SERVICE, $PRICE, COMBO BOUGHT, COMBO PRICE, AMOUNT PAID, NET REVENUE, TIPS, DEBT, CLIENT TYPE, SINGLE / COMBO, NEW, ORDER STATE
      // Wait, there's no ORDER ID in the header of export/not-live-combo!
      // Let's check detailSql:
      // o.id AS order_id, ...
      // Wait! Where is order_id in fputcsv?
      // Let's check export.php lines 1157-1190!
      // Ah! fputcsv does NOT include order_id!
      // Wait, let's look at the columns:
      // 0: store_name
      // 1: date_booked
      // 2: time_booked
      // ...
      // 16: client_id
      // 17: client_name
      // Let's check client_id and client_name.
    }

    // Let's query local database for all orders created on 2026-07-12
    const startOfDay = new Date('2026-07-12T00:00:00.000Z');
    const endOfDay = new Date('2026-07-12T23:59:59.999Z');

    const prismaOrders = await legacy.order.findMany({
      where: {
        date_created: { gte: startOfDay, lte: endOfDay },
        order_state: { not: 'Cancelled' },
      },
      select: {
        id: true,
        user_id: true,
        date_created: true,
      },
    });

    const rawSqlOrders = await legacy.$queryRaw<any[]>`
      SELECT o.id, o.user_id, o.date_created, o.order_state
      FROM \`order\` o
      JOIN order_service os ON os.order_id = o.id
      WHERE o.date_created >= '2026-07-12 00:00:00' AND o.date_created < '2026-07-13 00:00:00'
      GROUP BY o.id, o.user_id
    `;

    console.log('Prisma orders count (order_state <> Cancelled):', prismaOrders.length);
    console.log('Raw SQL orders count (grouped, includes all states):', rawSqlOrders.length);

    const prismaIds = prismaOrders.map((o) => o.id);
    const rawIds = rawSqlOrders.map((o) => o.id);

    const diff = rawIds.filter((id) => !prismaIds.includes(id));
    console.log('Orders in Raw SQL but not in Prisma (e.g. Cancelled or no order_service?):', diff);

    for (const id of diff) {
      const order = rawSqlOrders.find((o) => o.id === id);
      console.log(`  Order: ${id} | User: ${order.user_id} | State: ${order.order_state}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
