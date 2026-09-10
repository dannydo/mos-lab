import dotenv from 'dotenv';
import type { FastifyInstance } from 'fastify';
import { PrismaClient as CrmPrismaClient } from '../generated/crm-client/index.js';
import { PrismaClient as LegacyPrismaClient } from '../generated/legacy-client/index.js';
import { createVerifiedHistorySnapshot } from '../modules/payroll-ledger/cc-native-pilot-history.service.js';
import { getLegacyCcComparison } from '../safe-dev/legacy-cc-comparison.js';

dotenv.config(process.env.SOURCE_ENV_FILE ? { path: process.env.SOURCE_ENV_FILE, override: true } : undefined);

const pilotSubjects = [
  { subjectKey: 'staff:legacy:34295', legacyStaffId: 34295, displayName: 'Thục Nghi' },
  { subjectKey: 'staff:legacy:37790', legacyStaffId: 37790, displayName: 'Diễm Hương' },
  { subjectKey: 'staff:legacy:46092', legacyStaffId: 46092, displayName: 'Quang Khải CC' },
  { subjectKey: 'staff:legacy:48026', legacyStaffId: 48026, displayName: 'Yến Vy' },
] as const;

async function main() {
  const [legacy, crm] = [
    new LegacyPrismaClient({ datasources: { db: { url: process.env.LEGACY_DATABASE_URL } } }),
    new CrmPrismaClient({ datasources: { db: { url: process.env.CRM_DATABASE_URL } } }),
  ];
  await Promise.all([legacy.$connect(), crm.$connect()]);
  try {
    const fastify = {
      prisma: { legacy, crm },
      log: { error: () => undefined },
    } as unknown as FastifyInstance;
    const comparisons = await Promise.all(
      pilotSubjects.map(async (subject) => ({
        subject,
        comparison: await getLegacyCcComparison(fastify, subject),
      }))
    );
    const snapshot = createVerifiedHistorySnapshot({
      version: 'cc-native-pilot-history.v1',
      source: 'LOCAL_LEGACY_PARITY_REPLAY',
      verifiedAt: new Date().toISOString(),
      subjects: comparisons.map(({ subject, comparison }) => ({
        subjectKey: subject.subjectKey,
        displayName: subject.displayName,
        months: comparison.months.map((month) => ({
          periodKey: month.periodKey,
          rawXoayVnd: month.rawXoayVnd,
          dailyBonusVnd: month.dailyBonusVnd,
          heldXoayVnd: month.heldXoayVnd,
          effectiveXoayVnd: month.effectiveXoayVnd,
          cashTipVnd: month.cashTipVnd,
          componentTotalVnd: month.componentTotalVnd,
          sourceCounts: month.evidenceCounts,
        })),
      })),
    });
    process.stdout.write(JSON.stringify(snapshot));
  } finally {
    await Promise.all([legacy.$disconnect(), crm.$disconnect()]);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
