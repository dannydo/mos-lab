import { PrismaClient as CrmPrismaClient } from '../src/generated/crm-client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const crm = new CrmPrismaClient({
    datasources: {
      db: {
        url: process.env.CRM_DATABASE_URL,
      },
    },
  });

  await crm.$connect();
  const passwordHash = await bcrypt.hash('admin123', 10);

  const staff = await crm.crmStaff.upsert({
    where: { username: 'admin' },
    update: {
      displayName: 'Danny Do',
      role: 'super_admin',
      isActive: true,
      passwordHash: passwordHash,
    },
    create: {
      username: 'admin',
      displayName: 'Danny Do',
      role: 'super_admin',
      isActive: true,
      passwordHash: passwordHash,
    },
  });

  console.log('Seeded admin staff successfully:', staff.username, staff.id);
  await crm.$disconnect();
}

run().catch(console.error);
