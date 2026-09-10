import { createHash } from 'node:crypto';
import type { FalAdjustmentSnapshotInput, HrCustomAdjustmentInput, PayrollAdjustmentLabCase } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import { FalAdjustmentCaseService } from '../modules/payroll-ledger/fal-adjustment-case.service.js';
import { validateHrCustomAdjustment } from '../modules/payroll-ledger/hr-custom-adjustment.service.js';

export const LOCAL_ADJUSTMENT_CASE_EVENT_KEY = 'local-lab:fal-adjustment:001';
export const LOCAL_ELIGIBLE_ADJUSTMENT_CASE_EVENT_KEY = 'local-lab:fal-adjustment:003';
export const LOCAL_HR_CUSTOM_ADJUSTMENT_CASE_EVENT_KEY = 'local-lab:hr-custom:004';
export const LOCAL_SETTLEMENT_SNAPSHOT_CASE_EVENT_KEY = 'local-lab:settlement-snapshot:005';
const SOURCE_PERIOD_KEY = 'LAB-2026-08';
const TARGET_PERIOD_KEY = 'LAB-2026-09';
const ELIGIBLE_SOURCE_PERIOD_KEY = 'LAB-2026-07';
const CALCULATION_VERSION = 'fal-transactional.v1';
const INPUT_HASH = 'local-lab-fal-adjustment-snapshot-v1';
const ELIGIBLE_INPUT_HASH = 'local-lab-fal-adjustment-eligible-snapshot-v1';

type LocalRecipientSnapshot = {
  legacyStaffId: number;
  role: 'CC' | 'CV' | 'STAFF';
  displayName: string;
  avatarUrl: string;
  branchKey: string;
  branchName: string;
};

const LOCAL_RECIPIENTS: Record<'CC' | 'CV' | 'STAFF', LocalRecipientSnapshot> = {
  CC: {
    legacyStaffId: 900_010,
    role: 'CC',
    displayName: 'CC Local An',
    avatarUrl: '/payroll-adjustment-lab/avatars/cc-local.svg',
    branchKey: 'LOCAL-Q1',
    branchName: 'Chi nhánh Local Quận 1',
  },
  CV: {
    legacyStaffId: 900_011,
    role: 'CV',
    displayName: 'CV Local Bình',
    avatarUrl: '/payroll-adjustment-lab/avatars/cv-local.svg',
    branchKey: 'LOCAL-PN',
    branchName: 'Chi nhánh Local Phú Nhuận',
  },
  STAFF: {
    legacyStaffId: 900_012,
    role: 'STAFF',
    displayName: 'Staff Local Cẩm',
    avatarUrl: '/payroll-adjustment-lab/avatars/staff-local.svg',
    branchKey: 'LOCAL-Q7',
    branchName: 'Chi nhánh Local Quận 7',
  },
};

const LOCAL_RECIPIENT_BY_LEGACY_STAFF_ID = new Map(
  Object.values(LOCAL_RECIPIENTS).map((recipient) => [recipient.legacyStaffId, recipient])
);

function getSnapshotInput(): FalAdjustmentSnapshotInput {
  const beforeSettlement = {
    mode: 'SHADOW_READ_ONLY' as const,
    sourcePeriodKey: SOURCE_PERIOD_KEY,
    calculationVersion: CALCULATION_VERSION,
    subjectKey: 'synthetic:cc:001',
    lineCount: 1,
    grossAmount: 2_990,
    capAmount: null,
    receivedAmount: 2_990,
    holdAmount: 0,
  };
  return {
    eventKey: LOCAL_ADJUSTMENT_CASE_EVENT_KEY,
    falRule: 'Adjust',
    financialEligibility: 'READY',
    sourcePeriod: { periodKey: SOURCE_PERIOD_KEY, status: 'LOCKED', calculationVersion: CALCULATION_VERSION },
    targetPeriod: { periodKey: TARGET_PERIOD_KEY, status: 'OPEN' },
    beforeSettlement,
    afterSettlement: { ...beforeSettlement, grossAmount: 2_925, receivedAmount: 2_925 },
  };
}

