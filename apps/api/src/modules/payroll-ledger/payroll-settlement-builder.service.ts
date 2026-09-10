import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { calculateSettlementFromEventSnapshot } from './shadow-settlement.service.js';
import { PayrollSettlementClosingService, type SettlementReviewRequest } from './payroll-settlement-closing.service.js';

export type PayrollSettlementPolicySnapshot = {
  subjectKey: string;
  capAmountHalfDong: number | null;
  policyVersion: string;
  policyReference: string;
  policyHash: string;
};

export type PayrollSettlementBuildInput = {
  periodKey: string;
  settlementVersion: number;
  policies: readonly PayrollSettlementPolicySnapshot[];
};

type EventSnapshot = {
  eventKey: string;
  subjectKey: string;
  component: string;
  amountHalfDong: number;
  sourceReference: string;
  sourceHash: string;
  sourceOccurredAt: Date;
};

function stableHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function assertPolicy(policy: PayrollSettlementPolicySnapshot): void {
  if (
    !policy.subjectKey.trim() ||
    !policy.policyVersion.trim() ||
    !policy.policyReference.trim() ||
    !policy.policyHash.trim()
  ) {
    throw new Error('Every settlement subject requires versioned policy evidence');
  }
  if (
    policy.capAmountHalfDong != null &&
    (!Number.isSafeInteger(policy.capAmountHalfDong) || policy.capAmountHalfDong < 0)
  ) {
    throw new Error('A settlement policy cap must be an exact non-negative half-VND amount');
  }
}

function assertBuildInput(input: PayrollSettlementBuildInput): void {
  if (!input.periodKey.trim() || !Number.isSafeInteger(input.settlementVersion) || input.settlementVersion < 1) {
    throw new Error('A settlement build requires a period and positive version');
  }
  const subjects = new Set<string>();
  for (const policy of input.policies) {
    assertPolicy(policy);
    if (subjects.has(policy.subjectKey)) throw new Error('Settlement policy snapshots must have unique subjects');
    subjects.add(policy.subjectKey);
  }
}

function buildReviewRequest(
  period: {
    periodKey: string;
    label: string;
    startDate: Date;
    endDate: Date;
    timezone: string;
    calculationVersion: string;
    status: string;
  },
  input: PayrollSettlementBuildInput,
  events: readonly EventSnapshot[]
): SettlementReviewRequest {
  assertBuildInput(input);
  if (period.status !== 'REVIEWING') throw new Error('Only a reviewing payroll period can build a settlement');
  if (period.periodKey !== input.periodKey) throw new Error('The settlement build period does not match its source');
  if (!events.length) throw new Error('A settlement build requires immutable payroll ledger events');

  const eventsBySubject = new Map<string, EventSnapshot[]>();
  for (const event of events) {
    if (
      !event.eventKey.trim() ||
      !event.subjectKey.trim() ||
      !event.component.trim() ||
      !event.sourceReference.trim() ||
      !event.sourceHash.trim() ||
      !Number.isSafeInteger(event.amountHalfDong)
    ) {
      throw new Error('Every payroll event needs traceable half-VND evidence');
    }
    const subjectEvents = eventsBySubject.get(event.subjectKey) || [];
    subjectEvents.push(event);
    eventsBySubject.set(event.subjectKey, subjectEvents);
  }

  const policies = new Map(input.policies.map((policy) => [policy.subjectKey, policy]));
  if (
    policies.size !== eventsBySubject.size ||
    [...eventsBySubject.keys()].some((subjectKey) => !policies.has(subjectKey))
  ) {
    throw new Error('Every event subject needs exactly one immutable policy snapshot');
  }

  const evidence = [...eventsBySubject.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([subjectKey, subjectEvents]) => {
      const policy = policies.get(subjectKey)!;
      const orderedEvents = [...subjectEvents].sort(
        (left, right) =>
          left.sourceOccurredAt.getTime() - right.sourceOccurredAt.getTime() ||
          left.eventKey.localeCompare(right.eventKey)
      );
      return {
        subjectKey,
        policy,
        events: orderedEvents.map((event) => ({
          eventKey: event.eventKey,
          component: event.component,
          amountHalfDong: event.amountHalfDong,
          sourceReference: event.sourceReference,
          sourceHash: event.sourceHash,
          sourceOccurredAt: event.sourceOccurredAt.toISOString(),
        })),
      };
    });
  const inputHash = stableHash({
    periodKey: period.periodKey,
    calculationVersion: period.calculationVersion,
    evidence,
  });
  const sourceCutoffAt = events.reduce(
    (latest, event) => (event.sourceOccurredAt > latest ? event.sourceOccurredAt : latest),
    events[0]!.sourceOccurredAt
  );

  return {
    periodKey: period.periodKey,
    label: period.label,
    startDate: period.startDate,
    endDate: period.endDate,
    timezone: period.timezone,
    calculationVersion: period.calculationVersion,
    settlementVersion: input.settlementVersion,
    sourceCutoffAt,
    inputHash,
    subjects: evidence.map(({ subjectKey, policy, events: lines }) => ({
      subjectKey,
      inputJson: JSON.stringify({ policy, events: lines }),
      result: calculateSettlementFromEventSnapshot({
        sourcePeriod: { periodKey: period.periodKey, calculationVersion: period.calculationVersion },
        subjectKey,
        capAmountHalfDong: policy.capAmountHalfDong,
        lines: lines.map((line) => ({ sourceKey: line.eventKey, amountHalfDong: line.amountHalfDong })),
      }),
    })),
  };
}

/**
 * Builds and persists one REVIEWING settlement snapshot from append-only
 * local events. It cannot lock, export, create adjustments, or post money.
 */
export class PayrollSettlementBuilderService {
  static async createReviewFromEvents(
    fastify: FastifyInstance,
    actorStaffId: number | null,
    input: PayrollSettlementBuildInput
  ) {
    assertBuildInput(input);
    return fastify.prisma.crm.$transaction(async (tx) => {
      const period = await tx.crmPayrollPeriod.findUnique({ where: { periodKey: input.periodKey } });
      if (!period) throw new Error('A settlement build requires an existing reviewing payroll period');
      const existingSettlement = await tx.crmPayrollSettlement.findFirst({ where: { payrollPeriodId: period.id } });
      if (existingSettlement) throw new Error('A settlement review already freezes this payroll period event input');
      const events = await tx.crmPayrollLedgerEvent.findMany({
        where: { payrollPeriodId: period.id },
        orderBy: [{ sourceOccurredAt: 'asc' }, { eventKey: 'asc' }],
        select: {
          eventKey: true,
          subjectKey: true,
          component: true,
          amountHalfDong: true,
          sourceReference: true,
          sourceHash: true,
          sourceOccurredAt: true,
        },
      });
      const review = buildReviewRequest(period, input, events);
      return PayrollSettlementClosingService.createReviewInTransaction(tx, actorStaffId, review);
    });
  }
}

export const __test__ = { assertBuildInput, buildReviewRequest, stableHash };
