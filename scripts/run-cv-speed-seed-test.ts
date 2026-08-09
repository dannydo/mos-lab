import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client/index.js';
import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';
import { runNightlyCvSpeedSeed } from '../apps/api/src/modules/kpi/services/cv-speed-seed.service.js';

async function main() {
  const crmPrisma = new CrmPrismaClient({
    datasources: {
      db: { url: process.env.CRM_DATABASE_URL || 'mysql://root:root@localhost:3306/mos_lab' },
    },
  });
  const legacyPrisma = new LegacyPrismaClient({
    datasources: {
      db: { url: process.env.LEGACY_DATABASE_URL || 'mysql://root:root@localhost:3306/management' },
    },
  });

  console.log('--- Starting CV Speed Model Seed ---');
  const startTime = Date.now();

  const result = await runNightlyCvSpeedSeed(crmPrisma, legacyPrisma);

  console.log(`--- Seed Completed in ${(Date.now() - startTime) / 1000}s ---`);
  console.log('Result:', result);

  const count = await crmPrisma.crmCvSpeedProfile.count();
  console.log(`Total profile rows in crm_cv_speed_profile: ${count}`);

  const sampleRows = await crmPrisma.crmCvSpeedProfile.findMany({
    where: { lashStyle: 'Classic', lashCount: 60, serviceMode: 'normal_clean' },
    take: 10,
  });

  console.log('Sample Classic 60 profiles count:', sampleRows.length);
  console.log('Sample profiles:', sampleRows);

  await crmPrisma.$disconnect();
  await legacyPrisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