function getEligibleSnapshotInput(): FalAdjustmentSnapshotInput {
  const beforeSettlement = {
    mode: 'SHADOW_READ_ONLY' as const,
    sourcePeriodKey: ELIGIBLE_SOURCE_PERIOD_KEY,
    calculationVersion: CALCULATION_VERSION,
    subjectKey: 'synthetic:cv:003',
    lineCount: 1,
    grossAmount: 4_500,
    capAmount: null,
    receivedAmount: 4_500,
    holdAmount: 0,
  };
  return {
    eventKey: LOCAL_ELIGIBLE_ADJUSTMENT_CASE_EVENT_KEY,
    falRule: 'Fix',
    financialEligibility: 'READY',
    sourcePeriod: { periodKey: ELIGIBLE_SOURCE_PERIOD_KEY, status: 'LOCKED', calculationVersion: CALCULATION_VERSION },
    targetPeriod: { periodKey: TARGET_PERIOD_KEY, status: 'OPEN' },
    beforeSettlement,
    afterSettlement: { ...beforeSettlement, grossAmount: 4_620, receivedAmount: 4_620 },
  };
}

/** Idempotently prepares only synthetic fixture evidence in the loopback CRM. */
async function ensureScenario(fastify: FastifyInstance) {
  const snapshotInput = getSnapshotInput();
  return fastify.prisma.crm.$transaction(async (tx) => {
    const sourcePeriod = await tx.crmPayrollPeriod.upsert({
      where: { periodKey: SOURCE_PERIOD_KEY },
      update: {
        status: 'LOCKED',
        calculationVersion: CALCULATION_VERSION,
        lockedAt: new Date('2026-09-01T05:00:00.000Z'),
      },
      create: {
        periodKey: SOURCE_PERIOD_KEY,
        label: 'Local Lab nguồn đã khóa',
        startDate: new Date('2026-08-01T00:00:00.000Z'),
        endDate: new Date('2026-08-31T00:00:00.000Z'),
        status: 'LOCKED',
        calculationVersion: CALCULATION_VERSION,
        lockedAt: new Date('2026-09-01T05:00:00.000Z'),
      },
    });
    const targetPeriod = await tx.crmPayrollPeriod.upsert({
      where: { periodKey: TARGET_PERIOD_KEY },
      update: {},
      create: {
        periodKey: TARGET_PERIOD_KEY,
        label: 'Local Lab kỳ nhận đang mở',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T00:00:00.000Z'),
        status: 'OPEN',
        calculationVersion: CALCULATION_VERSION,
      },
    });
    const settlement = await tx.crmPayrollSettlement.upsert({
      where: { payrollPeriodId_version: { payrollPeriodId: sourcePeriod.id, version: 1 } },
      update: {
        status: 'LOCKED',
        calculatorVersion: CALCULATION_VERSION,
        sourceCutoffAt: new Date('2026-09-01T05:00:00.000Z'),
        inputHash: INPUT_HASH,
      },
      create: {
        payrollPeriodId: sourcePeriod.id,
        version: 1,
        status: 'LOCKED',
        calculatorVersion: CALCULATION_VERSION,
        sourceCutoffAt: new Date('2026-09-01T05:00:00.000Z'),
        inputHash: INPUT_HASH,
      },
    });
    await tx.crmPayrollSettlementSubject.upsert({
      where: {
        settlementId_subjectKey: { settlementId: settlement.id, subjectKey: snapshotInput.beforeSettlement.subjectKey },
      },
      update: {},
      create: {
        settlementId: settlement.id,
        subjectKey: snapshotInput.beforeSettlement.subjectKey,
        inputJson: JSON.stringify({ fixture: 'local-only', source: 'synthetic' }),
        resultJson: JSON.stringify(snapshotInput.beforeSettlement),
        inputHash: INPUT_HASH,
      },
    });

    return { sourcePeriod, targetPeriod, snapshotInput };
  });
}

