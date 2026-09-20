import type { FastifyInstance } from 'fastify';
import {
  formatBugReportKey,
  type BugReportRequestType,
  type BugReportStatus,
  type InboxExecutionDashboardQuery,
  type InboxExecutionDashboardSummary,
  type InboxExecutionInterval,
  type InboxExecutionPhaseMetric,
  type InboxExecutionTopTicket,
  type InboxTicketExecutionTiming,
  type InboxTimingBucket,
  type InboxTimingOutcome,
  type InboxTimingPhase,
  INBOX_TIMING_PHASE_LABELS,
} from '@mos-lab/shared';

// Maximum duration (in seconds) to allow for any uncompleted/stale interval before flagging
const MAX_STALE_ACTIVE_SECONDS = 3 * 60 * 60; // 3 hours max cap for stale active execution
const DEFAULT_JOB_ESTIMATED_DURATION_SECONDS = 15 * 60; // 15 mins fallback for unclosed plan/intake jobs

export interface RawTicketTimingSource {
  id: number;
  requestType: string;
  title: string;
  status: string;
  clarificationStatus?: string | null;
  createdAt: Date;
  startedAt?: Date | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  approvedAt?: Date | null;
  implementationApprovedAt?: Date | null;
  audits?: Array<{
    id: number;
    action: string;
    note?: string | null;
    createdAt: Date;
  }>;
  inboxPlanJobs?: Array<{
    id: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    leasedBy?: string | null;
    leaseExpiresAt?: Date | null;
    resultAction?: string | null;
  }>;
  inboxFollowUpJobs?: Array<{
    id: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    leasedBy?: string | null;
    leaseExpiresAt?: Date | null;
    resultAction?: string | null;
  }>;
  inboxImplementationJobs?: Array<{
    id: string;
    status: string;
    executionPhase?: string | null;
    retrySequence: number;
    startedAt?: Date | null;
    completedAt?: Date | null;
    updatedAt: Date;
    createdAt: Date;
    leaseExpiresAt?: Date | null;
    leaseHeartbeatAt?: Date | null;
    lastProgressAt?: Date | null;
  }>;
}

export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  const clampedIndex = Math.max(0, Math.min(sorted.length - 1, index));
  return sorted[clampedIndex];
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function safeSeconds(start: Date, end: Date | null | undefined, now = new Date()): number {
  const endTime = end ? end.getTime() : now.getTime();
  const startTime = start.getTime();
  return Math.max(0, Math.round((endTime - startTime) / 1000));
}

/**
 * Pure calculation function deriving server-authoritative intervals and totals
 * for a single Inbox ticket without storing any sensitive contents (UI-008).
 */
