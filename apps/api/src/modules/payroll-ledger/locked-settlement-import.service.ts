import { createHash } from 'node:crypto';
import type { LockedPayrollSettlementExport, SanitizedLockedSettlementImport } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';

function canonicalPayload(input: Omit<LockedPayrollSettlementExport, 'exportHash'>) {
  return {
    ...input,
    subjects: [...input.subjects].sort((left, right) => left.subjectKey.localeCompare(right.subjectKey)),
  };
}

/** The exporter and importer use this deterministic hash to detect drift in transit. */
export function hashLockedSettlementExport(input: Omit<LockedPayrollSettlementExport, 'exportHash'>): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalPayload(input)))
    .digest('hex');
}

/**
 * Validates a source handoff before any local persistence is attempted.
 * This service never queries Legacy and never has a production posting path.
 */
export function validateLockedSettlementExport(input: LockedPayrollSettlementExport): SanitizedLockedSettlementImport {
  if (input.sourceSystem !== 'WINGS_SETTLEMENT_EXPORT') {
    throw new Error('Only a trusted Wings settlement export can be imported');
  }
  if (!input.exportId.trim() || !input.period.periodKey.trim() || !input.period.calculationVersion.trim()) {
    throw new Error('The locked settlement export requires source identity and period metadata');
  }
  if (input.period.status !== 'LOCKED' || input.settlement.status !== 'LOCKED') {
    throw new Error('Only a locked payroll period and locked settlement can be imported');
  }
  if (!Number.isSafeInteger(input.settlement.version) || input.settlement.version < 1) {
    throw new Error('The settlement version must be a positive integer');
  }
  if (input.settlement.calculatorVersion !== input.period.calculationVersion) {
    throw new Error('The settlement calculator version must match the locked payroll period');
  }
  if (!input.subjects.length) {
    throw new Error('The locked settlement export must contain at least one sanitized subject');
  }

  const keys = new Set<string>();
  for (const subject of input.subjects) {
    if (!subject.subjectKey.trim() || keys.has(subject.subjectKey)) {
      throw new Error('Imported settlement subjects must have unique opaque keys');
    }
    keys.add(subject.subjectKey);
    if (!subject.sourceHash.trim()) throw new Error('Every imported settlement subject requires source evidence');
    if (
      subject.result.mode !== 'SHADOW_READ_ONLY' ||
      subject.result.sourcePeriodKey !== input.period.periodKey ||
      subject.result.calculationVersion !== input.period.calculationVersion ||
      subject.result.subjectKey !== subject.subjectKey
    ) {
      throw new Error('An imported settlement subject does not match the locked source period');
    }
  }

  const { exportHash: _exportHash, ...payload } = input;
  if (hashLockedSettlementExport(payload) !== input.exportHash) {
    throw new Error('The locked settlement export hash does not match its contents');
  }

  return {
    periodKey: input.period.periodKey,
    settlementVersion: input.settlement.version,
    exportId: input.exportId,
    exportHash: input.exportHash,
    subjectCount: input.subjects.length,
  };
}

function assertSameLockedPeriod(
  period: { status: string; calculationVersion: string; lockedAt: Date | null },
  input: LockedPayrollSettlementExport
) {
  if (
    period.status !== 'LOCKED' ||
    period.calculationVersion !== input.period.calculationVersion ||
    period.lockedAt?.toISOString() !== new Date(input.period.lockedAt).toISOString()
  ) {
    throw new Error('The local source-period record conflicts with the locked settlement export');
  }
}

/**
 * Stages a hash-verified export in the local CRM only. Existing locked
 * snapshots are compared, never updated; a retry is therefore idempotent.
 */
export async function stageLockedSettlementExport(
  fastify: FastifyInstance,
  input: LockedPayrollSettlementExport
): Promise<SanitizedLockedSettlementImport & { idempotent: boolean }> {
  const summary = validateLockedSettlementExport(input);
  return fastify.prisma.crm.$transaction(async (tx) => {
    const existingPeriod = await tx.crmPayrollPeriod.findUnique({ where: { periodKey: input.period.periodKey } });
    const period =
      existingPeriod ||
      (await tx.crmPayrollPeriod.create({
        data: {
          periodKey: input.period.periodKey,
          label: input.period.label,
          startDate: new Date(input.period.startDate),
          endDate: new Date(input.period.endDate),
          timezone: input.period.timezone,
          status: 'LOCKED',
          calculationVersion: input.period.calculationVersion,
          lockedAt: new Date(input.period.lockedAt),
        },
      }));
    if (existingPeriod) assertSameLockedPeriod(existingPeriod, input);

    const existingSettlement = await tx.crmPayrollSettlement.findUnique({
      where: { payrollPeriodId_version: { payrollPeriodId: period.id, version: input.settlement.version } },
    });
    const settlement =
      existingSettlement ||
      (await tx.crmPayrollSettlement.create({
        data: {
          payrollPeriodId: period.id,
          version: input.settlement.version,
          status: 'LOCKED',
          calculatorVersion: input.settlement.calculatorVersion,
          sourceCutoffAt: new Date(input.settlement.sourceCutoffAt),
          inputHash: input.settlement.inputHash,
        },
      }));
    if (
      existingSettlement &&
      (existingSettlement.status !== 'LOCKED' ||
        existingSettlement.calculatorVersion !== input.settlement.calculatorVersion ||
        existingSettlement.inputHash !== input.settlement.inputHash ||
        existingSettlement.sourceCutoffAt?.toISOString() !== new Date(input.settlement.sourceCutoffAt).toISOString())
    ) {
      throw new Error('The local settlement record conflicts with the locked settlement export');
    }

    const existingSubjects = await tx.crmPayrollSettlementSubject.findMany({ where: { settlementId: settlement.id } });
    const existingByKey = new Map(existingSubjects.map((subject) => [subject.subjectKey, subject]));
    if (existingSubjects.length && existingSubjects.length !== input.subjects.length) {
      throw new Error('The local settlement subject count conflicts with the locked settlement export');
    }
    let idempotent = Boolean(existingSettlement);
    for (const subject of input.subjects) {
      const existing = existingByKey.get(subject.subjectKey);
      const inputJson = JSON.stringify({
        sourceSystem: input.sourceSystem,
        exportId: input.exportId,
        exportHash: input.exportHash,
        sourceHash: subject.sourceHash,
      });
      const resultJson = JSON.stringify(subject.result);
      if (existing) {
        if (existing.inputHash !== input.settlement.inputHash || existing.resultJson !== resultJson) {
          throw new Error('The local settlement subject conflicts with the locked settlement export');
        }
        continue;
      }
      idempotent = false;
      await tx.crmPayrollSettlementSubject.create({
        data: {
          settlementId: settlement.id,
          subjectKey: subject.subjectKey,
          inputJson,
          resultJson,
          inputHash: input.settlement.inputHash,
        },
      });
    }
    return { ...summary, idempotent };
  });
}
