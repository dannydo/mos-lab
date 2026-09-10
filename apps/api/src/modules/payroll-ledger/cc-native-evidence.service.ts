import { createHash } from 'node:crypto';
import type {
  CcDailyBonusPolicySnapshot,
  CcNativeEvidencePayload,
  RecordedCcNativeEvidence,
  RecordCcNativeEvidenceRequest,
} from '@mos-lab/shared';
import { CC_GAMIFICATION_SYSTEM_CONFIG } from '@mos-lab/shared';
import type { Prisma } from '../../generated/crm-client/index.js';
import { calculateCcXoayCashHalfDong, CcNativePayrollPolicyService } from './cc-native-payroll-policy.service.js';

type PayrollLedgerTransaction = Prisma.TransactionClient;

type PreparedEvidence = Omit<RecordedCcNativeEvidence, 'payrollPeriodId' | 'subjectKey'> & {
  payload: CcNativeEvidencePayload;
};

function stableHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function assertSafeWholeVnd(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative whole VND amount`);
  }
}

function assertPolicy(policy: CcDailyBonusPolicySnapshot): void {
  if (!policy.policyVersion.trim() || !policy.tiers.length) {
    throw new Error('Daily sales evidence requires a versioned mOS policy snapshot');
  }
  let previousMinimum = -1;
  for (const tier of policy.tiers) {
    if (
      !Number.isSafeInteger(tier.minimumQualifyingSalesVnd) ||
      tier.minimumQualifyingSalesVnd < 0 ||
      !Number.isSafeInteger(tier.rateBasisPoints) ||
      tier.rateBasisPoints < 0 ||
      tier.minimumQualifyingSalesVnd <= previousMinimum
    ) {
      throw new Error('Daily sales policy tiers must be ordered exact mOS rule snapshots');
    }
    previousMinimum = tier.minimumQualifyingSalesVnd;
  }
}

function calculateDailyBonusHalfDong(
  qualifyingSalesVnd: number,
  policy: CcDailyBonusPolicySnapshot
): { amountHalfDong: number; policyHash: string } {
  assertSafeWholeVnd(qualifyingSalesVnd, 'Qualifying daily sales');
  assertPolicy(policy);
  const tier = [...policy.tiers]
    .sort((left, right) => right.minimumQualifyingSalesVnd - left.minimumQualifyingSalesVnd)
    .find((candidate) => qualifyingSalesVnd >= candidate.minimumQualifyingSalesVnd);
  if (!tier) throw new Error('Daily sales policy has no tier for this mOS evidence');

  // A policy must produce a whole-dong Daily Bonus.  This makes the 150% CC
  // Xoay cap exactly representable in half-dong units without hidden rounding.
  const numerator = qualifyingSalesVnd * tier.rateBasisPoints;
  if (!Number.isSafeInteger(numerator) || numerator % 10_000 !== 0) {
    throw new Error('Daily sales policy would introduce a sub-VND rounding difference');
  }
  return {
    amountHalfDong: (numerator / 10_000) * 2,
    policyHash: stableHash({ policyVersion: policy.policyVersion, tiers: policy.tiers }),
  };
}

function calculateCashTipHalfDong(cashTipPoolVnd: number, ccVisitRole: 'ONE_END' | 'BOTH_ENDS'): number {
  assertSafeWholeVnd(cashTipPoolVnd, 'Cash tip pool');
  const percent =
    ccVisitRole === 'BOTH_ENDS'
      ? CC_GAMIFICATION_SYSTEM_CONFIG.TIP_PERCENTAGE_FULL
      : CC_GAMIFICATION_SYSTEM_CONFIG.TIP_PERCENTAGE_SPLIT;
  // The visit role is the payroll rule: a CC at either check-in or check-out
  // receives 10%; the same CC at both ends receives 20%. Keep the result in
  // half-VND until settlement, never apply a percentage to an already
  // credited CC tip amount.
  const numerator = cashTipPoolVnd * percent * 2;
  const denominator = 100;
  if (!Number.isSafeInteger(numerator) || numerator % denominator !== 0) {
    throw new Error('Cash tip evidence cannot be represented exactly in half-VND units');
  }
  return numerator / denominator;
}

function prepareEvidence(input: RecordCcNativeEvidenceRequest): PreparedEvidence {
  if (
    !input.evidenceKey.trim() ||
    !Number.isSafeInteger(input.payrollPeriodId) ||
    input.payrollPeriodId <= 0 ||
    !input.subjectKey.trim() ||
    !input.sourceReference.startsWith('mos:') ||
    Number.isNaN(new Date(input.sourceOccurredAt).getTime())
  ) {
    throw new Error('Native CC evidence requires an mOS key, period, subject, source and timestamp');
  }

  const sourceOccurredAt = new Date(input.sourceOccurredAt);
  const requiredSourcePrefix =
    input.payload.kind === 'COMPLETED_SERVICE'
      ? 'mos:completed-service:'
      : input.payload.kind === 'DAILY_SALES_CLOSE'
        ? 'mos:daily-close:'
        : 'mos:cash-tip:';
  if (!input.sourceReference.startsWith(requiredSourcePrefix)) {
    throw new Error(`Native ${input.payload.kind} evidence requires its matching mOS operational source`);
  }
  const base = {
    evidenceKey: input.evidenceKey,
    sourceReference: input.sourceReference,
    sourceOccurredAt: sourceOccurredAt.toISOString(),
    payload: input.payload,
  };
  switch (input.payload.kind) {
    case 'COMPLETED_SERVICE': {
      const amountHalfDong = calculateCcXoayCashHalfDong({
        previousPoints: input.payload.previousPoints,
        shareCount: input.payload.shareCount,
      });
      return {
        ...base,
        evidenceKind: 'COMPLETED_SERVICE',
        component: 'CC_XOAY_CASH',
        amountHalfDong,
        sourceHash: stableHash(base),
        policyVersion: 'cc-xoay-cash.v1',
        policyHash: stableHash({ rule: 'floor(previousPoints / 100) + 1; level * 65 VND; split 50/50' }),
      };
    }
    case 'DAILY_SALES_CLOSE': {
      const dailyBonus = calculateDailyBonusHalfDong(input.payload.qualifyingSalesVnd, input.payload.policy);
      return {
        ...base,
        evidenceKind: 'DAILY_SALES_CLOSE',
        component: 'CC_DAILY_BONUS',
        amountHalfDong: dailyBonus.amountHalfDong,
        sourceHash: stableHash(base),
        policyVersion: input.payload.policy.policyVersion,
        policyHash: dailyBonus.policyHash,
      };
    }
    case 'CASH_TIP': {
      const amountHalfDong = calculateCashTipHalfDong(input.payload.cashTipPoolVnd, input.payload.ccVisitRole);
      return {
        ...base,
        evidenceKind: 'CASH_TIP',
        component: 'CC_TIP_CASH',
        amountHalfDong,
        sourceHash: stableHash(base),
        policyVersion: 'cc-cash-tip.v1',
        policyHash: stableHash({
          rule: 'ONE_END = 10 percent; BOTH_ENDS = 20 percent of one visit cash-tip pool',
          ccVisitRole: input.payload.ccVisitRole,
        }),
      };
    }
  }
}

/**
 * mOS-owned evidence boundary.  It records completed-service, daily-sales and
 * cash-tip facts immutably; it never reads iOS/Legacy, creates a settlement,
 * locks a period, or posts a payout.
 */
export class CcNativeEvidenceService {
  static async record(
    tx: PayrollLedgerTransaction,
    actorStaffId: number | null,
    input: RecordCcNativeEvidenceRequest
  ): Promise<RecordedCcNativeEvidence> {
    const prepared = prepareEvidence(input);
    const period = await tx.crmPayrollPeriod.findUnique({ where: { id: input.payrollPeriodId } });
    if (!period) throw new Error('Native CC evidence requires an existing payroll period');
    if (period.status !== 'OPEN')
      throw new Error('Native CC evidence can only be recorded while the payroll period is OPEN');
    const finalized = await tx.crmPayrollLedgerEvent.findFirst({
      where: {
        payrollPeriodId: input.payrollPeriodId,
        subjectKey: input.subjectKey,
        sourceType: 'CC',
        component: 'CC_POLICY_FINALIZED',
      },
      select: { id: true },
    });
    if (finalized) throw new Error('A finalized native CC policy cannot accept additional source evidence');

    await tx.crmPayrollCcEvidence.create({
      data: {
        evidenceKey: prepared.evidenceKey,
        payrollPeriodId: input.payrollPeriodId,
        subjectKey: input.subjectKey,
        evidenceKind: prepared.evidenceKind,
        component: prepared.component,
        amountHalfDong: prepared.amountHalfDong,
        sourceReference: prepared.sourceReference,
        sourceHash: prepared.sourceHash,
        sourceOccurredAt: new Date(prepared.sourceOccurredAt),
        policyVersion: prepared.policyVersion,
        policyHash: prepared.policyHash,
        payloadJson: JSON.stringify(prepared.payload),
        createdByStaffId: actorStaffId,
      },
    });
    return {
      evidenceKey: prepared.evidenceKey,
      payrollPeriodId: input.payrollPeriodId,
      subjectKey: input.subjectKey,
      evidenceKind: prepared.evidenceKind,
      component: prepared.component,
      amountHalfDong: prepared.amountHalfDong,
      sourceReference: prepared.sourceReference,
      sourceHash: prepared.sourceHash,
      sourceOccurredAt: prepared.sourceOccurredAt,
      policyVersion: prepared.policyVersion,
      policyHash: prepared.policyHash,
    };
  }

  /** Converts all previously recorded evidence for one person into frozen ledger input. */
  static async finalizeSubject(
    tx: PayrollLedgerTransaction,
    input: { payrollPeriodId: number; periodKey: string; subjectKey: string }
  ) {
    const period = await tx.crmPayrollPeriod.findUnique({ where: { id: input.payrollPeriodId } });
    if (!period || period.periodKey !== input.periodKey || period.status !== 'OPEN') {
      throw new Error('Native CC evidence can only be finalized for its matching OPEN payroll period');
    }
    const evidence = await tx.crmPayrollCcEvidence.findMany({
      where: { payrollPeriodId: input.payrollPeriodId, subjectKey: input.subjectKey },
      orderBy: [{ sourceOccurredAt: 'asc' }, { evidenceKey: 'asc' }],
    });
    if (!evidence.length) throw new Error('Native CC policy finalization requires recorded mOS evidence');
    return CcNativePayrollPolicyService.capture(tx, {
      payrollPeriodId: input.payrollPeriodId,
      periodKey: input.periodKey,
      subjectKey: input.subjectKey,
      events: evidence.map((row) => ({
        eventKey: row.evidenceKey,
        component: row.component as 'CC_DAILY_BONUS' | 'CC_XOAY_CASH' | 'CC_TIP_CASH',
        amountHalfDong: row.amountHalfDong,
        sourceReference: row.sourceReference,
        sourceHash: row.sourceHash,
        sourceOccurredAt: row.sourceOccurredAt,
        metadata: {
          evidenceKind: row.evidenceKind,
          policyVersion: row.policyVersion,
          policyHash: row.policyHash,
          evidenceHash: row.sourceHash,
        },
      })),
    });
  }
}

export const __test__ = { calculateDailyBonusHalfDong, calculateCashTipHalfDong, prepareEvidence };
