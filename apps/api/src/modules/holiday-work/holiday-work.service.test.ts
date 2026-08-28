import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';
import { DEFAULT_HOLIDAY_SELECTION_WEIGHTS, type HolidayCandidateMetrics } from '@mos-lab/shared';
import {
  buildVietnamHolidayCalendar2026,
  calculateHolidayCandidateScore,
  calculateHolidayPayroll,
  HolidayWorkService,
} from './holiday-work.service.js';

const workInput = {
  rosterStatus: 'SCHEDULED' as const,
  payBasis: 'HOURLY' as const,
  hourlyRate: 25_000,
  actualMinutes: 540,
  standardShiftHours: 9,
  paidLeaveMultiplier: 1,
  workPremiumMultiplier: 3,
};

test('hourly holiday work pays actual 1x plus 3x premium (4x total)', () => {
  const result = calculateHolidayPayroll(workInput);
  assert.equal(result.ledgerStatus, 'READY');
  assert.equal(result.actualHours, 9);
  assert.equal(result.baseHolidayAmount, 225_000);
  assert.equal(result.holidayPremiumAmount, 675_000);
  assert.equal(result.holidayTotalValue, 900_000);
  assert.equal(result.payrollAdditionAmount, 900_000);
});

test('monthly holiday work treats 1x as included and adds only 3x', () => {
  const result = calculateHolidayPayroll({ ...workInput, payBasis: 'MONTHLY' });
  assert.equal(result.baseIncludedInMonthlySalary, true);
  assert.equal(result.holidayTotalValue, 900_000);
  assert.equal(result.payrollAdditionAmount, 675_000);
});

test('holiday off pays one standard nine-hour shift without stacking weekly off multipliers', () => {
  const result = calculateHolidayPayroll({ ...workInput, rosterStatus: 'HOLIDAY_OFF', actualMinutes: 0 });
  assert.equal(result.actualHours, 0);
  assert.equal(result.baseHolidayAmount, 225_000);
  assert.equal(result.holidayPremiumAmount, 0);
  assert.equal(result.payrollAdditionAmount, 225_000);
});

test('booked off and approved leave receive no holiday payment', () => {
  assert.equal(
    calculateHolidayPayroll({ ...workInput, rosterStatus: 'BOOKED_OFF', actualMinutes: 0 }).holidayTotalValue,
    0
  );
  assert.equal(calculateHolidayPayroll({ ...workInput, approvedLeave: true }).holidayTotalValue, 0);
});

test('missing attendance, pay basis, or effective hourly rate creates blocking exceptions', () => {
  assert.equal(calculateHolidayPayroll({ ...workInput, actualMinutes: 0 }).exceptionCode, 'ATTENDANCE_MISSING');
  assert.equal(calculateHolidayPayroll({ ...workInput, payBasis: null }).exceptionCode, 'PAY_BASIS_MISSING');
  assert.equal(calculateHolidayPayroll({ ...workInput, hourlyRate: 0 }).exceptionCode, 'HOURLY_RATE_MISSING');
});

test('VND amounts are rounded to whole đồng', () => {
  const result = calculateHolidayPayroll({ ...workInput, hourlyRate: 23_333.33, actualMinutes: 475 });
  assert.equal(Number.isInteger(result.baseHolidayAmount), true);
  assert.equal(Number.isInteger(result.holidayPremiumAmount), true);
  assert.equal(Number.isInteger(result.payrollAdditionAmount), true);
});

test('2026 employee calendar exposes all 12 paid public-holiday days in chronological occasions', () => {
  const result = buildVietnamHolidayCalendar2026('2026-08-28');
  assert.equal(result.occasionCount, 6);
  assert.equal(result.officialPaidLeaveDays, 12);
  assert.equal(result.remainingPaidLeaveDays, 3);
  assert.equal(result.nextHolidayCode, 'NATIONAL_DAY_2026');
  assert.deepEqual(
    result.holidays.flatMap((holiday) => holiday.days.filter((day) => day.isPaidLeave).map((day) => day.date)),
    [
      '2026-01-01',
      '2026-02-16',
      '2026-02-17',
      '2026-02-18',
      '2026-02-19',
      '2026-02-20',
      '2026-04-26',
      '2026-04-30',
      '2026-05-01',
      '2026-09-01',
      '2026-09-02',
      '2026-11-24',
    ]
  );
});

