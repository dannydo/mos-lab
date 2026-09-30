import assert from 'node:assert/strict';
import test from 'node:test';
import { TelesaleTargetService, DEFAULT_OCTOBER_CONFIG } from './telesale-target.service.js';

test('TelesaleTargetService.cloneConfig validates inputs and clones targets correctly', async () => {
  const store = new Map<string, string>();

  const mockFastify = {
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async ({ where }: { where: { key: string } }) => {
            const val = store.get(where.key);
            return val ? { key: where.key, value: val } : null;
          },
          findMany: async () => {
            return Array.from(store.keys())
              .filter((k) => k.startsWith('TELESALE_TARGET_CONFIG_'))
              .map((key) => ({ key }));
          },
          upsert: async ({ where, create, update }: any) => {
            const val = update?.value || create?.value;
            store.set(where.key, val);
            return { key: where.key, value: val };
          },
        },
      },
    },
    log: {
      warn: () => {},
      error: () => {},
    },
  };

  // 1. Error on invalid format
  await assert.rejects(
    async () => {
      await TelesaleTargetService.cloneConfig(mockFastify as any, 'invalid', '2026-11');
    },
    { message: /Định dạng tháng không hợp lệ/ }
  );

  // 2. Error on same source and target month
  await assert.rejects(
    async () => {
      await TelesaleTargetService.cloneConfig(mockFastify as any, '2026-10', '2026-10');
    },
    { message: /Tháng đích phải khác tháng nguồn/ }
  );

  // 3. Successful clone from 2026-10 to 2026-11
  const cloned = await TelesaleTargetService.cloneConfig(mockFastify as any, '2026-10', '2026-11', false);
  assert.equal(cloned.month, '2026-11');
  assert.equal(cloned.teamDoneTarget, DEFAULT_OCTOBER_CONFIG.teamDoneTarget);
  assert.equal(cloned.teamBookTarget, DEFAULT_OCTOBER_CONFIG.teamBookTarget);
  assert.equal(cloned.stageTargets['0_30'], 200);

  // 4. Error on duplicate without overwrite
  await assert.rejects(
    async () => {
      await TelesaleTargetService.cloneConfig(mockFastify as any, '2026-10', '2026-11', false);
    },
    { message: /Kế hoạch tháng 2026-11 đã tồn tại/ }
  );

  // 5. Success with overwrite: true
  const overwritten = await TelesaleTargetService.cloneConfig(mockFastify as any, '2026-10', '2026-11', true);
  assert.equal(overwritten.month, '2026-11');

  // 6. Test listConfiguredMonths
  const months = await TelesaleTargetService.listConfiguredMonths(mockFastify as any);
  assert.ok(months.includes('2026-10'));
  assert.ok(months.includes('2026-11'));
});

