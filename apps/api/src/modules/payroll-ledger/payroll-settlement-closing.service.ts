import type { ShadowSettlementResult } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import type { Prisma } from '../../generated/crm-client/index.js';

export type SettlementReviewSubject = {
  subjectKey: string;
  inputJson: string;
  result: ShadowSettlementResult;
};

export type SettlementReviewRequest = {
  periodKey: string;
  label: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  calculationVersion: string;
  settlementVersion: number;
  sourceCutoffAt: Date;
  inputHash: string;
  subjects: readonly SettlementReviewSubject[];
};

function assertReviewRequest(request: SettlementReviewRequest) {
  if (
    !request.periodKey.trim() ||
    !request.label.trim() ||
    !request.calculationVersion.trim() ||
    !request.inputHash.trim()
  ) {
    throw new Error('A settlement review requires period identity, calculation version, and source evidence');
  }
  if (!Number.isSafeInteger(request.settlementVersion) || request.settlementVersion < 1 || !request.subjects.length) {
    throw new Error('A settlement review requires a positive version and at least one subject snapshot');
  }
  const keys = new Set<string>();
  for (const subject of request.subjects) {
    if (!subject.subjectKey.trim() || keys.has(subject.subjectKey) || !subject.inputJson.trim()) {
      throw new Error('Settlement review subjects require unique keys and source evidence');
    }
    keys.add(subject.subjectKey);
    if (
      subject.result.mode !== 'SHADOW_READ_ONLY' ||
      subject.result.sourcePeriodKey !== request.periodKey ||
      subject.result.calculationVersion !== request.calculationVersion ||
      subject.result.subjectKey !== subject.subjectKey
    ) {
      throw new Error('A settlement review subject does not match the period and calculator version');
    }
  }
}

/** Review and lock are separate; only this transaction may make a period exportable. */
export class PayrollSettlementClosingService {
  static async createReview(fastify: FastifyInstance, actorStaffId: number | null, request: SettlementReviewRequest) {
    assertReviewRequest(request);
    return fastify.prisma.crm.$transaction((tx) => this.createReviewInTransaction(tx, actorStaffId, request));
  }

  /** Used by the event builder so it can freeze inputs and create its review atomically. */
  static async createReviewInTransaction(
    tx: Prisma.TransactionClient,
    actorStaffId: number | null,
    request: SettlementReviewRequest
  ) {
    assertReviewRequest(request);
    const existingPeriod = await tx.crmPayrollPeriod.findUnique({ where: { periodKey: request.periodKey } });
    if (existingPeriod?.status === 'LOCKED') throw new Error('A locked payroll period cannot be reopened for review');
    const period =
      existingPeriod ||
      (await tx.crmPayrollPeriod.create({
        data: {
          periodKey: request.periodKey,
          label: request.label,
          startDate: request.startDate,
          endDate: request.endDate,
          timezone: request.timezone,
          status: 'REVIEWING',
          calculationVersion: request.calculationVersion,
        },
      }));
    if (
      existingPeriod &&
      (existingPeriod.status !== 'REVIEWING' || existingPeriod.calculationVersion !== request.calculationVersion)
    ) {
      throw new Error('The existing payroll period conflicts with this settlement review');
    }

    const existingSettlement = await tx.crmPayrollSettlement.findUnique({
      where: { payrollPeriodId_version: { payrollPeriodId: period.id, version: request.settlementVersion } },
    });
    if (existingSettlement) {
      if (
        existingSettlement.status !== 'REVIEWING' ||
        existingSettlement.calculatorVersion !== request.calculationVersion ||
        existingSettlement.inputHash !== request.inputHash
      ) {
        throw new Error('The existing settlement conflicts with this review evidence');
      }
      return { period, settlement: existingSettlement, idempotent: true };
    }

    const settlement = await tx.crmPayrollSettlement.create({
      data: {
        payrollPeriodId: period.id,
        version: request.settlementVersion,
        status: 'REVIEWING',
        calculatorVersion: request.calculationVersion,
        sourceCutoffAt: request.sourceCutoffAt,
        inputHash: request.inputHash,
        createdByStaffId: actorStaffId,
      },
    });
    await tx.crmPayrollSettlementSubject.createMany({
      data: request.subjects.map((subject) => ({
        settlementId: settlement.id,
        subjectKey: subject.subjectKey,
        inputJson: subject.inputJson,
        resultJson: JSON.stringify(subject.result),
        inputHash: request.inputHash,
      })),
    });
    return { period, settlement, idempotent: false };
  }

  static async lockReview(fastify: FastifyInstance, actorStaffId: number | null, periodKey: string, version: number) {
    if (!periodKey.trim() || !Number.isSafeInteger(version) || version < 1) {
      throw new Error('A payroll period and settlement version are required to lock');
    }
    return fastify.prisma.crm.$transaction(async (tx) => {
      const period = await tx.crmPayrollPeriod.findUnique({ where: { periodKey } });
      if (!period) throw new Error('Payroll period was not found');
      const settlement = await tx.crmPayrollSettlement.findUnique({
        where: { payrollPeriodId_version: { payrollPeriodId: period.id, version } },
      });
      if (!settlement) throw new Error('Payroll settlement was not found');
      if (period.status === 'LOCKED' && settlement.status === 'LOCKED') return { period, settlement, idempotent: true };
      if (period.status !== 'REVIEWING' || settlement.status !== 'REVIEWING') {
        throw new Error('Only a reviewing period and reviewing settlement can be locked');
      }
      const subjects = await tx.crmPayrollSettlementSubject.count({ where: { settlementId: settlement.id } });
      if (!subjects) throw new Error('A settlement without subject snapshots cannot be locked');

      const now = new Date();
      const lockedSettlement = await tx.crmPayrollSettlement.update({
        where: { id: settlement.id },
        data: { status: 'LOCKED' },
      });
      const lockedPeriod = await tx.crmPayrollPeriod.update({
        where: { id: period.id },
        data: { status: 'LOCKED', lockedAt: now, lockedByStaffId: actorStaffId },
      });
      return { period: lockedPeriod, settlement: lockedSettlement, idempotent: false };
    });
  }
}

export const __test__ = { assertReviewRequest };
