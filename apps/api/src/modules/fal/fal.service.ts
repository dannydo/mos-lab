import {
  FalCompensationMode,
  FalFinancialEligibility,
  FalLogExplanationRecord,
  FalReadModel,
  FalRotationMode,
  FalRule,
} from '@mos-lab/shared';
import { FastifyInstance } from 'fastify';

export const FAL_RULE_VALUES = ['Fix', 'Adjust', 'Log', 'Replace'] as const;

type LogExplanationLike = {
  id: number;
  orderServiceId: bigint | number;
  explanation: string | null;
  explanationChannel: string | null;
  explainedByStaffId: number | null;
  decisionStatus: string;
  ledgerStatus: string;
  approvedByStaffId: number | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function asFalRule(value?: string | null): FalRule | null {
  return FAL_RULE_VALUES.find((rule) => rule === value) ?? null;
}

export function getOriginResponsibility(rule: FalRule): 'CV' | 'CC' | null {
  if (rule === 'Adjust') return 'CC';
  if (rule === 'Fix' || rule === 'Replace') return 'CV';
  return null;
}

export function totalFalMinutes(servicingMinutes?: number | null, cleaningMinutes?: number | null): number | null {
  if (servicingMinutes == null || cleaningMinutes == null) return null;
  return Math.max(0, Number(servicingMinutes)) + Math.max(0, Number(cleaningMinutes));
}

export function resolveFalCompensationMode(input: {
  rule: FalRule;
  caseRole: 'ORIGIN' | 'REMEDIATION' | 'STANDALONE';
  totalMinutes?: number | null;
  decisionStatus?: string | null;
}): FalCompensationMode {
  if (input.caseRole === 'ORIGIN') return 'ORIGIN_ONLY';
  if (input.rule === 'Replace') return 'NORMAL_FINAL';
  if (!input.totalMinutes || input.totalMinutes <= 0) return 'BLOCKED';
  if (input.rule === 'Log' && input.decisionStatus !== 'APPROVED') return 'BLOCKED';
  return input.totalMinutes <= 25 ? 'BANANA_HEAD' : 'NORMAL_FINAL';
}

export function resolveFalRotationMode(input: {
  rule: FalRule;
  caseRole: 'ORIGIN' | 'REMEDIATION' | 'STANDALONE';
  totalMinutes?: number | null;
}): FalRotationMode {
  if (input.caseRole !== 'REMEDIATION') return 'UNDETERMINED';
  // Replace keeps its established normal (tail) rotation; it never earns a
  // FAL head-of-queue token, regardless of the service duration.
  if (input.rule === 'Replace') return 'FINAL';
  if (!input.totalMinutes || input.totalMinutes <= 0) return 'UNDETERMINED';
  return input.totalMinutes <= 25 ? 'HEAD' : 'FINAL';
}

export function resolveFalFinancialEligibility(input: {
  rule: FalRule;
  caseRole: 'ORIGIN' | 'REMEDIATION' | 'STANDALONE';
  totalMinutes?: number | null;
  decisionStatus?: string | null;
}): FalFinancialEligibility {
  if (input.caseRole === 'ORIGIN') return 'READY';
  if (!input.totalMinutes || input.totalMinutes <= 0) return 'INVALID_DURATION';
  if (input.rule !== 'Log') return 'READY';
  if (input.decisionStatus === 'APPROVED') return 'READY';
  return input.decisionStatus === 'REJECTED' ? 'REJECTED' : 'PENDING_LOG_APPROVAL';
}

export function toLogExplanationRecord(explanation: LogExplanationLike): FalLogExplanationRecord {
  return {
    id: explanation.id,
    orderServiceId: Number(explanation.orderServiceId),
    explanation: explanation.explanation,
    explanationChannel: explanation.explanationChannel,
    explainedByStaffId: explanation.explainedByStaffId,
    decisionStatus: explanation.decisionStatus as FalLogExplanationRecord['decisionStatus'],
    ledgerStatus: explanation.ledgerStatus as FalLogExplanationRecord['ledgerStatus'],
    approvedByStaffId: explanation.approvedByStaffId,
    approvedAt: explanation.approvedAt?.toISOString() || null,
    rejectionReason: explanation.rejectionReason,
    createdAt: explanation.createdAt.toISOString(),
    updatedAt: explanation.updatedAt.toISOString(),
  };
}

type LiveFalDuration = {
  servicingMinutes: number | null;
  cleaningMinutes: number | null;
};

/**
 * The legacy report is regenerated asynchronously.  Every MOS FAL consumer
 * therefore reads the same live Wings timeline used by rotation/ledger,
 * including its per-segment CEIL() rounding contract.
 */
async function getLiveFalDurationMap(
  fastify: FastifyInstance,
  orderServiceIds: number[]
): Promise<Map<number, LiveFalDuration>> {
  if (!orderServiceIds.length) return new Map();
  const ids = orderServiceIds.map((id) => Math.trunc(id)).filter((id) => id > 0);
  if (!ids.length) return new Map();
  const rows = await fastify.prisma.legacy.$queryRawUnsafe<
    Array<{
      orderServiceId: bigint | number;
      cleaningMinutes: number | null;
      servicingMinutes: number | null;
    }>
  >(`
    SELECT
      os.id AS orderServiceId,
      CASE
        WHEN started_at IS NULL OR completed_at IS NULL THEN NULL
        WHEN cleaned_at IS NULL THEN 0
        WHEN cleaned_at < started_at OR cleaned_at > completed_at THEN NULL
        ELSE CEIL(TIMESTAMPDIFF(SECOND, started_at, cleaned_at) / 60)
      END AS cleaningMinutes,
      CASE
        WHEN started_at IS NULL OR completed_at IS NULL THEN NULL
        WHEN cleaned_at IS NULL THEN CEIL(TIMESTAMPDIFF(SECOND, started_at, completed_at) / 60)
        WHEN cleaned_at < started_at OR cleaned_at > completed_at THEN NULL
        ELSE CEIL(TIMESTAMPDIFF(SECOND, cleaned_at, completed_at) / 60)
      END AS servicingMinutes
    FROM order_service os
    LEFT JOIN (
      SELECT
        order_service_id,
        MAX(CASE WHEN service_state = 'ServiceStart' THEN date_created END) AS started_at,
        MAX(CASE WHEN service_state = 'ServiceCleaned' THEN date_created END) AS cleaned_at,
        MAX(CASE WHEN service_state = 'ServiceCompleted' THEN date_created END) AS completed_at
      FROM order_service_progress
      WHERE order_service_id IN (${ids.join(',')})
      GROUP BY order_service_id
    ) timeline ON timeline.order_service_id = os.id
    WHERE os.id IN (${ids.join(',')})
  `);
  return new Map(
    rows.map((row) => [
      Number(row.orderServiceId),
      {
        cleaningMinutes: row.cleaningMinutes == null ? null : Number(row.cleaningMinutes),
        servicingMinutes: row.servicingMinutes == null ? null : Number(row.servicingMinutes),
      },
    ])
  );
}

function buildReadModel(input: {
  rule?: string | null;
  caseRole: 'ORIGIN' | 'REMEDIATION' | 'STANDALONE';
  originOrderServiceId?: number | null;
  remediationOrderServiceId?: number | null;
  servicingMinutes?: number | null;
  cleaningMinutes?: number | null;
  explanation?: LogExplanationLike | null;
  rotationPriority?: FalReadModel['rotationPriority'];
}): FalReadModel | null {
  const rule = asFalRule(input.rule);
  if (!rule) return null;
  const totalMinutes = totalFalMinutes(input.servicingMinutes, input.cleaningMinutes);
  const decisionStatus = rule === 'Log' ? input.explanation?.decisionStatus || 'PENDING' : null;
  const financialEligibility = resolveFalFinancialEligibility({
    rule,
    caseRole: input.caseRole,
    totalMinutes,
    decisionStatus,
  });
  return {
    rule,
    caseRole: input.caseRole,
    originOrderServiceId: input.originOrderServiceId ?? null,
    remediationOrderServiceId: input.remediationOrderServiceId ?? null,
    servicingMinutes: input.servicingMinutes ?? null,
    cleaningMinutes: input.cleaningMinutes ?? null,
    totalMinutes,
    compensationMode: resolveFalCompensationMode({ rule, caseRole: input.caseRole, totalMinutes, decisionStatus }),
    rotationMode: resolveFalRotationMode({ rule, caseRole: input.caseRole, totalMinutes }),
    financialEligibility,
    rotationPriority: input.rotationPriority ?? null,
    decisionStatus: decisionStatus as FalReadModel['decisionStatus'],
    ledgerStatus:
      rule === 'Log' ? (input.explanation?.ledgerStatus as FalReadModel['ledgerStatus']) || 'NOT_APPLIED' : null,
    originResponsibility: getOriginResponsibility(rule),
    requiresApproval: rule === 'Log',
  };
}

/**
 * FAL cases originate in Wings. MOS augments only Log with its explanation
 * gate; it never creates or re-classifies Fix/Adjust/Log services.
 */
export async function getFalReadModelMap(
  fastify: FastifyInstance,
  rows: Array<{
    orderServiceId: number;
    effectiveServiceType?: string | null;
    nextFixOrderServiceId?: number | null;
    nextAdjustOrderServiceId?: number | null;
    nextLogOrderServiceId?: number | null;
    originOrderServiceId?: number | null;
    servicingMinutes?: number | null;
    cleaningMinutes?: number | null;
    rotationPriority?: FalReadModel['rotationPriority'];
  }>
): Promise<Map<number, FalReadModel>> {
  const ids = [...new Set(rows.map((row) => Number(row.orderServiceId)).filter((id) => id > 0))];
  if (!ids.length) return new Map();
  const explanations = await fastify.prisma.crm.crmFalLogExplanation.findMany({
    where: { orderServiceId: { in: ids.map((id) => BigInt(id)) } },
  });
  const liveDurationByOrderServiceId = await getLiveFalDurationMap(fastify, ids);
  const explanationByOrderServiceId = new Map(explanations.map((item) => [Number(item.orderServiceId), item]));
  const result = new Map<number, FalReadModel>();
  for (const row of rows) {
    const liveDuration = liveDurationByOrderServiceId.get(Number(row.orderServiceId));
    const outgoingRule = row.nextFixOrderServiceId
      ? 'Fix'
      : row.nextAdjustOrderServiceId
        ? 'Adjust'
        : row.nextLogOrderServiceId
          ? 'Log'
          : null;
    const model = buildReadModel({
      rule: outgoingRule || row.effectiveServiceType,
      caseRole: outgoingRule ? 'ORIGIN' : 'REMEDIATION',
      originOrderServiceId: outgoingRule
        ? Number(row.orderServiceId)
        : row.originOrderServiceId
          ? Number(row.originOrderServiceId)
          : null,
      remediationOrderServiceId: outgoingRule
        ? Number(row.nextFixOrderServiceId || row.nextAdjustOrderServiceId || row.nextLogOrderServiceId)
        : Number(row.orderServiceId),
      // Never fall back to report_order_service here: missing live events are
      // intentionally INVALID_DURATION, not a reason to issue finance.
      servicingMinutes: liveDuration?.servicingMinutes ?? null,
      cleaningMinutes: liveDuration?.cleaningMinutes ?? null,
      rotationPriority: row.rotationPriority,
      explanation: explanationByOrderServiceId.get(Number(row.orderServiceId)),
    });
    if (model) result.set(Number(row.orderServiceId), model);
  }
  return result;
}
