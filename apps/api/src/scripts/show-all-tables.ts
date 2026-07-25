import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new LegacyPrismaClient();

async function run() {
  try {
    console.log('=== SHOWING ALL TABLES IN LEGACY DATABASE ===');
    const tables = await prisma.$queryRawUnsafe<Record<string, unknown>[]>('SHOW TABLES');
    console.log(tables);

    // Let's also check the structure of order_service table in more detail
    console.log('\n=== DESCRIBE ORDER_SERVICE ===');
    const descOS = await prisma.$queryRawUnsafe<Record<string, unknown>[]>('DESCRIBE `order_service`');
    console.log(descOS.map((c) => `${c.Field} (${c.Type})`).join(', '));

    console.log('\n=== DESCRIBE ORDER ===');
    const descO = await prisma.$queryRawUnsafe<Record<string, unknown>[]>('DESCRIBE `order`');
    console.log(descO.map((c) => `${c.Field} (${c.Type})`).join(', '));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(console.error);
