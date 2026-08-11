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

    console.log('=== ATTRIBUTE OPTIONS UNDER SAME ATTRIBUTE ID ===');
    const opts = await legacy.$queryRawUnsafe<any[]>(`
      SELECT ao.id, ao.attribute_id, ao.attribute_option_key, aol.language_id, aol.attribute_option_value
      FROM attribute_option ao
      JOIN attribute_option_language aol ON aol.attribute_option_id = ao.id
      WHERE ao.attribute_id = (SELECT attribute_id FROM attribute_option WHERE id = 110 LIMIT 1)
        AND aol.language_id = 2
      ORDER BY ao.id ASC
    `);
    console.table(opts);
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
