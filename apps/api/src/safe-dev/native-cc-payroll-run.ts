import type { NativeCcPayrollLocalRunResponse } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import { CcNativeEvidenceService } from '../modules/payroll-ledger/cc-native-evidence.service.js';
import { LockedSettlementExportService } from '../modules/payroll-ledger/locked-settlement-export.service.js';
import { PayrollSettlementBuilderService } from '../modules/payroll-ledger/payroll-settlement-builder.service.js';
import { PayrollSettlementClosingService } from '../modules/payroll-ledger/payroll-settlement-closing.service.js';

const PERIOD_KEY = 'LAB-2026-12-NCC';
const SUBJECT_KEY = 'local:cc:linh';
const CAP_PERIOD_KEY = 'LAB-2026-12-HOLD';
const CAP_SUBJECT_KEY = 'local:cc:cap';
const SETTLEMENT_VERSION = 1;

const DAILY_POLICY = {
  policyVersion: 'cc-daily-sales.v1',
  tiers: [
    { minimumQualifyingSalesVnd: 0, rateBasisPoints: 50 },
    { minimumQualifyingSalesVnd: 5_000_000, rateBasisPoints: 100 },
    { minimumQualifyingSalesVnd: 10_000_000, rateBasisPoints: 150 },
    { minimumQualifyingSalesVnd: 15_000_000, rateBasisPoints: 200 },
    { minimumQualifyingSalesVnd: 20_000_000, rateBasisPoints: 250 },
  ],
} as const;

/**
 * One repeatable local-only operational rehearsal.  The fixture deliberately
 * contains a split 32.5-dong service, so exact half-dong handling is visible
 * in the resulting locked settlement without invoking a real order, tip or
 * payroll system.
 */
