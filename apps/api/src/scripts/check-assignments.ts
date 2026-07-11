import { PrismaClient as CrmPrismaClient } from '../generated/crm-client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function run() {
  const crm = new CrmPrismaClient({
    datasources: {
      db: {
        url: process.env.CRM_DATABASE_URL,
      },
    },
  });

  await crm.$connect();

  const staff = await crm.crmStaff.findMany({
    select: { id: true, displayName: true, username: true, role: true }
  });
  console.log('Staff list:', staff);

  const assignmentsCount = await crm.crmCustomerAssignment.groupBy({
    by: ['staffId'],
    _count: {
      legacyUserId: true
    }
  });
  console.log('Assignments count per staff:', assignmentsCount);

  await crm.$disconnect();
}

run().catch(console.error);