export async function createLocalAdjustmentDraft(fastify: FastifyInstance, actorStaffId: number) {
  const scenario = await ensureScenario(fastify);
  return FalAdjustmentCaseService.createDraft(fastify, actorStaffId, {
    eventKey: LOCAL_ADJUSTMENT_CASE_EVENT_KEY,
    sourceType: 'FAL',
    adjustmentType: 'Adjust',
    originOrderServiceId: 990_001,
    remediationOrderServiceId: 990_002,
    originOccurredAt: new Date('2026-08-18T10:00:00.000Z'),
    sourcePeriodId: scenario.sourcePeriod.id,
    targetPeriodId: scenario.targetPeriod.id,
    sourceFingerprint: INPUT_HASH,
    reason: 'Local-only rehearsal: adjustment từ snapshot đã khóa.',
    snapshotInput: scenario.snapshotInput,
    lines: [
      {
        lineKey: 'synthetic:cc:001:cash',
        recipientLegacyStaffId: LOCAL_RECIPIENTS.CC.legacyStaffId,
        recipientRole: LOCAL_RECIPIENTS.CC.role,
        recipientDisplayName: LOCAL_RECIPIENTS.CC.displayName,
        recipientAvatarUrl: LOCAL_RECIPIENTS.CC.avatarUrl,
        recipientBranchKey: LOCAL_RECIPIENTS.CC.branchKey,
        recipientBranchName: LOCAL_RECIPIENTS.CC.branchName,
        component: 'Cash Bonus',
        beforeAmount: 2_990,
        afterAmount: 2_925,
      },
    ],
  });
}

/**
 * A distinct, eligible event used only to prove that a new event creates its
 * own draft. It never reuses or alters the first approved local case.
 */
