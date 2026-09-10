import { createHash } from 'node:crypto';
import type { LegacyCcComparisonResponse, LegacyCcParityReplayResponse } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import { LockedSettlementExportService } from '../modules/payroll-ledger/locked-settlement-export.service.js';
import { PayrollLedgerEventService } from '../modules/payroll-ledger/payroll-ledger-event.service.js';
import { PayrollSettlementBuilderService } from '../modules/payroll-ledger/payroll-settlement-builder.service.js';
import { PayrollSettlementClosingService } from '../modules/payroll-ledger/payroll-settlement-closing.service.js';
import { getLegacyCcComparison } from './legacy-cc-comparison.js';

const SUBJECT_KEY = 'local:legacy:cc:diem-huong';
const CALCULATION_VERSION = 'cc-legacy-parity.v1';
const SETTLEMENT_VERSION = 1;

type LegacyMonth = LegacyCcComparisonResponse['months'][number];

function localPeriodKey(sourcePeriodKey: string): string {
  return `LPR-${sourcePeriodKey.replace('-', '')}-DH`;
}

function sourceHash(month: LegacyMonth): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        source: 'WINGS_LEGACY_READ_ONLY',
        periodKey: month.periodKey,
        rawXoayVnd: month.rawXoayVnd,
        dailyBonusVnd: month.dailyBonusVnd,
        cashTipVnd: month.cashTipVnd,
        heldXoayVnd: month.heldXoayVnd,
        componentTotalVnd: month.componentTotalVnd,
        counts: month.evidenceCounts,
      })
    )
    .digest('hex');
}

function monthDates(periodKey: string) {
  const [year, month] = periodKey.split('-').map(Number);
  if (!year || !month) throw new Error('Legacy comparison returned an invalid month');
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  return { start, end };
}

function expectedComponents(month: LegacyMonth) {
  return [
    { component: 'CC_XOAY_CASH', amountHalfDong: month.rawXoayVnd * 2 },
    { component: 'CC_DAILY_BONUS', amountHalfDong: month.dailyBonusVnd * 2 },
    { component: 'CC_TIP_CASH', amountHalfDong: month.cashTipVnd * 2 },
    ...(month.heldXoayVnd > 0 ? [{ component: 'CC_XOAY_CAP_HOLD', amountHalfDong: -month.heldXoayVnd * 2 }] : []),
  ];
}

function assertExactReplay(
  month: LegacyMonth,
  events: Array<{ component: string; amountHalfDong: number; sourceHash: string }>
) {
  const expected = expectedComponents(month);
  const expectedHash = sourceHash(month);
  if (events.length !== expected.length) {
    throw new Error(`Local parity replay for ${month.periodKey} has an unexpected event count`);
  }
  for (const line of expected) {
    const event = events.find((candidate) => candidate.component === line.component);
    if (!event || event.amountHalfDong !== line.amountHalfDong || event.sourceHash !== expectedHash) {
      throw new Error(`Legacy source changed after the local replay for ${month.periodKey} was locked`);
    }
  }
}

/**
 * Replays a read-only Legacy component snapshot through the local ledger,
 * settlement lock and export boundary. It never turns Legacy data into mOS
 * native evidence and it never contacts a payout system.
 */
