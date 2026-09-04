import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeExperienceJournalEvent,
  normalizeExperienceJournalMetadata,
  redactJournalText,
} from './experience-journal.service.js';

test('redacts secrets and local paths before a journal event is persisted', () => {
  assert.equal(
    redactJournalText('authorization=Bearer abcdefghijklmnopqrstuvwxyz0123456789 /Users/dannydo/project', 420),
    'authorization=[redacted] [redacted] [internal-path]'
  );
  assert.deepEqual(
    normalizeExperienceJournalMetadata({ safe: 'ok', token: 'api_key=super-secret-value', nested: { no: true } }),
    {
      safe: 'ok',
      token: 'api_key=[redacted]',
    }
  );
});

test('uses a stable fingerprint for the same sanitized operational cause', () => {
  const first = normalizeExperienceJournalEvent({
    category: 'INFRA',
    severity: 'ERROR',
    component: 'worker',
    code: 'LEASE_RENEW_FAILED',
    summary: 'Lease renewal failed at /Users/dannydo/projects/mos-lab',
    reportId: 24,
  });
  const second = normalizeExperienceJournalEvent({
    category: 'INFRA',
    severity: 'WARNING',
    component: 'worker',
    code: 'LEASE_RENEW_FAILED',
    summary: 'Lease renewal failed at /home/web/mos-lab',
    reportId: 99,
  });
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(first.summary, 'Lease renewal failed at [internal-path]');
});

test('preserves validated job and release identifiers without treating them as secrets', () => {
  const event = normalizeExperienceJournalEvent({
    category: 'INFRA',
    severity: 'WARNING',
    component: 'deploy',
    code: 'DEPLOY_INTERRUPTED',
    summary: 'A reviewed deployment was interrupted.',
    jobId: '326e714b-6283-4a93-b193-3ca37322afc2',
    releaseCommit: 'E173ACB63D94B9EBBA06D915F4E4F68D95E09066',
  });
  assert.equal(event.jobId, '326e714b-6283-4a93-b193-3ca37322afc2');
  assert.equal(event.releaseCommit, 'e173acb63d94b9ebba06d915f4e4f68d95e09066');
});

test('rejects malformed categories and empty operational identity', () => {
  assert.throws(
    () =>
      normalizeExperienceJournalEvent({
        category: 'OTHER' as never,
        severity: 'ERROR',
        component: 'worker',
        code: 'X',
        summary: 'x',
      }),
    /Nhóm sự kiện/
  );
  assert.throws(
    () => normalizeExperienceJournalEvent({ category: 'UX', severity: 'INFO', component: '', code: 'X', summary: 'x' }),
    /Component/
  );
});
