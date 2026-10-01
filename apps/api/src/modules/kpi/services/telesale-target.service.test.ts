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
      dateCreated: '2099-10-05 10:00:00',
      isComboLive: 0,
      totalPrice: 500000,
      daysSinceLastVisit: 15,
    },
    {
      id: 2,
      bookerId: 101,
      orderState: 'Completed',
      dateCreated: '2099-10-06 11:00:00',
      isComboLive: 0,
      totalPrice: 300000,
      daysSinceLastVisit: 25,
    },
    {
      id: 3,
      bookerId: 101,
      orderState: 'Completed',
      dateCreated: '2099-10-07 14:00:00',
      isComboLive: 1,
      totalPrice: 1200000,
      daysSinceLastVisit: 45,
    },
    // Staff 102: 1 completed order, 1 cancelled
    {
      id: 4,
      bookerId: 102,
      orderState: 'Completed',
      dateCreated: '2099-10-05 09:00:00',
      isComboLive: 0,
      totalPrice: 400000,
      daysSinceLastVisit: 10,
    },
    {
      id: 5,
      bookerId: 102,
      orderState: 'Cancelled',
      dateCreated: '2099-10-06 15:00:00',
      isComboLive: 0,
      totalPrice: 800000,
      daysSinceLastVisit: 10,
    },
  ];

  const mockTodayOrders = [
    { id: 2, bookerId: 101, orderState: 'Completed', dateCreated: '2099-10-06 11:00:00', isComboLive: 0 },
  ];

  const mockFastify = {
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async () => ({
            key: 'TELESALE_TARGET_CONFIG_2099-10',
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

  const overview = await TelesaleTargetService.getOverview(mockFastify as any, '2099-10');
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
  // MOS-BUG-76: If month has not started yet, status must be NOT_STARTED ('Chưa bắt đầu')
  assert.equal(staffA.progressStatus, 'NOT_STARTED');
  assert.equal(staffA.progressStatusLabel, 'Chưa bắt đầu');

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

test('TelesaleTargetService.getOverview correctly counts today Book and Done when dates are Date objects (MOS-BUG-75)', async () => {
  // Current time in ICT
  const nowUtc = new Date();
  const ictOffsetMs = 7 * 60 * 60 * 1000;
  const nowIct = new Date(nowUtc.getTime() + ictOffsetMs);
  const todayStr = nowIct.toISOString().slice(0, 10);

  const mockConfig = {
    month: todayStr.slice(0, 7),
    teamDoneTarget: 450,
    teamBookTarget: 650,
    dailyDoneTarget: 18,
    dailyBookTarget: 25,
    dailyCallPerStaff: 90,
    staffTargets: [
      { legacyStaffId: 50670, name: 'Phượng', doneTarget: 150 },
      { legacyStaffId: 52648, name: 'Kiều', doneTarget: 100 },
    ],
    stageTargets: { '0_30': 200, '31_60': 110, '61_120': 80, gt_120: 60 },
  };

  // Orders returned from MySQL with real JavaScript Date objects
  const todayDateObj = new Date(`${todayStr}T10:00:00+07:00`);

  const mockFastify = {
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async () => ({
            key: `TELESALE_TARGET_CONFIG_${todayStr.slice(0, 7)}`,
            value: JSON.stringify(mockConfig),
          }),
        },
        crmHolidayPeriod: {
          findMany: async () => [],
        },
        crmStaff: {
          findMany: async () => [
            { legacyStaffId: 50670, role: 'telesales', isActive: true },
            { legacyStaffId: 52648, role: 'telesales', isActive: true },
          ],
        },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('prev_o.booking_date_start')) {
            return [];
          }
          if (sql.includes('o.date_created >=')) {
            return [
              { id: 101, bookerId: 50670, orderState: 'New', dateCreated: todayDateObj },
              { id: 103, bookerId: 52648, orderState: 'New', dateCreated: todayDateObj },
            ];
          }
          if (sql.includes('report_order ro')) {
            return [
              {
                id: 102,
                bookerId: 50670,
                orderState: 'Completed',
                totalPrice: 200000,
                bookingDateStart: todayDateObj,
                actualBookingDateStart: todayDateObj,
              },
            ];
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

  const overview = await TelesaleTargetService.getOverview(mockFastify as any, todayStr.slice(0, 7));

  // Book today must be 2 (id 101 and id 103), NOT 0
  assert.equal(overview.teamDaily.bookActual, 2);
  // Done today must be 1 (id 102), NOT 0
  assert.equal(overview.teamDaily.doneActual, 1);
  // Total bookings today in dailyAction
  assert.equal(overview.dailyAction.totalBookingsToday, 2);
  // Staff 50670 doneToday must be 1
  const phuong = overview.staffTargets.find((s) => s.legacyStaffId === 50670);
  assert.ok(phuong);
  assert.equal(phuong.doneToday, 1);
});

test('TelesaleTargetService.getOverview computes Daily Action Call & Pickup with shift filter (MOS-BUG-77)', async () => {
  const nowUtc = new Date();
  const ictOffsetMs = 7 * 60 * 60 * 1000;
  const nowIct = new Date(nowUtc.getTime() + ictOffsetMs);
  const todayStr = nowIct.toISOString().slice(0, 10);

  const mockConfig = {
    month: todayStr.slice(0, 7),
    teamDoneTarget: 450,
    teamBookTarget: 650,
    dailyDoneTarget: 18,
    dailyBookTarget: 25,
    dailyCallPerStaff: 83,
    dailyPickupPerStaff: 25,
    staffTargets: [
      { legacyStaffId: 50670, name: 'Phượng', doneTarget: 150 },
      { legacyStaffId: 52648, name: 'Kiều', doneTarget: 100 },
    ],
    stageTargets: { '0_30': 200, '31_60': 110, '61_120': 80, gt_120: 60 },
  };

  const mockFastify = {
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async () => ({
            key: `TELESALE_TARGET_CONFIG_${todayStr.slice(0, 7)}`,
            value: JSON.stringify(mockConfig),
          }),
        },
        crmHolidayPeriod: {
          findMany: async () => [],
        },
        crmStaff: {
          findMany: async () => [
            { legacyStaffId: 50670, role: 'telesales', isActive: true },
            { legacyStaffId: 52648, role: 'telesales', isActive: true },
          ],
        },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('staff_working_shift')) {
            // Staff 50670 is working today; Staff 52648 is NOT working today (OFF)
            return [{ user_id: 50670, working_day_count: 1 }];
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

  const overview = await TelesaleTargetService.getOverview(mockFastify as any, todayStr.slice(0, 7));

  assert.ok(overview.dailyAction);
  assert.equal(overview.dailyAction.callTargetPerStaff, 83);
  assert.equal(overview.dailyAction.pickupTargetPerStaff, 25);

  // Since only 1 staff is working today, team targets = 1 * per staff
  assert.equal(overview.dailyAction.teamCallTarget, 83);
  assert.equal(overview.dailyAction.teamPickupTarget, 25);

  const staffActions = overview.dailyAction.staffActions;
  assert.ok(staffActions);
  assert.equal(staffActions.length, 2);

  const phuongAction = staffActions.find((s) => s.legacyStaffId === 50670);
  assert.ok(phuongAction);
  assert.equal(phuongAction.isWorkingToday, true);
  assert.equal(phuongAction.callTarget, 83);
  assert.equal(phuongAction.pickupTarget, 25);

  const kieuAction = staffActions.find((s) => s.legacyStaffId === 52648);
  assert.ok(kieuAction);
  assert.equal(kieuAction.isWorkingToday, false);
  assert.equal(kieuAction.status, 'OFF');
  assert.equal(kieuAction.statusLabel, 'Nghỉ');
});

test('TelesaleTargetService.getOverview calculates staff Book today, contribution percent, top Book glow, and returns todayLiveEvents (MOS-FEAT-83)', async () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const mockConfig: any = {
    month: todayStr.slice(0, 7),
    teamDoneTarget: 450,
    teamBookTarget: 650,
    dailyDoneTarget: 18,
    dailyBookTarget: 25,
    dailyCallPerStaff: 83,
    dailyPickupPerStaff: 25,
    staffTargets: [
      { legacyStaffId: 50670, name: 'Phượng', doneTarget: 150 },
      { legacyStaffId: 52648, name: 'Kiều', doneTarget: 100 },
    ],
    stageTargets: { '0_30': 200, '31_60': 110, '61_120': 80, gt_120: 60 },
  };

  const mockFastify = {
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async () => ({ value: JSON.stringify(mockConfig) }),
        },
        crmStaff: {
          findMany: async () => [
            { id: 22, legacyStaffId: 50670, displayName: 'Bích Phượng', avatarUrl: 'https://avatar/phuong.jpg' },
            { id: 71, legacyStaffId: 52648, displayName: 'Thuý Kiều', avatarUrl: 'https://avatar/kieu.jpg' },
          ],
        },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('staff_working_shift')) {
            return [];
          }
          if (sql.includes('report_order ro') || sql.includes('ro.actual_booking_date_start')) {
            return [
              {
                id: 201,
                bookerId: 50670,
                orderState: 'Completed',
                totalPrice: 500000,
                actualBookingDateStart: new Date(),
              },
              {
                id: 202,
                bookerId: 50670,
                orderState: 'Completed',
                totalPrice: 300000,
                actualBookingDateStart: new Date(),
              },
            ];
          }
          if (sql.includes('user_profile')) {
            return [
              { user_id: 50670, full_name: 'Bích Phượng', avatarUrl: 'https://avatar/phuong.jpg' },
              { user_id: 52648, full_name: 'Thuý Kiều', avatarUrl: 'https://avatar/kieu.jpg' },
            ];
          }
          // Month orders
          if (sql.includes('o.booking_date_start >=')) {
            return [{ id: 1, bookerId: 50670, orderState: 'Completed', isComboLive: 0 }];
          }
          // Today book orders: Phượng has 3 books, Kiều has 1 book -> Total 4 books
          if (sql.includes('o.date_created >=')) {
            return [
              { id: 101, bookerId: 50670, orderState: 'New', dateCreated: new Date() },
              { id: 102, bookerId: 50670, orderState: 'New', dateCreated: new Date() },
              { id: 103, bookerId: 50670, orderState: 'New', dateCreated: new Date() },
              { id: 104, bookerId: 52648, orderState: 'New', dateCreated: new Date() },
            ];
          }
          return [];
        },
      },
    },
    log: { warn: () => {}, error: () => {} },
  };

  const overview = await TelesaleTargetService.getOverview(mockFastify as any, todayStr.slice(0, 7));

  // Team daily metrics
  assert.equal(overview.teamDaily.bookActual, 4);
  assert.equal(overview.teamDaily.doneActual, 2);

  // Staff targets verification
  const phuong = overview.staffTargets.find((s) => s.legacyStaffId === 50670);
  assert.ok(phuong);
  assert.equal(phuong.bookToday, 3);
  assert.equal(phuong.doneToday, 2);
  // 3 out of 4 books = 75%
  assert.equal(phuong.bookContributionPercent, 75);
  // Phượng has the highest books (3 vs 1) -> isTopBookToday must be true
  assert.equal(phuong.isTopBookToday, true);
  assert.equal(phuong.avatarUrl, 'https://avatar/phuong.jpg');

  const kieu = overview.staffTargets.find((s) => s.legacyStaffId === 52648);
  assert.ok(kieu);
  assert.equal(kieu.bookToday, 1);
  assert.equal(kieu.doneToday, 0);
  // 1 out of 4 books = 25%
  assert.equal(kieu.bookContributionPercent, 25);
  assert.equal(kieu.isTopBookToday, false);

  // Live events feed verification
  assert.ok(overview.todayLiveEvents);
  assert.equal(overview.todayLiveEvents.length, 6); // 4 books + 2 dones
  const bookEvents = overview.todayLiveEvents.filter((e) => e.type === 'BOOK');
  const doneEvents = overview.todayLiveEvents.filter((e) => e.type === 'DONE');
  assert.equal(bookEvents.length, 4);
  assert.equal(doneEvents.length, 2);
});

