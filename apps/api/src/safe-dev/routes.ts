import type {
  FalAdjustmentSnapshotInput,
  PayrollAdjustmentLabCaseResponse,
  PayrollAdjustmentLabCaseListResponse,
  HrCustomAdjustmentInput,
  PayrollAdjustmentLabApprovalCheckRequest,
  PayrollAdjustmentLabDecisionRequest,
  PayrollAdjustmentLabDraftRequest,
  PayrollAdjustmentLabHrCustomDraftRequest,
  PayrollAdjustmentLabHrCustomRequest,
  PayrollAdjustmentLabShadowRequest,
} from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import { PAYROLL_ADJUSTMENT_APPROVERS_TEAM_CODE } from '../modules/payroll-ledger/payroll-adjustment-approver.service.js';
import { LockedSettlementExportService } from '../modules/payroll-ledger/locked-settlement-export.service.js';
import { stageLockedSettlementExport } from '../modules/payroll-ledger/locked-settlement-import.service.js';
import {
  PayrollSettlementClosingService,
  type SettlementReviewRequest,
} from '../modules/payroll-ledger/payroll-settlement-closing.service.js';
import { dryRunApprovedAdjustment } from '../modules/payroll-ledger/payroll-adjustment-posting-dry-run.service.js';
import { getLocalSettlementReview } from './payroll-settlement-review-lab.js';
import { getLocalNativeCcPayrollRun } from './native-cc-payroll-run.js';
import { getLegacyCcComparison } from './legacy-cc-comparison.js';
import { getLegacyCcParityReplay } from './legacy-cc-parity-replay.js';
import { getLegacyCcCohortAudit } from './legacy-cc-cohort-audit.js';
import {
  createLocalAdjustmentDraft,
  createLocalEligibleAdjustmentDraft,
  createLocalSettlementSnapshotDraft,
  createLocalHrCustomAdjustmentDraft,
  getLocalAdjustmentCase,
  getLocalEligibleAdjustmentCase,
  getLocalHrCustomAdjustmentCase,
  getLocalSettlementSnapshotCase,
  LOCAL_ADJUSTMENT_CASE_EVENT_KEY,
  LOCAL_ELIGIBLE_ADJUSTMENT_CASE_EVENT_KEY,
  LOCAL_HR_CUSTOM_ADJUSTMENT_CASE_EVENT_KEY,
  LOCAL_SETTLEMENT_SNAPSHOT_CASE_EVENT_KEY,
} from './payroll-adjustment-case-lab.js';
import { calculatePayrollAdjustmentLabShadow, validatePayrollAdjustmentLabHrCustom } from './payroll-adjustment-lab.js';
import { isSafeDev } from './runtime.js';

function isPayrollAdjustmentLabRequest(value: unknown): value is PayrollAdjustmentLabShadowRequest {
  if (!value || typeof value !== 'object' || !('input' in value)) return false;
  const input = (value as { input?: unknown }).input;
  if (!input || typeof input !== 'object') return false;
  const candidate = input as Partial<FalAdjustmentSnapshotInput>;
  return (
    typeof candidate.eventKey === 'string' &&
    typeof candidate.falRule === 'string' &&
    typeof candidate.financialEligibility === 'string' &&
    Boolean(candidate.sourcePeriod) &&
    Boolean(candidate.targetPeriod) &&
    Boolean(candidate.beforeSettlement) &&
    Boolean(candidate.afterSettlement)
  );
}

function isPayrollAdjustmentLabHrCustomRequest(value: unknown): value is PayrollAdjustmentLabHrCustomRequest {
  if (!value || typeof value !== 'object' || !('input' in value)) return false;
  const input = (value as { input?: unknown }).input;
  if (!input || typeof input !== 'object') return false;
  const candidate = input as Partial<HrCustomAdjustmentInput>;
  return (
    typeof candidate.amount === 'number' &&
    typeof candidate.comment === 'string' &&
    typeof candidate.targetPeriodKey === 'string' &&
    typeof candidate.targetPeriodStatus === 'string'
  );
}

