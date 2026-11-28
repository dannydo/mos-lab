import assert from 'node:assert/strict';
import test from 'node:test';
import { canManageFmQuests, canSubmitFmDinner, resolveBondingStarFromDinner } from '@mos-lab/shared';
import {
  FmQuestError,
  reviewFmTeamDinner,
  saveFmQuestsConfig,
  settleFmWeeklyQuest,
  submitFmTeamDinner,
} from './fm-quests.service.js';
import {
  FM_MONTHLY_TEAM_DINNERS_KEY,
  FM_WEEKLY_QUEST_LEDGER_KEY,
  FM_WEEKLY_QUESTS_CONFIG_KEY,
} from './fm-quests.store.js';
import { computeFalWeeklyEvaluation, computeUnderminkEvaluation } from './fm-quests.evaluator.js';

function createMockFastify() {
  const configs = new Map<string, string>();
  const funds = new Map<string, { id: string; code: string; name: string; currentBalance: number; status: string }>();
  const periods = new Map<
    string,
    { id: string; fundId: string; totalIncome: number; totalExpense: number; status: string }
  >();
  const transactions: Array<{ id: string; fundId: string; type: string; amount: number; description: string }> = [];

  const crm: any = {
    crmConfig: {
      findUnique: async ({ where }: { where: { key: string } }) => {
        const value = configs.get(where.key);
        return value === undefined ? null : { key: where.key, value, updatedAt: new Date('2026-11-27T00:00:00Z') };
      },
      upsert: async ({ where, update, create }: any) => {
        const nextVal = configs.has(where.key) ? update.value : create.value;
        configs.set(where.key, nextVal);
        return { key: where.key, value: nextVal };
      },
    },
    crmFund: {
      findUnique: async ({ where }: { where: { id: string } }) => funds.get(where.id) || null,
      create: async ({ data }: any) => {
        const row = {
          id: data.id,
          code: data.code,
          name: data.name,
          currentBalance: Number(data.currentBalance || 0),
          maxQuota: Number(data.maxQuota || 15_000_000),
          alertThresholdPercent: Number(data.alertThresholdPercent || 80),
          status: data.status || 'ACTIVE',
        };
        funds.set(row.id, row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const existing = funds.get(where.id);
        if (!existing) throw new Error('Fund missing');
        existing.currentBalance = Number(data.currentBalance);
        return existing;
      },
    },
    crmFundPeriod: {
      findFirst: async ({ where }: any) =>
        [...periods.values()].find((p) => p.fundId === where.fundId && p.status === where.status) || null,
      create: async ({ data }: any) => {
        const row = {
          id: data.id,
          fundId: data.fundId,
          totalIncome: Number(data.totalIncome || 0),
          totalExpense: Number(data.totalExpense || 0),
          status: data.status || 'OPEN',
        };
        periods.set(row.id, row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const row = periods.get(where.id);
        if (!row) return null;
        if (data.totalIncome !== undefined) row.totalIncome = Number(data.totalIncome);
        if (data.totalExpense?.increment !== undefined) {
          row.totalExpense += Number(data.totalExpense.increment);
        } else if (data.totalExpense !== undefined) {
          row.totalExpense = Number(data.totalExpense);
        }
        return row;
      },
    },
    crmFundTransaction: {
      create: async ({ data }: any) => {
        const row = {
          id: data.id,
          fundId: data.fundId,
          periodId: data.periodId || null,
          proposalId: data.proposalId || null,
          type: data.type,
          amount: Number(data.amount),
          balanceBefore: Number(data.balanceBefore || 0),
          balanceAfter: Number(data.balanceAfter || 0),
          description: data.description,
          status: data.status || 'COMPLETED',
          beneficiaryStaffId: data.beneficiaryStaffId || null,
          beneficiaryStaffName: data.beneficiaryStaffName || null,
          beneficiaryPhone: data.beneficiaryPhone || null,
          telco: data.telco || null,
          receiptUrlsJson: data.receiptUrlsJson || null,
          actorStaffId: data.actorStaffId || 1,
          actorStaffName: data.actorStaffName || 'System',
          createdAt: new Date('2026-11-27T00:00:00Z'),
        };
        transactions.push(row);
        return row;
      },
    },
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(crm),
  };

  const legacy: any = {
    $queryRawUnsafe: async () => [],
  };

  return {
    configs,
    funds,
    transactions,
    fastify: {
      prisma: { crm, legacy },
      log: { warn: () => {}, error: () => {} },
    } as any,
  };
}

test('resolveBondingStarFromDinner handles 70/80/90% and missing dinner/check-in shield penalty', () => {
  assert.deepEqual(resolveBondingStarFromDinner({ organized: false, hasSocialCheckin: false, attendancePct: 100 }), {
    star: 0,
    missingDinnerShieldPenalty: 1,
  });
  assert.deepEqual(resolveBondingStarFromDinner({ organized: true, hasSocialCheckin: false, attendancePct: 95 }), {
    star: 0,
    missingDinnerShieldPenalty: 1,
  });
  assert.deepEqual(resolveBondingStarFromDinner({ organized: true, hasSocialCheckin: true, attendancePct: 68 }), {
    star: 0,
    missingDinnerShieldPenalty: 0,
  });
  assert.deepEqual(resolveBondingStarFromDinner({ organized: true, hasSocialCheckin: true, attendancePct: 70 }), {
    star: 1,
    missingDinnerShieldPenalty: 0,
  });
  assert.deepEqual(resolveBondingStarFromDinner({ organized: true, hasSocialCheckin: true, attendancePct: 80 }), {
    star: 2,
    missingDinnerShieldPenalty: 0,
  });
  assert.deepEqual(resolveBondingStarFromDinner({ organized: true, hasSocialCheckin: true, attendancePct: 90 }), {
    star: 3,
    missingDinnerShieldPenalty: 0,
  });
});

test('enforces HR and CEO/Admin permissions for Weekly Quest edits & settlement', async () => {
  assert.equal(canManageFmQuests('hr'), true);
  assert.equal(canManageFmQuests('admin'), true);
  assert.equal(canManageFmQuests('super_admin'), true);
  assert.equal(canManageFmQuests('fm'), false);
  assert.equal(canManageFmQuests('cc'), false);
  assert.equal(canSubmitFmDinner('fm'), true);
  assert.equal(canSubmitFmDinner('cc'), false);

  const { fastify } = createMockFastify();
  await assert.rejects(
    () => saveFmQuestsConfig(fastify, { id: 9, name: 'FM Thảo', role: 'fm' }, { monthlyQuestCapVnd: null, quests: [] }),
    (err: unknown) => err instanceof FmQuestError && err.statusCode === 403
  );
});

test('settles weekly quest idempotently to shop fund and deducts approved team dinner expense', async () => {
  const { fastify, funds, transactions, configs } = createMockFastify();
  const hrActor = { id: 2, name: 'HR Linh', role: 'hr' };
  const fmActor = { id: 5, name: 'FM Vy', role: 'fm' };

  await saveFmQuestsConfig(fastify, hrActor, {
    monthlyQuestCapVnd: 2_000_000,
    quests: [
      {
        id: 'quest-custom-1',
        code: 'SMILE_5',
        title: '5 nụ cười',
        description: 'Cười tươi đón khách',
        type: 'custom',
        rewardVnd: 500_000,
        branchScope: 'dt',
        isActive: true,
        targetConfig: { customCriteria: '5 ảnh feedback' },
        sortOrder: 1,
      },
    ],
  });
  assert.equal(configs.has(FM_WEEKLY_QUESTS_CONFIG_KEY), true);

  const settled = await settleFmWeeklyQuest(fastify, hrActor, {
    branch: 'dt',
    weekKey: '2026-W48',
    questId: 'quest-custom-1',
    overridePass: true,
    note: 'Đạt chuẩn tuần 48',
  });
  assert.equal(settled.entry.settled, true);
  assert.equal(settled.newBalanceVnd, 500_000);
  assert.equal(funds.get('fund-shop-dt')?.currentBalance, 500_000);
  assert.equal(configs.has(FM_WEEKLY_QUEST_LEDGER_KEY), true);

  await assert.rejects(
    () =>
      settleFmWeeklyQuest(fastify, hrActor, {
        branch: 'dt',
        weekKey: '2026-W48',
        questId: 'quest-custom-1',
        overridePass: true,
      }),
    (err: unknown) => err instanceof FmQuestError && err.statusCode === 409
  );

  const dinner = await submitFmTeamDinner(fastify, fmActor, {
    branch: 'dt',
    monthKey: '2026-11',
    eventDate: '2026-11-26',
    venueName: 'Lẩu Bò Sài Gòn',
    attendeeCount: 13,
    totalHeadcount: 14,
    socialCheckinUrl: 'https://facebook.com/wings/posts/123',
    amountSpentVnd: 350_000,
    deductFromShopFund: true,
  });
  assert.equal(dinner.computedStar, 3);
  assert.equal(dinner.status, 'PENDING');
  assert.equal(configs.has(FM_MONTHLY_TEAM_DINNERS_KEY), true);

  const approved = await reviewFmTeamDinner(fastify, hrActor, dinner.id, {
    decision: 'APPROVED',
    reviewNote: 'Check-in hợp lệ',
    deductFromShopFund: true,
  });
  assert.equal(approved.status, 'APPROVED');
  assert.ok(approved.fundTransactionId);
  assert.equal(funds.get('fund-shop-dt')?.currentBalance, 150_000);
  assert.equal(transactions.length, 2);
  assert.equal(transactions[0].type, 'TOPUP');
  assert.equal(transactions[1].type, 'EXPENSE');
});

test('scales Undermink 85% ratio threshold and FAL Fix cap (+1 when activeCvCount >= 13)', () => {
  const tenItems = Array.from({ length: 10 }, (_, idx) => ({
    staffId: idx + 1,
    label: `CV #${idx + 1}`,
    countText: idx < 9 ? '2/2 bộ' : '1/2 bộ',
    passed: idx < 9,
  }));
  const umPass = computeUnderminkEvaluation(tenItems, 2, 85);
  assert.equal(umPass.passed, true); // 90% >= 85%

  const umFail = computeUnderminkEvaluation(
    tenItems.map((it, idx) => ({ ...it, passed: idx < 8 })),
    2,
    85
  );
  assert.equal(umFail.passed, false); // 80% < 85%

  const falSmallShop = computeFalWeeklyEvaluation(
    { fixCount: 2, adjustCount: 1, logCount: 1, activeCvCount: 12 },
    { maxFix: 1, maxAdjust: 1, maxLog: 1 }
  );
  assert.equal(falSmallShop.passed, false);

  const falLargeShop = computeFalWeeklyEvaluation(
    { fixCount: 2, adjustCount: 1, logCount: 1, activeCvCount: 14 },
    { maxFix: 1, maxAdjust: 1, maxLog: 1 }
  );
  assert.equal(falLargeShop.passed, true);
});
