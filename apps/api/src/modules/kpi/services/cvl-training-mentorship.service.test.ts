import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG,
  calculateActorTipBreakdown,
  calculateCcMentorTrainingBonus,
  resolveMenuKeysForApiPath,
  type CvlTrainingMentorshipPair,
} from '@mos-lab/shared';
import {
  CvlTrainingMentorshipService,
  buildCvTipStaffMatchSql,
  buildExcludeOtherMenteeTrainingOrderSql,
  buildExcludeTrainingCvlOrderSql,
  buildIsMenteeTrainingWindowSql,
  normalizeCvlTrainingMentorshipConfig,
  sanitizeCvlTrainingMentorshipPair,
  type LegacyTipSqlExecutor,
} from './cvl-training-mentorship.service.js';
import {
  resolveMentorshipOutcomeImpl,
  saveMentorshipConfig,
} from './cvl-training-mentorship/cvl-training-mentorship.config.js';

test('DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG contains Nov 2026 DT pairs for Thảo Ly & Khanh Cao', () => {
  const normalized = normalizeCvlTrainingMentorshipConfig(null);
  assert.equal(normalized.pairs.length, 2);
  assert.equal(normalized.pairs[0]?.menteeLegacyStaffId, 46272);
  assert.equal(normalized.pairs[0]?.mentorLegacyStaffId, 37790);
  assert.equal(normalized.pairs[1]?.menteeLegacyStaffId, 13783);
  assert.equal(normalized.pairs[1]?.mentorLegacyStaffId, 34295);
});

test('sanitizeCvlTrainingMentorshipPair rejects invalid dates and normalizes valid pairs', () => {
  assert.equal(
    sanitizeCvlTrainingMentorshipPair(
      {
        menteeLegacyStaffId: 46272,
        mentorLegacyStaffId: 37790,
        startDate: '2026-11-30',
        endDate: '2026-11-01',
      },
      0
    ),
    null
  );

  const valid = sanitizeCvlTrainingMentorshipPair(
    {
      menteeLegacyStaffId: 46272,
      menteeDisplayName: 'Thảo Ly',
      mentorLegacyStaffId: 37790,
      mentorDisplayName: 'Diễm Hương',
      storeCode: 'Estella',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
    },
    0
  );
  assert.ok(valid);
  assert.equal(valid.storeCode, 'EP');
  assert.equal(valid.fixedAllowanceVnd, 1_000_000);
  assert.equal(valid.menteeBonusShareRate, 0.5);
  assert.equal(valid.minComboRateThreshold, 0.2);
});

test('SQL builders exclude training CVL orders from CC reports and transfer CC <=20% tips to Mentee CVL', () => {
  const pairs = DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG.pairs;

  const excludeCcSql = buildExcludeTrainingCvlOrderSql(pairs, 'o.id', 'o.booking_date_start');
  assert.match(excludeCcSql, /NOT EXISTS/);
  assert.match(excludeCcSql, /46272/);
  assert.match(excludeCcSql, /13783/);

  const menteeWinSql = buildIsMenteeTrainingWindowSql([pairs[0]!], 'o.booking_date_start');
  assert.match(menteeWinSql, /2026-11-01/);
  assert.match(menteeWinSql, /2026-11-30/);

  const excludeOthersForThaoLy = buildExcludeOtherMenteeTrainingOrderSql(pairs, 46272, 'o.id', 'o.booking_date_start');
  assert.doesNotMatch(excludeOthersForThaoLy, /46272/);
  assert.match(excludeOthersForThaoLy, /13783/);

  const tipMatchSql = buildCvTipStaffMatchSql(pairs, 'st_raw', 'os.assigned_staff_id', 'fo.checkinTime');
  assert.match(tipMatchSql, /tip_percentage.*<= 20/);
  assert.match(tipMatchSql, /46272/);
});

