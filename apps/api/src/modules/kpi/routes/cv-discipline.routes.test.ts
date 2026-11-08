import test from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import { registerCvDisciplineRoutes } from './cv-discipline.routes.js';
import type { SafeAny } from '@mos-lab/shared';

test('registerCvDisciplineRoutes registers GET /kpi/cv-discipline route', async () => {
  let registeredPath = '';
  const mockFastify = {
    get: (path: string) => {
      registeredPath = path;
    },
  } as unknown as FastifyInstance;

  await registerCvDisciplineRoutes(mockFastify);
  assert.equal(registeredPath, '/kpi/cv-discipline');
});

test('CV Discipline API maps real violations from staff_activity and banana transactions', async () => {
  let routeHandler: (request: SafeAny, reply: SafeAny) => Promise<SafeAny> = async () => {};

  const mockFastify = {
    get: (_path: string, _opts: SafeAny, handler: SafeAny) => {
      routeHandler = handler;
    },
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async () => null,
        },
        crmTeam: {
          findUnique: async () => ({
            id: 1,
            code: 'CV',
            members: [
              { legacyStaffId: 5001, isActive: true },
              { legacyStaffId: 5002, isActive: true },
            ],
          }),
        },
        crmStaff: {
          findMany: async (args: SafeAny) => {
            if (args?.where?.employmentStatus) return [];
            return [
              {
                id: 10,
                legacyStaffId: 5001,
                role: 'CVL',
                avatarUrl: 'https://cdn.example.com/avatar1.jpg',
                displayName: 'Bảo Trâm',
              },
              {
                id: 11,
                legacyStaffId: 5002,
                role: 'CV',
                avatarUrl: null,
                displayName: 'Thùy Dương',
              },
            ];
          },
        },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('SELECT user_id FROM user_profile')) {
            return [{ user_id: 5001 }, { user_id: 5002 }];
          }
          if (sql.includes('SELECT ugl.user_group_name')) {
            return [{ user_id: 5001 }, { user_id: 5002 }];
          }
          if (sql.includes('FROM `user_profile` up')) {
            return [
              { userId: 5001, fullName: 'Bảo Trâm', avatar: 'legacy-avatar1.jpg', rawStoreKey: 'de-tham' },
              { userId: 5002, fullName: 'Thùy Dương', avatar: null, rawStoreKey: 'estella-place' },
            ];
          }
          if (sql.includes('FROM `staff_activity` sa')) {
            return [
              {
                activityId: 801,
                userId: 5001,
                ruleId: 32,
                ruleTitle: 'CV - Đi trễ',
                bananaAmount: -50,
                targetType: 'staff_working_shift',
                targetId: 1001,
                activityNote: 'Oops, you are late!',
                dateCreated: '2026-11-07 08:15:00',
                incidentDate: '2026-11-07',
                shiftStart: '08:00',
                shiftEnd: '17:00',
                checkInTime: '08:15:00',
                checkOutTime: '17:00:00',
                checkInDiff: -15,
                checkOutDiff: 0,
                rawStoreKey: 'de-tham',
                dayOffNote: null,
                dayOffReason: null,
              },
              {
                activityId: 802,
                userId: 5001,
                ruleId: 54,
                ruleTitle: 'CV - Báo off phép tháng gấp (trước 1 ngày)',
                bananaAmount: -300,
                targetType: 'staff_day_off',
                targetId: 2001,
                activityNote: 'Xin nghỉ sốt xuất huyết',
                dateCreated: '2026-11-05 10:00:00',
                incidentDate: '2026-11-05',
                shiftStart: null,
                shiftEnd: null,
                checkInTime: null,
                checkOutTime: null,
                checkInDiff: null,
                checkOutDiff: null,
                rawStoreKey: 'de-tham',
                dayOffNote: 'Xin nghỉ sốt xuất huyết',
                dayOffReason: 'Nghỉ ốm',
              },
              {
                activityId: 803,
                userId: 5002,
                ruleId: 33,
                ruleTitle: 'CV - Về sớm',
                bananaAmount: -300,
                targetType: 'staff_working_shift',
                targetId: 1002,
                activityNote: "Wait, don't leave me too early girl...",
                dateCreated: '2026-11-06 17:30:00',
                incidentDate: '2026-11-06',
                shiftStart: '09:00',
                shiftEnd: '18:00',
                checkInTime: '09:00:00',
                checkOutTime: '17:30:00',
                checkInDiff: 0,
                checkOutDiff: -30,
                rawStoreKey: 'estella-place',
                dayOffNote: null,
                dayOffReason: null,
              },
            ];
          }
          if (sql.includes('FROM `user_balance_transaction` ubt')) {
            return [
              {
                ubtId: 7001,
                userId: 5001,
                itemId: 1001,
                itemType: 'staff_working_shift',
                amount: -50,
                balance: 100,
                description: 'Trừ chuối đi trễ ca',
                trackingKey: '{"staff_activity_id":"801"}',
                dateCreated: '2026-11-07 08:16:00',
                dateStr: '2026-11-07',
              },
              {
                ubtId: 7002,
                userId: 5001,
                itemId: 2001,
                itemType: 'staff_day_off',
                amount: -300,
                balance: -200,
                description: 'Trừ chuối nghỉ gấp',
                trackingKey: '{"staff_activity_id":"802"}',
                dateCreated: '2026-11-05 10:00:00',
                dateStr: '2026-11-05',
              },
              {
                ubtId: 7003,
                userId: 5002,
                itemId: 1002,
                itemType: 'staff_working_shift',
                amount: -300,
                balance: 500,
                description: 'Trừ chuối về sớm',
                trackingKey: '{"staff_activity_id":"803"}',
                dateCreated: '2026-11-06 17:31:00',
                dateStr: '2026-11-06',
              },
            ];
          }
          return [];
        },
      },
    },
    log: {
      error: () => {},
      warn: () => {},
    },
  } as unknown as FastifyInstance;

  await registerCvDisciplineRoutes(mockFastify);

  let sentPayload: SafeAny = null;
  const mockReply = {
    send: (payload: SafeAny) => {
      sentPayload = payload;
      return mockReply;
    },
    status: () => mockReply,
  };

  await routeHandler(
    {
      query: { dateFrom: '2026-11-01', dateTo: '2026-11-08' },
    },
    mockReply
  );

  assert.ok(sentPayload);
  assert.equal(sentPayload.summary.totalLateRecords, 1);
  assert.equal(sentPayload.summary.totalLateMinutes, 15);
  assert.equal(sentPayload.summary.totalEarlyRecords, 1);
  assert.equal(sentPayload.summary.totalEarlyMinutes, 30);
  assert.equal(sentPayload.summary.totalUrgentOffs, 1);
  assert.equal(sentPayload.summary.totalFinedBananas, 650); // 50 + 300 + 300

  // Staff 5001 (Bảo Trâm) has 2 violations (1 late + 1 urgent off) and 350 fined bananas
  const staff1 = sentPayload.data.find((s: SafeAny) => s.legacyUserId === 5001);
  assert.ok(staff1);
  assert.equal(staff1.lateCount, 1);
  assert.equal(staff1.lateMinutes, 15);
  assert.equal(staff1.urgentOffCount, 1);
  assert.equal(staff1.finedBananaAmount, 350);
  assert.equal(staff1.isCvPlus, true);

  const lateViolation = staff1.violations.find((v: SafeAny) => v.type === 'LATE');
  assert.ok(lateViolation);
  assert.equal(lateViolation.isFined, true);
  assert.equal(lateViolation.finedBananas, 50);

  // Staff 5002 (Thùy Dương) has 1 early violation with fine 300 bananas
  const staff2 = sentPayload.data.find((s: SafeAny) => s.legacyUserId === 5002);
  assert.ok(staff2);
  assert.equal(staff2.earlyCount, 1);
  assert.equal(staff2.earlyMinutes, 30);
  assert.equal(staff2.finedBananaAmount, 300);

  const earlyViolation = staff2.violations.find((v: SafeAny) => v.type === 'EARLY');
  assert.ok(earlyViolation);
  assert.equal(earlyViolation.isFined, true);
  assert.equal(earlyViolation.finedBananas, 300);
});

