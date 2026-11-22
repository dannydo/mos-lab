import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const legacy = new LegacyPrismaClient();

async function run() {
  console.log('Listing tables in legacy DB...');
  const tables = await legacy.$queryRawUnsafe<any[]>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'management'
  `);

  for (const t of tables) {
    const name = t.TABLE_NAME || t.table_name;
    const countRes = await legacy.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as count FROM \`${name}\`
    `);
    console.log(`Table: ${name}, Rows: ${countRes[0]?.count}`);
  }

  await legacy.$disconnect();
}

run();
