import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';
import {
  BkGameParticipant,
  BkGameTeamBookingDoneTier,
  DEFAULT_BK_TEAM_BOOKING_DONE_TIERS,
} from '@mos-lab/shared';
import { ComboRecognitionService } from '../../customers/services/combo-recognition.service.js';
import {
  BkGameTeamBookingDoneBonusService,
  aggregateTeamBookingDoneBonusData,
  buildIctDateList,
  normalizeTeamBookingDoneTiers,
  parseTeamBookingDoneBonusConfig,
  resolveEffectiveDailyTimeWindow,
  resolveTeamBookingDoneTier,
} from './bk-game-team-booking-done-bonus.service.js';
import { BkGameService } from './bk-game.service.js';

test('normalizeTeamBookingDoneTiers sorts ascending, deduplicates minBookings, and computes range labels', () => {
  const normalized = normalizeTeamBookingDoneTiers([
    { id: 'c', minBookings: 50, bonusPerDone: 10000 },
    { id: 'a', minBookings: 30, bonusPerDone: 5000 },
    { id: 'b', minBookings: 40, bonusPerDone: 7000 },
    { id: 'dup', minBookings: 30, bonusPerDone: 4000 },
  ]);

  assert.equal(normalized.length, 3);
  assert.deepEqual(
    normalized.map((t) => ({ minBookings: t.minBookings, bonusPerDone: t.bonusPerDone, label: t.label })),
    [
      { minBookings: 30, bonusPerDone: 5000, label: '30–39 Booking' },
      { minBookings: 40, bonusPerDone: 7000, label: '40–49 Booking' },
      { minBookings: 50, bonusPerDone: 10000, label: 'Từ 50 Booking' },
    ]
  );
});

test('resolveTeamBookingDoneTier resolves WINGS BOOKING RACE boundaries and custom dynamic tiers', () => {
  const tiers = DEFAULT_BK_TEAM_BOOKING_DONE_TIERS;

  assert.deepEqual(resolveTeamBookingDoneTier(0, tiers), {
    matchedMinBookings: null,
    bonusPerDone: 0,
    tierLabel: 'Dưới 30 Booking',
    nextTierMinBookings: 30,
    nextTierBonusPerDone: 5000,
    bookingsToNextTier: 30,
  });

  assert.equal(resolveTeamBookingDoneTier(29, tiers).bonusPerDone, 0);
  assert.equal(resolveTeamBookingDoneTier(29, tiers).tierLabel, 'Dưới 30 Booking');

  assert.equal(resolveTeamBookingDoneTier(30, tiers).bonusPerDone, 5000);
  assert.equal(resolveTeamBookingDoneTier(30, tiers).tierLabel, '30–39 Booking');
  assert.equal(resolveTeamBookingDoneTier(39, tiers).bonusPerDone, 5000);

  assert.equal(resolveTeamBookingDoneTier(40, tiers).bonusPerDone, 7000);
  assert.equal(resolveTeamBookingDoneTier(49, tiers).tierLabel, '40–49 Booking');

  assert.equal(resolveTeamBookingDoneTier(50, tiers).bonusPerDone, 10000);
  assert.equal(resolveTeamBookingDoneTier(50, tiers).tierLabel, 'Từ 50 Booking');
  assert.equal(resolveTeamBookingDoneTier(82, tiers).bonusPerDone, 10000);
  assert.equal(resolveTeamBookingDoneTier(82, tiers).nextTierMinBookings, null);

  // Custom editable tiers (not hardcoded)
  const customTiers: BkGameTeamBookingDoneTier[] = [
    { id: 't1', minBookings: 15, bonusPerDone: 3000 },
    { id: 't2', minBookings: 25, bonusPerDone: 8000 },
  ];
  assert.equal(resolveTeamBookingDoneTier(14, customTiers).bonusPerDone, 0);
  assert.equal(resolveTeamBookingDoneTier(20, customTiers).bonusPerDone, 3000);
  assert.equal(resolveTeamBookingDoneTier(20, customTiers).tierLabel, '15–24 Booking');
  assert.equal(resolveTeamBookingDoneTier(25, customTiers).bonusPerDone, 8000);
});

