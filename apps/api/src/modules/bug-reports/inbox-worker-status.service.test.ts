import test from 'node:test';
import assert from 'node:assert/strict';
import { InboxWorkerStatusService } from './inbox-worker-status.service.js';

test('InboxWorkerStatusService tracks AG and Codex heartbeats independently', async () => {
  InboxWorkerStatusService.resetForTesting();
  const now = new Date('2026-09-21T10:00:00.000Z');

  // Initially both offline when no heartbeats
  const fastifyMock = {
    prisma: {
      crm: {
        crmConfig: {
          findMany: async () => [],
          upsert: async () => ({}),
        },
        crmInboxImplementationJob: { findMany: async () => [] },
      },
    },
  };

  const initial = await InboxWorkerStatusService.getDualWorkersStatus(fastifyMock as never, now);
  assert.equal(initial.ag.isOnline, false);
  assert.equal(initial.codex.isOnline, false);
  assert.equal(initial.ag.activeTask, null);
  assert.equal(initial.codex.activeTask, null);

  // Record AG heartbeat at now
  InboxWorkerStatusService.recordHeartbeat('AG', 'ag-test-prov', fastifyMock as never, now);
  const afterAg = await InboxWorkerStatusService.getDualWorkersStatus(fastifyMock as never, now);
  assert.equal(afterAg.ag.isOnline, true);
  assert.equal(afterAg.codex.isOnline, false);

  // 30 seconds later: AG is still online (< 45s)
  const after30s = new Date(now.getTime() + 30_000);
  const statusAfter30s = await InboxWorkerStatusService.getDualWorkersStatus(fastifyMock as never, after30s);
  assert.equal(statusAfter30s.ag.isOnline, true);
  assert.equal(statusAfter30s.codex.isOnline, false);

  // 50 seconds later: AG is offline (> 45s)
  const after50s = new Date(now.getTime() + 50_000);
  const statusAfter50s = await InboxWorkerStatusService.getDualWorkersStatus(fastifyMock as never, after50s);
  assert.equal(statusAfter50s.ag.isOnline, false);

  // Record Codex heartbeat at after50s
  InboxWorkerStatusService.recordHeartbeat('IDE', 'codex-test-prov', fastifyMock as never, after50s);
  const statusCodex = await InboxWorkerStatusService.getDualWorkersStatus(fastifyMock as never, after50s);
  assert.equal(statusCodex.ag.isOnline, false);
  assert.equal(statusCodex.codex.isOnline, true);
});

test('InboxWorkerStatusService assigns active tasks to correct worker based on executionOwner', async () => {
  InboxWorkerStatusService.resetForTesting();
  const now = new Date('2026-09-21T10:00:00.000Z');

  const fastifyMock = {
    prisma: {
      crm: {
        crmConfig: {
          findMany: async () => [],
          upsert: async () => ({}),
        },
        crmInboxImplementationJob: {
          findMany: async () => [
            {
              id: 'job-ag-1',
              reportId: 5,
              executionOwner: 'AG',
              status: 'RUNNING',
              executionPhase: 'CODEX_RUNNING',
              startedAt: new Date('2026-09-21T09:50:00.000Z'),
              lastProgressAt: new Date('2026-09-21T09:55:00.000Z'),
              report: { id: 5, requestType: 'BUG', title: 'Không chọn mốc thời gian được' },
            },
            {
              id: 'job-ide-1',
              reportId: 13,
              executionOwner: 'IDE',
              status: 'AWAITING_COMMIT_REVIEW',
              executionPhase: 'COMMITTING',
              startedAt: new Date('2026-09-21T09:40:00.000Z'),
              lastProgressAt: new Date('2026-09-21T09:45:00.000Z'),
              report: { id: 13, requestType: 'FEATURE', title: 'Thêm Game BK' },
            },
          ],
        },
      },
    },
  };

  InboxWorkerStatusService.recordHeartbeat('AG', undefined, fastifyMock as never, now);
  InboxWorkerStatusService.recordHeartbeat('IDE', undefined, fastifyMock as never, now);

  const status = await InboxWorkerStatusService.getDualWorkersStatus(fastifyMock as never, now);
  assert.equal(status.ag.isOnline, true);
  assert.equal(status.codex.isOnline, true);

  // AG task
  assert.ok(status.ag.activeTask);
  assert.equal(status.ag.activeTask.ticketId, 5);
  assert.equal(status.ag.activeTask.ticketKey, 'MOS-BUG-5');
  assert.equal(status.ag.activeTask.phase, 'Đang code/test');
  assert.equal(status.ag.activeTask.title, 'Không chọn mốc thời gian được');

  // Codex task
  assert.ok(status.codex.activeTask);
  assert.equal(status.codex.activeTask.ticketId, 13);
  assert.equal(status.codex.activeTask.ticketKey, 'MOS-FEAT-13');
  assert.equal(status.codex.activeTask.phase, 'Chờ Danny duyệt commit');
  assert.equal(status.codex.activeTask.title, 'Thêm Game BK');
});
