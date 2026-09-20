import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';
import { FrontendTelemetryService } from './telemetry.service.js';
import type { FrontendIssuePayload } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';

describe('FrontendTelemetryService', () => {
  beforeEach(() => {
    FrontendTelemetryService.clear();
  });

  const mockPayload: FrontendIssuePayload = {
    issueId: 'test_123',
    fingerprint: 'fp_test_abc',
    issueType: 'RAGE_CLICK',
    occurredAt: '2026-09-20T11:00:00.000Z',
    userId: 129,
    userName: 'Tina Ngo',
    userRole: 'cc',
    path: '/dashboard/cc',
    pageTitle: 'CC Dashboard',
    breadcrumbs: [
      {
        timestamp: '2026-09-20T10:59:59.000Z',
        category: 'ui',
        action: 'click',
        target: 'button[Tạo đơn]',
        path: '/dashboard/cc',
      },
    ],
    error: null,
    clientContext: {
      viewport: { width: 1440, height: 900, devicePixelRatio: 2 },
      userAgent: 'Mozilla/5.0 Test',
      online: true,
      timeZone: 'Asia/Ho_Chi_Minh',
    },
  };

  test('records a new frontend issue successfully', async () => {
    const res = await FrontendTelemetryService.recordIssue(mockPayload);
    assert.equal(res.success, true);
    assert.equal(res.issueId, 'test_123');

    const summaries = FrontendTelemetryService.getSummaries();
    assert.equal(summaries.length, 1);
    assert.equal(summaries[0].fingerprint, 'fp_test_abc');
    assert.equal(summaries[0].occurrenceCount, 1);
    assert.equal(summaries[0].issueType, 'RAGE_CLICK');
  });

  test('aggregates multiple occurrences of the same fingerprint', async () => {
    await FrontendTelemetryService.recordIssue(mockPayload);

    const secondPayload: FrontendIssuePayload = {
      ...mockPayload,
      issueId: 'test_456',
      occurredAt: '2026-09-20T11:00:10.000Z',
    };
    await FrontendTelemetryService.recordIssue(secondPayload);

    const summaries = FrontendTelemetryService.getSummaries();
    assert.equal(summaries.length, 1);
    assert.equal(summaries[0].occurrenceCount, 2);
    assert.equal(summaries[0].lastSeenAt, '2026-09-20T11:00:10.000Z');
    assert.equal(summaries[0].latestIssue.issueId, 'test_456');

    const raw = FrontendTelemetryService.getRawIssues();
    assert.equal(raw.length, 2);
  });

  test('rejects invalid payloads safely', async () => {
    const res = await FrontendTelemetryService.recordIssue({} as FrontendIssuePayload);
    assert.equal(res.success, false);
  });

  test('provides in-memory fallback list and metrics when db is absent', async () => {
    await FrontendTelemetryService.recordIssue(mockPayload);
    const fakeFastify = {} as FastifyInstance;

    const listRes = await FrontendTelemetryService.list(fakeFastify);
    assert.equal(listRes.total, 1);
    assert.equal(listRes.data[0].fingerprint, 'fp_test_abc');
    assert.equal(listRes.data[0].status, 'NEW');
    assert.equal(listRes.metrics.totalCount, 1);
    assert.equal(listRes.metrics.newCount, 1);

    const metrics = await FrontendTelemetryService.getMetrics(fakeFastify);
    assert.equal(metrics.totalCount, 1);
    assert.equal(metrics.newCount, 1);
  });
});