export function calculateTicketExecutionTiming(
  source: RawTicketTimingSource,
  now = new Date()
): InboxTicketExecutionTiming {
  const rawIntervals: InboxExecutionInterval[] = [];
  let hasIncompleteData = false;
  const audits = [...(source.audits ?? [])].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const planJobs = source.inboxPlanJobs ?? [];
  const followUpJobs = source.inboxFollowUpJobs ?? [];
  const impJobs = source.inboxImplementationJobs ?? [];

  // 1. Follow-up & Clarification analysis jobs
  for (const job of followUpJobs) {
    const isCompleted = job.status === 'COMPLETED';
    const isFailed = job.status === 'FAILED';
    const isTerminated = isCompleted || isFailed;

    // Queue wait
    if (job.leasedBy) {
      const queueEnd = isTerminated
        ? job.updatedAt
        : job.leaseExpiresAt
          ? new Date(Math.min(job.leaseExpiresAt.getTime(), now.getTime()))
          : now;
      rawIntervals.push({
        id: `fu-q-${job.id}`,
        bucket: 'SYSTEM_WAIT',
        phase: 'SYSTEM_QUEUE',
        label: 'Hàng đợi làm rõ yêu cầu',
        startedAt: job.createdAt.toISOString(),
        endedAt: queueEnd.toISOString(),
        durationSeconds: safeSeconds(job.createdAt, queueEnd, now),
        outcome: 'COMPLETED',
        source: 'JOB',
        isEstimated: false,
        isOngoing: false,
      });
    }

    // Active analysis execution
    let executionEnd: Date | null = isTerminated ? job.updatedAt : null;
    let isOngoing = !isTerminated;
    let isEstimated = false;
    let outcome: InboxTimingOutcome = isCompleted ? 'COMPLETED' : isFailed ? 'FAILED' : 'RUNNING';

    // Infinite duration guard: if job is not completed and lease is expired or old
    if (!isTerminated && job.leaseExpiresAt && job.leaseExpiresAt.getTime() < now.getTime()) {
      executionEnd = job.leaseExpiresAt;
      isOngoing = false;
      isEstimated = true;
      outcome = 'EXPIRED';
      hasIncompleteData = true;
    } else if (!isTerminated && safeSeconds(job.createdAt, null, now) > MAX_STALE_ACTIVE_SECONDS) {
      executionEnd = new Date(job.createdAt.getTime() + DEFAULT_JOB_ESTIMATED_DURATION_SECONDS * 1000);
      isOngoing = false;
      isEstimated = true;
      outcome = 'EXPIRED';
      hasIncompleteData = true;
    }

    rawIntervals.push({
      id: `fu-act-${job.id}`,
      bucket: 'AI_ACTIVE',
      phase: 'ANALYSIS_PLAN',
      label: INBOX_TIMING_PHASE_LABELS.ANALYSIS_PLAN,
      startedAt: job.createdAt.toISOString(),
      endedAt: executionEnd?.toISOString() ?? null,
      durationSeconds: safeSeconds(job.createdAt, executionEnd, now),
      outcome,
      source: 'JOB',
      isEstimated,
      isOngoing,
    });
  }

  // 2. Planning jobs
  for (const job of planJobs) {
    const isCompleted = job.status === 'COMPLETED';
    const isFailed = job.status === 'FAILED';
    const isTerminated = isCompleted || isFailed;

    // Queue wait
    if (job.leasedBy) {
      const queueEnd = isTerminated
        ? job.updatedAt
        : job.leaseExpiresAt
          ? new Date(Math.min(job.leaseExpiresAt.getTime(), now.getTime()))
          : now;
      rawIntervals.push({
        id: `plan-q-${job.id}`,
        bucket: 'SYSTEM_WAIT',
        phase: 'SYSTEM_QUEUE',
        label: 'Hàng đợi lập kế hoạch (Plan)',
        startedAt: job.createdAt.toISOString(),
        endedAt: queueEnd.toISOString(),
        durationSeconds: safeSeconds(job.createdAt, queueEnd, now),
        outcome: 'COMPLETED',
        source: 'JOB',
        isEstimated: false,
        isOngoing: false,
      });
    }

    let executionEnd: Date | null = isTerminated ? job.updatedAt : null;
    let isOngoing = !isTerminated;
    let isEstimated = false;
    let outcome: InboxTimingOutcome = isCompleted ? 'COMPLETED' : isFailed ? 'FAILED' : 'RUNNING';

    // Infinite duration guard
    if (!isTerminated && job.leaseExpiresAt && job.leaseExpiresAt.getTime() < now.getTime()) {
      executionEnd = job.leaseExpiresAt;
      isOngoing = false;
      isEstimated = true;
      outcome = 'EXPIRED';
      hasIncompleteData = true;
    } else if (!isTerminated && safeSeconds(job.createdAt, null, now) > MAX_STALE_ACTIVE_SECONDS) {
      executionEnd = new Date(job.createdAt.getTime() + DEFAULT_JOB_ESTIMATED_DURATION_SECONDS * 1000);
      isOngoing = false;
      isEstimated = true;
      outcome = 'EXPIRED';
      hasIncompleteData = true;
    }

    rawIntervals.push({
      id: `plan-act-${job.id}`,
      bucket: 'AI_ACTIVE',
      phase: 'ANALYSIS_PLAN',
      label: 'Lập kế hoạch giải pháp (AI Plan)',
      startedAt: job.createdAt.toISOString(),
      endedAt: executionEnd?.toISOString() ?? null,
      durationSeconds: safeSeconds(job.createdAt, executionEnd, now),
      outcome,
      source: 'JOB',
      isEstimated,
      isOngoing,
    });
  }

  // 3. Implementation jobs (Code & Test, Retry & Fix)
  for (const job of impJobs) {
    const isRetry = job.retrySequence > 0;
    const phase: InboxTimingPhase = isRetry ? 'RETRY_FIX' : 'CODE_TEST';
    const phaseLabel = isRetry ? INBOX_TIMING_PHASE_LABELS.RETRY_FIX : INBOX_TIMING_PHASE_LABELS.CODE_TEST;

    // Queue wait before worker starts
    if (job.startedAt && job.startedAt.getTime() > job.createdAt.getTime()) {
      rawIntervals.push({
        id: `imp-q-${job.id}`,
        bucket: 'SYSTEM_WAIT',
        phase: 'SYSTEM_QUEUE',
        label: 'Hàng đợi worker triển khai',
        startedAt: job.createdAt.toISOString(),
        endedAt: job.startedAt.toISOString(),
        durationSeconds: safeSeconds(job.createdAt, job.startedAt, now),
        outcome: 'COMPLETED',
        source: 'JOB',
        isEstimated: false,
        isOngoing: false,
      });
    }

    const execStart = job.startedAt || job.createdAt;
    let execEnd: Date | null = null;
    let isOngoing = false;
    let isEstimated = false;
    let outcome: InboxTimingOutcome;

    if (job.status === 'FAILED') {
      outcome = 'FAILED';
      execEnd = job.completedAt || job.updatedAt;
    } else if (job.status === 'CHANGES_REQUESTED') {
      outcome = 'CHANGES_REQUESTED';
      execEnd = job.completedAt || job.updatedAt;
    } else if (job.completedAt) {
      outcome = 'COMPLETED';
      execEnd = job.completedAt;
    } else {
      // Still running or crashed/stale
      const lastProgress = job.lastProgressAt || job.leaseHeartbeatAt;
      const isStale =
        (job.leaseExpiresAt && job.leaseExpiresAt.getTime() < now.getTime()) ||
        safeSeconds(execStart, null, now) > MAX_STALE_ACTIVE_SECONDS;

      if (isStale) {
        execEnd =
          lastProgress ||
          job.leaseExpiresAt ||
          new Date(execStart.getTime() + DEFAULT_JOB_ESTIMATED_DURATION_SECONDS * 1000);
        isOngoing = false;
        isEstimated = true;
        outcome = 'EXPIRED';
        hasIncompleteData = true;
      } else {
        outcome = 'RUNNING';
        isOngoing = true;
      }
    }

    rawIntervals.push({
      id: `imp-act-${job.id}`,
      bucket: 'AI_ACTIVE',
      phase,
      label: phaseLabel,
      startedAt: execStart.toISOString(),
      endedAt: execEnd?.toISOString() ?? null,
      durationSeconds: safeSeconds(execStart, execEnd, now),
      outcome,
      source: 'JOB',
      isEstimated,
      isOngoing,
    });
  }

  // 4. Audit-derived Human Waiting & Deploy Intervals
  for (let i = 0; i < audits.length; i++) {
    const audit = audits[i];
    const nextAudit = audits[i + 1];

    // WAITING_REPORTER: Clarification asked until answered
    if (audit.action === 'AGENT_ASKED_CLARIFICATION') {
      const waitEnd =
        nextAudit?.action === 'CLARIFICATION_ANSWERED'
          ? nextAudit.createdAt
          : nextAudit?.createdAt || (source.status === 'CLOSED' ? source.closedAt : null);
      rawIntervals.push({
        id: `wait-rep-${audit.id}`,
        bucket: 'USER_DANNY_WAIT',
        phase: 'WAITING_REPORTER',
        label: INBOX_TIMING_PHASE_LABELS.WAITING_REPORTER,
        startedAt: audit.createdAt.toISOString(),
        endedAt: waitEnd?.toISOString() ?? null,
        durationSeconds: safeSeconds(audit.createdAt, waitEnd, now),
        outcome: waitEnd ? 'COMPLETED' : 'RUNNING',
        source: 'AUDIT',
        isEstimated: false,
        isOngoing: !waitEnd,
      });
    }

    // WAITING_DANNY: Plan posted / clarity confirmed awaiting Danny Triage / Approval
    if (audit.action === 'AGENT_PLAN_POSTED' || audit.action === 'AGENT_CONFIRMED_CLARITY') {
      const approvalAudit = audits
        .slice(i + 1)
        .find(
          (a) =>
            a.action === 'IMPLEMENTATION_APPROVED' ||
            a.action === 'STATUS_APPROVED' ||
            a.action === 'DANNY_PLAN_CHANGES_REQUESTED'
        );
      const waitEnd = approvalAudit ? approvalAudit.createdAt : source.status === 'CLOSED' ? source.closedAt : null;
      rawIntervals.push({
        id: `wait-danny-plan-${audit.id}`,
        bucket: 'USER_DANNY_WAIT',
        phase: 'WAITING_DANNY',
        label: 'Chờ Danny duyệt kế hoạch / triage',
        startedAt: audit.createdAt.toISOString(),
        endedAt: waitEnd?.toISOString() ?? null,
        durationSeconds: safeSeconds(audit.createdAt, waitEnd, now),
        outcome: waitEnd ? 'COMPLETED' : 'RUNNING',
        source: 'AUDIT',
        isEstimated: false,
        isOngoing: !waitEnd,
      });
    }

    // WAITING_DANNY: Review ready awaiting Danny commit approval
    if (audit.action === 'AGENT_IMPLEMENTATION_REVIEW_READY') {
      const commitAudit = audits
        .slice(i + 1)
        .find((a) => a.action === 'DANNY_COMMIT_APPROVED' || a.action === 'DANNY_CHANGES_REQUESTED');
      const waitEnd = commitAudit ? commitAudit.createdAt : null;
      rawIntervals.push({
        id: `wait-danny-commit-${audit.id}`,
        bucket: 'USER_DANNY_WAIT',
        phase: 'WAITING_DANNY',
        label: 'Chờ Danny duyệt commit mã nguồn',
        startedAt: audit.createdAt.toISOString(),
        endedAt: waitEnd?.toISOString() ?? null,
        durationSeconds: safeSeconds(audit.createdAt, waitEnd, now),
        outcome: waitEnd ? 'COMPLETED' : 'RUNNING',
        source: 'AUDIT',
        isEstimated: false,
        isOngoing: !waitEnd,
      });
    }

    // WAITING_DANNY: Committed awaiting Danny deploy authorization
    if (audit.action === 'AGENT_IMPLEMENTATION_COMMITTED') {
      const deployAudit = audits.slice(i + 1).find((a) => a.action === 'DANNY_DEPLOY_APPROVED');
      const waitEnd = deployAudit ? deployAudit.createdAt : null;
      rawIntervals.push({
        id: `wait-danny-deploy-${audit.id}`,
        bucket: 'USER_DANNY_WAIT',
        phase: 'WAITING_DANNY',
        label: 'Chờ Danny duyệt triển khai (Deploy)',
        startedAt: audit.createdAt.toISOString(),
        endedAt: waitEnd?.toISOString() ?? null,
        durationSeconds: safeSeconds(audit.createdAt, waitEnd, now),
        outcome: waitEnd ? 'COMPLETED' : 'RUNNING',
        source: 'AUDIT',
        isEstimated: false,
        isOngoing: !waitEnd,
      });
    }

    // DEPLOY: Danny approved deploy to production
    if (audit.action === 'DANNY_DEPLOY_APPROVED') {
      const deployedAudit = audits
        .slice(i + 1)
        .find((a) => a.action === 'AGENT_IMPLEMENTATION_DEPLOYED' || a.action === 'AGENT_IMPLEMENTATION_DEPLOY_FAILED');
      let deployEnd = deployedAudit ? deployedAudit.createdAt : source.resolvedAt || null;
      let isOngoing = !deployEnd;
      let isEstimated = !deployedAudit;
      let outcome: InboxTimingOutcome = deployedAudit
        ? deployedAudit.action === 'AGENT_IMPLEMENTATION_DEPLOYED'
          ? 'COMPLETED'
          : 'FAILED'
        : 'COMPLETED';

      const MAX_DEPLOY_SECONDS = 30 * 60; // 30 mins deploy limit
      if (!deployEnd && safeSeconds(audit.createdAt, null, now) > MAX_DEPLOY_SECONDS) {
        const nextAuditAfterDeploy = audits.slice(i + 1)[0];
        deployEnd = nextAuditAfterDeploy
          ? nextAuditAfterDeploy.createdAt
          : new Date(audit.createdAt.getTime() + 15 * 60 * 1000);
        isOngoing = false;
        isEstimated = true;
        outcome = 'EXPIRED';
        hasIncompleteData = true;
      }

      rawIntervals.push({
        id: `act-deploy-${audit.id}`,
        bucket: 'AI_ACTIVE',
        phase: 'DEPLOY',
        label: INBOX_TIMING_PHASE_LABELS.DEPLOY,
        startedAt: audit.createdAt.toISOString(),
        endedAt: deployEnd?.toISOString() ?? null,
        durationSeconds: safeSeconds(audit.createdAt, deployEnd, now),
        outcome,
        source: 'AUDIT',
        isEstimated,
        isOngoing,
      });
    }

    // WAITING_REPORTER: Deployed awaiting reporter acceptance / verification
    if (
      audit.action === 'AGENT_IMPLEMENTATION_DEPLOYED' ||
      audit.action === 'DANNY_RELEASED_FOR_ACCEPTANCE' ||
      audit.action === 'DANNY_RELEASED_FOR_REPORTER_ACCEPTANCE'
    ) {
      const reporterAudit = audits
        .slice(i + 1)
        .find(
          (a) =>
            a.action === 'REPORTER_APPROVED' ||
            a.action === 'REPORTER_REOPENED' ||
            a.action === 'STATUS_CLOSED' ||
            a.action === 'ADMIN_OVERRIDE_CLOSED'
        );
      const waitEnd = reporterAudit ? reporterAudit.createdAt : source.closedAt || null;
      rawIntervals.push({
        id: `wait-rep-accept-${audit.id}`,
        bucket: 'USER_DANNY_WAIT',
        phase: 'WAITING_REPORTER',
        label: 'Chờ người yêu cầu nghiệm thu',
        startedAt: audit.createdAt.toISOString(),
        endedAt: waitEnd?.toISOString() ?? null,
        durationSeconds: safeSeconds(audit.createdAt, waitEnd, now),
        outcome: waitEnd ? 'COMPLETED' : 'RUNNING',
        source: 'AUDIT',
        isEstimated: false,
        isOngoing: !waitEnd,
      });
    }
  }

  // 5. Fallback for historical tickets that don't have fine-grained job rows
  if (rawIntervals.length === 0) {
    hasIncompleteData = true;
    if (source.startedAt && source.resolvedAt) {
      // Historical ticket with high-level start/resolve timestamps
      rawIntervals.push({
        id: `hist-act-${source.id}`,
        bucket: 'AI_ACTIVE',
        phase: 'CODE_TEST',
        label: `${INBOX_TIMING_PHASE_LABELS.CODE_TEST} (Lịch sử ước tính)`,
        startedAt: source.startedAt.toISOString(),
        endedAt: source.resolvedAt.toISOString(),
        durationSeconds: safeSeconds(source.startedAt, source.resolvedAt, now),
        outcome: 'COMPLETED',
        source: 'ESTIMATED',
        isEstimated: true,
        isOngoing: false,
      });

      if (source.createdAt < source.startedAt) {
        rawIntervals.push({
          id: `hist-wait-${source.id}`,
          bucket: 'USER_DANNY_WAIT',
          phase: 'WAITING_DANNY',
          label: `${INBOX_TIMING_PHASE_LABELS.WAITING_DANNY} (Lịch sử)`,
          startedAt: source.createdAt.toISOString(),
          endedAt: source.startedAt.toISOString(),
          durationSeconds: safeSeconds(source.createdAt, source.startedAt, now),
          outcome: 'COMPLETED',
          source: 'ESTIMATED',
          isEstimated: true,
          isOngoing: false,
        });
      }
    } else {
      // Ticket just created or awaiting triage
      rawIntervals.push({
        id: `init-wait-${source.id}`,
        bucket: 'USER_DANNY_WAIT',
        phase: 'WAITING_DANNY',
        label: 'Chờ xem xét ban đầu',
        startedAt: source.createdAt.toISOString(),
        endedAt: source.closedAt?.toISOString() ?? null,
        durationSeconds: safeSeconds(source.createdAt, source.closedAt, now),
        outcome: source.closedAt ? 'COMPLETED' : 'RUNNING',
        source: 'AUDIT',
        isEstimated: false,
        isOngoing: !source.closedAt,
      });
    }
  }

  // Sort intervals chronologically
  rawIntervals.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  // Aggregate totals
  let totalAiActiveSeconds = 0;
  let totalUserDannyWaitSeconds = 0;
  let totalSystemWaitSeconds = 0;
  const aiActiveByPhase: Partial<Record<InboxTimingPhase, number>> = {};

  for (const interval of rawIntervals) {
    if (interval.bucket === 'AI_ACTIVE') {
      totalAiActiveSeconds += interval.durationSeconds;
      aiActiveByPhase[interval.phase] = (aiActiveByPhase[interval.phase] ?? 0) + interval.durationSeconds;
    } else if (interval.bucket === 'USER_DANNY_WAIT') {
      totalUserDannyWaitSeconds += interval.durationSeconds;
    } else if (interval.bucket === 'SYSTEM_WAIT') {
      totalSystemWaitSeconds += interval.durationSeconds;
    }
  }

  // End-to-end duration from ticket creation to resolution / closure (or now)
  const endMarker = source.closedAt || source.resolvedAt || null;
  const endToEndSeconds = safeSeconds(source.createdAt, endMarker, now);

  const requestType = (source.requestType === 'FEATURE' ? 'FEATURE' : 'BUG') as BugReportRequestType;

  return {
    reportId: source.id,
    reportKey: formatBugReportKey(source.id, requestType),
    requestType,
    title: source.title,
    status: source.status as BugReportStatus,
    reportedAt: source.createdAt.toISOString(),
    resolvedAt: source.resolvedAt?.toISOString() ?? null,
    totalAiActiveSeconds,
    totalUserDannyWaitSeconds,
    totalSystemWaitSeconds,
    endToEndSeconds,
    aiActiveByPhase,
    intervals: rawIntervals,
    hasIncompleteData,
  };
}

