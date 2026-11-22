import {
  type InboxExecutionDashboardSummary,
  type InboxExecutionPhaseMetric,
  type InboxExecutionTopTicket,
  type InboxTicketExecutionTiming,
  type InboxTimingBucket,
  type InboxTimingPhase,
  INBOX_TIMING_PHASE_LABELS,
} from '@mos-lab/shared';

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
