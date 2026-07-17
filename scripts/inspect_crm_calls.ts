import { PrismaClient as CrmPrismaClient } from '../apps/api/src/generated/crm-client/index.js';

const crm = new CrmPrismaClient();

async function run() {
  console.log('Checking crm_call_log table...');
  const count = await crm.crmCallLog.count();
  console.log('crm_call_log total count:', count);

  if (count > 0) {
    const minMax = await crm.crmCallLog.aggregate({
      _min: { createdAt: true },
      _max: { createdAt: true },
    });
    console.log('crm_call_log min/max date:', minMax);

    const recent = await crm.crmCallLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    console.log('Recent 5 calls in CRM:', recent);
  }

  await crm.$disconnect();
}

run();
