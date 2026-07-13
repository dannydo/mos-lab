import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client/index.js';
import { PrismaClient as LegacyPrismaClient } from '../apps/api/src/generated/legacy-client/index.js';

const crm = new CrmPrismaClient();
const legacy = new LegacyPrismaClient();

async function run() {
  const crmStaff = await crm.crmStaff.findMany();
  console.log('CRM Staff:');
  for (const s of crmStaff) {
    console.log(`ID: ${s.id}, Username: ${s.username}, DisplayName: ${s.displayName}, Role: ${s.role}, LegacyStaffId: ${s.legacyStaffId}, IsActive: ${s.isActive}`);
  }

  await crm.$disconnect();
  await legacy.$disconnect();
}

run();
