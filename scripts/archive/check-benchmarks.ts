import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client/index.js';

async function main() {
  const crmPrisma = new CrmPrismaClient({
    datasources: { db: { url: process.env.CRM_DATABASE_URL || 'mysql://root:root@localhost:3306/mos_lab' } },
  });

  const bm = await crmPrisma.crmLashTypeBenchmark.findMany();
  console.log('All Benchmarks in crm_lash_type_benchmark:', bm);

  await crmPrisma.$disconnect();
}

main().catch(console.error);
