import { PrismaClient } from '../generated/legacy-client/index.js';

const prisma = new PrismaClient();

async function run() {
  try {
    const cols = await prisma.$queryRawUnsafe<SafeAny[]>('DESCRIBE staff_working_shift');
    console.log(
      'Columns of staff_working_shift:',
      cols.map((c) => ({ Field: c.Field, Type: c.Type }))
    );
  } catch (err) {
    console.error('Describe failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(console.error);
