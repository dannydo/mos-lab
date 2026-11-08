import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';
import { registerCvDisciplineRoutes } from './cv-discipline.routes.js';
import { SafeAny } from '@mos-lab/shared';

test('registerCvDisciplineRoutes registers GET /kpi/cv-discipline route', async () => {
  let registeredPath = '';
  let registeredMethod = '';

  const mockFastify = {
    get: (path: string, _opts: unknown, _handler: unknown) => {
      registeredPath = path;
      registeredMethod = 'GET';
    },
  } as unknown as FastifyInstance;

  await registerCvDisciplineRoutes(mockFastify);

  assert.equal(registeredPath, '/kpi/cv-discipline');
  assert.equal(registeredMethod, 'GET');
});

test('CV Discipline API maps violations and penalty banana transactions', async () => {
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
            if (args?.where?.employmentStatus) {
              return [];
            }
            return [
              { id: 101, legacyStaffId: 5001, role: 'CVL', avatarUrl: 'avatar-cv1.jpg', displayName: 'Bảo Trâm CV🪶' },
              { id: 102, legacyStaffId: 5002, role: 'CV', avatarUrl: null, displayName: 'Thùy Dương' },
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
              { userId: 5001, fullName: 'Bảo Trâm', avatar: 'legacy-avatar1.jpg', store: 'PXL' },
              { userId: 5002, fullName: 'Thùy Dương', avatar: null, store: 'Q1' },
            ];
          }
          if (sql.includes('FROM `report_staff` rs')) {
            return [
              {
                reportStaffId: 901,
                userId: 5001,
                date: '2026-11-07',
                checkInTime: '08:15:00',
                checkOutTime: '17:00:00',
                shiftStart: '08:00',
                shiftEnd: '17:00',
                checkInDiff: -15, // 15 mins late
                checkOutDiff: 0,
                store: 'PXL',
              },
              {
                reportStaffId: 902,
                userId: 5002,
                date: '2026-11-06',
                checkInTime: '09:00:00',
                checkOutTime: '17:30:00',
                shiftStart: '09:00',
                shiftEnd: '18:00',
                checkInDiff: 0,
                checkOutDiff: -30, // 30 mins early
                store: 'Q1',
              },
            ];
          }
          if (sql.includes('FROM `staff_working_shift` sws')) {
            return [
              { shiftId: 1001, userId: 5001, date: '2026-11-07', startTime: '08:00', endTime: '17:00' },
              { shiftId: 1002, userId: 5002, date: '2026-11-06', startTime: '09:00', endTime: '18:00' },
            ];
          }
          if (sql.includes('FROM `staff_day_off` sdo')) {
            return [
              {
                dayOffId: 2001,
                userId: 5001,
                date: '2026-11-05',
                attributeOptionId: 113,
                note: 'Xin nghỉ sốt xuất huyết',
                requestState: 'Approved',
                store: 'PXL',
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
                dateCreated: '2026-11-05 10:00:00',
                dateStr: '2026-11-05',
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
  assert.equal(sentPayload.summary.totalFinedBananas, 350); // 50 + 300

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

  // Staff 5002 (Thùy Dương) has 1 early violation with NO fine
  const staff2 = sentPayload.data.find((s: SafeAny) => s.legacyUserId === 5002);
  assert.ok(staff2);
  assert.equal(staff2.earlyCount, 1);
  assert.equal(staff2.earlyMinutes, 30);
  assert.equal(staff2.finedBananaAmount, 0);

  const earlyViolation = staff2.violations.find((v: SafeAny) => v.type === 'EARLY');
  assert.ok(earlyViolation);
  assert.equal(earlyViolation.isFined, false);
  assert.equal(earlyViolation.finedBananas, 0);
});