export async function createLocalEligibleAdjustmentDraft(fastify: FastifyInstance, actorStaffId: number) {
  const snapshotInput = getEligibleSnapshotInput();
  const scenario = await fastify.prisma.crm.$transaction(async (tx) => {
    const sourcePeriod = await tx.crmPayrollPeriod.upsert({
      where: { periodKey: ELIGIBLE_SOURCE_PERIOD_KEY },
      update: {
        status: 'LOCKED',
        calculationVersion: CALCULATION_VERSION,
        lockedAt: new Date('2026-08-01T05:00:00.000Z'),
      },
      create: {
        periodKey: ELIGIBLE_SOURCE_PERIOD_KEY,
        label: 'Local Lab nguồn đủ điều kiện',
        startDate: new Date('2026-07-01T00:00:00.000Z'),
        endDate: new Date('2026-07-31T00:00:00.000Z'),
        status: 'LOCKED',
        calculationVersion: CALCULATION_VERSION,
        lockedAt: new Date('2026-08-01T05:00:00.000Z'),
      },
    });
    const targetPeriod = await tx.crmPayrollPeriod.upsert({
      where: { periodKey: TARGET_PERIOD_KEY },
      update: {},
      create: {
        periodKey: TARGET_PERIOD_KEY,
        label: 'Local Lab kỳ nhận đang mở',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T00:00:00.000Z'),
        status: 'OPEN',
        calculationVersion: CALCULATION_VERSION,
      },
    });
    const settlement = await tx.crmPayrollSettlement.upsert({
      where: { payrollPeriodId_version: { payrollPeriodId: sourcePeriod.id, version: 1 } },
      update: {
        status: 'LOCKED',
        calculatorVersion: CALCULATION_VERSION,
        sourceCutoffAt: new Date('2026-08-01T05:00:00.000Z'),
        inputHash: ELIGIBLE_INPUT_HASH,
      },
      create: {
        payrollPeriodId: sourcePeriod.id,
        version: 1,
        status: 'LOCKED',
        calculatorVersion: CALCULATION_VERSION,
        sourceCutoffAt: new Date('2026-08-01T05:00:00.000Z'),
        inputHash: ELIGIBLE_INPUT_HASH,
      },
    });
    await tx.crmPayrollSettlementSubject.upsert({
      where: {
        settlementId_subjectKey: { settlementId: settlement.id, subjectKey: snapshotInput.beforeSettlement.subjectKey },
      },
      update: {},
      create: {
        settlementId: settlement.id,
        subjectKey: snapshotInput.beforeSettlement.subjectKey,
        inputJson: JSON.stringify({ fixture: 'local-only', source: 'synthetic', scenario: 'eligible-event' }),
        resultJson: JSON.stringify(snapshotInput.beforeSettlement),
        inputHash: ELIGIBLE_INPUT_HASH,
      },
    });
    return { sourcePeriod, targetPeriod };
  });

  return FalAdjustmentCaseService.createDraft(fastify, actorStaffId, {
    eventKey: LOCAL_ELIGIBLE_ADJUSTMENT_CASE_EVENT_KEY,
    sourceType: 'FAL',
    adjustmentType: 'Fix',
    originOrderServiceId: 990_003,
    remediationOrderServiceId: 990_004,
    originOccurredAt: new Date('2026-07-21T10:00:00.000Z'),
    sourcePeriodId: scenario.sourcePeriod.id,
    targetPeriodId: scenario.targetPeriod.id,
    sourceFingerprint: ELIGIBLE_INPUT_HASH,
    reason: 'Local-only rehearsal: event mới đủ điều kiện tạo draft riêng.',
    snapshotInput,
    lines: [
      {
        lineKey: 'synthetic:cv:003:cash',
        recipientLegacyStaffId: LOCAL_RECIPIENTS.CV.legacyStaffId,
        recipientRole: LOCAL_RECIPIENTS.CV.role,
        recipientDisplayName: LOCAL_RECIPIENTS.CV.displayName,
        recipientAvatarUrl: LOCAL_RECIPIENTS.CV.avatarUrl,
        recipientBranchKey: LOCAL_RECIPIENTS.CV.branchKey,
        recipientBranchName: LOCAL_RECIPIENTS.CV.branchName,
        component: 'Cash Bonus',
        beforeAmount: 4_500,
        afterAmount: 4_620,
      },
    ],
  });
}

