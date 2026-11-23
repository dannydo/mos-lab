import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const legacy = new LegacyPrismaClient();

async function run() {
  console.log('Adding composite index locally...');
  try {
    await legacy.$queryRawUnsafe(`
      ALTER TABLE \`user_service_balance_transaction\` 
      ADD INDEX idx_balance_id_date_created (user_service_balance_id, date_created)
    `);
    console.log('Successfully added composite index to local DB!');
  } catch (err) {
    console.error('Failed to add index (it may already exist):', err);
  } finally {
    await legacy.$disconnect();
  }
}

run();