test('TelesaleTargetService.calculateTeamWorkDaysPacing handles not started, in-progress, and completed periods correctly (MOS-BUG-67)', async () => {
  const mockFastify = {
    prisma: {
      crm: {
        crmHolidayPeriod: {
          findMany: async () => [],
        },
      },
    },
    log: {
      warn: () => {},
    },
  };

  // Case 1: Future month (Not started yet - e.g. evaluating 2026-10 on 2026-09-30)
  const nowBefore = new Date('2026-09-30T10:00:00.000Z');
  const notStartedPacing = await TelesaleTargetService.calculateTeamWorkDaysPacing(
    mockFastify as any,
    '2026-10',
    [50670, 52086],
    nowBefore,
    450,
    0,
    650,
    0
  );

  assert.equal(notStartedPacing.periodStatus, 'NOT_STARTED');
  assert.equal(notStartedPacing.pacingStatus, 'NOT_STARTED');
  assert.equal(notStartedPacing.pacingStatusLabel, 'Chưa bắt đầu');
  assert.equal(notStartedPacing.workDaysElapsed, 0);
  assert.equal(notStartedPacing.workDaysTotal, 27); // 31 days in Oct 2026 - 4 Sundays = 27 workdays
  assert.equal(notStartedPacing.workDaysRemaining, 27);
  assert.equal(notStartedPacing.expectedDone, 0);
  assert.equal(notStartedPacing.expectedBook, 0);
  assert.equal(notStartedPacing.gapDone, 0);
  assert.equal(notStartedPacing.gapBook, 0);
  assert.equal(notStartedPacing.remainingDone, 450);
  assert.equal(notStartedPacing.remainingBook, 650);
  assert.equal(notStartedPacing.dailyRequiredDone, 16.7); // 450 / 27 = 16.666 -> 16.7
  assert.equal(notStartedPacing.dailyRequiredBook, 24.1); // 650 / 27 = 24.07 -> 24.1

  // Case 2: In progress month (Ahead: doneActual exceeds expectedDone by >= 5%)
  // On 2026-10-14 (12 workdays elapsed in Oct 2026: Oct 1,2,3, 5,6,7,8,9,10, 12,13,14)
  const nowMid = new Date('2026-10-14T10:00:00.000Z');
  const inProgressPacingAhead = await TelesaleTargetService.calculateTeamWorkDaysPacing(
    mockFastify as any,
    '2026-10',
    [50670, 52086],
    nowMid,
    450,
    220, // Expected: 450 * (12/27) = 200, Actual: 220 -> Ahead (+10%)
    650,
    300
  );

  assert.equal(inProgressPacingAhead.periodStatus, 'IN_PROGRESS');
  assert.equal(inProgressPacingAhead.workDaysElapsed, 12);
  assert.equal(inProgressPacingAhead.workDaysRemaining, 15);
  assert.equal(inProgressPacingAhead.expectedDone, 200);
  assert.equal(inProgressPacingAhead.gapDone, 20); // 220 - 200 = +20
  assert.equal(inProgressPacingAhead.remainingDone, 230); // 450 - 220 = 230
  assert.equal(inProgressPacingAhead.dailyRequiredDone, 15.3); // 230 / 15 = 15.333 -> 15.3
  assert.equal(inProgressPacingAhead.pacingStatus, 'AHEAD');
  assert.equal(inProgressPacingAhead.pacingStatusLabel, 'Vượt nhịp');
  assert.equal(inProgressPacingAhead.isPacingOnTrack, true);

  // Case 3: In progress month (Behind: doneActual < 95% of expectedDone)
  const inProgressPacingBehind = await TelesaleTargetService.calculateTeamWorkDaysPacing(
    mockFastify as any,
    '2026-10',
    [50670, 52086],
    nowMid,
    450,
    180, // Expected: 200, Actual: 180 (90%) -> Behind
    650,
    250
  );

  assert.equal(inProgressPacingBehind.pacingStatus, 'BEHIND');
  assert.equal(inProgressPacingBehind.pacingStatusLabel, 'Chậm nhịp');
  assert.equal(inProgressPacingBehind.gapDone, -20); // 180 - 200 = -20
  assert.equal(inProgressPacingBehind.remainingDone, 270);
  assert.equal(inProgressPacingBehind.dailyRequiredDone, 18.0); // 270 / 15 = 18.0
  assert.equal(inProgressPacingBehind.isPacingOnTrack, false);

  // Case 4: Completed month (Past month - e.g. evaluating 2026-08 on 2026-09-30)
  const completedPacing = await TelesaleTargetService.calculateTeamWorkDaysPacing(
    mockFastify as any,
    '2026-08',
    [50670, 52086],
    nowBefore,
    450,
    460,
    650,
    670
  );

  assert.equal(completedPacing.periodStatus, 'COMPLETED');
  assert.equal(completedPacing.workDaysElapsed, completedPacing.workDaysTotal);
  assert.equal(completedPacing.workDaysRemaining, 0);
  assert.equal(completedPacing.dailyRequiredDone, 0);
  assert.equal(completedPacing.dailyRequiredBook, 0);
});