/** A local-only Fix rehearsal derived from the actual locked settlement fixture. */
export async function createLocalSettlementSnapshotDraft(fastify: FastifyInstance, actorStaffId: number) {
  const sourcePeriod = await fastify.prisma.crm.crmPayrollPeriod.findUniqueOrThrow({
    where: { periodKey: 'LAB-2026-11-REVIEW' },
  });
  if (sourcePeriod.status !== 'LOCKED')
    throw new Error('The local settlement source must be locked before an adjustment draft');
  const settlement = await fastify.prisma.crm.crmPayrollSettlement.findUniqueOrThrow({
    where: { payrollPeriodId_version: { payrollPeriodId: sourcePeriod.id, version: 1 } },
  });
  const subject = await fastify.prisma.crm.crmPayrollSettlementSubject.findUniqueOrThrow({
    where: { settlementId_subjectKey: { settlementId: settlement.id, subjectKey: 'local:cc:an' } },
  });
  const beforeSettlement = JSON.parse(subject.resultJson) as FalAdjustmentSnapshotInput['beforeSettlement'];
  const afterSettlement = { ...beforeSettlement, grossAmount: 2_925, receivedAmount: 2_925, holdAmount: 0 };
  const targetPeriod = await fastify.prisma.crm.crmPayrollPeriod.upsert({
    where: { periodKey: 'LAB-2026-12-OPEN' },
    update: {},
    create: {
      periodKey: 'LAB-2026-12-OPEN',
      label: 'Local Lab kỳ nhận mở',
      startDate: new Date('2026-12-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T23:59:59.999Z'),
      timezone: 'Asia/Ho_Chi_Minh',
      status: 'OPEN',
      calculationVersion: sourcePeriod.calculationVersion,
    },
  });
  const snapshotInput: FalAdjustmentSnapshotInput = {
    eventKey: LOCAL_SETTLEMENT_SNAPSHOT_CASE_EVENT_KEY,
    falRule: 'Fix',
    financialEligibility: 'READY',
    sourcePeriod: {
      periodKey: sourcePeriod.periodKey,
      status: 'LOCKED',
      calculationVersion: sourcePeriod.calculationVersion,
    },
    targetPeriod: { periodKey: targetPeriod.periodKey, status: 'OPEN' },
    beforeSettlement,
    afterSettlement,
  };
  return FalAdjustmentCaseService.createDraft(fastify, actorStaffId, {
    eventKey: LOCAL_SETTLEMENT_SNAPSHOT_CASE_EVENT_KEY,
    sourceType: 'FAL',
    adjustmentType: 'Fix',
    originOrderServiceId: 990_005,
    remediationOrderServiceId: 990_006,
    originOccurredAt: new Date('2026-11-10T09:00:00.000Z'),
    sourcePeriodId: sourcePeriod.id,
    targetPeriodId: targetPeriod.id,
    sourceFingerprint: subject.inputHash,
    reason: 'Local-only rehearsal: Fix tạo từ snapshot settlement đã LOCKED.',
    snapshotInput,
    lines: [
      {
        lineKey: 'local:cc:an:settlement-fix',
        recipientLegacyStaffId: LOCAL_RECIPIENTS.CC.legacyStaffId,
        recipientRole: 'CC',
        recipientDisplayName: LOCAL_RECIPIENTS.CC.displayName,
        recipientAvatarUrl: LOCAL_RECIPIENTS.CC.avatarUrl,
        recipientBranchKey: LOCAL_RECIPIENTS.CC.branchKey,
        recipientBranchName: LOCAL_RECIPIENTS.CC.branchName,
        component: 'CC Xoay',
        beforeAmount: 3_000,
        afterAmount: 2_925,
      },
    ],
  });
}

/**
 * HR Custom deliberately has no historical settlement reference. Its own
 * immutable reference is the reviewed VND amount, comment, creator, approver
 * and open target period stored together in this local-only case.
 */