test('findMatchingTrainingPairForOrder matches exact inclusive date boundaries and respects isActive', () => {
  const pairs = DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG.pairs;
  assert.equal(
    CvlTrainingMentorshipService.findMatchingTrainingPairForOrder(pairs, 46272, '2026-11-01')?.mentorLegacyStaffId,
    37790
  );
  assert.equal(
    CvlTrainingMentorshipService.findMatchingTrainingPairForOrder(pairs, 13783, '2026-11-30')?.mentorLegacyStaffId,
    34295
  );
  assert.equal(CvlTrainingMentorshipService.findMatchingTrainingPairForOrder(pairs, 46272, '2026-12-01'), null);
  assert.equal(
    CvlTrainingMentorshipService.findMatchingTrainingPairForOrder(
      [{ ...pairs[0]!, isActive: false }],
      46272,
      '2026-11-12'
    ),
    null
  );
});

test('calculateActorTipBreakdown awards 90% tip to Mentee CVL and 0% to CC on training CVL orders', () => {
  const booking = {
    assignedStaffId: 46272,
    assignedStaffName: 'Thảo Ly',
    checkInStaffId: 37790,
    checkInStaffName: 'Diễm Hương',
    checkOutStaffId: 37790,
    checkOutStaffName: 'Diễm Hương',
    isTrainingCvlOrder: true,
  };

  const ccView = calculateActorTipBreakdown(booking, { staffId: 37790, name: 'Diễm Hương' }, 100_000);
  assert.equal(ccView.actorEarnedPercent, 0);
  assert.equal(ccView.actorEarnedAmount, 0);

  const menteeView = calculateActorTipBreakdown(booking, { staffId: 46272, name: 'Thảo Ly' }, 100_000);
  assert.equal(menteeView.actorEarnedPercent, 90);
  assert.equal(menteeView.actorEarnedAmount, 90_000);
});

test('calculateCcMentorTrainingBonus enforces >= 20.0% combo rate threshold for 1M + 50% payout', () => {
  const pair = DEFAULT_CVL_TRAINING_MENTORSHIP_CONFIG.pairs[0]!;

  const unlocked = calculateCcMentorTrainingBonus({
    pair,
    combosSoldCount: 2,
    notComboLiveOrders: 10, // exact 20.0%
    comboLiveOrders: 5,
    menteeDeltaHourlyWage: 300_000,
    menteeDeltaTipBonus: 200_000,
    menteeComboBonusTotal: 400_000,
    menteeSerumBonusTotal: 100_000,
  });
  assert.equal(unlocked.isUnlocked, true);
  assert.equal(unlocked.menteeTotalAdditionalIncome, 1_000_000);
  assert.equal(unlocked.mentorFixedEarned, 1_000_000);
  assert.equal(unlocked.mentorShareEarned, 500_000);
  assert.equal(unlocked.mentorTotalBonus, 1_500_000);

  const locked = calculateCcMentorTrainingBonus({
    pair,
    combosSoldCount: 1,
    notComboLiveOrders: 10, // 10.0% < 20.0%
    comboLiveOrders: 5,
    menteeDeltaHourlyWage: 300_000,
    menteeDeltaTipBonus: 200_000,
    menteeComboBonusTotal: 400_000,
    menteeSerumBonusTotal: 100_000,
  });
  assert.equal(locked.isUnlocked, false);
  assert.equal(locked.mentorFixedEarned, 0);
  assert.equal(locked.mentorShareEarned, 0);
  assert.equal(locked.mentorTotalBonus, 0);
});

test('Zero-Trust API guard locks /api/kpi/cvl-training-mentorship/* to __ADMIN_ONLY_DEFAULT__', () => {
  assert.deepEqual(resolveMenuKeysForApiPath('/api/kpi/cvl-training-mentorship/config'), ['__ADMIN_ONLY_DEFAULT__']);
});

