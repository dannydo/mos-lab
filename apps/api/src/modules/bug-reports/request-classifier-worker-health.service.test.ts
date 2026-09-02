import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveRequestClassifierWorkerHealthState,
  isStaleRequestClassifierWorkerHeartbeat,
  normalizeRequestClassifierWorkerHeartbeat,
  requestClassifierWorkerHealthThresholds,
} from './request-classifier-worker-health.service.js';

const thresholds = requestClassifierWorkerHealthThresholds({});
const serverNow = new Date('2026-09-03T03:00:00.000Z');

test('worker health is server-authoritative at the 90s / 180s heartbeat boundaries', () => {
  const row = {
    lastHeartbeatAt: new Date(serverNow.getTime() - 90_000),
    consecutiveFailureCount: 0,
    lastOutcomeSeverity: null,
    lastOutcomeAt: null,
  };
  assert.equal(deriveRequestClassifierWorkerHealthState(row, serverNow, thresholds).state, 'ONLINE');
  assert.equal(
    deriveRequestClassifierWorkerHealthState(
      { ...row, lastHeartbeatAt: new Date(serverNow.getTime() - 91_000) },
      serverNow,
      thresholds
    ).state,
    'DEGRADED'
  );
  assert.equal(
    deriveRequestClassifierWorkerHealthState(
      { ...row, lastHeartbeatAt: new Date(serverNow.getTime() - 180_000) },
      serverNow,
      thresholds
    ).state,
    'OFFLINE'
  );
});

test('current serious errors and sustained failures degrade a fresh heartbeat', () => {
  assert.equal(
    deriveRequestClassifierWorkerHealthState(
      {
        lastHeartbeatAt: serverNow,
        consecutiveFailureCount: 0,
        lastOutcomeSeverity: 'ERROR',
        lastOutcomeAt: new Date(serverNow.getTime() - 10_000),
      },
      serverNow,
      thresholds
    ).reason,
    'SERIOUS_CURRENT_FAILURE'
  );
  assert.equal(
    deriveRequestClassifierWorkerHealthState(
      {
        lastHeartbeatAt: serverNow,
        consecutiveFailureCount: thresholds.sustainedFailureCount,
        lastOutcomeSeverity: 'WARNING',
        lastOutcomeAt: serverNow,
      },
      serverNow,
      thresholds
    ).reason,
    'SUSTAINED_FAILURES'
  );
});

test('heartbeat validation keeps only bounded operational metadata', () => {
  const heartbeat = normalizeRequestClassifierWorkerHeartbeat(
    {
      workerId: 'mac-operations',
      workerVersion: 'request-classifier-worker-v1',
      sessionId: '2c6c6c4e-0f8f-4ab8-8c33-91b531a344ef',
      sequence: 4,
      sentAt: serverNow.toISOString(),
      connectionMode: 'WEBSOCKET',
      activeJob: { kind: 'INBOX_PLAN', startedAt: serverNow.toISOString() },
      latestOutcome: {
        kind: 'INBOX_FOLLOW_UP',
        status: 'SUCCEEDED',
        severity: 'INFO',
        code: 'COMPLETED',
        occurredAt: serverNow.toISOString(),
      },
    },
    serverNow
  );
  assert.equal(heartbeat.activeJob?.kind, 'INBOX_PLAN');
  assert.equal(heartbeat.latestOutcome?.code, 'COMPLETED');
  assert.throws(
    () =>
      normalizeRequestClassifierWorkerHeartbeat(
        { ...heartbeat, latestOutcome: { ...heartbeat.latestOutcome!, code: 'contains ticket text' } },
        serverNow
      ),
    /không hợp lệ/
  );
  const oldButSafeOutcome = normalizeRequestClassifierWorkerHeartbeat(
    {
      ...heartbeat,
      sequence: 5,
      sentAt: serverNow.toISOString(),
      latestOutcome: { ...heartbeat.latestOutcome!, occurredAt: '2026-08-03T03:00:00.000Z' },
    },
    serverNow
  );
  assert.equal(oldButSafeOutcome.latestOutcome?.occurredAt, '2026-08-03T03:00:00.000Z');
});

test('a stale heartbeat cannot overwrite a newer heartbeat or sequence', () => {
  const current = {
    sessionId: 'new-session',
    lastSequence: 9,
    lastClientSentAt: new Date('2026-09-03T03:00:01.000Z'),
  };
  assert.equal(
    isStaleRequestClassifierWorkerHeartbeat(
      { sessionId: 'old-session', sequence: 999, clientSentAt: new Date('2026-09-03T03:00:00.999Z') },
      current
    ),
    true
  );
  assert.equal(
    isStaleRequestClassifierWorkerHeartbeat(
      { sessionId: 'new-session', sequence: 9, clientSentAt: current.lastClientSentAt },
      current
    ),
    true
  );
  assert.equal(
    isStaleRequestClassifierWorkerHeartbeat(
      { sessionId: 'restarted-session', sequence: 1, clientSentAt: new Date('2026-09-03T03:00:02.000Z') },
      current
    ),
    false
  );
});

test('threshold configuration never permits offline before online expires', () => {
  const configured = requestClassifierWorkerHealthThresholds({
    MOS_REQUEST_CLASSIFIER_WORKER_ONLINE_SECONDS: '120',
    MOS_REQUEST_CLASSIFIER_WORKER_OFFLINE_SECONDS: '60',
  });
  assert.equal(configured.onlineWithinSeconds, 120);
  assert.equal(configured.offlineAfterSeconds, 121);
});