function isPayrollAdjustmentLabApprovalCheckRequest(value: unknown): value is PayrollAdjustmentLabApprovalCheckRequest {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PayrollAdjustmentLabApprovalCheckRequest>;
  return Number.isInteger(candidate.requesterStaffId) && Number.isInteger(candidate.approverStaffId);
}

function isPayrollAdjustmentLabDraftRequest(value: unknown): value is PayrollAdjustmentLabDraftRequest {
  return Boolean(
    value &&
    typeof value === 'object' &&
    Number.isInteger((value as Partial<PayrollAdjustmentLabDraftRequest>).requesterStaffId)
  );
}

function isPayrollAdjustmentLabDecisionRequest(value: unknown): value is PayrollAdjustmentLabDecisionRequest {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PayrollAdjustmentLabDecisionRequest>;
  return (
    Number.isInteger(candidate.approverStaffId) && (candidate.decision === 'APPROVE' || candidate.decision === 'REJECT')
  );
}

function isPayrollAdjustmentLabHrCustomDraftRequest(value: unknown): value is PayrollAdjustmentLabHrCustomDraftRequest {
  return (
    Boolean(value && typeof value === 'object') &&
    Number.isInteger((value as Partial<PayrollAdjustmentLabHrCustomDraftRequest>).requesterStaffId) &&
    isPayrollAdjustmentLabHrCustomRequest({ input: (value as Partial<PayrollAdjustmentLabHrCustomDraftRequest>).input })
  );
}

function isLockedSettlementExport(value: unknown): value is import('@mos-lab/shared').LockedPayrollSettlementExport {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'sourceSystem' in value &&
    'period' in value &&
    'settlement' in value &&
    'subjects' in value
  );
}

function isSettlementReviewRequest(
  value: unknown
): value is { actorStaffId?: number | null; review: SettlementReviewRequest } {
  if (!value || typeof value !== 'object' || !('review' in value)) return false;
  const candidate = value as { actorStaffId?: unknown; review?: Partial<SettlementReviewRequest> };
  return (
    (candidate.actorStaffId == null || Number.isInteger(candidate.actorStaffId)) &&
    typeof candidate.review?.periodKey === 'string' &&
    typeof candidate.review?.calculationVersion === 'string' &&
    Array.isArray(candidate.review?.subjects)
  );
}

function isSettlementLockRequest(
  value: unknown
): value is { actorStaffId?: number | null; periodKey: string; version: number } {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<{ actorStaffId: number | null; periodKey: string; version: number }>;
  return (
    (candidate.actorStaffId == null || Number.isInteger(candidate.actorStaffId)) &&
    typeof candidate.periodKey === 'string' &&
    Number.isInteger(candidate.version)
  );
}

async function localCaseResponse(fastify: FastifyInstance): Promise<PayrollAdjustmentLabCaseResponse> {
  return { mode: 'LOCAL_ONLY', adjustmentCase: await getLocalAdjustmentCase(fastify) };
}

async function localEligibleCaseResponse(fastify: FastifyInstance): Promise<PayrollAdjustmentLabCaseResponse> {
  return { mode: 'LOCAL_ONLY', adjustmentCase: await getLocalEligibleAdjustmentCase(fastify) };
}

async function localHrCustomCaseResponse(fastify: FastifyInstance): Promise<PayrollAdjustmentLabCaseResponse> {
  return { mode: 'LOCAL_ONLY', adjustmentCase: await getLocalHrCustomAdjustmentCase(fastify) };
}

async function localCaseListResponse(fastify: FastifyInstance): Promise<PayrollAdjustmentLabCaseListResponse> {
  const candidates = await Promise.all([
    getLocalAdjustmentCase(fastify),
    getLocalEligibleAdjustmentCase(fastify),
    getLocalHrCustomAdjustmentCase(fastify),
    getLocalSettlementSnapshotCase(fastify),
  ]);
  return {
    mode: 'LOCAL_ONLY',
    adjustmentCases: candidates.filter(
      (adjustmentCase): adjustmentCase is NonNullable<typeof adjustmentCase> => adjustmentCase !== null
    ),
  };
}

/**
 * The lab is intentionally unavailable outside Safe Dev. Its only mutations
 * create synthetic review cases in the loopback CRM; it has no ledger-posting
 * or payroll-write route.
 */
