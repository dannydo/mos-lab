import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAccessLogEntry,
  decideAiSessionAccess,
  normalizeAuditReason,
  readSessionPrivacyMeta,
  withAccessLogEntry,
  withMissionLink,
  withSharing,
} from './ai-session-access.js';

const owner = { id: 101, role: 'admin' };
const otherAdmin = { id: 202, role: 'admin' };
const superAdmin = { id: 1, role: 'super_admin' };
const staff = { id: 303, role: 'telesales' };

test('owner always has access and it is not logged', () => {
  const d = decideAiSessionAccess({ ownerStaffId: 101, viewer: owner, metadata: {} });
  assert.deepEqual(d, { allowed: true, mode: 'owner', logAccess: false });
});

test('private session: nobody else gets in by default, Admin is only told that an audit is possible', () => {
  const asStaff = decideAiSessionAccess({ ownerStaffId: 101, viewer: staff, metadata: {} });
  assert.deepEqual(asStaff, { allowed: false, auditAvailable: false });

  const asAdmin = decideAiSessionAccess({ ownerStaffId: 101, viewer: otherAdmin, metadata: {} });
  assert.deepEqual(asAdmin, { allowed: false, auditAvailable: true });

  const asSuper = decideAiSessionAccess({ ownerStaffId: 101, viewer: superAdmin, metadata: {} });
  assert.deepEqual(asSuper, { allowed: false, auditAvailable: true });
});

test('shared session is viewable by any signed-in staff, read-only and unlogged', () => {
  const d = decideAiSessionAccess({
    ownerStaffId: 101,
    viewer: staff,
    metadata: withSharing({}, true, 101),
  });
  assert.deepEqual(d, { allowed: true, mode: 'shared', logAccess: false });

  const revoked = decideAiSessionAccess({
    ownerStaffId: 101,
    viewer: staff,
    metadata: withSharing(withSharing({}, true, 101), false, 101),
  });
  assert.equal(revoked.allowed, false);
});

test('Super Admin may open a session only when it is linked to a mOS Mission (logged)', () => {
  const linked = withMissionLink({}, 255);
  const d = decideAiSessionAccess({ ownerStaffId: 101, viewer: superAdmin, metadata: linked });
  assert.deepEqual(d, { allowed: true, mode: 'mission', logAccess: true });

  // Regular Admin gets no mission shortcut
  const asAdmin = decideAiSessionAccess({ ownerStaffId: 101, viewer: otherAdmin, metadata: linked });
  assert.equal(asAdmin.allowed, false);
});

test('security audit needs Admin/Super Admin and a written reason; it is logged', () => {
  const noReason = decideAiSessionAccess({
    ownerStaffId: 101,
    viewer: otherAdmin,
    metadata: {},
    auditRequested: true,
    auditReason: 'ngắn',
  });
  assert.deepEqual(noReason, { allowed: false, auditAvailable: true, invalidAuditReason: true });

  const ok = decideAiSessionAccess({
    ownerStaffId: 101,
    viewer: otherAdmin,
    metadata: {},
    auditRequested: true,
    auditReason: 'Rà soát nhân viên nghi dùng MAI truy cập dữ liệu ngoài phạm vi',
  });
  assert.deepEqual(ok, { allowed: true, mode: 'audit', logAccess: true });

  const notAdmin = decideAiSessionAccess({
    ownerStaffId: 101,
    viewer: staff,
    metadata: {},
    auditRequested: true,
    auditReason: 'Rà soát nhân viên nghi dùng MAI truy cập dữ liệu ngoài phạm vi',
  });
  assert.deepEqual(notAdmin, { allowed: false, auditAvailable: false });
});

test('metadata helpers are tolerant and keep the access log bounded', () => {
  assert.deepEqual(readSessionPrivacyMeta(null), { sharingEnabled: false, missionReportIds: [], accessLog: [] });
  assert.deepEqual(readSessionPrivacyMeta({ missionReportIds: ['x', 5, -1, 5.5] }).missionReportIds, [5]);
  assert.equal(normalizeAuditReason('   '), null);
  assert.equal(normalizeAuditReason('x'.repeat(900))?.length, 500);

  assert.deepEqual(withMissionLink(withMissionLink({ a: 1 }, 7), 7), { a: 1, missionReportIds: [7] });

  let meta: Record<string, unknown> = {};
  for (let i = 0; i < 130; i++) {
    meta = withAccessLogEntry(
      meta,
      buildAccessLogEntry({ id: i + 1, role: 'admin', username: `u${i}` }, 'audit', 'lý do rà soát bảo mật', [])
    );
  }
  const log = readSessionPrivacyMeta(meta).accessLog;
  assert.equal(log.length, 100);
  assert.equal(log[99].viewerStaffId, 130);
  assert.equal(log[0].viewerStaffId, 31);
});
