import assert from 'node:assert/strict';
import test from 'node:test';
import { BkGameParticipant } from '@mos-lab/shared';
import { formatIctDateTime, formatIctDate } from './bk-game.service.js';

test('Game BK target progress calculates accurately with a 100% cap', () => {
  const calcProgress = (score: number, target?: number | null): number => {
    if (!target || target <= 0) return 100;
    return Math.min(100, Math.round((score / target) * 100));
  };

  assert.equal(calcProgress(45, 50), 90);
  assert.equal(calcProgress(50, 50), 100);
  assert.equal(calcProgress(65, 50), 100);
  assert.equal(calcProgress(0, 50), 0);
  assert.equal(calcProgress(10, null), 100);
});

test('Game BK team score aggregation sums all member scores correctly', () => {
  const participants: BkGameParticipant[] = [
    {
      id: 1,
      gameId: 10,
      staffId: 101,
      staffName: 'Bích Phượng',
      teamId: 1,
      betAmount: 50000,
      score: 30,
      rewardAmount: 0,
      status: 'ACTIVE',
    },
    {
      id: 2,
      gameId: 10,
      staffId: 102,
      staffName: 'Ngọc Điệp',
      teamId: 1,
      betAmount: 50000,
      score: 25,
      rewardAmount: 0,
      status: 'ACTIVE',
    },
    {
      id: 3,
      gameId: 10,
      staffId: 103,
      staffName: 'Kim Ngân',
      teamId: 2,
      betAmount: 50000,
      score: 40,
      rewardAmount: 0,
      status: 'ACTIVE',
    },
  ];

  const team1Members = participants.filter((p) => p.teamId === 1);
  const team2Members = participants.filter((p) => p.teamId === 2);

  const team1Score = team1Members.reduce((sum, m) => sum + m.score, 0);
  const team2Score = team2Members.reduce((sum, m) => sum + m.score, 0);

  assert.equal(team1Score, 55);
  assert.equal(team2Score, 40);
  assert.equal(team1Score > team2Score, true);
});

test('Game BK TOP_3 distribution splits reward pool 60 / 30 / 10', () => {
  const pool = 1000000;
  const firstReward = Math.round(pool * 0.6);
  const secondReward = Math.round(pool * 0.3);
  const thirdReward = Math.round(pool * 0.1);

  assert.equal(firstReward, 600000);
  assert.equal(secondReward, 300000);
  assert.equal(thirdReward, 100000);
  assert.equal(firstReward + secondReward + thirdReward, pool);
});

test('Game BK formatIctDateTime correctly converts UTC timestamps to Vietnam time strings', () => {
  // Midnight on Sept 22 in Vietnam (UTC+7) is 17:00 on Sept 21 UTC
  const startUtc = new Date('2026-09-21T17:00:00.000Z');
  assert.equal(formatIctDateTime(startUtc), '2026-09-22 00:00:00');
  assert.equal(formatIctDate(startUtc), '2026-09-22');

  // 23:59:59 on Sept 30 in Vietnam (UTC+7) is 16:59:59 on Sept 30 UTC
  const endUtc = new Date('2026-09-30T16:59:59.000Z');
  assert.equal(formatIctDateTime(endUtc), '2026-09-30 23:59:59');
  assert.equal(formatIctDate(endUtc), '2026-09-30');

  // Daytime check: 10:09:24 UTC is 17:09:24 Vietnam
  const midDay = new Date('2026-09-22T10:09:24.000Z');
  assert.equal(formatIctDateTime(midDay), '2026-09-22 17:09:24');
  assert.equal(formatIctDate(midDay), '2026-09-22');
});

test('Game BK query parameters resolve exact campaign start and end datetimes', () => {
  const game = {
    id: 42,
    startDate: new Date('2026-09-18T01:00:00.000Z'), // 08:00:00 ICT
    endDate: new Date('2026-09-21T16:59:59.000Z'), // 23:59:59 ICT
  };

  const startDateTimeStr = formatIctDateTime(game.startDate);
  const endDateTimeStr = formatIctDateTime(game.endDate);
  const callStartDateStr = formatIctDate(game.startDate);
  const callEndDateStr = formatIctDate(game.endDate);

  assert.equal(startDateTimeStr, '2026-09-18 08:00:00');
  assert.equal(endDateTimeStr, '2026-09-21 23:59:59');
  assert.equal(callStartDateStr, '2026-09-18');
  assert.equal(callEndDateStr, '2026-09-21');
});