export async function safeDevRoutes(fastify: FastifyInstance) {
  fastify.get('/safe-dev/payroll-native-cc-run', async (_request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    try {
      return reply.send(await getLocalNativeCcPayrollRun(fastify));
    } catch (error) {
      return reply.status(409).send({
        message: error instanceof Error ? error.message : 'Unable to run the local native CC payroll rehearsal',
      });
    }
  });

  fastify.get('/safe-dev/legacy-cc-comparison', async (_request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    try {
      return reply.send(await getLegacyCcComparison(fastify));
    } catch (error) {
      return reply.status(409).send({
        message: error instanceof Error ? error.message : 'Unable to prepare the Legacy read-only comparison',
      });
    }
  });

  fastify.get('/safe-dev/legacy-cc-parity-replay', async (_request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    try {
      return reply.send(await getLegacyCcParityReplay(fastify));
    } catch (error) {
      return reply.status(409).send({
        message: error instanceof Error ? error.message : 'Unable to run the local Legacy parity replay',
      });
    }
  });

  fastify.get('/safe-dev/legacy-cc-cohort-audit', async (_request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    try {
      return reply.send(await getLegacyCcCohortAudit(fastify));
    } catch (error) {
      return reply.status(409).send({
        message: error instanceof Error ? error.message : 'Unable to run the Legacy CC cohort audit',
      });
    }
  });

  fastify.get('/safe-dev/payroll-adjustment-lab/settlement-review', async (_request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    try {
      return reply.send(await getLocalSettlementReview(fastify));
    } catch (error) {
      return reply
        .status(409)
        .send({ message: error instanceof Error ? error.message : 'Unable to prepare the local settlement review' });
    }
  });

  fastify.get<{ Params: { periodKey: string } }>(
    '/safe-dev/payroll-adjustment-lab/locked-settlement-export/:periodKey',
    async (request, reply) => {
      if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
      try {
        return reply.send({
          mode: 'LOCAL_ONLY',
          settlementExport: await LockedSettlementExportService.exportLockedPeriod(fastify, request.params.periodKey),
        });
      } catch (error) {
        return reply
          .status(409)
          .send({ message: error instanceof Error ? error.message : 'Unable to export the locked settlement' });
      }
    }
  );

  fastify.post('/safe-dev/payroll-adjustment-lab/locked-settlement-import', async (request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    if (!isLockedSettlementExport(request.body))
      return reply.status(400).send({ message: 'A locked settlement export is required' });
    try {
      return reply.send({ mode: 'LOCAL_ONLY', import: await stageLockedSettlementExport(fastify, request.body) });
    } catch (error) {
      return reply
        .status(409)
        .send({ message: error instanceof Error ? error.message : 'Unable to stage the locked settlement export' });
    }
  });

  fastify.post('/safe-dev/payroll-adjustment-lab/settlement-review', async (request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    if (!isSettlementReviewRequest(request.body))
      return reply.status(400).send({ message: 'A local settlement review is required' });
    try {
      const review = request.body.review;
      return reply.send({
        mode: 'LOCAL_ONLY',
        review: await PayrollSettlementClosingService.createReview(fastify, request.body.actorStaffId ?? null, {
          ...review,
          startDate: new Date(review.startDate),
          endDate: new Date(review.endDate),
          sourceCutoffAt: new Date(review.sourceCutoffAt),
        }),
      });
    } catch (error) {
      return reply
        .status(409)
        .send({ message: error instanceof Error ? error.message : 'Unable to create the settlement review' });
    }
  });

  fastify.post('/safe-dev/payroll-adjustment-lab/settlement-review/lock', async (request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    if (!isSettlementLockRequest(request.body))
      return reply.status(400).send({ message: 'A local period and settlement version are required' });
    try {
      return reply.send({
        mode: 'LOCAL_ONLY',
        lock: await PayrollSettlementClosingService.lockReview(
          fastify,
          request.body.actorStaffId ?? null,
          request.body.periodKey,
          request.body.version
        ),
      });
    } catch (error) {
      return reply
        .status(409)
        .send({ message: error instanceof Error ? error.message : 'Unable to lock the settlement review' });
    }
  });

  fastify.post('/safe-dev/payroll-adjustment-lab/case/settlement-snapshot/draft', async (request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    if (!isPayrollAdjustmentLabDraftRequest(request.body))
      return reply.status(400).send({ message: 'A local requester is required' });
    try {
      const result = await createLocalSettlementSnapshotDraft(fastify, request.body.requesterStaffId);
      return reply.send({ mode: 'LOCAL_ONLY', adjustmentCase: result.adjustmentCase });
    } catch (error) {
      return reply
        .status(409)
        .send({ message: error instanceof Error ? error.message : 'Unable to create settlement snapshot draft' });
    }
  });

  fastify.post('/safe-dev/payroll-adjustment-lab/case/settlement-snapshot/decision', async (request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    if (!isPayrollAdjustmentLabDecisionRequest(request.body))
      return reply.status(400).send({ message: 'A local approver and decision are required' });
    try {
      const { FalAdjustmentCaseService } = await import('../modules/payroll-ledger/fal-adjustment-case.service.js');
      const adjustmentCase = await fastify.prisma.crm.crmPayrollAdjustmentCase.findUnique({
        where: { eventKey: LOCAL_SETTLEMENT_SNAPSHOT_CASE_EVENT_KEY },
        select: { id: true },
      });
      if (!adjustmentCase)
        return reply.status(404).send({ message: 'Create the locked-settlement draft before deciding it' });
      await FalAdjustmentCaseService.decide(
        fastify,
        request.body.approverStaffId,
        adjustmentCase.id,
        request.body.decision,
        request.body.reason
      );
      return reply.send({ mode: 'LOCAL_ONLY', adjustmentCase: await getLocalSettlementSnapshotCase(fastify) });
    } catch (error) {
      return reply.status(400).send({
        message: error instanceof Error ? error.message : 'Settlement snapshot decision could not be recorded',
      });
    }
  });

  fastify.get('/safe-dev/payroll-adjustment-lab/case/settlement-snapshot/posting-dry-run', async (_request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    try {
      const adjustmentCase = await fastify.prisma.crm.crmPayrollAdjustmentCase.findUnique({
        where: { eventKey: LOCAL_SETTLEMENT_SNAPSHOT_CASE_EVENT_KEY },
        include: { targetPeriod: true, lines: { orderBy: { id: 'asc' } } },
      });
      if (!adjustmentCase)
        return reply.status(404).send({ message: 'Create the locked-settlement draft before dry run' });
      return reply.send(
        dryRunApprovedAdjustment({
          status: adjustmentCase.status,
          targetPeriodKey: adjustmentCase.targetPeriod.periodKey,
          lines: adjustmentCase.lines.map((line) => ({
            lineKey: line.lineKey,
            recipientLegacyStaffId: line.recipientLegacyStaffId,
            deltaAmount: line.deltaAmount,
            postingState: line.postingState,
          })),
        })
      );
    } catch (error) {
      return reply
        .status(409)
        .send({ message: error instanceof Error ? error.message : 'Posting dry run could not be planned' });
    }
  });

  fastify.get('/safe-dev/payroll-adjustment-lab/approvers', async (_request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });

    const team = await fastify.prisma.crm.crmTeam.findUnique({
      where: { code: PAYROLL_ADJUSTMENT_APPROVERS_TEAM_CODE },
      select: {
        code: true,
        name: true,
        members: {
          where: { isActive: true },
          orderBy: { displayName: 'asc' },
          select: { crmStaffId: true, displayName: true, role: true },
        },
      },
    });
    if (!team) return reply.status(404).send({ message: 'Local Payroll Adjustment Approvers are not configured' });

    return reply.send({
      mode: 'LOCAL_ONLY',
      group: {
        code: team.code,
        name: team.name,
        members: team.members
          .filter((member) => member.crmStaffId !== null)
          .map((member) => ({
            staffId: member.crmStaffId!,
            displayName: member.displayName || 'Unknown',
            role: member.role,
          })),
      },
    });
  });

  fastify.post('/safe-dev/payroll-adjustment-lab/approval-check', async (request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    if (!isPayrollAdjustmentLabApprovalCheckRequest(request.body)) {
      return reply.status(400).send({ message: 'A local requester and approver are required' });
    }

    const { requesterStaffId, approverStaffId } = request.body;
    if (requesterStaffId === approverStaffId) {
      return reply.send({
        mode: 'LOCAL_ONLY',
        allowed: false,
        reason: 'Người tạo draft không được tự duyệt Adjustment.',
      });
    }

    const membership = await fastify.prisma.crm.crmTeamMember.findFirst({
      where: {
        crmStaffId: approverStaffId,
        isActive: true,
        team: { code: PAYROLL_ADJUSTMENT_APPROVERS_TEAM_CODE, isActive: true },
      },
      select: { id: true },
    });
    if (!membership) {
      return reply.send({
        mode: 'LOCAL_ONLY',
        allowed: false,
        reason: 'Người duyệt thử không thuộc nhóm Payroll Adjustment Approvers.',
      });
    }

    return reply.send({
      mode: 'LOCAL_ONLY',
      allowed: true,
      reason: 'Được phép duyệt draft mô phỏng. Lab không tạo case, audit hoặc payout.',
    });
  });

  fastify.get('/safe-dev/payroll-adjustment-lab/case', async (_request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    return reply.send(await localCaseResponse(fastify));
  });

  fastify.get('/safe-dev/payroll-adjustment-lab/cases', async (_request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    return reply.send(await localCaseListResponse(fastify));
  });

  fastify.post('/safe-dev/payroll-adjustment-lab/case/draft', async (request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    if (!isPayrollAdjustmentLabDraftRequest(request.body)) {
      return reply.status(400).send({ message: 'A local draft creator is required' });
    }
    try {
      await createLocalAdjustmentDraft(fastify, request.body.requesterStaffId);
      return reply.send(await localCaseResponse(fastify));
    } catch (error) {
      return reply
        .status(400)
        .send({ message: error instanceof Error ? error.message : 'Local draft could not be created' });
    }
  });

  fastify.post('/safe-dev/payroll-adjustment-lab/case/decision', async (request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    if (!isPayrollAdjustmentLabDecisionRequest(request.body)) {
      return reply.status(400).send({ message: 'A local approver and decision are required' });
    }
    try {
      const { FalAdjustmentCaseService } = await import('../modules/payroll-ledger/fal-adjustment-case.service.js');
      const adjustmentCase = await fastify.prisma.crm.crmPayrollAdjustmentCase.findUnique({
        where: { eventKey: LOCAL_ADJUSTMENT_CASE_EVENT_KEY },
        select: { id: true },
      });
      if (!adjustmentCase) return reply.status(404).send({ message: 'Create the local draft before deciding it' });
      await FalAdjustmentCaseService.decide(
        fastify,
        request.body.approverStaffId,
        adjustmentCase.id,
        request.body.decision,
        request.body.reason
      );
      return reply.send(await localCaseResponse(fastify));
    } catch (error) {
      return reply
        .status(400)
        .send({ message: error instanceof Error ? error.message : 'Local decision could not be recorded' });
    }
  });

  fastify.get('/safe-dev/payroll-adjustment-lab/case/eligible', async (_request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    return reply.send(await localEligibleCaseResponse(fastify));
  });

  fastify.post('/safe-dev/payroll-adjustment-lab/case/eligible/draft', async (request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    if (!isPayrollAdjustmentLabDraftRequest(request.body)) {
      return reply.status(400).send({ message: 'A local draft creator is required' });
    }
    try {
      await createLocalEligibleAdjustmentDraft(fastify, request.body.requesterStaffId);
      return reply.send(await localEligibleCaseResponse(fastify));
    } catch (error) {
      return reply
        .status(400)
        .send({ message: error instanceof Error ? error.message : 'Eligible local draft could not be created' });
    }
  });

  fastify.post('/safe-dev/payroll-adjustment-lab/case/eligible/decision', async (request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    if (!isPayrollAdjustmentLabDecisionRequest(request.body)) {
      return reply.status(400).send({ message: 'A local approver and decision are required' });
    }
    try {
      const { FalAdjustmentCaseService } = await import('../modules/payroll-ledger/fal-adjustment-case.service.js');
      const adjustmentCase = await fastify.prisma.crm.crmPayrollAdjustmentCase.findUnique({
        where: { eventKey: LOCAL_ELIGIBLE_ADJUSTMENT_CASE_EVENT_KEY },
        select: { id: true },
      });
      if (!adjustmentCase)
        return reply.status(404).send({ message: 'Create the eligible local draft before deciding it' });
      await FalAdjustmentCaseService.decide(
        fastify,
        request.body.approverStaffId,
        adjustmentCase.id,
        request.body.decision,
        request.body.reason
      );
      return reply.send(await localEligibleCaseResponse(fastify));
    } catch (error) {
      return reply
        .status(400)
        .send({ message: error instanceof Error ? error.message : 'Eligible local decision could not be recorded' });
    }
  });

  fastify.get('/safe-dev/payroll-adjustment-lab/case/hr-custom', async (_request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    return reply.send(await localHrCustomCaseResponse(fastify));
  });

  fastify.post('/safe-dev/payroll-adjustment-lab/case/hr-custom/draft', async (request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    if (!isPayrollAdjustmentLabHrCustomDraftRequest(request.body)) {
      return reply.status(400).send({ message: 'A local HR Custom creator and complete input are required' });
    }
    try {
      await createLocalHrCustomAdjustmentDraft(fastify, request.body.requesterStaffId, request.body.input);
      return reply.send(await localHrCustomCaseResponse(fastify));
    } catch (error) {
      return reply
        .status(400)
        .send({ message: error instanceof Error ? error.message : 'Local HR Custom draft could not be created' });
    }
  });

  fastify.post('/safe-dev/payroll-adjustment-lab/case/hr-custom/decision', async (request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    if (!isPayrollAdjustmentLabDecisionRequest(request.body)) {
      return reply.status(400).send({ message: 'A local approver and decision are required' });
    }
    try {
      const { FalAdjustmentCaseService } = await import('../modules/payroll-ledger/fal-adjustment-case.service.js');
      const adjustmentCase = await fastify.prisma.crm.crmPayrollAdjustmentCase.findUnique({
        where: { eventKey: LOCAL_HR_CUSTOM_ADJUSTMENT_CASE_EVENT_KEY },
        select: { id: true },
      });
      if (!adjustmentCase)
        return reply.status(404).send({ message: 'Create the local HR Custom draft before deciding it' });
      await FalAdjustmentCaseService.decide(
        fastify,
        request.body.approverStaffId,
        adjustmentCase.id,
        request.body.decision,
        request.body.reason
      );
      return reply.send(await localHrCustomCaseResponse(fastify));
    } catch (error) {
      return reply
        .status(400)
        .send({ message: error instanceof Error ? error.message : 'Local HR Custom decision could not be recorded' });
    }
  });

  fastify.post('/safe-dev/payroll-adjustment-lab/shadow', async (request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    if (!isPayrollAdjustmentLabRequest(request.body)) {
      return reply.status(400).send({ message: 'A complete local-only adjustment snapshot is required' });
    }

    return reply.send(calculatePayrollAdjustmentLabShadow(request.body.input));
  });

  fastify.post('/safe-dev/payroll-adjustment-lab/hr-custom', async (request, reply) => {
    if (!isSafeDev()) return reply.status(404).send({ message: 'Not found' });
    if (!isPayrollAdjustmentLabHrCustomRequest(request.body)) {
      return reply.status(400).send({ message: 'A complete local-only HR Custom Adjustment is required' });
    }
    try {
      return reply.send(validatePayrollAdjustmentLabHrCustom(request.body.input));
    } catch (error) {
      return reply
        .status(400)
        .send({ message: error instanceof Error ? error.message : 'Invalid HR Custom Adjustment' });
    }
  });
}

export const __test__ = {
  isPayrollAdjustmentLabRequest,
  isPayrollAdjustmentLabHrCustomRequest,
  isPayrollAdjustmentLabApprovalCheckRequest,
  isPayrollAdjustmentLabDraftRequest,
  isPayrollAdjustmentLabDecisionRequest,
  isPayrollAdjustmentLabHrCustomDraftRequest,
};