/**
 * Aggregates timing across multiple tickets to build the Weekly/Monthly Dashboard.
 */
export function aggregateExecutionDashboard(
  ticketsTiming: InboxTicketExecutionTiming[],
  period: 'WEEK' | 'MONTH' | 'ALL',
  startDate: string,
  endDate: string
): InboxExecutionDashboardSummary {
  const totalTickets = ticketsTiming.length;
  let totalAiActiveSeconds = 0;
  let totalUserDannyWaitSeconds = 0;
  let totalSystemWaitSeconds = 0;
  let totalEndToEndSeconds = 0;

  const allAiSeconds: number[] = [];
  const bugAiSeconds: number[] = [];
  const featAiSeconds: number[] = [];

  let bugTotalAi = 0;
  let featTotalAi = 0;
  let bugCount = 0;
  let featCount = 0;

  const phaseDurations: Record<InboxTimingPhase, number[]> = {
    ANALYSIS_PLAN: [],
    CODE_TEST: [],
    RETRY_FIX: [],
    DEPLOY: [],
    POST_DEPLOY_VERIFICATION: [],
    WAITING_REPORTER: [],
    WAITING_DANNY: [],
    SYSTEM_QUEUE: [],
    BLOCKED: [],
  };

  for (const t of ticketsTiming) {
    totalAiActiveSeconds += t.totalAiActiveSeconds;
    totalUserDannyWaitSeconds += t.totalUserDannyWaitSeconds;
    totalSystemWaitSeconds += t.totalSystemWaitSeconds;
    totalEndToEndSeconds += t.endToEndSeconds;

    allAiSeconds.push(t.totalAiActiveSeconds);

    if (t.requestType === 'FEATURE') {
      featCount++;
      featTotalAi += t.totalAiActiveSeconds;
      featAiSeconds.push(t.totalAiActiveSeconds);
    } else {
      bugCount++;
      bugTotalAi += t.totalAiActiveSeconds;
      bugAiSeconds.push(t.totalAiActiveSeconds);
    }

    for (const interval of t.intervals) {
      if (interval.phase in phaseDurations) {
        phaseDurations[interval.phase].push(interval.durationSeconds);
      }
    }
  }

  // Phase metrics
  const byPhase: InboxExecutionPhaseMetric[] = (Object.keys(phaseDurations) as InboxTimingPhase[]).map((phase) => {
    const list = phaseDurations[phase];
    const total = list.reduce((acc, v) => acc + v, 0);
    const count = list.length;
    let bucket: InboxTimingBucket = 'AI_ACTIVE';
    if (phase === 'WAITING_REPORTER' || phase === 'WAITING_DANNY') {
      bucket = 'USER_DANNY_WAIT';
    } else if (phase === 'SYSTEM_QUEUE' || phase === 'BLOCKED') {
      bucket = 'SYSTEM_WAIT';
    }

    return {
      phase,
      bucket,
      label: INBOX_TIMING_PHASE_LABELS[phase] || phase,
      totalSeconds: total,
      count,
      medianSeconds: calculateMedian(list),
      p95Seconds: calculatePercentile(list, 95),
    };
  });

  // Top time-consuming tickets (ranked by totalAiActiveSeconds desc)
  const sortedByAi = [...ticketsTiming].sort((a, b) => b.totalAiActiveSeconds - a.totalAiActiveSeconds);
  const topTimeConsumingTickets: InboxExecutionTopTicket[] = sortedByAi.slice(0, 15).map((t) => ({
    reportId: t.reportId,
    reportKey: t.reportKey,
    title: t.title,
    requestType: t.requestType,
    status: t.status,
    aiActiveSeconds: t.totalAiActiveSeconds,
    userDannyWaitSeconds: t.totalUserDannyWaitSeconds,
    systemWaitSeconds: t.totalSystemWaitSeconds,
    endToEndSeconds: t.endToEndSeconds,
  }));

  return {
    period,
    startDate,
    endDate,
    totalTickets,
    totalAiActiveSeconds,
    totalUserDannyWaitSeconds,
    totalSystemWaitSeconds,
    totalEndToEndSeconds,
    medianAiActiveSeconds: calculateMedian(allAiSeconds),
    p95AiActiveSeconds: calculatePercentile(allAiSeconds, 95),
    byRequestType: {
      BUG: {
        ticketCount: bugCount,
        totalAiSeconds: bugTotalAi,
        medianAiSeconds: calculateMedian(bugAiSeconds),
        p95AiSeconds: calculatePercentile(bugAiSeconds, 95),
      },
      FEATURE: {
        ticketCount: featCount,
        totalAiSeconds: featTotalAi,
        medianAiSeconds: calculateMedian(featAiSeconds),
        p95AiSeconds: calculatePercentile(featAiSeconds, 95),
      },
    },
    byPhase,
    topTimeConsumingTickets,
  };
}

