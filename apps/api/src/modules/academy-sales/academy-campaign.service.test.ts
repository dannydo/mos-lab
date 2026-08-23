import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_ACADEMY_CAMPAIGN_TOUCHPOINTS,
  isAcademyCampaignSidebarVisible,
  isAcademyCampaignTouchpointWritable,
  isAcademyCampaignTouchpointOutcome,
  isCampaignVisibleToStaff,
  parseAcademyCampaignDate,
  normalizeAcademyCampaignSnapshotLeadIds,
} from './academy-campaign.service.js';

test('uses the operational D1/D3/D7/D14/D21 touchpoint cadence as the campaign default', () => {
  assert.deepEqual(
    DEFAULT_ACADEMY_CAMPAIGN_TOUCHPOINTS.map(({ key, daysMin, daysMax }) => ({ key, daysMin, daysMax })),
    [
      { key: 'd1', daysMin: 1, daysMax: 1 },
      { key: 'd3', daysMin: 3, daysMax: 3 },
      { key: 'd7', daysMin: 7, daysMax: 7 },
      { key: 'd14', daysMin: 14, daysMax: 14 },
      { key: 'd21', daysMin: 21, daysMax: 21 },
    ]
  );
});

test('captures a clean, fixed Academy lead snapshot without deriving it from later filters', () => {
  assert.deepEqual(normalizeAcademyCampaignSnapshotLeadIds([101, '102', 101, 0, -1, 'not-a-lead']), [101, 102]);
  assert.deepEqual(normalizeAcademyCampaignSnapshotLeadIds(undefined), []);
});

test('preserves a DATE campaign boundary as the written ICT calendar date', () => {
  assert.equal(parseAcademyCampaignDate('2026-08-19', 'Ngày bắt đầu')?.toISOString(), '2026-08-19T00:00:00.000Z');
  assert.throws(() => parseAcademyCampaignDate('2026-02-30', 'Ngày bắt đầu'), /không hợp lệ/);
});

test('limits campaigns to their assigned team and never broadcasts an empty roster to telesales', () => {
  const telesales = { id: 19, role: 'telesales' };
  const leader = { id: 5, role: 'ls' };

  assert.equal(isCampaignVisibleToStaff({ assignedStaffIds: [19] }, telesales, [19]), true);
  assert.equal(isCampaignVisibleToStaff({ assignedStaffIds: [19] }, leader, [5, 19]), true);
  assert.equal(isCampaignVisibleToStaff({ assignedStaffIds: [19] }, { id: 23, role: 'telesales' }, [23]), false);
  assert.equal(isCampaignVisibleToStaff({ assignedStaffIds: [] }, telesales, [19]), false);
  assert.equal(isCampaignVisibleToStaff({ assignedStaffIds: [19] }, { id: 1, role: 'manager' }, null), true);
});

test('shows a sidebar-pinned campaign to every admin but only assigned non-admin staff', () => {
  const campaign = { assignedStaffIds: [19, 23] };

  assert.equal(isAcademyCampaignSidebarVisible(campaign, { id: 1, role: 'admin' }), true);
  assert.equal(isAcademyCampaignSidebarVisible(campaign, { id: 2, role: 'super_admin' }), true);
  assert.equal(isAcademyCampaignSidebarVisible(campaign, { id: 19, role: 'telesales' }), true);
  assert.equal(isAcademyCampaignSidebarVisible(campaign, { id: 5, role: 'manager' }), false);
  assert.equal(isAcademyCampaignSidebarVisible(campaign, { id: 99, role: 'ls' }), false);
  assert.equal(isAcademyCampaignSidebarVisible({ assignedStaffIds: [] }, { id: 19, role: 'telesales' }), false);
});

test('accepts only audited operational touchpoint outcomes', () => {
  assert.equal(isAcademyCampaignTouchpointOutcome('CALLBACK'), true);
  assert.equal(isAcademyCampaignTouchpointOutcome('SUCCESS'), true);
  assert.equal(isAcademyCampaignTouchpointOutcome('PENDING'), false);
  assert.equal(isAcademyCampaignTouchpointOutcome(null), false);
});

test('allows notes and touchpoint outcomes before activation but locks paused and closed campaigns', () => {
  assert.equal(isAcademyCampaignTouchpointWritable({ status: 'DRAFT' }), true);
  assert.equal(isAcademyCampaignTouchpointWritable({ status: 'SCHEDULED' }), true);
  assert.equal(isAcademyCampaignTouchpointWritable({ status: 'ACTIVE' }), true);
  assert.equal(isAcademyCampaignTouchpointWritable({ status: 'PAUSED' }), false);
  assert.equal(isAcademyCampaignTouchpointWritable({ status: 'COMPLETED' }), false);
  assert.equal(isAcademyCampaignTouchpointWritable({ status: 'ACTIVE', deletedAt: new Date() }), false);
});
