import type { FalAdjustmentSnapshotInput, PayrollAdjustmentSourceType } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import { calculateFalAdjustmentShadow } from './fal-adjustment-shadow.service.js';
import { requirePayrollAdjustmentApprover } from './payroll-adjustment-approver.service.js';

export type FalAdjustmentDraftLine = {
  lineKey: string;
  recipientLegacyStaffId: number;
  recipientRole: 'CC' | 'CV' | 'STAFF';
  recipientDisplayName: string;
  recipientAvatarUrl: string;
  recipientBranchKey: string;
  recipientBranchName: string;
  component: string;
  beforeAmount: number;
  afterAmount: number;
};

export type FalAdjustmentDraftRequest = {
  eventKey: string;
  sourceType: PayrollAdjustmentSourceType;
  adjustmentType: string;
  originOrderServiceId: number;
  remediationOrderServiceId: number;
  originOccurredAt: Date;
  sourcePeriodId: number;
  targetPeriodId: number;
  sourceFingerprint: string;
  reason?: string | null;
  snapshotInput: FalAdjustmentSnapshotInput;
  lines: readonly FalAdjustmentDraftLine[];
};

function assertDraftLines(lines: readonly FalAdjustmentDraftLine[], expectedDelta: number) {
  if (!lines.length) throw new Error('At least one adjustment line is required for review');
  if (new Set(lines.map((line) => line.lineKey)).size !== lines.length) {
    throw new Error('Adjustment line keys must be unique within one snapshot');
  }
  if (
    lines.some(
      (line) =>
        !line.recipientDisplayName.trim() ||
        !line.recipientAvatarUrl.trim() ||
        !line.recipientBranchKey.trim() ||
        !line.recipientBranchName.trim()
    )
  ) {
    throw new Error('Every adjustment line requires an immutable recipient identity and branch snapshot');
  }
  const actualDelta = lines.reduce((total, line) => total + line.afterAmount - line.beforeAmount, 0);
  if (actualDelta !== expectedDelta) {
    throw new Error('Adjustment lines do not reconcile to the shadow settlement delta');
  }
}

/**
 * Creates the review-only audit trail in a single CRM transaction. It never
 * reads mutable Legacy state and deliberately has no payroll posting method.
 */