export async function createLocalHrCustomAdjustmentDraft(
  fastify: FastifyInstance,
  actorStaffId: number,
  input: HrCustomAdjustmentInput
) {
  const custom = validateHrCustomAdjustment(input);
  const inputHash = createHash('sha256').update(JSON.stringify(custom)).digest('hex');

  return fastify.prisma.crm.$transaction(async (tx) => {
    const targetPeriod = await tx.crmPayrollPeriod.upsert({
      where: { periodKey: custom.targetPeriodKey },
      update: {},
      create: {
        periodKey: custom.targetPeriodKey,
        label: 'Local Lab kỳ nhận đang mở',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T00:00:00.000Z'),
        status: 'OPEN',
        calculationVersion: 'hr-custom.v1',
      },
    });
    if (targetPeriod.status !== 'OPEN') throw new Error('The local HR Custom target period is not open');

    const existing = await tx.crmPayrollAdjustmentCase.findUnique({
      where: { eventKey: LOCAL_HR_CUSTOM_ADJUSTMENT_CASE_EVENT_KEY },
    });
    if (existing) return { adjustmentCase: existing, idempotent: true };

    const adjustmentCase = await tx.crmPayrollAdjustmentCase.create({
      data: {
        eventKey: LOCAL_HR_CUSTOM_ADJUSTMENT_CASE_EVENT_KEY,
        sourceType: custom.sourceType,
        adjustmentType: custom.adjustmentType,
        targetPeriodId: targetPeriod.id,
        status: 'READY_FOR_APPROVAL',
        reason: custom.comment,
        sourceFingerprint: inputHash,
        calculatorVersion: 'hr-custom.v1',
        settlementVersion: 0,
        requestedByStaffId: actorStaffId,
      },
    });
    const snapshot = await tx.crmPayrollAdjustmentSnapshot.create({
      data: {
        caseId: adjustmentCase.id,
        revision: 1,
        inputJson: JSON.stringify(custom),
        sourceLedgerJson: JSON.stringify({ referenceType: 'HR_CUSTOM', comment: custom.comment }),
        shadowSettlementJson: JSON.stringify({
          status: 'READY_FOR_APPROVAL',
          effect: 'CURRENT_PAYROLL_ADJUSTMENT',
          sourceType: custom.sourceType,
          adjustmentType: custom.adjustmentType,
          amount: custom.amount,
        }),
        beforeNetAmount: 0,
        afterNetAmount: custom.amount,
        netDelta: custom.amount,
        inputHash,
        computedByStaffId: actorStaffId,
      },
    });
    await tx.crmPayrollAdjustmentLine.create({
      data: {
        caseId: adjustmentCase.id,
        snapshotId: snapshot.id,
        lineKey: 'synthetic:hr:004:custom',
        recipientLegacyStaffId: 900_012,
        recipientRole: 'STAFF',
        recipientDisplayName: LOCAL_RECIPIENTS.STAFF.displayName,
        recipientAvatarUrl: LOCAL_RECIPIENTS.STAFF.avatarUrl,
        recipientBranchKey: LOCAL_RECIPIENTS.STAFF.branchKey,
        recipientBranchName: LOCAL_RECIPIENTS.STAFF.branchName,
        component: 'HR Custom Adjustment',
        beforeAmount: 0,
        afterAmount: custom.amount,
        deltaAmount: custom.amount,
        effect: 'CURRENT_PAYROLL_ADJUSTMENT',
      },
    });
    await tx.crmPayrollAdjustmentAudit.create({
      data: {
        caseId: adjustmentCase.id,
        action: 'DRAFT_CREATED',
        actorStaffId,
        reason: custom.comment,
        afterJson: JSON.stringify({
          snapshotId: snapshot.id,
          netDelta: custom.amount,
          effect: 'CURRENT_PAYROLL_ADJUSTMENT',
        }),
        correlationKey: LOCAL_HR_CUSTOM_ADJUSTMENT_CASE_EVENT_KEY,
      },
    });
    return { adjustmentCase, idempotent: false };
  });
}

export async function getLocalAdjustmentCase(fastify: FastifyInstance) {
  return getLocalAdjustmentCaseByEventKey(fastify, LOCAL_ADJUSTMENT_CASE_EVENT_KEY);
}

export async function getLocalEligibleAdjustmentCase(fastify: FastifyInstance) {
  return getLocalAdjustmentCaseByEventKey(fastify, LOCAL_ELIGIBLE_ADJUSTMENT_CASE_EVENT_KEY);
}

export async function getLocalHrCustomAdjustmentCase(fastify: FastifyInstance) {
  return getLocalAdjustmentCaseByEventKey(fastify, LOCAL_HR_CUSTOM_ADJUSTMENT_CASE_EVENT_KEY);
}

export async function getLocalSettlementSnapshotCase(fastify: FastifyInstance) {
  return getLocalAdjustmentCaseByEventKey(fastify, LOCAL_SETTLEMENT_SNAPSHOT_CASE_EVENT_KEY);
}

