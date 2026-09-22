import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';
import { FrontendTelemetryService, generateAgAnalysis, classifyIssueIntoCluster } from './telemetry.service.js';
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
    const metrics = await FrontendTelemetryService.getMetrics(fakeFastify);
    assert.equal(metrics.totalCount, 1);
    assert.equal(metrics.newCount, 1);
  });

  test('generates accurate AG analysis for CallLogModal rage click', () => {
    const analysis = generateAgAnalysis({
      id: 37,
      fingerprint: 'fp_rage_call_log',
      issueType: 'RAGE_CLICK',
      path: '/dashboard/nyc',
      target: 'textarea[Gọi nhỡ - Không trả lời]',
      message: 'User clicked textarea 3 times rapidly',
      occurrenceCount: 73,
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      status: 'NEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    assert.equal(analysis.severity, 'P1');
    assert.equal(analysis.category, 'Trải nghiệm Booker / Call Wrapup UX');
    assert.ok(analysis.affectedFiles.includes('apps/web/components/CallLogModal.tsx'));
    assert.ok(analysis.proposedFix.length >= 2);
  });

  test('generates accurate AG analysis for slow API and uncaught SDK exceptions', () => {
    const slowAnalysis = generateAgAnalysis({
      id: 115,
      fingerprint: 'fp_slow_bug_reports',
      issueType: 'SLOW_INTERACTION',
      path: '/dashboard/customers',
      target: 'GET /bug-reports/mine',
      message: 'API request took 4161ms (slow response)',
      occurrenceCount: 162,
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      status: 'NEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    assert.equal(slowAnalysis.severity, 'P1');
    assert.ok(slowAnalysis.affectedFiles.includes('apps/api/src/modules/bug-reports/bug-report.service.ts'));

    const sdkCrash = generateAgAnalysis({
      id: 185,
      fingerprint: 'fp_sdk_uninit',
      issueType: 'UNCAUGHT_EXCEPTION',
      path: '/dashboard/nyc',
      message: 'Uncaught Error: SDK not initialized',
      occurrenceCount: 13,
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      status: 'NEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    assert.equal(sdkCrash.severity, 'P0');
    assert.ok(sdkCrash.affectedFiles.includes('apps/web/context/omicall/OmiCallProvider.tsx'));
  });

  test('correctly classifies issues into the 5 root-cause clusters', () => {
    // 1. POLLING_SLOW_API
    assert.equal(
      classifyIssueIntoCluster({
        issueType: 'SLOW_INTERACTION',
        path: '/dashboard/nyc',
        target: 'GET /bug-reports/mine',
        message: 'API request took 4500ms',
      }),
      'POLLING_SLOW_API'
    );

    // 2. RAGE_CLICK_CALL_LOG
    assert.equal(
      classifyIssueIntoCluster({
        issueType: 'RAGE_CLICK',
        path: '/dashboard/telesales',
        target: 'textarea[Gọi nhỡ - Không trả lời]',
        message: 'User clicked textarea rapidly',
      }),
      'RAGE_CLICK_CALL_LOG'
    );

    // 3. WEBRTC_SDK_CRASH
    assert.equal(
      classifyIssueIntoCluster({
        issueType: 'UNCAUGHT_EXCEPTION',
        path: '/dashboard/calls',
        message: 'Uncaught Error: SDK not initialized',
      }),
      'WEBRTC_SDK_CRASH'
    );

    // 4. OTHER_SLOW_INTERACTION
    assert.equal(
      classifyIssueIntoCluster({
        issueType: 'SLOW_INTERACTION',
        path: '/dashboard/orders',
        message: 'Table render took 3200ms',
      }),
      'OTHER_SLOW_INTERACTION'
    );

    // 5. OTHER_UI_RAGE_CLICK
    assert.equal(
      classifyIssueIntoCluster({
        issueType: 'RAGE_CLICK',
        path: '/dashboard/settings',
        target: 'button[Lưu cài đặt]',
        message: 'User clicked button 5 times',
      }),
      'OTHER_UI_RAGE_CLICK'
    );
  });

  test('getClusters partitions memory issues into 5 clusters and returns summary', async () => {
    await FrontendTelemetryService.recordIssue(mockPayload);
    const fakeFastify = {} as FastifyInstance;

    const res = await FrontendTelemetryService.getClusters(fakeFastify);
    assert.equal(res.clusters.length, 5);
    assert.equal(res.summary.totalClusters, 5);
    assert.equal(res.summary.totalIssuesClustered, 1);
    const otherUiCluster = res.clusters.find((c) => c.clusterKey === 'OTHER_UI_RAGE_CLICK');
    assert.ok(otherUiCluster);
    assert.equal(otherUiCluster.issueCount, 1);
  });
});
