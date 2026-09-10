import { createHash } from 'node:crypto';
import type { LockedPayrollSettlementExport, ShadowSettlementResult } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import { hashLockedSettlementExport } from './locked-settlement-import.service.js';

function subjectSourceHash(inputJson: string, resultJson: string): string {
  return createHash('sha256').update(`${inputJson}\n${resultJson}`).digest('hex');
}

function parseSubjectResult(
  value: string,
  subjectKey: string,
  periodKey: string,
  calculationVersion: string
): ShadowSettlementResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`The locked settlement subject ${subjectKey} has invalid evidence`);
  }
  if (!parsed || typeof parsed !== 'object')
    throw new Error(`The locked settlement subject ${subjectKey} has invalid evidence`);
  const result = parsed as Partial<ShadowSettlementResult>;
  if (
    result.mode !== 'SHADOW_READ_ONLY' ||
    result.subjectKey !== subjectKey ||
    result.sourcePeriodKey !== periodKey ||
    result.calculationVersion !== calculationVersion ||
    !Number.isSafeInteger(result.receivedAmount) ||
    !Number.isSafeInteger(result.grossAmount) ||
    !Number.isSafeInteger(result.holdAmount) ||
    !Number.isSafeInteger(result.lineCount)
  ) {
    throw new Error(`The locked settlement subject ${subjectKey} does not match its payroll period`);
  }
  return result as ShadowSettlementResult;
}

/**
 * The mOS Payroll Ledger is the only emitter for a settlement handoff. It
 * reads one already-locked period and one immutable settlement version; it
 * never contacts Legacy, rebuilds a period, or posts payroll.
 */
export class LockedSettlementExportService {
  static async exportLockedPeriod(fastify: FastifyInstance, periodKey: string): Promise<LockedPayrollSettlementExport> {
    const period = await fastify.prisma.crm.crmPayrollPeriod.findUnique({ where: { periodKey } });
    if (!period || period.status !== 'LOCKED' || !period.lockedAt) {
      throw new Error('Only an explicitly locked payroll period can issue a settlement export');
    }

    const settlement = await fastify.prisma.crm.crmPayrollSettlement.findFirst({
      where: { payrollPeriodId: period.id, status: 'LOCKED' },
      orderBy: { version: 'desc' },
    });
    if (!settlement || settlement.calculatorVersion !== period.calculationVersion || !settlement.sourceCutoffAt) {
      throw new Error('The locked payroll period has no verifiable locked settlement');
    }

    const subjects = await fastify.prisma.crm.crmPayrollSettlementSubject.findMany({
      where: { settlementId: settlement.id },
      orderBy: { subjectKey: 'asc' },
    });
    if (!subjects.length) throw new Error('The locked settlement has no subject snapshots to export');

    const payload = {
      sourceSystem: 'WINGS_SETTLEMENT_EXPORT' as const,
      exportId: `mos-payroll:${period.periodKey}:v${settlement.version}:${settlement.inputHash}`,
      // The immutable settlement timestamp keeps retries byte-for-byte stable.
      exportedAt: settlement.updatedAt.toISOString(),
      period: {
        periodKey: period.periodKey,
        label: period.label,
        startDate: period.startDate.toISOString().slice(0, 10),
        endDate: period.endDate.toISOString().slice(0, 10),
        timezone: period.timezone,
        status: 'LOCKED' as const,
        calculationVersion: period.calculationVersion,
        lockedAt: period.lockedAt.toISOString(),
      },
      settlement: {
        version: settlement.version,
        status: 'LOCKED' as const,
        calculatorVersion: settlement.calculatorVersion,
        sourceCutoffAt: settlement.sourceCutoffAt.toISOString(),
        inputHash: settlement.inputHash,
      },
      subjects: subjects.map((subject) => ({
        subjectKey: subject.subjectKey,
        result: parseSubjectResult(subject.resultJson, subject.subjectKey, period.periodKey, period.calculationVersion),
        sourceHash: subjectSourceHash(subject.inputJson, subject.resultJson),
      })),
    };
    return { ...payload, exportHash: hashLockedSettlementExport(payload) };
  }
}

export const __test__ = { parseSubjectResult, subjectSourceHash };