async function getLocalAdjustmentCaseByEventKey(
  fastify: FastifyInstance,
  eventKey: string
): Promise<PayrollAdjustmentLabCase | null> {
  const adjustmentCase = await fastify.prisma.crm.crmPayrollAdjustmentCase.findUnique({
    where: { eventKey },
    include: {
      sourcePeriod: true,
      targetPeriod: true,
      snapshots: { orderBy: { revision: 'asc' } },
      lines: { orderBy: { id: 'asc' } },
      auditLogs: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!adjustmentCase) return null;

  const actorIds = Array.from(
    new Set(
      [
        adjustmentCase.requestedByStaffId,
        adjustmentCase.approvedByStaffId,
        ...adjustmentCase.auditLogs.map((log) => log.actorStaffId),
      ].filter((id): id is number => id !== null)
    )
  );
  const actors = await fastify.prisma.crm.crmStaff.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, displayName: true },
  });
  const nameById = new Map(actors.map((actor) => [actor.id, actor.displayName]));
  const snapshot = adjustmentCase.snapshots[0] || null;

  return {
    reference: adjustmentCase.eventKey,
    sourceType: adjustmentCase.sourceType,
    adjustmentType: adjustmentCase.adjustmentType,
    status: adjustmentCase.status,
    reason: adjustmentCase.reason,
    requestedBy: adjustmentCase.requestedByStaffId
      ? nameById.get(adjustmentCase.requestedByStaffId) || 'Unknown'
      : null,
    approvedBy: adjustmentCase.approvedByStaffId ? nameById.get(adjustmentCase.approvedByStaffId) || 'Unknown' : null,
    beforeAmount: snapshot?.beforeNetAmount ?? null,
    afterAmount: snapshot?.afterNetAmount ?? null,
    deltaAmount: snapshot?.netDelta ?? null,
    sourcePeriod: adjustmentCase.sourcePeriod
      ? {
          periodKey: adjustmentCase.sourcePeriod.periodKey,
          label: adjustmentCase.sourcePeriod.label,
          status: adjustmentCase.sourcePeriod.status,
          startDate: adjustmentCase.sourcePeriod.startDate.toISOString(),
          endDate: adjustmentCase.sourcePeriod.endDate.toISOString(),
        }
      : null,
    targetPeriod: {
      periodKey: adjustmentCase.targetPeriod.periodKey,
      label: adjustmentCase.targetPeriod.label,
      status: adjustmentCase.targetPeriod.status,
      startDate: adjustmentCase.targetPeriod.startDate.toISOString(),
      endDate: adjustmentCase.targetPeriod.endDate.toISOString(),
    },
    lines: adjustmentCase.lines.map((line) => {
      const fallback = LOCAL_RECIPIENT_BY_LEGACY_STAFF_ID.get(line.recipientLegacyStaffId);
      const isStoredSnapshot = Boolean(
        line.recipientDisplayName && line.recipientAvatarUrl && line.recipientBranchKey && line.recipientBranchName
      );
      const snapshotState: PayrollAdjustmentLabCase['lines'][number]['recipient']['snapshotState'] = isStoredSnapshot
        ? 'STORED'
        : fallback
          ? 'LOCAL_FIXTURE'
          : 'MISSING';
      return {
        component: line.component,
        deltaAmount: line.deltaAmount,
        postingState: line.postingState,
        recipient: {
          legacyStaffId: line.recipientLegacyStaffId,
          displayName: line.recipientDisplayName || fallback?.displayName || 'Không có snapshot người nhận',
          role: line.recipientRole,
          avatarUrl: line.recipientAvatarUrl || fallback?.avatarUrl || '',
          branchKey: line.recipientBranchKey || fallback?.branchKey || '',
          branchName: line.recipientBranchName || fallback?.branchName || 'Chưa có chi nhánh snapshot',
          snapshotState,
        },
      };
    }),
    audit: adjustmentCase.auditLogs.map((log) => ({
      action: log.action,
      actorName: log.actorStaffId ? nameById.get(log.actorStaffId) || 'Unknown' : 'System',
      reason: log.reason,
      occurredAt: log.createdAt.toISOString(),
    })),
  };
}