test('annual calendar marks the next break and links only overlapping Wings periods', () => {
  const result = buildVietnamHolidayCalendar2026('2026-08-28', [
    {
      id: 9,
      code: 'QUOC_KHANH_2026',
      name: 'Quốc khánh 2026',
      startDate: '2026-09-01',
      endDate: '2026-09-02',
      status: 'DRAFT',
    },
  ]);
  const nationalDay = result.holidays.find((holiday) => holiday.code === 'NATIONAL_DAY_2026');
  const cultureDay = result.holidays.find((holiday) => holiday.code === 'VIETNAM_CULTURE_DAY_2026');
  assert.equal(nationalDay?.status, 'UPCOMING');
  assert.equal(nationalDay?.daysUntil, 1);
  assert.equal(nationalDay?.companyPeriod?.code, 'QUOC_KHANH_2026');
  assert.equal(cultureDay?.companyPeriod, null);
});

test('candidate score renormalizes weights when a role has no applicable Fix or speed metric', () => {
  const metrics: HolidayCandidateMetrics = {
    completedServices: 40,
    verifiedNegativeFeedbackCount: 0,
    feedbackRate: 0,
    fixCount: 0,
    fixRate: null,
    tippedVisits: 20,
    tipRate: 0.5,
    medianSpeedRatio: null,
    attendanceIncidentPoints: 0,
    feedbackPercentile: 90,
    fixPercentile: null,
    tipPercentile: 80,
    speedPercentile: null,
    attendancePercentile: 100,
  };
  const result = calculateHolidayCandidateScore(metrics, DEFAULT_HOLIDAY_SELECTION_WEIGHTS);
  assert.equal(result.dataSufficient, true);
  assert.equal(result.applicableWeight, 60);
  assert.equal(result.totalScore, 90);
});

test('new staff remains eligible for manual nomination but has no automatic score', () => {
  const metrics: HolidayCandidateMetrics = {
    completedServices: 12,
    verifiedNegativeFeedbackCount: 0,
    feedbackRate: 0,
    fixCount: 0,
    fixRate: 0,
    tippedVisits: 4,
    tipRate: 1 / 3,
    medianSpeedRatio: 1,
    attendanceIncidentPoints: 0,
    feedbackPercentile: 100,
    fixPercentile: 100,
    tipPercentile: 75,
    speedPercentile: 50,
    attendancePercentile: 100,
  };
  const result = calculateHolidayCandidateScore(metrics, DEFAULT_HOLIDAY_SELECTION_WEIGHTS);
  assert.equal(result.dataSufficient, false);
  assert.equal(result.totalScore, null);
});

test('branch coverage saves CC and CV requirements together using the canonical active branch', async () => {
  const rows: Array<Record<string, any>> = [];
  let auditCount = 0;
  const coverageModel = {
    findMany: async () => [],
    findFirst: async ({ where }: any) => rows.find((row) => row.teamCode === where.teamCode) || null,
    create: async ({ data }: any) => {
      const saved = { id: rows.length + 1, ...data };
      rows.push(saved);
      return saved;
    },
    update: async ({ where, data }: any) => {
      const index = rows.findIndex((row) => row.id === where.id);
      rows[index] = { ...rows[index], ...data };
      return rows[index];
    },
    delete: async ({ where }: any) => {
      const index = rows.findIndex((row) => row.id === where.id);
      return rows.splice(index, 1)[0];
    },
    deleteMany: async () => ({ count: 0 }),
  };
  const fastify = {
    prisma: {
      crm: {
        crmHolidayPeriod: {
          findUnique: async () => ({
            id: 9,
            status: 'DRAFT',
            startDate: new Date('2026-08-31T17:00:00Z'),
            endDate: new Date('2026-09-01T17:00:00Z'),
          }),
        },
        crmStore: {
          findUnique: async () => ({ id: 3, code: 'DT', isActive: true, storeType: 'SALON' }),
        },
        crmHolidayCoverage: coverageModel,
        crmHolidayAuditLog: {
          create: async () => {
            auditCount += 1;
            return {};
          },
        },
        $transaction: async (callback: (tx: any) => Promise<unknown>) =>
          callback({ crmHolidayCoverage: coverageModel }),
      },
    },
  } as unknown as FastifyInstance;

  const result = await HolidayWorkService.upsertBranchCoverage(
    fastify,
    9,
    {
      workDate: '2026-09-01',
      storeId: 3,
      storeKey: 'free-text-is-not-authoritative',
      shiftStart: '09:00',
      shiftEnd: '18:00',
      requiredByTeam: { CC: 2, CV: 5 },
    },
    { id: 1, role: 'admin' }
  );

  assert.deepEqual(
    result.map((row) => ({ teamCode: row.teamCode, requiredCount: row.requiredCount, storeKey: row.storeKey })),
    [
      { teamCode: 'CC', requiredCount: 2, storeKey: 'DT' },
      { teamCode: 'CV', requiredCount: 5, storeKey: 'DT' },
    ]
  );
  assert.equal(auditCount, 1);
});