test('parseTeamBookingDoneBonusConfig and resolveEffectiveDailyTimeWindow handle windows and disabled configs', () => {
  const parsed = parseTeamBookingDoneBonusConfig(
    JSON.stringify({
      enabled: true,
      tiers: DEFAULT_BK_TEAM_BOOKING_DONE_TIERS,
      timeWindowStart: '08:00',
      timeWindowEnd: '17:00',
    })
  );
  assert.ok(parsed);
  assert.equal(parsed?.enabled, true);
  assert.equal(parsed?.tiers.length, 3);
  assert.equal(parsed?.timeWindowStart, '08:00');
  assert.equal(parsed?.timeWindowEnd, '17:00');

  assert.deepEqual(resolveEffectiveDailyTimeWindow(parsed!, 'INDIVIDUAL', null), {
    start: '08:00',
    end: '17:00',
  });

  // Inherits TEAM_KPI window if custom window is omitted
  const noWindowCfg = parseTeamBookingDoneBonusConfig({
    enabled: true,
    tiers: DEFAULT_BK_TEAM_BOOKING_DONE_TIERS,
  })!;
  assert.deepEqual(
    resolveEffectiveDailyTimeWindow(noWindowCfg, 'TEAM_KPI', {
      dailyTarget: 30,
      rewardPerDay: 50000,
      penaltyPerDay: 25000,
      timeWindowStart: '09:00',
      timeWindowEnd: '18:00',
    }),
    { start: '09:00', end: '18:00' }
  );
  assert.equal(resolveEffectiveDailyTimeWindow(noWindowCfg, 'INDIVIDUAL', null), null);
  assert.equal(parseTeamBookingDoneBonusConfig(null), null);
  assert.equal(parseTeamBookingDoneBonusConfig(''), null);
});

