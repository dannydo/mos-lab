import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMedian,
  calculatePercentile,
  calculateTicketExecutionTiming,
  aggregateExecutionDashboard,
  type RawTicketTimingSource,
} from './inbox-execution-time.service.js';

describe('InboxExecutionTimeService', () => {
  describe('Statistical calculations (Median & Percentile)', () => {
    it('calculates median correctly for empty, odd, and even datasets', () => {
      assert.equal(calculateMedian([]), 0);
      assert.equal(calculateMedian([42]), 42);
      assert.equal(calculateMedian([10, 20, 30]), 20);
      assert.equal(calculateMedian([10, 20, 30, 40]), 25);
      assert.equal(calculateMedian([40, 10, 30, 20]), 25); // Unsorted input
    });

    it('calculates 95th percentile correctly across diverse ranges', () => {
      assert.equal(calculatePercentile([], 95), 0);
      assert.equal(calculatePercentile([100], 95), 100);
      const dataset = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
      assert.equal(calculatePercentile(dataset, 95), 95);
      assert.equal(calculatePercentile(dataset, 50), 50);
    });
  });

  describe('Ticket timing interval classification & isolation (Kinh Thánh mOS UI-008)', () => {
    it('isolates AI active time strictly from WAITING_DANNY, WAITING_REPORTER, and SYSTEM_QUEUE', () => {
      const baseTime = new Date('2026-09-01T10:00:00.000Z');
      const codeStart = new Date('2026-09-01T10:05:00.000Z');
      const codeEnd = new Date('2026-09-01T10:25:00.000Z'); // 20 mins AI code/test (1200s)
      const reviewReady = new Date('2026-09-01T10:25:00.000Z');
      const dannyApproved = new Date('2026-09-01T12:25:00.000Z'); // 2 hours Danny wait (7200s)
      const deployEnd = new Date('2026-09-01T12:32:00.000Z'); // 7 mins AI deploy (420s)
      const reporterAccept = new Date('2026-09-01T15:32:00.000Z'); // 3 hours Reporter wait (10800s)

      const source: RawTicketTimingSource = {
        id: 101,
        requestType: 'FEATURE',
        title: 'Thêm bộ đo thời gian Agent',
        status: 'CLOSED',
        createdAt: baseTime,
        startedAt: codeStart,
        resolvedAt: deployEnd,
        closedAt: reporterAccept,
        inboxImplementationJobs: [
          {
            id: 'job-1',
            status: 'AWAITING_COMMIT_REVIEW',
            retrySequence: 0,
            createdAt: baseTime,
            startedAt: codeStart,
            completedAt: codeEnd,
            updatedAt: codeEnd,
          },
        ],
        audits: [
          {
            id: 1,
            action: 'AGENT_IMPLEMENTATION_REVIEW_READY',
            createdAt: reviewReady,
          },
          {
            id: 2,
            action: 'DANNY_COMMIT_APPROVED',
            createdAt: dannyApproved,
          },
          {
            id: 3,
            action: 'DANNY_DEPLOY_APPROVED',
            createdAt: dannyApproved,
          },
          {
            id: 4,
            action: 'AGENT_IMPLEMENTATION_DEPLOYED',
            createdAt: deployEnd,
          },
          {
            id: 5,
            action: 'REPORTER_APPROVED',
            createdAt: reporterAccept,
          },
        ],
      };

      const result = calculateTicketExecutionTiming(source, reporterAccept);

      // AI active time: 20 mins code/test (1200s) + 7 mins deploy (420s) = 1620s (27 mins)
      assert.equal(result.totalAiActiveSeconds, 1620);
      assert.equal(result.aiActiveByPhase.CODE_TEST, 1200);
      assert.equal(result.aiActiveByPhase.DEPLOY, 420);

      // User & Danny wait: 2 hours Danny wait (7200s) + 3 hours Reporter wait (10800s) = 18000s
      assert.equal(result.totalUserDannyWaitSeconds, 18000);

      // System queue: 5 mins queue before worker start = 300s
      assert.equal(result.totalSystemWaitSeconds, 300);

      // Key invariant: total AI active time MUST NOT include Danny or Reporter wait or Queue
      assert.ok(result.totalAiActiveSeconds < result.totalUserDannyWaitSeconds);
      assert.equal(result.hasIncompleteData, false);
    });

    it('classifies retry implementation jobs as RETRY_FIX phase', () => {
      const start = new Date('2026-09-01T10:00:00.000Z');
      const end = new Date('2026-09-01T10:15:00.000Z');

      const source: RawTicketTimingSource = {
        id: 102,
        requestType: 'BUG',
        title: 'Lỗi retry hiển thị',
        status: 'IN_PROGRESS',
        createdAt: start,
        inboxImplementationJobs: [
          {
            id: 'job-retry-1',
            status: 'COMPLETED',
            retrySequence: 1, // Retry sequence > 0
            createdAt: start,
            startedAt: start,
            completedAt: end,
            updatedAt: end,
          },
        ],
      };

      const result = calculateTicketExecutionTiming(source, end);
      assert.equal(result.totalAiActiveSeconds, 900);
      assert.equal(result.aiActiveByPhase.RETRY_FIX, 900);
      assert.equal(result.aiActiveByPhase.CODE_TEST, undefined);
    });

    it('prevents infinite durations for abandoned or stale running jobs without heartbeat', () => {
      const created = new Date('2026-09-01T10:00:00.000Z');
      const leaseExpires = new Date('2026-09-01T10:12:00.000Z'); // 12 mins lease
      const now = new Date('2026-09-10T10:00:00.000Z'); // 9 days later!

      const source: RawTicketTimingSource = {
        id: 103,
        requestType: 'BUG',
        title: 'Job bị crash',
        status: 'IN_PROGRESS',
        createdAt: created,
        inboxImplementationJobs: [
          {
            id: 'stale-job',
            status: 'RUNNING', // Abandoned in RUNNING status
            retrySequence: 0,
            createdAt: created,
            startedAt: created,
            completedAt: null,
            updatedAt: created,
            leaseExpiresAt: leaseExpires,
          },
        ],
      };

      const result = calculateTicketExecutionTiming(source, now);

      // Must be capped at leaseExpires (12 mins = 720s), NOT 9 days!
      assert.equal(result.totalAiActiveSeconds, 720);
      assert.equal(result.hasIncompleteData, true);
      const staleInterval = result.intervals.find((i) => i.id === 'imp-act-stale-job');
      assert.ok(staleInterval);
      assert.equal(staleInterval.outcome, 'EXPIRED');
      assert.equal(staleInterval.isEstimated, true);
      assert.equal(staleInterval.isOngoing, false);
    });

    it('flags sparse historical tickets without fine-grained jobs as estimated', () => {
      const created = new Date('2026-08-01T08:00:00.000Z');
      const started = new Date('2026-08-01T09:00:00.000Z');
      const resolved = new Date('2026-08-01T09:45:00.000Z');

      const source: RawTicketTimingSource = {
        id: 104,
        requestType: 'BUG',
        title: 'Vé lịch sử thời kỳ đầu',
        status: 'FIXED',
        createdAt: created,
        startedAt: started,
        resolvedAt: resolved,
      };

      const result = calculateTicketExecutionTiming(source, resolved);
      assert.equal(result.hasIncompleteData, true);
      assert.equal(result.totalAiActiveSeconds, 2700); // 45 mins
      assert.equal(result.totalUserDannyWaitSeconds, 3600); // 1 hour wait
      assert.ok(result.intervals.some((i) => i.isEstimated));
    });

    it('maintains strict privacy: timing objects contain only operational metadata and no prompts or secrets', () => {
      const source: RawTicketTimingSource = {
        id: 105,
        requestType: 'BUG',
        title: 'Kiểm tra privacy',
        status: 'FIXED',
        createdAt: new Date('2026-09-01T10:00:00.000Z'),
        audits: [
          {
            id: 10,
            action: 'CREATED',
            note: 'Sensitive internal customer phone 0901234567 token secret_xyz',
            createdAt: new Date('2026-09-01T10:00:00.000Z'),
          },
        ],
      };

      const result = calculateTicketExecutionTiming(source);
      const json = JSON.stringify(result);
      assert.ok(!json.includes('0901234567'));
      assert.ok(!json.includes('secret_xyz'));
      assert.ok(!json.includes('token'));
    });
  });

  describe('Dashboard aggregation across multiple tickets', () => {
    it('correctly calculates totals, medians, p95, and top time-consuming tickets', () => {
      const ticket1 = calculateTicketExecutionTiming({
        id: 1,
        requestType: 'BUG',
        title: 'Bug nhanh',
        status: 'FIXED',
        createdAt: new Date('2026-09-01T10:00:00Z'),
        startedAt: new Date('2026-09-01T10:00:00Z'),
        resolvedAt: new Date('2026-09-01T10:10:00Z'), // 600s
      });

      const ticket2 = calculateTicketExecutionTiming({
        id: 2,
        requestType: 'FEATURE',
        title: 'Feature vừa',
        status: 'FIXED',
        createdAt: new Date('2026-09-01T10:00:00Z'),
        startedAt: new Date('2026-09-01T10:00:00Z'),
        resolvedAt: new Date('2026-09-01T10:30:00Z'), // 1800s
      });

      const ticket3 = calculateTicketExecutionTiming({
        id: 3,
        requestType: 'FEATURE',
        title: 'Feature tốn nhiều thời gian',
        status: 'FIXED',
        createdAt: new Date('2026-09-01T10:00:00Z'),
        startedAt: new Date('2026-09-01T10:00:00Z'),
        resolvedAt: new Date('2026-09-01T11:00:00Z'), // 3600s
      });

      const summary = aggregateExecutionDashboard(
        [ticket1, ticket2, ticket3],
        'WEEK',
        '2026-09-01T00:00:00.000Z',
        '2026-09-07T23:59:59.999Z'
      );

      assert.equal(summary.totalTickets, 3);
      assert.equal(summary.totalAiActiveSeconds, 6000); // 600 + 1800 + 3600
      assert.equal(summary.medianAiActiveSeconds, 1800);
      assert.equal(summary.p95AiActiveSeconds, 3600);

      // By request type
      assert.equal(summary.byRequestType.BUG.ticketCount, 1);
      assert.equal(summary.byRequestType.BUG.totalAiSeconds, 600);
      assert.equal(summary.byRequestType.FEATURE.ticketCount, 2);
      assert.equal(summary.byRequestType.FEATURE.totalAiSeconds, 5400);

      // Top time consuming tickets ranking
      assert.equal(summary.topTimeConsumingTickets.length, 3);
      assert.equal(summary.topTimeConsumingTickets[0].reportId, 3); // Highest first
      assert.equal(summary.topTimeConsumingTickets[0].aiActiveSeconds, 3600);
      assert.equal(summary.topTimeConsumingTickets[1].reportId, 2);
      assert.equal(summary.topTimeConsumingTickets[2].reportId, 1);
    });
  });
});
