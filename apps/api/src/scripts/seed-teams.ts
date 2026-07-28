import { PrismaClient as CrmPrismaClient } from '../generated/crm-client/index.js';
import dotenv from 'dotenv';

dotenv.config();

const crmPrisma = new CrmPrismaClient();

interface TeamSeed {
  code: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
  parentCode?: string;
  configKey?: string;
}

const TEAMS_TO_SEED: TeamSeed[] = [
  {
    code: 'CC',
    name: 'Client Consultant',
    description: 'Đội ngũ Tư Vấn Viên chăm sóc và bán hàng trực tiếp tại cửa hàng',
    color: '#1890ff',
    icon: '💎',
    sortOrder: 1,
    configKey: 'ACTIVE_CC_STAFF_CONFIG',
  },
  {
    code: 'CV',
    name: 'Chuyên Viên / KTV',
    description: 'Đội ngũ Kỹ Thuật Viên trực tiếp thực hiện dịch vụ làm mi',
    color: '#52c41a',
    icon: '✂️',
    sortOrder: 2,
    configKey: 'ACTIVE_CV_STAFF_CONFIG',
  },
  {
    code: 'BK',
    name: 'Booker',
    description: 'Đội ngũ Đặt lịch & Telesales tổng đài',
    color: '#fa8c16',
    icon: '📞',
    sortOrder: 3,
    configKey: 'ACTIVE_BK_STAFF_CONFIG',
  },
  {
    code: 'BK_TELESALES',
    name: 'Telesales',
    description: 'Nhóm Booker gọi điện tư vấn và chốt lịch hẹn',
    color: '#fa541c',
    icon: '📱',
    sortOrder: 4,
    parentCode: 'BK',
  },
  {
    code: 'BK_CS',
    name: 'Customer Service (CS)',
    description: 'Nhóm Booker chăm sóc khách hàng và giải đáp thắc mắc',
    color: '#13c2c2',
    icon: '🎧',
    sortOrder: 5,
    parentCode: 'BK',
  },
  {
    code: 'BK_CONTROL',
    name: 'Control',
    description: 'Nhóm Booker kiểm soát và điều phối lịch hẹn',
    color: '#722ed1',
    icon: '🔒',
    sortOrder: 6,
    parentCode: 'BK',
  },
  {
    code: 'BK_OTHER',
    name: 'Khác',
    description: 'Nhóm Booker hỗ trợ các tác vụ khác',
    color: '#8c8c8c',
    icon: '📋',
    sortOrder: 7,
    parentCode: 'BK',
  },
];

async function seed() {
  console.log('🌱 Starting Team Configuration Seeding...');

  const teamIdMap = new Map<string, number>();

  // 1. Seed root teams first (CC, CV, BK)
  for (const t of TEAMS_TO_SEED.filter((item) => !item.parentCode)) {
    const created = await crmPrisma.crmTeam.upsert({
      where: { code: t.code },
      update: {
        name: t.name,
        description: t.description,
        color: t.color,
        icon: t.icon,
        sortOrder: t.sortOrder,
      },
      create: {
        code: t.code,
        name: t.name,
        description: t.description,
        color: t.color,
        icon: t.icon,
        sortOrder: t.sortOrder,
        isActive: true,
      },
    });
    teamIdMap.set(t.code, created.id);
    console.log(`✅ Root Team created/updated: ${t.code} (ID: ${created.id})`);
  }

  // 2. Seed sub-teams (BK_TELESALES, BK_CS, BK_CONTROL, BK_OTHER)
  for (const t of TEAMS_TO_SEED.filter((item) => Boolean(item.parentCode))) {
    const parentTeamId = t.parentCode ? (teamIdMap.get(t.parentCode) ?? null) : null;
    const created = await crmPrisma.crmTeam.upsert({
      where: { code: t.code },
      update: {
        name: t.name,
        description: t.description,
        color: t.color,
        icon: t.icon,
        sortOrder: t.sortOrder,
        parentTeamId,
      },
      create: {
        code: t.code,
        name: t.name,
        description: t.description,
        color: t.color,
        icon: t.icon,
        sortOrder: t.sortOrder,
        isActive: true,
        parentTeamId,
      },
    });
    teamIdMap.set(t.code, created.id);
    console.log(`✅ Sub-Team created/updated: ${t.code} (ID: ${created.id}, Parent: ${parentTeamId})`);
  }

  // 3. Import active staff members from crmConfig for CC, CV, BK
  for (const t of TEAMS_TO_SEED.filter((item) => item.configKey)) {
    const teamId = teamIdMap.get(t.code);
    if (!teamId || !t.configKey) continue;

    const configRecord = await crmPrisma.crmConfig.findUnique({
      where: { key: t.configKey },
    });

    if (configRecord && configRecord.value) {
      try {
        const staffIds: number[] = JSON.parse(configRecord.value);
        if (Array.isArray(staffIds) && staffIds.length > 0) {
          console.log(`📥 Importing ${staffIds.length} members for team ${t.code}...`);

          for (const legacyStaffId of staffIds) {
            const numLegacyId = Number(legacyStaffId);
            if (isNaN(numLegacyId)) continue;

            // Try finding matching CrmStaff
            const crmStaff = await crmPrisma.crmStaff.findFirst({
              where: { legacyStaffId: numLegacyId },
            });

            await crmPrisma.crmTeamMember.upsert({
              where: {
                teamId_legacyStaffId: {
                  teamId,
                  legacyStaffId: numLegacyId,
                },
              },
              update: {
                isActive: true,
                crmStaffId: crmStaff?.id ?? null,
                displayName: crmStaff?.displayName ?? null,
              },
              create: {
                teamId,
                legacyStaffId: numLegacyId,
                crmStaffId: crmStaff?.id ?? null,
                displayName: crmStaff?.displayName ?? null,
                isActive: true,
              },
            });
          }
          console.log(`✅ Finished importing members for team ${t.code}`);
        }
      } catch (err) {
        console.error(`❌ Error parsing config for key ${t.configKey}:`, err);
      }
    } else {
      console.log(`⚠️ No crmConfig record found for ${t.configKey}, skipping member import.`);
    }
  }

  console.log('🎉 Seeding completed successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await crmPrisma.$disconnect();
  });
