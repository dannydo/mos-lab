import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client/index.js';
import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';
import { runNightlyCvSpeedSeed } from '../apps/api/src/modules/kpi/services/cv-speed-seed.service.js';

async function main() {
  const crmPrisma = new CrmPrismaClient({
    datasources: { db: { url: process.env.CRM_DATABASE_URL || 'mysql://root:root@localhost:3306/mos_lab' } },
  });
  const legacyPrisma = new LegacyPrismaClient({
    datasources: { db: { url: process.env.LEGACY_DATABASE_URL || 'mysql://root:root@localhost:3306/management' } },
  });

  console.log('--- Reseeding CV Speed Profiles ---');
  await runNightlyCvSpeedSeed(crmPrisma, legacyPrisma);

  console.log('--- Querying Hyperlight 70 profiles AFTER fix ---');
  const profiles = await crmPrisma.crmCvSpeedProfile.findMany({
    where: { lashStyle: 'Hyperlight', lashCount: 70, serviceMode: 'normal_clean' },
    select: { staffId: true, staffName: true, totalMinutes: true, modelLayer: true, sampleSize: true },
    orderBy: { totalMinutes: 'asc' },
  });

  console.log('Hyperlight 70 profiles AFTER fix:');
  console.table(profiles);

  await crmPrisma.$disconnect();
  await legacyPrisma.$disconnect();
}

main().catch(console.error);