test('TelesaleTargetService.getFallbackCelebrationQuote embeds staffName and cultural values', () => {
  const bookQuote = TelesaleTargetService.getFallbackCelebrationQuote('BOOK', 'Bích Phượng');
  assert.ok(bookQuote.includes('Bích Phượng'));
  assert.ok(bookQuote.length > 20);

  const doneQuote = TelesaleTargetService.getFallbackCelebrationQuote('DONE', 'Thuý Kiều');
  assert.ok(doneQuote.includes('Thuý Kiều'));
  assert.ok(doneQuote.length > 20);
});

test('TelesaleTargetService.generateLiveCelebrationQuote falls back gracefully when API error or offline', async () => {
  const mockFastify = { log: { warn: () => {} } } as any;
  const originalKey = process.env.GEMINI_API_KEY;
  try {
    delete process.env.GEMINI_API_KEY;
    const res = await TelesaleTargetService.generateLiveCelebrationQuote(mockFastify, 'BOOK', 'Thanh Vũ');
    assert.equal(res.source, 'fallback');
    assert.ok(res.quote.includes('Thanh Vũ'));
  } finally {
    process.env.GEMINI_API_KEY = originalKey;
  }
});

test('TelesaleTargetService.synthesizeCelebrationAudio throws on empty text and handles cache', async () => {
  await assert.rejects(
    async () => TelesaleTargetService.synthesizeCelebrationAudio(''),
    /empty/
  );
});

