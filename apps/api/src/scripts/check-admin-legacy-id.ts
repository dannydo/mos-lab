import { PrismaClient as CrmPrismaClient } from '../generated/crm-client';

const crm = new CrmPrismaClient();

async function main() {
  console.log('Querying CrmStaff accounts:');
  const staff = await crm.crmStaff.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      legacyStaffId: true
    }
  });
  console.log(staff);
}

main()
  .catch(console.error)
  .finally(() => crm.$disconnect());