test('aggregateTeamBookingDoneBonusData calculates daily tiers, excludes Combo, deduplicates orders, and aggregates per-Booker totals', () => {
  const participants: BkGameParticipant[] = [
    { id: 1, gameId: 77, staffId: 101, staffName: 'Ngọc Điệp', betAmount: 0, score: 0, rewardAmount: 0, status: 'ACTIVE' },
    { id: 2, gameId: 77, staffId: 102, staffName: 'Bích Phượng', betAmount: 0, score: 0, rewardAmount: 0, status: 'ACTIVE' },
  ];

  const config = parseTeamBookingDoneBonusConfig({
    enabled: true,
    tiers: DEFAULT_BK_TEAM_BOOKING_DONE_TIERS,
  })!;

  const dailyList = buildIctDateList('2026-11-19', '2026-11-21');
  assert.deepEqual(dailyList, ['2026-11-19', '2026-11-20', '2026-11-21']);

  const dailyTeamBookingsMap = new Map<string, number>([
    ['2026-11-19', 28], // Dưới 30 -> 0đ/Done
    ['2026-11-20', 42], // 40-49 -> 7.000đ/Done
    ['2026-11-21', 55], // >=50 -> 10.000đ/Done
  ]);

  const completedOrders = [
    // Day 1 (0đ tier): 2 single dones for 101
    { orderId: 1001, orderKey: 'ORD-1001', staffId: 101, customerName: 'Khách A', completedAt: '2026-11-19T04:00:00Z', completedDate: '2026-11-19' },
    { orderId: 1002, orderKey: 'ORD-1002', staffId: 101, customerName: 'Khách B', completedAt: '2026-11-19T05:00:00Z', completedDate: '2026-11-19' },
    // Day 2 (7.000đ tier): 3 single + 1 duplicate orderId (must count once!) + 2 combo (must exclude!)
    { orderId: 1003, orderKey: 'ORD-1003', staffId: 101, customerName: 'Khách C', completedAt: '2026-11-20T03:00:00Z', completedDate: '2026-11-20' },
    { orderId: 1003, orderKey: 'ORD-1003', staffId: 101, customerName: 'Khách C', completedAt: '2026-11-20T03:00:00Z', completedDate: '2026-11-20' },
    { orderId: 1004, orderKey: 'ORD-1004', staffId: 101, customerName: 'Khách D (Combo)', completedAt: '2026-11-20T04:00:00Z', completedDate: '2026-11-20' },
    { orderId: 1005, orderKey: 'ORD-1005', staffId: 102, customerName: 'Khách E', completedAt: '2026-11-20T05:00:00Z', completedDate: '2026-11-20' },
    { orderId: 1006, orderKey: 'ORD-1006', staffId: 102, customerName: 'Khách F', completedAt: '2026-11-20T06:00:00Z', completedDate: '2026-11-20' },
    { orderId: 1007, orderKey: 'ORD-1007', staffId: 102, customerName: 'Khách G (Combo)', completedAt: '2026-11-20T07:00:00Z', completedDate: '2026-11-20' },
    // Day 3 (10.000đ tier): 1 single for 101
    { orderId: 1008, orderKey: 'ORD-1008', staffId: 101, customerName: 'Khách H', completedAt: '2026-11-21T04:00:00Z', completedDate: '2026-11-21' },
  ];

  const comboLiveMap = new Map<number, boolean>([
    [1001, false],
    [1002, false],
    [1003, false],
    [1004, true], // Combo -> excluded
    [1005, false],
    [1006, false],
    [1007, true], // Combo -> excluded
    [1008, false],
  ]);

  const { summary, qualifiedLedgerItems } = aggregateTeamBookingDoneBonusData({
    gameId: 77,
    config,
    effectiveWindow: null,
    dailyList,
    todayStr: '2026-11-21',
    dailyTeamBookingsMap,
    completedOrders,
    comboLiveMap,
    participants,
  });

  // Day 1: 2 single dones * 0đ = 0đ
  assert.equal(summary.dailyResults[0].teamBookings, 28);
  assert.equal(summary.dailyResults[0].tierLabel, 'Dưới 30 Booking');
  assert.equal(summary.dailyResults[0].bonusPerDone, 0);
  assert.equal(summary.dailyResults[0].totalSingleDone, 2);
  assert.equal(summary.dailyResults[0].totalDayBonus, 0);

  // Day 2: 3 single dones (1003 once for 101; 1005, 1006 for 102) * 7.000đ = 21.000đ; 2 combo excluded
  assert.equal(summary.dailyResults[1].teamBookings, 42);
  assert.equal(summary.dailyResults[1].tierLabel, '40–49 Booking');
  assert.equal(summary.dailyResults[1].bonusPerDone, 7000);
  assert.equal(summary.dailyResults[1].totalSingleDone, 3);
  assert.equal(summary.dailyResults[1].totalComboDoneExcluded, 2);
  assert.equal(summary.dailyResults[1].totalDayBonus, 21000);

  // Day 3 (Today): 1 single done * 10.000đ = 10.000đ
  assert.equal(summary.todayTeamBookings, 55);
  assert.equal(summary.todayTierLabel, 'Từ 50 Booking');
  assert.equal(summary.todayBonusPerDone, 10000);
  assert.equal(summary.todaySingleDone, 1);
  assert.equal(summary.todayTotalBonus, 10000);

  // Overall totals: 6 single dones total, 2 combos excluded, 31.000đ total bonus
  assert.equal(summary.totalSingleDone, 6);
  assert.equal(summary.totalComboDoneExcluded, 2);
  assert.equal(summary.totalBonus, 31000);

  // Per-booker totals:
  // 101 Ngọc Điệp: 2*0 + 1*7000 + 1*10000 = 17.000đ (4 single dones)
  // 102 Bích Phượng: 0*0 + 2*7000 + 0*10000 = 14.000đ (2 single dones)
  const diep = summary.staffTotals.find((s) => s.staffId === 101)!;
  const phuong = summary.staffTotals.find((s) => s.staffId === 102)!;
  assert.equal(diep.singleDoneCount, 4);
  assert.equal(diep.totalBonus, 17000);
  assert.equal(phuong.singleDoneCount, 2);
  assert.equal(phuong.totalBonus, 14000);

  // Ledger items strictly contain only orders with bonusAmount > 0, each orderId once
  assert.deepEqual(
    qualifiedLedgerItems.map((x) => ({ orderId: x.orderId, bonusAmount: x.bonusAmount })),
    [
      { orderId: 1003, bonusAmount: 7000 },
      { orderId: 1005, bonusAmount: 7000 },
      { orderId: 1006, bonusAmount: 7000 },
      { orderId: 1008, bonusAmount: 10000 },
    ]
  );
});