test('reconcileTrainingCvlStaffTips consolidates 70+20, 80+10, NULL user_id, and multi-service orders idempotently into 90% for Mentee CVL', async () => {
  CvlTrainingMentorshipService.clearCache();

  const pair: CvlTrainingMentorshipPair = {
    id: 'pair-ly-huong',
    menteeLegacyStaffId: 46272,
    menteeDisplayName: 'Thảo Ly',
    mentorLegacyStaffId: 37790,
    mentorDisplayName: 'Diễm Hương',
    storeCode: 'EP',
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    fixedAllowanceVnd: 1000000,
    menteeBonusShareRate: 0.5,
    minComboRateThreshold: 0.2,
    isActive: true,
  };

  const serviceRows = [
    { id: 5001, order_id: 339200, assigned_staff_id: 46272 }, // 70% + 20%
    { id: 5002, order_id: 339761, assigned_staff_id: 46272 }, // 80% + 10% (Chị Vân 100K)
    { id: 5003, order_id: 339363, assigned_staff_id: 46272 }, // Multi-service part 1
    { id: 5004, order_id: 339363, assigned_staff_id: 46272 }, // Multi-service part 2
    { id: 5005, order_id: 339400, assigned_staff_id: 46272 }, // NULL user_id on 20% row
  ];

  let tipRows: Array<{
    id: number;
    order_id: number;
    order_service_id: number | null;
    user_id: number | null;
    tip_amount: number;
    tip_percentage: number;
    is_academy: number;
  }> = [
    // Order 339200: Mentor checkin & checkout -> 70% Ly + 20% Hương
    {
      id: 101,
      order_id: 339200,
      order_service_id: 5001,
      user_id: 46272,
      tip_amount: 70000,
      tip_percentage: 70,
      is_academy: 0,
    },
    {
      id: 102,
      order_id: 339200,
      order_service_id: 5001,
      user_id: 37790,
      tip_amount: 20000,
      tip_percentage: 20,
      is_academy: 0,
    },
    // Order 339761: Mentor checkin + Ly checkout -> 80% Ly + 10% Hương
    {
      id: 103,
      order_id: 339761,
      order_service_id: 5002,
      user_id: 46272,
      tip_amount: 80000,
      tip_percentage: 80,
      is_academy: 0,
    },
    {
      id: 104,
      order_id: 339761,
      order_service_id: 5002,
      user_id: 37790,
      tip_amount: 10000,
      tip_percentage: 10,
      is_academy: 0,
    },
    // Order 339363: Multi-service -> two distinct order_service_id buckets
    {
      id: 105,
      order_id: 339363,
      order_service_id: 5003,
      user_id: 46272,
      tip_amount: 70000,
      tip_percentage: 70,
      is_academy: 0,
    },
    {
      id: 106,
      order_id: 339363,
      order_service_id: 5003,
      user_id: 37790,
      tip_amount: 20000,
      tip_percentage: 20,
      is_academy: 0,
    },
    {
      id: 107,
      order_id: 339363,
      order_service_id: 5004,
      user_id: 46272,
      tip_amount: 80000,
      tip_percentage: 80,
      is_academy: 0,
    },
    {
      id: 108,
      order_id: 339363,
      order_service_id: 5004,
      user_id: 37790,
      tip_amount: 10000,
      tip_percentage: 10,
      is_academy: 0,
    },
    // Order 339400: NULL user_id on CC tip row
    {
      id: 109,
      order_id: 339400,
      order_service_id: 5005,
      user_id: 46272,
      tip_amount: 70000,
      tip_percentage: 70,
      is_academy: 0,
    },
    {
      id: 110,
      order_id: 339400,
      order_service_id: 5005,
      user_id: null,
      tip_amount: 20000,
      tip_percentage: 20,
      is_academy: 0,
    },
  ];

  let queryCount = 0;
  const executor: LegacyTipSqlExecutor = {
    async queryRows<T>(sql: string): Promise<T[]> {
      queryCount += 1;
      if (sql.includes('SELECT DISTINCT') && sql.includes('o.id AS order_id')) {
        const candidates: Array<{ order_id: number; mentee_id: number }> = [];
        for (const t of tipRows) {
          const svc =
            serviceRows.find((s) => s.order_id === t.order_id && s.id === t.order_service_id) ||
            serviceRows.find((s) => s.order_id === t.order_id);
          if (!svc) continue;
          if (
            (t.user_id === null || t.user_id !== svc.assigned_staff_id) &&
            t.tip_percentage > 0 &&
            t.tip_percentage <= 20
          ) {
            candidates.push({ order_id: t.order_id, mentee_id: svc.assigned_staff_id });
          }
        }
        return candidates as unknown as T[];
      }
      if (sql.includes('FROM `order_service`')) {
        return serviceRows as unknown as T[];
      }
      if (sql.includes('FROM `staff_tip`')) {
        return tipRows as unknown as T[];
      }
      return [];
    },
    async execute(sql: string, params: unknown[] = []): Promise<void> {
      if (sql.startsWith('UPDATE `staff_tip`')) {
        const [userId, tipAmount, tipPct, id] = params as [number, number, number, number];
        const row = tipRows.find((r) => r.id === id);
        if (row) {
          row.user_id = userId;
          row.tip_amount = tipAmount;
          row.tip_percentage = tipPct;
        }
      } else if (sql.startsWith('DELETE FROM `staff_tip` WHERE id IN')) {
        const match = sql.match(/IN \(([^)]+)\)/);
        const idsToDelete = new Set((match?.[1] || '').split(',').map((s) => Number(s.trim())));
        tipRows = tipRows.filter((r) => !idsToDelete.has(r.id));
      }
    },
  };

  const firstRun = await CvlTrainingMentorshipService.reconcileTrainingCvlStaffTips(executor, [pair]);
  assert.equal(firstRun.updatedOrders, 4);
  assert.equal(firstRun.consolidatedRows, 5);
  assert.equal(tipRows.length, 5);
  for (const r of tipRows) {
    assert.equal(r.user_id, 46272);
    assert.equal(r.tip_amount, 90000);
    assert.equal(r.tip_percentage, 90);
  }
  assert.deepEqual(
    tipRows.filter((r) => r.order_id === 339363).map((r) => r.order_service_id),
    [5003, 5004]
  );

  // Throttled repeat call does not hit DB again
  const queriesAfterFirstRun = queryCount;
  const throttledRun = await CvlTrainingMentorshipService.reconcileTrainingCvlStaffTips(executor, [pair]);
  assert.equal(throttledRun.updatedOrders, 0);
  assert.equal(queryCount, queriesAfterFirstRun);

  // Forced idempotent repeat finds nothing left to consolidate
  const forcedSecondRun = await CvlTrainingMentorshipService.reconcileTrainingCvlStaffTips(executor, [pair], {
    force: true,
  });
  assert.equal(forcedSecondRun.updatedOrders, 0);
  assert.equal(forcedSecondRun.consolidatedRows, 0);
  assert.equal(tipRows.length, 5);

  CvlTrainingMentorshipService.clearCache();
});