test('CV Discipline API ignores false early checkout and returns 0 violations if no penalty in DB', async () => {
  let routeHandler: (request: SafeAny, reply: SafeAny) => Promise<SafeAny> = async () => {};

  const mockFastify = {
    get: (_path: string, _opts: SafeAny, handler: SafeAny) => {
      routeHandler = handler;
    },
    prisma: {
      crm: {
        crmConfig: { findUnique: async () => null },
        crmTeam: {
          findUnique: async () => ({
            id: 1,
            code: 'CV',
            members: [{ legacyStaffId: 3832, isActive: true }],
          }),
        },
        crmStaff: {
          findMany: async (args: SafeAny) => {
            if (args?.where?.employmentStatus) return [];
            return [{ id: 20, legacyStaffId: 3832, role: 'CV', avatarUrl: null, displayName: 'Ánh Tuyết' }];
          },
        },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('SELECT user_id FROM user_profile')) return [{ user_id: 3832 }];
          if (sql.includes('FROM `user_profile` up')) {
            return [{ userId: 3832, fullName: 'Ánh Tuyết', avatar: null, rawStoreKey: 'de-tham' }];
          }
          // No activities in staff_activity for Ánh Tuyết in late or early
          if (sql.includes('FROM `staff_activity` sa')) {
            return [];
          }
          if (sql.includes('FROM `user_balance_transaction` ubt')) {
            return [];
          }
          return [];
        },
      },
    },
    log: { error: () => {}, warn: () => {} },
  } as unknown as FastifyInstance;

  await registerCvDisciplineRoutes(mockFastify);

  let sentPayload: SafeAny = null;
  const mockReply = {
    send: (payload: SafeAny) => {
      sentPayload = payload;
      return mockReply;
    },
    status: () => mockReply,
  };

  await routeHandler({ query: { dateFrom: '2026-10-01', dateTo: '2026-10-31' } }, mockReply);

  assert.ok(sentPayload);
  assert.equal(sentPayload.summary.totalEarlyRecords, 0);
  assert.equal(sentPayload.summary.totalEarlyMinutes, 0);
  assert.equal(sentPayload.summary.totalLateRecords, 0);
  assert.equal(sentPayload.summary.totalLateMinutes, 0);
  assert.equal(sentPayload.summary.totalFinedBananas, 0);

  const staff = sentPayload.data.find((s: SafeAny) => s.legacyUserId === 3832);
  assert.ok(staff);
  assert.equal(staff.earlyCount, 0);
  assert.equal(staff.earlyMinutes, 0);
  assert.equal(staff.lateCount, 0);
  assert.equal(staff.finedBananaAmount, 0);
  assert.equal(staff.violations.length, 0);
});