test('post-lock payroll correction appends an adjustment and never overwrites the locked ledger', async () => {
  let createdAdjustment: Record<string, unknown> | null = null;
  let auditCount = 0;
  const fastify = {
    prisma: {
      crm: {
        crmHolidayPeriod: { findUnique: async () => ({ id: 9, status: 'PAYROLL_LOCKED' }) },
        crmHolidayPayrollLedger: {
          findUnique: async () => ({ id: 41, holidayId: 9, ledgerStatus: 'LOCKED' }),
        },
        crmHolidayPayrollAdjustment: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            createdAdjustment = data;
            return { id: 77, ...data, createdAt: new Date('2026-09-05T00:00:00Z') };
          },
        },
        crmHolidayAuditLog: {
          create: async () => {
            auditCount += 1;
            return {};
          },
        },
      },
    },
  } as unknown as FastifyInstance;

  const result = await HolidayWorkService.createPayrollAdjustment(
    fastify,
    9,
    { ledgerId: 41, amount: -50_000, reason: 'Điều chỉnh theo biên bản HR.' },
    { id: 1, role: 'admin' }
  );

  assert.equal(result.amount, -50_000);
  assert.deepEqual(createdAdjustment, {
    holidayId: 9,
    ledgerId: 41,
    amount: -50_000,
    reason: 'Điều chỉnh theo biên bản HR.',
    createdByStaffId: 1,
  });
  assert.equal(auditCount, 1);
});

test('payroll adjustment is blocked until the base ledger is locked', async () => {
  const fastify = {
    prisma: {
      crm: {
        crmHolidayPeriod: { findUnique: async () => ({ id: 9, status: 'PUBLISHED' }) },
      },
    },
  } as unknown as FastifyInstance;

  await assert.rejects(
    () =>
      HolidayWorkService.createPayrollAdjustment(
        fastify,
        9,
        { ledgerId: 41, amount: 50_000, reason: 'Biên bản HR.' },
        { id: 1, role: 'admin' }
      ),
    /chỉ được tạo sau khi kỳ lương đã khóa/
  );
});

test('roster import is idempotent for the same holiday, date, and staff identity', async () => {
  const rows = new Map<string, Record<string, unknown>>();
  let auditCount = 0;
  const fastify = {
    prisma: {
      crm: {
        crmHolidayPeriod: {
          findUnique: async () => ({
            id: 9,
            status: 'DRAFT',
            startDate: new Date('2026-08-31T17:00:00Z'),
            endDate: new Date('2026-09-01T17:00:00Z'),
          }),
        },
        crmTeam: { findMany: async () => [{ code: 'CV' }] },
        crmHolidayCandidateSnapshot: { findUnique: async () => null },
        crmHolidayRoster: {
          upsert: async ({ where, create, update }: any) => {
            const key = where.holiday_roster_key.rosterKey as string;
            const existing = rows.get(key);
            const now = new Date('2026-08-28T00:00:00Z');
            const saved = existing
              ? { ...existing, ...update, updatedAt: now }
              : {
                  id: rows.size + 1,
                  ...create,
                  avatarUrl: null,
                  isApprovedLeave: false,
                  createdAt: now,
                  updatedAt: now,
                };
            rows.set(key, saved);
            return saved;
          },
        },
        crmHolidayAuditLog: {
          create: async () => {
            auditCount += 1;
            return {};
          },
        },
      },
    },
  } as unknown as FastifyInstance;
  const input = {
    workDate: '2026-09-01',
    crmStaffId: 12,
    legacyStaffId: 777,
    importedName: 'Anh Tuyết',
    displayName: 'Ánh Tuyết',
    teamCode: 'CV',
    storeKey: 'DE_THAM',
    shiftStart: '09:00',
    shiftEnd: '18:00',
    status: 'SCHEDULED' as const,
    decisionReason: 'Prefill từ danh sách HR.',
  };

  const first = await HolidayWorkService.upsertRoster(fastify, 9, input, { id: 1, role: 'admin' });
  const second = await HolidayWorkService.upsertRoster(fastify, 9, input, { id: 1, role: 'admin' });

  assert.equal(rows.size, 1);
  assert.equal(first.id, second.id);
  assert.equal(first.rosterKey, '2026-09-01:staff:777');
  assert.equal(auditCount, 2);
});