test('saveMentorshipConfig rejects overlapping strict 1-on-1 mentor or mentee pairs with 400', async () => {
  CvlTrainingMentorshipService.clearCache();
  let upsertCalled = false;
  const fakeFastify = {
    prisma: {
      crm: {
        crmConfig: {
          async upsert() {
            upsertCalled = true;
            return null;
          },
        },
      },
    },
  } as unknown as Parameters<typeof saveMentorshipConfig>[0];

  const basePair: CvlTrainingMentorshipPair = {
    id: 'p1',
    mentorLegacyStaffId: 37790,
    mentorDisplayName: 'Diễm Hương',
    mentorRoleGroup: 'CC',
    menteeLegacyStaffId: 46272,
    menteeDisplayName: 'Thảo Ly',
    storeCode: 'DT',
    startDate: '2026-12-01',
    endDate: '2026-12-31',
    fixedAllowanceVnd: 1_000_000,
    menteeBonusShareRate: 0.5,
    minComboRateThreshold: 0.2,
    isActive: true,
  };

  await assert.rejects(
    () =>
      saveMentorshipConfig(
        fakeFastify,
        {
          pairs: [
            basePair,
            {
              ...basePair,
              id: 'p2',
              menteeLegacyStaffId: 13783,
              menteeDisplayName: 'Khanh Cao',
              startDate: '2026-12-10',
              endDate: '2026-12-25',
            },
          ],
        },
        'Danny'
      ),
    (err: Error & { statusCode?: number }) => err.statusCode === 400
  );
  assert.equal(upsertCalled, false);
  CvlTrainingMentorshipService.clearCache();
});