test('TelesaleTargetService strictly pulls active Telesales staff from HR (crmStaff) and prunes invalid/inactive staff (MOS-BUG-84)', async () => {
  const mockStaffDb = [
    // Active Telesales staff (Must be included)
    { id: 1, legacyStaffId: 50670, name: 'Bích Phượng', displayName: 'Bích Phượng', role: 'telesales', isActive: true, avatarUrl: 'https://avatar/phuong.jpg' },
    { id: 2, legacyStaffId: 52648, name: 'Thuý Kiều', displayName: 'Thuý Kiều', role: 'Telesales Executive', isActive: true, avatarUrl: 'https://avatar/kieu.jpg' },
    { id: 3, legacyStaffId: 32268, name: 'Ngọc Điệp', displayName: 'Ngọc Điệp', role: 'telesales', isActive: true, avatarUrl: null },
    { id: 4, legacyStaffId: 52598, name: 'Thanh Vũ', displayName: 'Thanh Vũ', role: 'telesales', isActive: true, avatarUrl: null },
    // Inactive staff (Must be excluded)
    { id: 5, legacyStaffId: 99001, name: 'Thuỳ Chang', displayName: 'Thuỳ Chang', role: 'telesales', isActive: false, avatarUrl: null },
    { id: 6, legacyStaffId: 99002, name: 'Thanh Mai', displayName: 'Thanh Mai', role: 'telesales', isActive: false, avatarUrl: null },
    // Non-telesales roles (Must be excluded even if active)
    { id: 7, legacyStaffId: 48791, name: 'Tâm Nguyễn', displayName: 'Tâm Nguyễn', role: 'admin', isActive: true, avatarUrl: null },
    { id: 8, legacyStaffId: 52454, name: 'Phương Giao', displayName: 'Phương Giao', role: 'manager', isActive: true, avatarUrl: null },
    { id: 9, legacyStaffId: 52086, name: 'Mỹ Diệu', displayName: 'Mỹ Diệu', role: 'manager', isActive: true, avatarUrl: null },
    { id: 10, legacyStaffId: 47510, name: 'Thanh Trúc', displayName: 'Thanh Trúc', role: 'cc', isActive: true, avatarUrl: null },
  ];

  let configStore: Record<string, string> = {
    'TELESALE_TARGET_CONFIG_2026-10': JSON.stringify({
      month: '2026-10',
      teamDoneTarget: 450,
      teamBookTarget: 650,
      dailyDoneTarget: 18,
      dailyBookTarget: 25,
      // Old stale config containing manager 52454, 52086 and admin 48791
      staffTargets: [
        { legacyStaffId: 52454, name: 'Phương Giao', doneTarget: 150 },
        { legacyStaffId: 52086, name: 'Mỹ Diệu', doneTarget: 100 },
        { legacyStaffId: 48791, name: 'Tâm Nguyễn', doneTarget: 100 },
        { legacyStaffId: 50670, name: 'Bích Phượng', doneTarget: 120 },
      ],
      stageTargets: { '0_30': 200, '31_60': 110, '61_120': 80, gt_120: 60 },
    }),
  };

  const mockFastify = {
    prisma: {
      crm: {
        crmStaff: {
          findMany: async ({ where }: any) => {
            let list = [...mockStaffDb];
            if (where?.isActive !== undefined) {
              list = list.filter((s) => s.isActive === where.isActive);
            }
            if (Array.isArray(where?.OR)) {
              list = list.filter((s) => where.OR.some((cond: any) => cond.role === s.role));
            }
            if (where?.legacyStaffId?.in) {
              list = list.filter((s) => where.legacyStaffId.in.includes(s.legacyStaffId));
            }
            return list;
          },
        },
        crmConfig: {
          findUnique: async ({ where }: any) => {
            const val = configStore[where.key];
            return val ? { key: where.key, value: val } : null;
          },
          update: async ({ where, data }: any) => {
            configStore[where.key] = data.value;
            return { key: where.key, value: data.value };
          },
        },
      },
    },
    log: { warn: () => {}, error: () => {} },
  };

  // 1. Test getActiveTelesalesStaffFromHr
  const hrStaff = await TelesaleTargetService.getActiveTelesalesStaffFromHr(mockFastify as any);
  assert.equal(hrStaff.length, 4);
  const hrIds = hrStaff.map((s) => s.legacyStaffId);
  assert.deepEqual(hrIds.sort(), [32268, 50670, 52598, 52648].sort());
  // None of the inactive or manager/admin staff are present
  assert.ok(!hrIds.includes(52454));
  assert.ok(!hrIds.includes(52086));
  assert.ok(!hrIds.includes(48791));
  assert.ok(!hrIds.includes(99001));

  // 2. Test getConfig auto-repair and reconciliation
  const config = await TelesaleTargetService.getConfig(mockFastify as any, '2026-10');
  assert.equal(config.staffTargets.length, 4);
  const configStaffIds = config.staffTargets.map((s) => s.legacyStaffId);
  assert.deepEqual(configStaffIds.sort(), [32268, 50670, 52598, 52648].sort());
  // Bích Phượng preserves custom doneTarget 120 from old config
  const phuongConfig = config.staffTargets.find((s) => s.legacyStaffId === 50670);
  assert.equal(phuongConfig?.doneTarget, 120);
  // Others receive default target (450 / 4 = 113)
  const kieuConfig = config.staffTargets.find((s) => s.legacyStaffId === 52648);
  assert.equal(kieuConfig?.doneTarget, 113);
  // Old managers and admins are purged
  assert.ok(!configStaffIds.includes(52454));
  assert.ok(!configStaffIds.includes(52086));
  assert.ok(!configStaffIds.includes(48791));
});


