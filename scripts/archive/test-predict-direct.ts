import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client/index.js';
import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';
import { predictCvSpeed } from '../apps/api/src/modules/kpi/services/cv-speed-model.service.js';

async function test() {
  const crmPrisma = new CrmPrismaClient({
    datasources: { db: { url: process.env.CRM_DATABASE_URL || 'mysql://root:chickisslove@127.0.0.1:3306/mos_lab' } },
  });
  const legacyPrisma = new LegacyPrismaClient({
    datasources: {
      db: { url: process.env.LEGACY_DATABASE_URL || 'mysql://root:chickisslove@127.0.0.1:3306/management' },
    },
  });

  const staffId = 47950; // Cẩm Tiên
  const pred = await predictCvSpeed(crmPrisma, legacyPrisma, staffId, 'Classic', 'normal_clean', 60);

  console.log('Direct predictCvSpeed result for Cẩm Tiên (Classic 60 normal_clean):', pred);

  await crmPrisma.$disconnect();
  await legacyPrisma.$disconnect();
}

test().catch(console.error);