test('resolveMentorshipOutcomeImpl transitions pair & CRM progression across GRADUATE, EXTEND, RETURN_TO_CV', async () => {
  CvlTrainingMentorshipService.clearCache();
  let storedPairs: CvlTrainingMentorshipPair[] = [
    {
      id: 'pair-nov',
      mentorLegacyStaffId: 37790,
      mentorDisplayName: 'Diễm Hương',
      mentorRoleGroup: 'CC',
      menteeLegacyStaffId: 46272,
      menteeDisplayName: 'Thảo Ly',
      storeCode: 'DT',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      fixedAllowanceVnd: 1_000_000,
      menteeBonusShareRate: 0.5,
      minComboRateThreshold: 0.2,
      isActive: true,
      outcome: 'ACTIVE',
    },
  ];
  const progressionOps: Array<{ currentRole: string; status: string }> = [];
  const staffRoles: string[] = [];

  const fakeFastify = {
    prisma: {
      crm: {
        crmStaff: {
          async findFirst() {
            return { id: 901 };
          },
          async update({ data }: { data: { role: string } }) {
            staffRoles.push(data.role);
            return null;
          },
        },
        crmCareerProgression: {
          async upsert({ update }: { update: { currentRole: string; status: string } }) {
            progressionOps.push({ currentRole: update.currentRole, status: update.status });
            return null;
          },
        },
        crmConfig: {
          async upsert({ update }: { update: { value: string } }) {
            storedPairs = JSON.parse(update.value).pairs;
            return null;
          },
        },
      },
    },
  } as unknown as Parameters<typeof resolveMentorshipOutcomeImpl>[0];

  const loadConfig = async () => ({ pairs: storedPairs });

  // 1. EXTEND closes old pair as EXTENDED & opens new ACTIVE pair (respecting 1-on-1)
  const afterExtend = await resolveMentorshipOutcomeImpl(
    fakeFastify,
    loadConfig,
    {
      pairId: 'pair-nov',
      action: 'EXTEND',
      newStartDate: '2026-12-01',
      newEndDate: '2026-12-31',
      mentorLegacyStaffId: 37790,
      mentorDisplayName: 'Diễm Hương',
    },
    { id: 1, name: 'Danny' }
  );
  assert.equal(afterExtend.pairs.length, 2);
  assert.equal(afterExtend.pairs[0]?.outcome, 'EXTENDED');
  assert.equal(afterExtend.pairs[1]?.outcome, 'ACTIVE');
  assert.equal(afterExtend.pairs[1]?.startDate, '2026-12-01');

  const extendedPairId = afterExtend.pairs[1]!.id;

  // 2. GRADUATE marks pair GRADUATED & promotes CRM progression to CV_PLUS
  const afterGraduate = await resolveMentorshipOutcomeImpl(
    fakeFastify,
    loadConfig,
    { pairId: extendedPairId, action: 'GRADUATE' },
    { id: 1, name: 'Danny' }
  );
  assert.equal(afterGraduate.pairs[1]?.outcome, 'GRADUATED');
  assert.deepEqual(progressionOps.at(-1), { currentRole: 'CV_PLUS', status: 'PROMOTED' });
  assert.equal(staffRoles.at(-1), 'cv_plus');

  // 3. RETURN_TO_CV marks RETURNED_TO_CV & resets CRM progression to CV
  const afterReturn = await resolveMentorshipOutcomeImpl(
    fakeFastify,
    loadConfig,
    { pairId: extendedPairId, action: 'RETURN_TO_CV' },
    { id: 1, name: 'Danny' }
  );
  assert.equal(afterReturn.pairs[1]?.outcome, 'RETURNED_TO_CV');
  assert.deepEqual(progressionOps.at(-1), { currentRole: 'CV', status: 'IN_PROGRESS' });
  assert.equal(staffRoles.at(-1), 'cv');

  CvlTrainingMentorshipService.clearCache();
});
