import type { FastifyInstance } from 'fastify';
import { PayrollLedgerEventService } from '../modules/payroll-ledger/payroll-ledger-event.service.js';
import { PayrollSettlementBuilderService } from '../modules/payroll-ledger/payroll-settlement-builder.service.js';

const PERIOD_KEY = 'LAB-2026-11-REVIEW';
const VERSION = 1;

/** Creates only a repeatable local review fixture; it has no payout path. */
export async function getLocalSettlementReview(fastify: FastifyInstance) {
  await fastify.prisma.crm.$transaction(async (tx) => {
    const period = await tx.crmPayrollPeriod.upsert({
      where: { periodKey: PERIOD_KEY },
      update: {},
      create: {
        periodKey: PERIOD_KEY,
        label: 'Local Lab · chốt kỳ November',
        startDate: new Date('2026-11-01T00:00:00.000Z'),
        endDate: new Date('2026-11-30T23:59:59.999Z'),
        timezone: 'Asia/Ho_Chi_Minh',
        status: 'REVIEWING',
        calculationVersion: 'payroll-ledger.v1',
      },
    });
    const hasSettlement = await tx.crmPayrollSettlement.count({ where: { payrollPeriodId: period.id } });
    if (hasSettlement) return;
    const events = [
      ['local:settlement:an:cc', 'local:cc:an', 'CC Xoay', 6_000, 'fal:local:an:cc'],
      ['local:settlement:an:daily', 'local:cc:an', 'Daily Bonus', 1, 'fal:local:an:daily'],
      ['local:settlement:binh:cc', 'local:cv:binh', 'CV Bonus', 9_000, 'fal:local:binh:cv'],
    ] as const;
    for (const [eventKey, subjectKey, component, amountHalfDong, sourceReference] of events) {
      await PayrollLedgerEventService.append(tx, {
        eventKey,
        payrollPeriodId: period.id,
        subjectKey,
        sourceType: 'FAL',
        component,
        amountHalfDong,
        sourceReference,
        sourceHash: `hash:${eventKey}`,
        sourceOccurredAt: new Date('2026-11-10T09:00:00.000Z'),
      });
    }
  });

  const existing = await fastify.prisma.crm.crmPayrollPeriod.findUnique({
    where: { periodKey: PERIOD_KEY },
    include: { settlements: { orderBy: { version: 'desc' }, take: 1 } },
  });
  if (!existing?.settlements[0]) {
    await PayrollSettlementBuilderService.createReviewFromEvents(fastify, null, {
      periodKey: PERIOD_KEY,
      settlementVersion: VERSION,
      policies: [
        {
          subjectKey: 'local:cc:an',
          capAmountHalfDong: 6_000,
          policyVersion: 'cc-cap.v1',
          policyReference: 'PAY-001',
          policyHash: 'local-policy:an:v1',
        },
        {
          subjectKey: 'local:cv:binh',
          capAmountHalfDong: null,
          policyVersion: 'cv-normal.v1',
          policyReference: 'PAY-001',
          policyHash: 'local-policy:binh:v1',
        },
      ],
    });
  }

  const period = await fastify.prisma.crm.crmPayrollPeriod.findUniqueOrThrow({
    where: { periodKey: PERIOD_KEY },
    include: {
      settlements: { where: { version: VERSION }, include: { subjects: { orderBy: { subjectKey: 'asc' } } } },
    },
  });
  const settlement = period.settlements[0]!;
  const events = await fastify.prisma.crm.crmPayrollLedgerEvent.findMany({
    where: { payrollPeriodId: period.id },
    orderBy: [{ subjectKey: 'asc' }, { sourceOccurredAt: 'asc' }, { eventKey: 'asc' }],
    select: { eventKey: true, subjectKey: true, component: true, amountHalfDong: true, sourceReference: true },
  });
  return {
    mode: 'LOCAL_ONLY' as const,
    period: { periodKey: period.periodKey, label: period.label, status: period.status, version: settlement.version },
    events,
    subjects: settlement.subjects.map((subject) => ({
      subjectKey: subject.subjectKey,
      input: JSON.parse(subject.inputJson),
      result: JSON.parse(subject.resultJson),
    })),
  };
}
