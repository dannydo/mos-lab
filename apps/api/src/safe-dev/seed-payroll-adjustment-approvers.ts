import 'dotenv/config';
import { PrismaClient } from '../generated/crm-client/index.js';
import { PAYROLL_ADJUSTMENT_APPROVERS_TEAM_CODE } from '../modules/payroll-ledger/payroll-adjustment-approver.service.js';
import { assertSafeDevConfiguration, isSafeDev } from './runtime.js';

type LocalApprover = {
  username: string;
  displayName: string;
  staffRole: string;
  syntheticLegacyStaffId: number;
  membershipRole: string;
};

const LOCAL_APPROVERS: readonly LocalApprover[] = [
  {
    username: 'safe-dev.danny',
    displayName: 'Danny',
    staffRole: 'admin',
    syntheticLegacyStaffId: 900_001,
    membershipRole: 'approver',
  },
  {
    username: 'safe-dev.bao-han',
    displayName: 'Bảo Hân',
    staffRole: 'hr',
    syntheticLegacyStaffId: 900_002,
    membershipRole: 'approver',
  },
];

async function run() {
  assertSafeDevConfiguration();
  if (!isSafeDev()) {
    throw new Error('This seed is available only when MOS_SAFE_DEV=true');
  }

  const crm = new PrismaClient({ datasources: { db: { url: process.env.CRM_DATABASE_URL } } });
  try {
    const result = await crm.$transaction(async (tx) => {
      const team = await tx.crmTeam.upsert({
        where: { code: PAYROLL_ADJUSTMENT_APPROVERS_TEAM_CODE },
        update: {
          name: 'Payroll Adjustment Approvers',
          description: 'Local-only separation-of-duties group for payroll adjustment review.',
          isActive: true,
          metadata: JSON.stringify({ localOnly: true, capability: 'PAYROLL_ADJUSTMENT_DECIDE' }),
        },
        create: {
          code: PAYROLL_ADJUSTMENT_APPROVERS_TEAM_CODE,
          name: 'Payroll Adjustment Approvers',
          description: 'Local-only separation-of-duties group for payroll adjustment review.',
          isActive: true,
          metadata: JSON.stringify({ localOnly: true, capability: 'PAYROLL_ADJUSTMENT_DECIDE' }),
        },
      });

      const members = await Promise.all(
        LOCAL_APPROVERS.map(async (approver) => {
          const staff = await tx.crmStaff.upsert({
            where: { username: approver.username },
            update: {
              displayName: approver.displayName,
              role: approver.staffRole,
              isActive: true,
              legacyStaffId: approver.syntheticLegacyStaffId,
            },
            create: {
              username: approver.username,
              displayName: approver.displayName,
              passwordHash: 'SAFE_DEV_ONLY_NO_LOGIN',
              role: approver.staffRole,
              isActive: true,
              legacyStaffId: approver.syntheticLegacyStaffId,
            },
          });

          return tx.crmTeamMember.upsert({
            where: {
              teamId_legacyStaffId: {
                teamId: team.id,
                legacyStaffId: approver.syntheticLegacyStaffId,
              },
            },
            update: {
              crmStaffId: staff.id,
              displayName: approver.displayName,
              role: approver.membershipRole,
              isActive: true,
            },
            create: {
              teamId: team.id,
              legacyStaffId: approver.syntheticLegacyStaffId,
              crmStaffId: staff.id,
              displayName: approver.displayName,
              role: approver.membershipRole,
              isActive: true,
            },
          });
        })
      );

      return {
        team: { code: team.code, name: team.name },
        members: members.map((member) => ({ displayName: member.displayName, role: member.role })),
      };
    });

    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await crm.$disconnect();
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
