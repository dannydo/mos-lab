import type { LegacyCcCohortAuditResponse } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import { CcKpiService } from '../modules/kpi/services/cc-kpi.service.js';
import { getLegacyCcComparison } from './legacy-cc-comparison.js';

/**
 * Read-only readiness gate for the existing active CC cohort. It verifies
 * that both comparison months have source rows and that each Cash Tip row
 * obeys the 10% one-end / 20% both-ends rule. It does not create any mOS
 * evidence, period, settlement, adjustment or payout.
 */
export async function getLegacyCcCohortAudit(fastify: FastifyInstance): Promise<LegacyCcCohortAuditResponse> {
  const activeIds = [...new Set(await CcKpiService.getActiveCcStaffIds(fastify))]
    .filter((staffId) => Number.isSafeInteger(staffId) && staffId > 0)
    .sort((left, right) => left - right);
  if (!activeIds.length) throw new Error('No active CC can be audited');

  const profiles = await fastify.prisma.legacy.$queryRawUnsafe<Array<{ userId: number; displayName: string | null }>>(`
    SELECT up.user_id AS userId, up.full_name AS displayName
    FROM user_profile up
    WHERE up.user_id IN (${activeIds.join(',')})
  `);
  const names = new Map(
    profiles.map((profile) => [Number(profile.userId), String(profile.displayName || `CC ${profile.userId}`)])
  );
  const cc = await Promise.all(
    activeIds.map(async (legacyStaffId) => {
      const comparison = await getLegacyCcComparison(fastify, {
        legacyStaffId,
        displayName: names.get(legacyStaffId) || `CC ${legacyStaffId}`,
      });
      const sourceMissing = comparison.months.some(
        (month) =>
          month.evidenceCounts.xoayLedgerRows + month.evidenceCounts.dailyCloses + month.evidenceCounts.cashTipRows ===
          0
      );
      const tipMismatch = comparison.months.some((month) => month.cashTipBreakdown.ruleMismatchRows > 0);
      const reason: 'MISSING_SOURCE' | 'TIP_RULE_MISMATCH' | undefined = sourceMissing
        ? 'MISSING_SOURCE'
        : tipMismatch
          ? 'TIP_RULE_MISMATCH'
          : undefined;
      return {
        legacyStaffId,
        displayName: comparison.staff.displayName,
        status: reason ? ('BLOCKED' as const) : ('PASS' as const),
        ...(reason ? { reason } : {}),
        months: comparison.months.map((month) => ({
          periodKey: month.periodKey,
          componentTotalVnd: month.componentTotalVnd,
          cashTipRows: month.evidenceCounts.cashTipRows,
          ruleMismatchRows: month.cashTipBreakdown.ruleMismatchRows,
        })),
      };
    })
  );
  const passedCcCount = cc.filter((subject) => subject.status === 'PASS').length;
  return {
    mode: 'LOCAL_READ_ONLY',
    source: 'WINGS_LEGACY',
    months: ['2026-08', '2026-09'],
    gate: passedCcCount === cc.length ? 'PASS' : 'BLOCKED',
    summary: { activeCcCount: cc.length, passedCcCount, blockedCcCount: cc.length - passedCcCount },
    cc,
  };
}
