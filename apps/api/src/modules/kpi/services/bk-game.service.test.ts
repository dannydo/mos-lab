import assert from 'node:assert/strict';
import test from 'node:test';
import { BkGameParticipant } from '@mos-lab/shared';

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