test('BkGameTeamBookingDoneBonusService.syncAndComputeSummary queries legacy DB, excludes Combo, and syncs ledger', async () => {
  ComboRecognitionService.clearComboLiveCache();

  const queriesExecuted: string[] = [];
  const deletedIds: number[] = [];
  const upsertedOrderIds: number[] = [];

  const mockFastify = {
    prisma: {
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          queriesExecuted.push(sql);
          if (sql.includes('COUNT(DISTINCT o.id) AS teamBookings')) {
            return [{ bookingDate: '2026-11-19', teamBookings: 35 }];
          }
          if (sql.includes("o.order_state IN ('Completed', 'CheckOut')")) {
            return [
              {
                orderId: 5001,
                orderKey: 'WL-5001',
                staffId: 101,
                customerName: 'Chị Mai',
                completedAt: new Date('2026-11-19T05:00:00Z'),
                completedDate: '2026-11-19',
              },
              {
                orderId: 5002,
                orderKey: 'WL-5002',
                staffId: 101,
                customerName: 'Chị Lan (Combo)',
                completedAt: new Date('2026-11-19T06:00:00Z'),
                completedDate: '2026-11-19',
              },
            ];
          }
          if (sql.includes('hasLiveComboAtBooking')) {
            return [
              { orderId: 5001, hasLiveComboAtBooking: 0 },
              { orderId: 5002, hasLiveComboAtBooking: 1 },
            ];
          }
          return [];
        },
      },
      crm: {
        crmBkGameTeamBookingDoneBonus: {
          findMany: async () => {
            if (upsertedOrderIds.length === 0) {
              // Stale order 9999 previously recorded should be pruned
              return [
                {
                  id: 10,
                  gameId: 88,
                  orderId: 9999,
                  orderKey: 'WL-9999',
                  staffId: 101,
                  customerName: 'Stale',
                  rewardDate: '2026-11-19',
                  teamBookings: 35,
                  tierLabel: '30–39 Booking',
                  bonusPerDone: 5000,
                  bonusAmount: 5000,
                  orderCompletedAt: new Date('2026-11-19T05:00:00Z'),
                  createdAt: new Date('2026-11-19T05:05:00Z'),
                },
              ];
            }
            return [
              {
                id: 11,
                gameId: 88,
                orderId: 5001,
                orderKey: 'WL-5001',
                staffId: 101,
                customerName: 'Chị Mai',
                rewardDate: '2026-11-19',
                teamBookings: 35,
                tierLabel: '30–39 Booking',
                bonusPerDone: 5000,
                bonusAmount: 5000,
                orderCompletedAt: new Date('2026-11-19T05:00:00Z'),
                createdAt: new Date('2026-11-19T05:05:00Z'),
              },
            ];
          },
          deleteMany: async ({ where }: { where: { id: { in: number[] } } }) => {
            deletedIds.push(...where.id.in);
            return { count: where.id.in.length };
          },
          upsert: async ({ create }: { create: { orderId: number } }) => {
            upsertedOrderIds.push(create.orderId);
            return create;
          },
        },
      },
    },
    log: { info: () => {}, warn: () => {} },
  } as unknown as FastifyInstance;

  const summary = await BkGameTeamBookingDoneBonusService.syncAndComputeSummary(
    mockFastify,
    {
      id: 88,
      gameType: 'INDIVIDUAL',
      status: 'ACTIVE',
      startDate: new Date('2026-11-18T17:00:00.000Z'), // 2026-11-19 00:00:00 ICT
      endDate: new Date('2026-11-19T16:59:59.000Z'), // 2026-11-19 23:59:59 ICT
      allowedBookingChannels: '["GB"]',
      teamBookingDoneBonusConfig: JSON.stringify({
        enabled: true,
        tiers: DEFAULT_BK_TEAM_BOOKING_DONE_TIERS,
        timeWindowStart: '08:00',
        timeWindowEnd: '17:00',
      }),
    },
    [
      {
        id: 1,
        gameId: 88,
        staffId: 101,
        staffName: 'Ngọc Điệp',
        betAmount: 0,
        score: 0,
        rewardAmount: 0,
        status: 'ACTIVE',
      },
    ]
  );

  assert.ok(summary);
  assert.equal(summary.totalSingleDone, 1);
  assert.equal(summary.totalComboDoneExcluded, 1);
  assert.equal(summary.totalBonus, 5000);
  assert.deepEqual(deletedIds, [10]);
  assert.deepEqual(upsertedOrderIds, [5001]);

  // Verify channel filter, time window filter, and virtual/cancelled booking inclusion were inherited in SQL
  const bookingSql = queriesExecuted.find((q) => q.includes('teamBookings'))!;
  assert.ok(bookingSql.includes("UPPER(o.booking_channels) IN ('GB')"));
  assert.ok(bookingSql.includes("TIME(o.date_created) >= '08:00:00'"));
  assert.ok(bookingSql.includes("TIME(o.date_created) <= '17:00:59'"));
  assert.ok(!bookingSql.includes("o.order_state != 'Cancelled'"));

  const doneSql = queriesExecuted.find((q) => q.includes("o.order_state IN ('Completed', 'CheckOut')"))!;
  assert.ok(doneSql.includes("2026-11-19 00:00:00"));
  assert.ok(doneSql.includes("2026-11-19 23:59:59"));
});