export async function getLocalNativeCcPayrollRun(fastify: FastifyInstance): Promise<NativeCcPayrollLocalRunResponse> {
  const period = await fastify.prisma.crm.crmPayrollPeriod.upsert({
    where: { periodKey: PERIOD_KEY },
    update: {},
    create: {
      periodKey: PERIOD_KEY,
      label: 'Local Lab · CC native December',
      startDate: new Date('2026-12-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.999Z'),
      timezone: 'Asia/Ho_Chi_Minh',
      status: 'OPEN',
      calculationVersion: 'cc-native-payroll.v1',
    },
  });

  if (period.status === 'OPEN') {
    const existingEvidence = await fastify.prisma.crm.crmPayrollCcEvidence.count({
      where: { payrollPeriodId: period.id, subjectKey: SUBJECT_KEY },
    });
    if (!existingEvidence) {
      await fastify.prisma.crm.$transaction(async (tx) => {
        const sourceOccurredAt = '2026-12-15T09:00:00.000Z';
        await CcNativeEvidenceService.record(tx, null, {
          evidenceKey: 'mos:cc-evidence:2026-12:linh:service-001',
          payrollPeriodId: period.id,
          subjectKey: SUBJECT_KEY,
          sourceReference: 'mos:completed-service:local-001',
          sourceOccurredAt,
          payload: { kind: 'COMPLETED_SERVICE', previousPoints: 0, shareCount: 2 },
        });
        await CcNativeEvidenceService.record(tx, null, {
          evidenceKey: 'mos:cc-evidence:2026-12:linh:daily-close-001',
          payrollPeriodId: period.id,
          subjectKey: SUBJECT_KEY,
          sourceReference: 'mos:daily-close:local-2026-12-15',
          sourceOccurredAt: '2026-12-15T20:00:00.000Z',
          payload: { kind: 'DAILY_SALES_CLOSE', qualifyingSalesVnd: 20_000_000, policy: DAILY_POLICY },
        });
        await CcNativeEvidenceService.record(tx, null, {
          evidenceKey: 'mos:cc-evidence:2026-12:linh:cash-tip-001',
          payrollPeriodId: period.id,
          subjectKey: SUBJECT_KEY,
          sourceReference: 'mos:cash-tip:local-001:linh',
          sourceOccurredAt: '2026-12-15T20:01:00.000Z',
          payload: { kind: 'CASH_TIP', cashTipPoolVnd: 325, ccVisitRole: 'BOTH_ENDS' },
        });
      });
    }

    const finalized = await fastify.prisma.crm.crmPayrollLedgerEvent.findFirst({
      where: { payrollPeriodId: period.id, subjectKey: SUBJECT_KEY, component: 'CC_POLICY_FINALIZED' },
      select: { id: true },
    });
    if (!finalized) {
      await fastify.prisma.crm.$transaction((tx) =>
        CcNativeEvidenceService.finalizeSubject(tx, {
          payrollPeriodId: period.id,
          periodKey: PERIOD_KEY,
          subjectKey: SUBJECT_KEY,
        })
      );
    }
    await fastify.prisma.crm.crmPayrollPeriod.update({
      where: { id: period.id },
      data: { status: 'REVIEWING' },
    });
  }

  const reviewingPeriod = await fastify.prisma.crm.crmPayrollPeriod.findUniqueOrThrow({
    where: { periodKey: PERIOD_KEY },
    include: { settlements: { where: { version: SETTLEMENT_VERSION }, take: 1 } },
  });
  if (!reviewingPeriod.settlements.length && reviewingPeriod.status === 'REVIEWING') {
    await PayrollSettlementBuilderService.createReviewFromEvents(fastify, null, {
      periodKey: PERIOD_KEY,
      settlementVersion: SETTLEMENT_VERSION,
      policies: [
        {
          subjectKey: SUBJECT_KEY,
          capAmountHalfDong: null,
          policyVersion: 'cc-native-payroll.v1',
          policyReference: 'CC-003,PAY-001',
          policyHash: 'local-native-cc-policy.v1',
        },
      ],
    });
  }

  const beforeLock = await fastify.prisma.crm.crmPayrollPeriod.findUniqueOrThrow({ where: { periodKey: PERIOD_KEY } });
  if (beforeLock.status === 'REVIEWING') {
    await PayrollSettlementClosingService.lockReview(fastify, null, PERIOD_KEY, SETTLEMENT_VERSION);
  }

  const [lockedPeriod, evidence, ledger, lockedExport] = await Promise.all([
    fastify.prisma.crm.crmPayrollPeriod.findUniqueOrThrow({
      where: { periodKey: PERIOD_KEY },
      include: {
        settlements: {
          where: { version: SETTLEMENT_VERSION },
          include: { subjects: { where: { subjectKey: SUBJECT_KEY }, take: 1 } },
        },
      },
    }),
    fastify.prisma.crm.crmPayrollCcEvidence.findMany({
      where: { payrollPeriod: { periodKey: PERIOD_KEY }, subjectKey: SUBJECT_KEY },
      orderBy: [{ sourceOccurredAt: 'asc' }, { evidenceKey: 'asc' }],
    }),
    fastify.prisma.crm.crmPayrollLedgerEvent.findMany({
      where: { payrollPeriod: { periodKey: PERIOD_KEY }, subjectKey: SUBJECT_KEY },
      orderBy: [{ sourceOccurredAt: 'asc' }, { eventKey: 'asc' }],
    }),
    LockedSettlementExportService.exportLockedPeriod(fastify, PERIOD_KEY),
  ]);
  const settlement = lockedPeriod.settlements[0];
  const subject = settlement?.subjects[0];
  if (lockedPeriod.status !== 'LOCKED' || !settlement || settlement.status !== 'LOCKED' || !subject) {
    throw new Error('The local native CC payroll rehearsal did not reach a verifiable locked settlement');
  }
  if (!lockedExport.exportHash) throw new Error('The local native CC payroll rehearsal export could not be verified');
  const result = JSON.parse(subject.resultJson) as { grossAmount: number; receivedAmount: number; holdAmount: number };

  // A second, isolated month makes the ledger transformation visible: 260đ
  // of raw Xoay is reduced to the 150đ cap derived from a 100đ Daily Bonus.
  const capPeriod = await fastify.prisma.crm.crmPayrollPeriod.upsert({
    where: { periodKey: CAP_PERIOD_KEY },
    update: {},
    create: {
      periodKey: CAP_PERIOD_KEY,
      label: 'Local Lab · CC cap hold December',
      startDate: new Date('2026-12-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.999Z'),
      timezone: 'Asia/Ho_Chi_Minh',
      status: 'OPEN',
      calculationVersion: 'cc-native-payroll.v1',
    },
  });
  if (capPeriod.status === 'OPEN') {
    const capEvidenceCount = await fastify.prisma.crm.crmPayrollCcEvidence.count({
      where: { payrollPeriodId: capPeriod.id, subjectKey: CAP_SUBJECT_KEY },
    });
    if (!capEvidenceCount) {
      await fastify.prisma.crm.$transaction(async (tx) => {
        await CcNativeEvidenceService.record(tx, null, {
          evidenceKey: 'mos:cc-evidence:2026-12:cap:service-001',
          payrollPeriodId: capPeriod.id,
          subjectKey: CAP_SUBJECT_KEY,
          sourceReference: 'mos:completed-service:local-cap-001',
          sourceOccurredAt: '2026-12-16T09:00:00.000Z',
          payload: { kind: 'COMPLETED_SERVICE', previousPoints: 300, shareCount: 1 },
        });
        await CcNativeEvidenceService.record(tx, null, {
          evidenceKey: 'mos:cc-evidence:2026-12:cap:daily-close-001',
          payrollPeriodId: capPeriod.id,
          subjectKey: CAP_SUBJECT_KEY,
          sourceReference: 'mos:daily-close:local-cap-2026-12-16',
          sourceOccurredAt: '2026-12-16T20:00:00.000Z',
          payload: { kind: 'DAILY_SALES_CLOSE', qualifyingSalesVnd: 20_000, policy: DAILY_POLICY },
        });
      });
    }
    const capFinalized = await fastify.prisma.crm.crmPayrollLedgerEvent.findFirst({
      where: { payrollPeriodId: capPeriod.id, subjectKey: CAP_SUBJECT_KEY, component: 'CC_POLICY_FINALIZED' },
      select: { id: true },
    });
    if (!capFinalized) {
      await fastify.prisma.crm.$transaction((tx) =>
        CcNativeEvidenceService.finalizeSubject(tx, {
          payrollPeriodId: capPeriod.id,
          periodKey: CAP_PERIOD_KEY,
          subjectKey: CAP_SUBJECT_KEY,
        })
      );
    }
    await fastify.prisma.crm.crmPayrollPeriod.update({ where: { id: capPeriod.id }, data: { status: 'REVIEWING' } });
  }
  const capReviewPeriod = await fastify.prisma.crm.crmPayrollPeriod.findUniqueOrThrow({
    where: { periodKey: CAP_PERIOD_KEY },
    include: { settlements: { where: { version: SETTLEMENT_VERSION }, take: 1 } },
  });
  if (!capReviewPeriod.settlements.length && capReviewPeriod.status === 'REVIEWING') {
    await PayrollSettlementBuilderService.createReviewFromEvents(fastify, null, {
      periodKey: CAP_PERIOD_KEY,
      settlementVersion: SETTLEMENT_VERSION,
      policies: [
        {
          subjectKey: CAP_SUBJECT_KEY,
          capAmountHalfDong: null,
          policyVersion: 'cc-native-payroll.v1',
          policyReference: 'CC-003,PAY-001',
          policyHash: 'local-native-cc-cap-policy.v1',
        },
      ],
    });
  }
  const beforeCapLock = await fastify.prisma.crm.crmPayrollPeriod.findUniqueOrThrow({
    where: { periodKey: CAP_PERIOD_KEY },
  });
  if (beforeCapLock.status === 'REVIEWING') {
    await PayrollSettlementClosingService.lockReview(fastify, null, CAP_PERIOD_KEY, SETTLEMENT_VERSION);
  }
  const [capEvidence, capLedger, capSettlement] = await Promise.all([
    fastify.prisma.crm.crmPayrollCcEvidence.findMany({
      where: { payrollPeriod: { periodKey: CAP_PERIOD_KEY }, subjectKey: CAP_SUBJECT_KEY },
    }),
    fastify.prisma.crm.crmPayrollLedgerEvent.findMany({
      where: { payrollPeriod: { periodKey: CAP_PERIOD_KEY }, subjectKey: CAP_SUBJECT_KEY },
    }),
    fastify.prisma.crm.crmPayrollSettlement.findFirstOrThrow({
      where: { payrollPeriod: { periodKey: CAP_PERIOD_KEY }, version: SETTLEMENT_VERSION, status: 'LOCKED' },
      include: { subjects: { where: { subjectKey: CAP_SUBJECT_KEY }, take: 1 } },
    }),
  ]);
  const capSubject = capSettlement.subjects[0];
  if (!capSubject) throw new Error('The local CC cap rehearsal has no locked subject result');
  const capResult = JSON.parse(capSubject.resultJson) as { receivedAmount: number };
  const capHoldHalfDong = capLedger
    .filter((event) => event.component === 'CC_XOAY_CAP_HOLD')
    .reduce((total, event) => total + event.amountHalfDong, 0);
  const dailyBonusHalfDong = capEvidence
    .filter((evidence) => evidence.component === 'CC_DAILY_BONUS')
    .reduce((total, evidence) => total + evidence.amountHalfDong, 0);
  const rawXoayHalfDong = capEvidence
    .filter((evidence) => evidence.component === 'CC_XOAY_CASH')
    .reduce((total, evidence) => total + evidence.amountHalfDong, 0);

  return {
    mode: 'LOCAL_ONLY',
    period: { periodKey: PERIOD_KEY, label: lockedPeriod.label, status: 'LOCKED', version: settlement.version },
    evidence: evidence.map((row) => ({
      kind: row.evidenceKind as NativeCcPayrollLocalRunResponse['evidence'][number]['kind'],
      component: row.component,
      amountHalfDong: row.amountHalfDong,
      sourceReference: row.sourceReference,
      policyVersion: row.policyVersion,
    })),
    ledger: ledger.map((row) => ({
      component: row.component,
      amountHalfDong: row.amountHalfDong,
      sourceReference: row.sourceReference,
    })),
    settlement: {
      subjectKey: SUBJECT_KEY,
      grossAmount: result.grossAmount,
      receivedAmount: result.receivedAmount,
      holdAmount: result.holdAmount,
      exportVerified: true,
    },
    safeguards: ['MOS_ONLY_EVIDENCE', 'HALF_DONG_EXACT', 'NO_PAYOUT'],
    normalExample: {
      subjectLabel: 'CC Linh · case kiểm chính xác nửa đồng',
      explanation:
        'Một dịch vụ bậc 1 là 65đ được hai CC chia đều, nên CC Linh nhận 32.5đ. Case này chỉ chứng minh độ chính xác nửa đồng; không phải case cap.',
    },
    capExample: {
      periodKey: CAP_PERIOD_KEY,
      subjectLabel: 'CC Cap · case minh họa cap tháng',
      explanation:
        'Đây là một run local riêng cho CC khác để nhìn rõ ledger tạo HOLD. Trong vận hành thật, mọi CC cùng tháng vẫn nằm trong một settlement của tháng đó.',
      rawXoayExplanation: 'CC này tự nhận ca ở bậc 4: 4 × 65đ, không chia ca, nên CC Xoay Cash gốc là 260đ.',
      evidence: capEvidence.map((row) => ({
        component: row.component,
        amountHalfDong: row.amountHalfDong,
        sourceReference: row.sourceReference,
      })),
      ledger: capLedger.map((row) => ({
        component: row.component,
        amountHalfDong: row.amountHalfDong,
        sourceReference: row.sourceReference,
      })),
      evidenceTotalHalfDong: capEvidence.reduce((total, item) => total + item.amountHalfDong, 0),
      ledgerTotalHalfDong: capLedger.reduce((total, item) => total + item.amountHalfDong, 0),
      dailyBonusHalfDong,
      rawXoayHalfDong,
      xoayCapHalfDong: (dailyBonusHalfDong * 3) / 2,
      capHoldHalfDong,
      settlementReceivedAmount: capResult.receivedAmount,
    },
  };
}
