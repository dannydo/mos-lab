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

    console.log('=== TABLES IN MANAGEMENT ===');
    const mgtTables = await legacy.$queryRawUnsafe<any[]>(`SHOW TABLES FROM \`management\``);
    const mgtNames = mgtTables
      .map((t) => Object.values(t)[0] as string)
      .filter(
        (name) =>
          name.includes('staff') ||
          name.includes('day') ||
          name.includes('off') ||
          name.includes('shift') ||
          name.includes('leave')
      );
    console.log('Management relevant tables:', mgtNames);

    console.log('\n=== TABLES IN MOS_LAB ===');
    const mosTables = await legacy.$queryRawUnsafe<any[]>(`SHOW TABLES FROM \`mos_lab\``);
    const mosNames = mosTables.map((t) => Object.values(t)[0] as string);
    console.log('mos_lab tables:', mosNames);
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await legacy.$disconnect();
  }
}

main();