test('BkGameTeamBookingDoneBonusService.syncAndComputeSummary uses full ICT day bounds even when game timestamps are mid-day', async () => {
  ComboRecognitionService.clearComboLiveCache();
  const queriesExecuted: string[] = [];

  const mockFastify = {
    prisma: {
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          queriesExecuted.push(sql);
          return [];
        },
      },
      crm: {
        crmBkGameTeamBookingDoneBonus: {
          findMany: async () => [],
        },
      },
    },
    log: { info: () => {}, warn: () => {} },
  } as unknown as FastifyInstance;

  await BkGameTeamBookingDoneBonusService.syncAndComputeSummary(
    mockFastify,
    {
      id: 89,
      gameType: 'INDIVIDUAL',
      status: 'ACTIVE',
      startDate: new Date('2026-11-19T04:15:00.000Z'), // 11:15:00 ICT (mid-day)
      endDate: new Date('2026-11-22T17:00:00.000Z'), // 2026-11-23 00:00:00 ICT (midnight)
      teamBookingDoneBonusConfig: JSON.stringify({
        enabled: true,
        tiers: DEFAULT_BK_TEAM_BOOKING_DONE_TIERS,
      }),
    },
    [
      {
        id: 1,
        gameId: 89,
        staffId: 101,
        staffName: 'Ngọc Điệp',
        betAmount: 0,
        score: 0,
        rewardAmount: 0,
        status: 'ACTIVE',
      },
    ]
  );

  const bookingSql = queriesExecuted.find((q) => q.includes('teamBookings'))!;
  const doneSql = queriesExecuted.find((q) => q.includes("o.order_state IN ('Completed', 'CheckOut')"))!;
  assert.ok(bookingSql.includes("o.date_created >= '2026-11-19 00:00:00'"));
  assert.ok(bookingSql.includes("o.date_created <= '2026-11-23 23:59:59'"));
  assert.ok(doneSql.includes("ro.actual_booking_date_start >= '2026-11-19 00:00:00'"));
  assert.ok(doneSql.includes("ro.actual_booking_date_start <= '2026-11-23 23:59:59'"));
});

test('BkGameService.updateGame serializes teamBookingDoneBonusConfig and rejects invalid timeWindow', async () => {
  let updatedData: Record<string, unknown> | null = null;
  const now = new Date();

  const mockFastify = {
    prisma: {
      legacy: {
        $queryRawUnsafe: async () => [],
      },
      crm: {
        crmBkGame: {
          findUnique: async () => ({
            id: 5,
            title: 'WINGS BOOKING RACE',
            gameType: 'INDIVIDUAL',
            metricType: 'DONE',
            status: 'ACTIVE',
            startDate: new Date(now.getTime() - 86400000),
            endDate: new Date(now.getTime() + 86400000),
            allowedBookingChannels: null,
            doneBonusConfig: null,
            teamKpiConfig: null,
            teamBookingDoneBonusConfig: updatedData?.teamBookingDoneBonusConfig ?? null,
            participants: [],
            teams: [],
          }),
          update: async ({ data }: { data: Record<string, unknown> }) => {
            updatedData = data;
            return { id: 5, ...data };
          },
        },
        crmBkGameDoneBonus: { findMany: async () => [] },
        crmBkGameTeamBookingDoneBonus: { findMany: async () => [] },
      },
    },
    log: { info: () => {}, warn: () => {} },
  } as unknown as FastifyInstance;

  await assert.rejects(
    () =>
      BkGameService.updateGame(mockFastify, 5, {
        teamBookingDoneBonusConfig: {
          enabled: true,
          tiers: DEFAULT_BK_TEAM_BOOKING_DONE_TIERS,
          timeWindowStart: '18:00',
          timeWindowEnd: '08:00',
        },
      }),
    /Khung giờ tính Booking Team không hợp lệ/
  );

  const updated = await BkGameService.updateGame(mockFastify, 5, {
    teamBookingDoneBonusConfig: {
      enabled: true,
      tiers: DEFAULT_BK_TEAM_BOOKING_DONE_TIERS,
    },
  });

  assert.ok(updated.teamBookingDoneBonusConfig?.enabled);
  assert.equal(updated.teamBookingDoneBonusConfig?.tiers.length, 3);
  assert.ok(typeof (updatedData as Record<string, unknown> | null)?.teamBookingDoneBonusConfig === 'string');
});