test('TelesaleTargetService.getOverview computes MOS-BUG-72 staff KPI metrics correctly', async () => {
  const mockConfig = {
    teamDoneTarget: 400,
    teamBookTarget: 600,
    dailyCallPerStaff: 40,
    staffTargets: [
      { legacyStaffId: 101, name: 'Nhân viên A', doneTarget: 100 },
      { legacyStaffId: 102, name: 'Nhân viên B', doneTarget: 100 },
      { legacyStaffId: 103, name: 'Nhân viên C', doneTarget: 100 },
    ],
    stageTargets: { '0_30': 200, '31_60': 100, '61_120': 50, gt_120: 50 },
  };

  const mockMonthOrders = [
    // Staff 101: 3 completed orders (2 regular, 1 combo)
    {
      id: 1,
      bookerId: 101,
      orderState: 'Completed',
      dateCreated: '2026-10-05 10:00:00',
      isComboLive: 0,
      totalPrice: 500000,
      daysSinceLastVisit: 15,
    },
    {
      id: 2,
      bookerId: 101,
      orderState: 'Completed',
      dateCreated: '2026-10-06 11:00:00',
      isComboLive: 0,
      totalPrice: 300000,
      daysSinceLastVisit: 25,
    },
    {
      id: 3,
      bookerId: 101,
      orderState: 'Completed',
      dateCreated: '2026-10-07 14:00:00',
      isComboLive: 1,
      totalPrice: 1200000,
      daysSinceLastVisit: 45,
    },
    // Staff 102: 1 completed order, 1 cancelled
    {
      id: 4,
      bookerId: 102,
      orderState: 'Completed',
      dateCreated: '2026-10-05 09:00:00',
      isComboLive: 0,
      totalPrice: 400000,
      daysSinceLastVisit: 10,
    },
    {
      id: 5,
      bookerId: 102,
      orderState: 'Cancelled',
      dateCreated: '2026-10-06 15:00:00',
      isComboLive: 0,
      totalPrice: 800000,
      daysSinceLastVisit: 10,
    },
  ];

  const mockTodayOrders = [
    { id: 2, bookerId: 101, orderState: 'Completed', dateCreated: '2026-10-06 11:00:00', isComboLive: 0 },
  ];

  const mockFastify = {
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async () => ({
            key: 'TELESALE_TARGET_CONFIG_2026-10',
            value: JSON.stringify(mockConfig),
          }),
        },
        crmHolidayPeriod: {
          findMany: async () => [],
        },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('prev_o.booking_date_start')) {
            return mockMonthOrders;
          }
          if (sql.includes('buildComboLiveAtBookingSql')) {
            return mockTodayOrders;
          }
          if (sql.includes('user_profile')) {
            return [];
          }
          return [];
        },
      },
    },
    log: {
      warn: () => {},
      error: () => {},
    },
  };

  const overview = await TelesaleTargetService.getOverview(mockFastify as any, '2026-10');
  assert.equal(overview.staffTargets.length, 3);

  const staffA = overview.staffTargets.find((s) => s.legacyStaffId === 101);
  assert.ok(staffA);
  assert.equal(staffA.doneActual, 2);
  assert.equal(staffA.comboLiveDoneActual, 1);
  // Revenue must sum completed orders of staff 101: 500k + 300k + 1200k = 2,000,000đ
  assert.equal(staffA.revenueActual, 2000000);
  assert.ok(staffA.gapDone !== undefined);
  assert.ok(staffA.remainingDone !== undefined);
  assert.ok(staffA.dailyRequiredDone !== undefined);
  assert.ok(['AHEAD', 'ON_TRACK', 'BEHIND'].includes(staffA.progressStatus!));
  assert.ok(['Vượt tiến độ', 'Đúng tiến độ', 'Chậm tiến độ'].includes(staffA.progressStatusLabel!));

  const staffB = overview.staffTargets.find((s) => s.legacyStaffId === 102);
  assert.ok(staffB);
  assert.equal(staffB.doneActual, 1);
  assert.equal(staffB.comboLiveDoneActual, 0);
  // Cancelled order (800k) should NOT be counted in revenue
  assert.equal(staffB.revenueActual, 400000);

  const staffC = overview.staffTargets.find((s) => s.legacyStaffId === 103);
  assert.ok(staffC);
  assert.equal(staffC.doneActual, 0);
  assert.equal(staffC.revenueActual, 0);
  assert.equal(staffC.remainingDone, 100);
});