export class InboxExecutionTimeService {
  constructor(private readonly fastify: FastifyInstance) {}

  async getTicketTiming(reportId: number): Promise<InboxTicketExecutionTiming | null> {
    const report = await this.fastify.prisma.crm.crmBugReport.findUnique({
      where: { id: reportId },
      include: {
        audits: {
          select: {
            id: true,
            action: true,
            note: true,
            createdAt: true,
          },
          orderBy: { id: 'asc' },
        },
        inboxPlanJobs: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            leasedBy: true,
            leaseExpiresAt: true,
            resultAction: true,
          },
          orderBy: { id: 'asc' },
        },
        inboxFollowUpJobs: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            leasedBy: true,
            leaseExpiresAt: true,
            resultAction: true,
          },
          orderBy: { id: 'asc' },
        },
        inboxImplementationJobs: {
          select: {
            id: true,
            status: true,
            executionPhase: true,
            retrySequence: true,
            startedAt: true,
            completedAt: true,
            updatedAt: true,
            createdAt: true,
            leaseExpiresAt: true,
            leaseHeartbeatAt: true,
            lastProgressAt: true,
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!report) return null;
    return calculateTicketExecutionTiming(report);
  }

  async getDashboardSummary(query: InboxExecutionDashboardQuery): Promise<InboxExecutionDashboardSummary> {
    const period = query.period || 'WEEK';
    const now = new Date();
    let startDate: Date;
    const endDate = now;

    if (query.dateFrom) {
      startDate = new Date(query.dateFrom);
    } else if (period === 'WEEK') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'MONTH') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(0); // ALL
    }

    const where: {
      createdAt?: { gte?: Date; lte?: Date };
      requestType?: string;
    } = {};

    if (period !== 'ALL' || query.dateFrom) {
      where.createdAt = { gte: startDate, lte: endDate };
    }

    if (query.requestType && query.requestType !== 'ALL') {
      where.requestType = query.requestType;
    }

    const reports = await this.fastify.prisma.crm.crmBugReport.findMany({
      where,
      include: {
        audits: {
          select: {
            id: true,
            action: true,
            note: true,
            createdAt: true,
          },
          orderBy: { id: 'asc' },
        },
        inboxPlanJobs: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            leasedBy: true,
            leaseExpiresAt: true,
            resultAction: true,
          },
          orderBy: { id: 'asc' },
        },
        inboxFollowUpJobs: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            leasedBy: true,
            leaseExpiresAt: true,
            resultAction: true,
          },
          orderBy: { id: 'asc' },
        },
        inboxImplementationJobs: {
          select: {
            id: true,
            status: true,
            executionPhase: true,
            retrySequence: true,
            startedAt: true,
            completedAt: true,
            updatedAt: true,
            createdAt: true,
            leaseExpiresAt: true,
            leaseHeartbeatAt: true,
            lastProgressAt: true,
          },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { id: 'desc' },
    });

    const ticketsTiming = reports.map((r) => calculateTicketExecutionTiming(r, now));

    return aggregateExecutionDashboard(ticketsTiming, period, startDate.toISOString(), endDate.toISOString());
  }
}
