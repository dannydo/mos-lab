import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client/index.js';

async function main() {
  const crmPrisma = new CrmPrismaClient({
    datasources: { db: { url: process.env.CRM_DATABASE_URL || 'mysql://root:root@localhost:3306/mos_lab' } },
  });

  const profiles = await crmPrisma.crmCvSpeedProfile.findMany({
    where: { lashStyle: 'Hyperlight', lashCount: 70, serviceMode: 'normal_clean' },
    select: { id: true, staffId: true, staffName: true, totalMinutes: true, modelLayer: true, sampleSize: true },
  });

  console.log('Hyperlight 70 profiles in crm_cv_speed_profile:', profiles);

  await crmPrisma.$disconnect();
}

main().catch(console.error);