test('BkGameTeamBookingDoneBonusService merges newly added active BK_TELESALES staff into live calculation', async () => {
  ComboRecognitionService.clearComboLiveCache();
  let capturedStaffFilter = '';
  const createdParticipantStaffIds: number[] = [];

  const mockFastify = {
    prisma: {
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('SELECT user_id FROM user_profile')) {
            return [{ user_id: 50670 }, { user_id: 52853 }];
          }
          if (sql.includes('FROM user_profile up')) {
            return [{ staffId: 52853, staffName: 'Ngọc Huyền', avatar: null }];
          }
          if (sql.includes('teamBookings')) {
            capturedStaffFilter = sql;
            return [{ bookingDate: '2026-11-20', teamBookings: 28 }];
          }
          if (sql.includes("o.order_state IN ('Completed', 'CheckOut')")) {
            return [
              {
                orderId: 339915,
                orderKey: 'WL-339915',
                staffId: 52853,
                customerName: 'Chị Hương',
                completedAt: new Date('2026-11-20T04:00:00Z'),
                completedDate: '2026-11-20',
              },
            ];
          }
          if (sql.includes('hasLiveComboAtBooking')) {
            return [{ orderId: 339915, hasLiveComboAtBooking: 0 }];
          }
          return [];
        },
      },
      crm: {
        crmTeam: {
          findUnique: async () => null,
        },
        crmConfig: {
          findUnique: async () => ({
            key: 'ACTIVE_BK_TELESALES_STAFF_CONFIG',
            value: JSON.stringify([50670, 52853]),
          }),
        },
        crmBkGameParticipant: {
          createMany: async ({ data }: { data: Array<{ staffId: number }> }) => {
            createdParticipantStaffIds.push(...data.map((d) => d.staffId));
            return { count: data.length };
          },
        },
        crmBkGameTeamBookingDoneBonus: {
          findMany: async () => [],
          upsert: async () => ({}),
        },
      },
    },
    log: { info: () => {}, warn: () => {} },
  } as unknown as FastifyInstance;

  const summary = await BkGameTeamBookingDoneBonusService.syncAndComputeSummary(
    mockFastify,
    {
      id: 5,
      gameType: 'INDIVIDUAL',
      status: 'ACTIVE',
      startDate: new Date('2026-11-18T17:00:00.000Z'),
      endDate: new Date('2026-11-20T16:59:59.000Z'),
      teamBookingDoneBonusConfig: JSON.stringify({
        enabled: true,
        tiers: DEFAULT_BK_TEAM_BOOKING_DONE_TIERS,
      }),
    },
    [
      {
        id: 1,
        gameId: 5,
        staffId: 50670,
        staffName: 'Bích Phượng',
        betAmount: 0,
        score: 0,
        rewardAmount: 0,
        status: 'ACTIVE',
      },
    ]
  );

  assert.ok(summary);
  assert.ok(capturedStaffFilter.includes('50670,52853'));
  assert.deepEqual(createdParticipantStaffIds, [52853]);
  assert.equal(summary.totalSingleDone, 1);
  assert.ok(summary.staffTotals.some((s) => s.staffId === 52853 && s.staffName === 'Ngọc Huyền' && s.singleDoneCount === 1));
});
