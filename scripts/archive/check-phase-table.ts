import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client/index.js';

async function main() {
  const crm = new CrmPrismaClient();
  const rows = await crm.crmCvSpeedProfile.findMany({
    where: { lashStyle: 'Hyperlight', lashCount: 70, serviceMode: 'normal_clean' },
    select: {
      staffName: true,
      totalMinutes: true,
      cleaningMinutes: true,
      extensionMinutes: true,
      prepQcMinutes: true,
    },
    orderBy: { totalMinutes: 'asc' },
  });

  console.log('--- Real Breakdown in DB for Hyperlight 70 ---');
  console.table(rows);
  await crm.$disconnect();
}

main().catch(console.error);
