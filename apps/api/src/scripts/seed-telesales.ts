import { PrismaClient as CrmPrismaClient } from '../generated/crm-client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const telesalesList = [
  { name: 'Bảo Hân', email: 'baohan@masteros.app' },
  { name: 'Mỹ Diệu', email: 'mydieu@masteros.app' },
  { name: 'Tâm Nguyễn', email: 'tamnguyen@masteros.app' },
  { name: 'Bích Phượng', email: 'bichphuong@masteros.app' },
  { name: 'Nguyễn Quang Khải', email: 'quangkhai@masteros.app' },
  { name: 'Thanh Mai', email: 'thanhmai@masteros.app' },
  { name: 'Thục Nghi', email: 'thucnghi@masteros.app' },
  { name: 'An Nam', email: 'annam@masteros.app' },
  { name: 'Yến Vy', email: 'yenvy@masteros.app' },
  { name: 'Quang Khải CC', email: 'quangkhaicc@masteros.app' },
];

async function run() {
  const crm = new CrmPrismaClient({
    datasources: {
      db: {
        url: process.env.CRM_DATABASE_URL,
      },
    },
  });

  await crm.$connect();
  console.log('Connected to CRM Database.');

  const passwordHash = await bcrypt.hash('WingsLive2026Base', 10);

  for (const ts of telesalesList) {
    console.log(`Seeding telesales: ${ts.name} (${ts.email})...`);
    await crm.crmStaff.upsert({
      where: { username: ts.email },
      update: {
        displayName: ts.name,
        role: 'telesales',
        isActive: true,
        email: ts.email,
      },
      create: {
        username: ts.email,
        displayName: ts.name,
        passwordHash: passwordHash,
        role: 'telesales',
        isActive: true,
        email: ts.email,
      },
    });
  }

  console.log('Seeding completed successfully!');
  await crm.$disconnect();
}

run().catch(console.error);