test('CV Discipline API automatically forgives incidents refunded by management tickets', async () => {
  let routeHandler: (request: SafeAny, reply: SafeAny) => Promise<SafeAny> = async () => {};

  const mockFastify = {
    get: (_path: string, _opts: SafeAny, handler: SafeAny) => {
      routeHandler = handler;
    },
    prisma: {
      crm: {
        crmConfig: { findUnique: async () => null },
        crmTeam: {
          findUnique: async () => ({
            id: 1,
            code: 'CV',
            members: [{ legacyStaffId: 51154, isActive: true }],
          }),
        },
        crmStaff: {
          findMany: async (args: SafeAny) => {
            if (args?.where?.employmentStatus) return [];
            return [{ id: 50, legacyStaffId: 51154, role: 'CV', avatarUrl: null, displayName: 'Ly Trần' }];
          },
        },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('SELECT user_id FROM user_profile')) return [{ user_id: 51154 }];
          if (sql.includes('FROM `user_profile` up')) {
            return [{ userId: 51154, fullName: 'Ly Trần', avatar: null, rawStoreKey: 'de-tham' }];
          }
          if (sql.includes('FROM `staff_activity` sa')) {
            return [
              {
                activityId: 41363,
                userId: 51154,
                ruleId: 141,
                ruleTitle: 'CV - Đi trễ hơn 30 phút',
                bananaAmount: -500,
                targetType: 'staff_working_shift',
                targetId: 260098,
                activityNote: 'Power outage incident',
                dateCreated: '2026-10-07 10:37:21',
                activityTime: '10:37:21',
                incidentDate: '2026-10-07',
                shiftStart: '09:00',
                shiftEnd: '20:00',
                checkInTime: '09:00:00',
                checkOutTime: '20:00:00',
                checkInDiff: 0,
                checkOutDiff: 0,
                rawStoreKey: 'de-tham',
                dayOffNote: null,
                dayOffReason: null,
              },
            ];
          }
          // Banana penalty
          if (sql.includes('AND ubt.amount < 0')) {
            return [
              {
                ubtId: 736512,
                userId: 51154,
                itemId: 260098,
                itemType: 'staff_working_shift',
                amount: -500,
                balance: 1000,
                description: 'CV - Đi trễ hơn 30 phút',
                trackingKey:
                  '{"staff_working_shift_id":"260098","staff_activity_id":"41363","staff_activity_rule_id":141}',
                dateCreated: '2026-10-07 10:37:21',
                dateStr: '2026-10-07',
              },
            ];
          }
          // Banana refund
          if (sql.includes('AND ubt.amount > 0')) {
            return [
              {
                ubtId: 736785,
                userId: 51154,
                parentId: 736512,
                amount: 500,
                trackingKey: '{"user_ticket_id":"35674","user_balance_transaction_id":"736512"}',
                dateCreated: '2026-10-09 14:42:56',
              },
            ];
          }
          return [];
        },
      },
    },
    log: { error: () => {}, warn: () => {} },
  } as unknown as FastifyInstance;

  await registerCvDisciplineRoutes(mockFastify);

  let sentPayload: SafeAny = null;
  const mockReply = {
    send: (payload: SafeAny) => {
      sentPayload = payload;
      return mockReply;
    },
    status: () => mockReply,
  };

  await routeHandler({ query: { dateFrom: '2026-10-01', dateTo: '2026-10-31' } }, mockReply);

  assert.ok(sentPayload);
  // Summary counts should be 0 because the penalty was refunded
  assert.equal(sentPayload.summary.totalLateRecords, 0);
  assert.equal(sentPayload.summary.totalLateMinutes, 0);
  assert.equal(sentPayload.summary.totalFinedBananas, 0);
  assert.equal(sentPayload.summary.totalStaffWithViolations, 0);

  const staff = sentPayload.data.find((s: SafeAny) => s.legacyUserId === 51154);
  assert.ok(staff);
  assert.equal(staff.lateCount, 0);
  assert.equal(staff.lateMinutes, 0);
  assert.equal(staff.finedBananaAmount, 0);
  assert.equal(staff.totalViolations, 0);

  // In violations array (Drawer history), the incident still exists and is marked isForgiven
  assert.equal(staff.violations.length, 1);
  const v = staff.violations[0];
  assert.equal(v.isForgiven, true);
  assert.equal(v.isFined, false);
  assert.equal(v.finedBananas, 0);
  assert.equal(v.refundBananas, 500);
  assert.equal(v.refundDate, '2026-10-09 14:42:56');
  assert.ok(v.description.includes('Đã hoàn trả +500 chuối vào ví'));
});