test('manager cannot nominate staff outside an active leader team', async () => {
  const fastify = {
    prisma: {
      crm: {
        crmHolidayPeriod: {
          findUnique: async () => ({
            id: 9,
            status: 'DRAFT',
            startDate: new Date('2026-08-31T17:00:00Z'),
            endDate: new Date('2026-09-01T17:00:00Z'),
          }),
        },
        crmStaff: { findUnique: async () => ({ legacyStaffId: 99 }) },
        crmTeamMember: { findMany: async () => [{ team: { code: 'CC' } }] },
      },
    },
  } as unknown as FastifyInstance;

  await assert.rejects(
    () =>
      HolidayWorkService.upsertRoster(
        fastify,
        9,
        {
          workDate: '2026-09-01',
          crmStaffId: 12,
          legacyStaffId: 777,
          displayName: 'Ánh Tuyết',
          teamCode: 'CV',
          storeKey: 'DE_THAM',
          shiftStart: '09:00',
          shiftEnd: '18:00',
          status: 'NOMINATED',
          nominationReason: 'Đủ điều kiện vận hành.',
        },
        { id: 5, role: 'manager' }
      ),
    /Manager chỉ được đề cử NOMINATED trong đội mình phụ trách/
  );
});

test('admin must explain an insufficient-data scheduling decision', async () => {
  const fastify = {
    prisma: {
      crm: {
        crmHolidayPeriod: {
          findUnique: async () => ({
            id: 9,
            status: 'DRAFT',
            startDate: new Date('2026-08-31T17:00:00Z'),
            endDate: new Date('2026-09-01T17:00:00Z'),
          }),
        },
        crmTeam: { findMany: async () => [{ code: 'CV' }] },
        crmHolidayCandidateSnapshot: { findUnique: async () => ({ dataSufficient: false }) },
      },
    },
  } as unknown as FastifyInstance;

  await assert.rejects(
    () =>
      HolidayWorkService.upsertRoster(
        fastify,
        9,
        {
          workDate: '2026-09-01',
          crmStaffId: 12,
          legacyStaffId: 777,
          displayName: 'Nhân sự mới',
          teamCode: 'CV',
          storeKey: 'DE_THAM',
          shiftStart: '09:00',
          shiftEnd: '18:00',
          status: 'SCHEDULED',
        },
        { id: 1, role: 'admin' }
      ),
    /chưa đủ mẫu dữ liệu/
  );
});

test('resolving a roster exception requires an auditable decision reason', async () => {
  const fastify = {
    prisma: {
      crm: {
        crmHolidayPeriod: {
          findUnique: async () => ({
            id: 9,
            status: 'DRAFT',
            startDate: new Date('2026-08-31T17:00:00Z'),
            endDate: new Date('2026-09-01T17:00:00Z'),
          }),
        },
        crmTeam: { findMany: async () => [{ code: 'CV' }] },
        crmHolidayRoster: { findUnique: async () => ({ id: 8, holidayId: 9, status: 'PAYROLL_EXCEPTION' }) },
      },
    },
  } as unknown as FastifyInstance;

  await assert.rejects(
    () =>
      HolidayWorkService.upsertRoster(
        fastify,
        9,
        {
          workDate: '2026-09-01',
          crmStaffId: 12,
          legacyStaffId: 777,
          importedName: 'Tuyết Mai',
          displayName: 'Hồ sơ đã xác nhận',
          teamCode: 'CV',
          storeKey: 'UNASSIGNED',
          shiftStart: '09:00',
          shiftEnd: '18:00',
          status: 'HOLIDAY_OFF',
        },
        { id: 1, role: 'admin' },
        8
      ),
    /Cần ghi lý do khi xử lý ngoại lệ roster/
  );
});
