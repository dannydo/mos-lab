import assert from 'node:assert/strict';
import test from 'node:test';
import { compareBookerProductivity } from './leaderboard.js';

test('ranks telesales by booked productivity instead of earnings', () => {
  const leaderboard = [
    { staffId: 1, displayName: 'Lương cao', totalBooked: 0, totalCheckin: 0, totalEarnings: 20_000_000 },
    { staffId: 2, displayName: 'Năng suất cao', totalBooked: 12, totalCheckin: 4, totalEarnings: 5_000_000 },
  ].sort(compareBookerProductivity);

  assert.equal(leaderboard[0]?.staffId, 2);
});

test('uses check-in, display name and staff id as deterministic tie-breakers', () => {
  const leaderboard = [
    { staffId: 4, displayName: 'Bình', totalBooked: 10, totalCheckin: 3 },
    { staffId: 3, displayName: 'An', totalBooked: 10, totalCheckin: 3 },
    { staffId: 2, displayName: 'An', totalBooked: 10, totalCheckin: 4 },
    { staffId: 1, displayName: 'An', totalBooked: 10, totalCheckin: 3 },
  ].sort(compareBookerProductivity);

  assert.deepEqual(
    leaderboard.map((entry) => entry.staffId),
    [2, 1, 3, 4]
  );
});