export class FalAdjustmentCaseService {
  static async createDraft(fastify: FastifyInstance, actorStaffId: number, request: FalAdjustmentDraftRequest) {
    const shadow = calculateFalAdjustmentShadow(request.snapshotInput);
    if (shadow.status !== 'READY_FOR_APPROVAL' || shadow.netDelta == null) {
      throw new Error(shadow.reason || 'The FAL adjustment is not ready for financial review');
    }
    const beforeNetAmount = shadow.beforeNetAmount!;
    const afterNetAmount = shadow.afterNetAmount!;
    const netDelta = shadow.netDelta;
    assertDraftLines(request.lines, netDelta);

    return fastify.prisma.crm.$transaction(async (tx) => {
      const [sourcePeriod, targetPeriod] = await Promise.all([
        tx.crmPayrollPeriod.findUnique({ where: { id: request.sourcePeriodId } }),
        tx.crmPayrollPeriod.findUnique({ where: { id: request.targetPeriodId } }),
      ]);
      if (!sourcePeriod || !targetPeriod) throw new Error('Both source and target payroll periods are required');
      if (
        sourcePeriod.periodKey !== request.snapshotInput.sourcePeriod.periodKey ||
        sourcePeriod.status !== 'LOCKED' ||
        sourcePeriod.calculationVersion !== request.snapshotInput.sourcePeriod.calculationVersion
      ) {
        throw new Error('The supplied source snapshot is not bound to the locked source period');
      }
      if (targetPeriod.periodKey !== request.snapshotInput.targetPeriod.periodKey || targetPeriod.status !== 'OPEN') {
        throw new Error('The target payroll period is not open for a future adjustment');
      }

      const settlement = await tx.crmPayrollSettlement.findUnique({
        where: { payrollPeriodId_version: { payrollPeriodId: sourcePeriod.id, version: 1 } },
      });
      if (!settlement) {
        throw new Error('The source settlement version is missing');
      }
      const subject = await tx.crmPayrollSettlementSubject.findUnique({
        where: {
          settlementId_subjectKey: {
            settlementId: settlement.id,
            subjectKey: request.snapshotInput.beforeSettlement.subjectKey,
          },
        },
      });
      if (!subject) {
        throw new Error('The locked source settlement subject snapshot is missing');
      }
      if (
        subject.inputHash !== settlement.inputHash ||
        subject.resultJson !== JSON.stringify(request.snapshotInput.beforeSettlement)
      ) {
        throw new Error('The supplied before-settlement does not match the immutable source snapshot');
      }

      const existing = await tx.crmPayrollAdjustmentCase.findUnique({ where: { eventKey: request.eventKey } });
      if (existing) return { adjustmentCase: existing, idempotent: true };

      const adjustmentCase = await tx.crmPayrollAdjustmentCase.create({
        data: {
          eventKey: request.eventKey,
          sourceType: request.sourceType,
          adjustmentType: request.adjustmentType,
          originOrderServiceId: request.originOrderServiceId,
          remediationOrderServiceId: request.remediationOrderServiceId,
          originOccurredAt: request.originOccurredAt,
          sourcePeriodId: sourcePeriod.id,
          targetPeriodId: targetPeriod.id,
          sourcePeriodStatus: sourcePeriod.status,
          status: shadow.status,
          reason: request.reason?.trim() || null,
          sourceFingerprint: request.sourceFingerprint,
          calculatorVersion: sourcePeriod.calculationVersion,
          settlementVersion: settlement.version,
          requestedByStaffId: actorStaffId,
        },
      });
      const snapshot = await tx.crmPayrollAdjustmentSnapshot.create({
        data: {
          caseId: adjustmentCase.id,
          revision: 1,
          inputJson: JSON.stringify(request.snapshotInput),
          sourceLedgerJson: subject.inputJson,
          shadowSettlementJson: JSON.stringify(shadow),
          beforeNetAmount,
          afterNetAmount,
          netDelta,
          inputHash: subject.inputHash,
          computedByStaffId: actorStaffId,
        },
      });
      await tx.crmPayrollAdjustmentLine.createMany({
        data: request.lines.map((line) => ({
          caseId: adjustmentCase.id,
          snapshotId: snapshot.id,
          lineKey: line.lineKey,
          recipientLegacyStaffId: line.recipientLegacyStaffId,
          recipientRole: line.recipientRole,
          recipientDisplayName: line.recipientDisplayName.trim(),
          recipientAvatarUrl: line.recipientAvatarUrl.trim(),
          recipientBranchKey: line.recipientBranchKey.trim(),
          recipientBranchName: line.recipientBranchName.trim(),
          component: line.component,
          beforeAmount: line.beforeAmount,
          afterAmount: line.afterAmount,
          deltaAmount: line.afterAmount - line.beforeAmount,
          effect: shadow.effect,
        })),
      });
      await tx.crmPayrollAdjustmentAudit.create({
        data: {
          caseId: adjustmentCase.id,
          action: 'DRAFT_CREATED',
          actorStaffId,
          reason: request.reason?.trim() || null,
          afterJson: JSON.stringify({ snapshotId: snapshot.id, netDelta, effect: shadow.effect }),
          correlationKey: request.eventKey,
        },
      });
      return { adjustmentCase, idempotent: false };
    });
  }

  static async decide(
    fastify: FastifyInstance,
    actorStaffId: number,
    caseId: number,
    decision: 'APPROVE' | 'REJECT',
    reason?: string | null
  ) {
    return fastify.prisma.crm.$transaction(async (tx) => {
      const adjustmentCase = await tx.crmPayrollAdjustmentCase.findUnique({ where: { id: caseId } });
      if (!adjustmentCase) throw new Error('FAL adjustment case was not found');
      if (adjustmentCase.requestedByStaffId === actorStaffId) {
        throw new Error('The creator cannot approve or reject their own FAL adjustment case');
      }
      await requirePayrollAdjustmentApprover(tx, actorStaffId);
      if (adjustmentCase.status !== 'READY_FOR_APPROVAL') {
        throw new Error('Only a ready FAL adjustment case can be decided');
      }
      if (decision === 'REJECT' && !reason?.trim()) throw new Error('A rejection reason is required');

      const nextStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const saved = await tx.crmPayrollAdjustmentCase.update({
        where: { id: adjustmentCase.id },
        data: {
          status: nextStatus,
          approvedByStaffId: actorStaffId,
          approvedAt: decision === 'APPROVE' ? new Date() : null,
          rejectedAt: decision === 'REJECT' ? new Date() : null,
        },
      });
      await tx.crmPayrollAdjustmentAudit.create({
        data: {
          caseId: saved.id,
          action: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          actorStaffId,
          reason: reason?.trim() || null,
          beforeJson: JSON.stringify({ status: adjustmentCase.status }),
          afterJson: JSON.stringify({ status: saved.status }),
          correlationKey: adjustmentCase.eventKey,
        },
      });
      return saved;
    });
  }
}

export const __test__ = { assertDraftLines };
