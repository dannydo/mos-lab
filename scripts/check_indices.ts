import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const legacy = new LegacyPrismaClient();

async function run() {
  console.log('Checking indexes on user_service_balance_transaction...');
  const indexes = await legacy.$queryRawUnsafe<any[]>(`
    SHOW INDEX FROM \`user_service_balance_transaction\`
  `);
  
  indexes.forEach(idx => {
    console.log(`Index Name: ${idx.Key_name || idx.key_name}`);
    console.log(`  Column: ${idx.Column_name || idx.column_name}`);
    console.log(`  Non_unique: ${idx.Non_unique || idx.non_unique}`);
    console.log(`  Seq_in_index: ${idx.Seq_in_index || idx.seq_in_index}`);
  });

  await legacy.$disconnect();
}

run();
