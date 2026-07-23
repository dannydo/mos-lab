import { PrismaClient as CrmPrismaClient } from '../generated/crm-client/index.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const crm = new CrmPrismaClient();

async function run() {
  try {
    console.log('=== CRM STAFF LIST & ROLES ===');
    const staffs = await crm.crmStaff.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        legacyStaffId: true,
      },
    });
    console.log(staffs);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await crm.$disconnect();
  }
}

run().catch(console.error);