export async function getLegacyCcParityReplay(fastify: FastifyInstance): Promise<LegacyCcParityReplayResponse> {
  const comparison = await getLegacyCcComparison(fastify);
  const months = [] as LegacyCcParityReplayResponse['months'];

  for (const month of comparison.months) {
    const periodKey = localPeriodKey(month.periodKey);
    const { start, end } = monthDates(month.periodKey);
    const hash = sourceHash(month);
    const period = await fastify.prisma.crm.crmPayrollPeriod.upsert({
      where: { periodKey },
      update: {},
      create: {
        periodKey,
        label: `Local parity replay · ${comparison.staff.displayName} · ${month.periodKey}`,
        startDate: start,
        endDate: end,
        timezone: 'Asia/Ho_Chi_Minh',
        status: 'OPEN',
        calculationVersion: CALCULATION_VERSION,
      },
    });

    const currentEvents = await fastify.prisma.crm.crmPayrollLedgerEvent.findMany({
      where: { payrollPeriodId: period.id, subjectKey: SUBJECT_KEY },
      select: { component: true, amountHalfDong: true, sourceHash: true },
    });
    if (currentEvents.length) assertExactReplay(month, currentEvents);

    if (period.status === 'OPEN') {
      if (currentEvents.length) {
        throw new Error(`Open local parity replay ${month.periodKey} already contains immutable events`);
      }
      await fastify.prisma.crm.$transaction(async (tx) => {
        for (const line of expectedComponents(month)) {
          await PayrollLedgerEventService.append(tx, {
            eventKey: `legacy-parity:${month.periodKey}:${line.component.toLowerCase()}`,
            payrollPeriodId: period.id,
            subjectKey: SUBJECT_KEY,
            sourceType: 'SYSTEM',
            component: line.component,
            amountHalfDong: line.amountHalfDong,
            sourceReference: `legacy:read-only:${month.periodKey}:${line.component.toLowerCase()}`,
            sourceHash: hash,
            sourceOccurredAt: end,
            metadata: {
              replay: 'LOCAL_LEGACY_PARITY_ONLY',
              legacyPeriodKey: month.periodKey,
              componentTotalVnd: month.componentTotalVnd,
            },
          });
        }
      });
      await fastify.prisma.crm.crmPayrollPeriod.update({ where: { id: period.id }, data: { status: 'REVIEWING' } });
    }

    const latestPeriod = await fastify.prisma.crm.crmPayrollPeriod.findUniqueOrThrow({
      where: { periodKey },
      include: { settlements: { where: { version: SETTLEMENT_VERSION }, take: 1 } },
    });
    if (!latestPeriod.settlements.length && latestPeriod.status === 'REVIEWING') {
      await PayrollSettlementBuilderService.createReviewFromEvents(fastify, null, {
        periodKey,
        settlementVersion: SETTLEMENT_VERSION,
        policies: [
          {
            subjectKey: SUBJECT_KEY,
            capAmountHalfDong: null,
            policyVersion: CALCULATION_VERSION,
            policyReference: 'LOCAL-LEGACY-PARITY-REPLAY',
            policyHash: hash,
          },
        ],
      });
    }
    const beforeLock = await fastify.prisma.crm.crmPayrollPeriod.findUniqueOrThrow({ where: { periodKey } });
    if (beforeLock.status === 'REVIEWING') {
      await PayrollSettlementClosingService.lockReview(fastify, null, periodKey, SETTLEMENT_VERSION);
    }

    const [lockedPeriod, lockedExport] = await Promise.all([
      fastify.prisma.crm.crmPayrollPeriod.findUniqueOrThrow({
        where: { periodKey },
        include: {
          settlements: {
            where: { version: SETTLEMENT_VERSION, status: 'LOCKED' },
            include: { subjects: { where: { subjectKey: SUBJECT_KEY }, take: 1 } },
            take: 1,
          },
        },
      }),
      LockedSettlementExportService.exportLockedPeriod(fastify, periodKey),
    ]);
    const resultJson = lockedPeriod.settlements[0]?.subjects[0]?.resultJson;
    if (lockedPeriod.status !== 'LOCKED' || !resultJson || !lockedExport.exportHash) {
      throw new Error(`Local parity replay for ${month.periodKey} did not reach a verifiable locked export`);
    }
    const result = JSON.parse(resultJson) as { receivedAmount?: unknown };
    const settlementReceivedVnd = Number(result.receivedAmount);
    const componentsMatchExactly =
      Number.isSafeInteger(settlementReceivedVnd) && settlementReceivedVnd === month.componentTotalVnd;
    if (!componentsMatchExactly)
      throw new Error(`Local parity replay for ${month.periodKey} does not match Legacy exactly`);

    months.push({
      sourcePeriodKey: month.periodKey,
      localPeriodKey: periodKey,
      status: 'LOCKED',
      legacy: {
        rawXoayVnd: month.rawXoayVnd,
        dailyBonusVnd: month.dailyBonusVnd,
        cashTipVnd: month.cashTipVnd,
        heldXoayVnd: month.heldXoayVnd,
        componentTotalVnd: month.componentTotalVnd,
      },
      localLedger: {
        rawXoayVnd: month.rawXoayVnd,
        dailyBonusVnd: month.dailyBonusVnd,
        cashTipVnd: month.cashTipVnd,
        heldXoayVnd: month.heldXoayVnd,
        settlementReceivedVnd,
      },
      componentsMatchExactly,
      exportVerified: true,
    });
  }

  return {
    mode: 'LOCAL_LEGACY_PARITY_REPLAY',
    source: 'WINGS_LEGACY_READ_ONLY',
    staff: { displayName: comparison.staff.displayName },
    months,
    safeguards: ['LOCAL_ONLY', 'LEGACY_READ_ONLY', 'NO_PAYOUT'],
  };
}
