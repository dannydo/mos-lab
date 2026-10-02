import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';
import {
  calculateStandardWorkDays,
  canUserManageTelesalesAttendance,
  computeBkOrderCheckins,
  fetchBkAttendanceMap,
  fetchBkExceptionAdjustedAttendanceMap,
  fetchTelesalesAttendanceAuditLogs,
  fetchTelesalesAttendanceExceptions,
  getActiveBkTelesalesIds,
  getBkWorkDaysOverrides,
  isStaffTelesalesExecutive,
  resolveBkTelesalesStaffScope,
  upsertTelesalesAttendanceException,
} from './bk-salary.service.js';

test('BK Done scope uses only active BK_TELESALES members', async () => {
  const inspectedTeamCodes: string[] = [];
  const fastify = {
    prisma: {
      crm: {
        crmTeam: {
          findUnique: async ({ where }: { where: { code: string } }) => {
            inspectedTeamCodes.push(where.code);
            return {
              members: [
                { legacyStaffId: 101, isActive: true },
                { legacyStaffId: 202, isActive: true },
              ],
            };
          },
        },
        crmStaff: {
          findMany: async () => [],
        },
      },
      legacy: {
        $queryRawUnsafe: async () => [{ user_id: 101 }, { user_id: 202 }],
      },
    },
  } as unknown as FastifyInstance;

  const ids = await getActiveBkTelesalesIds(fastify);

  assert.deepEqual(inspectedTeamCodes, ['BK_TELESALES']);
  assert.deepEqual(ids, [101, 202]);
});

test('BK Done scope falls back only to the BK_TELESALES configuration key', async () => {
  const configKeys: string[] = [];
  const fastify = {
    prisma: {
      crm: {
        crmTeam: {
          findUnique: async () => null,
        },
        crmConfig: {
          findUnique: async ({ where }: { where: { key: string } }) => {
            configKeys.push(where.key);
            return { value: '[303]' };
          },
        },
        crmStaff: {
          findMany: async () => [],
        },
      },
      legacy: {
        $queryRawUnsafe: async () => [{ user_id: 303 }],
      },
    },
  } as unknown as FastifyInstance;

  const ids = await getActiveBkTelesalesIds(fastify);

  assert.deepEqual(configKeys, ['ACTIVE_BK_TELESALES_STAFF_CONFIG']);
  assert.deepEqual(ids, [303]);
});

test('BK Booking details never expand beyond the active BK_TELESALES roster', () => {
  const activeTelesalesIds = [101, 202];

  assert.deepEqual(resolveBkTelesalesStaffScope(activeTelesalesIds), activeTelesalesIds);
  assert.deepEqual(resolveBkTelesalesStaffScope(activeTelesalesIds, 'ALL'), activeTelesalesIds);
  assert.deepEqual(resolveBkTelesalesStaffScope(activeTelesalesIds, '202'), [202]);
  assert.deepEqual(resolveBkTelesalesStaffScope(activeTelesalesIds, '999'), []);
  assert.deepEqual(resolveBkTelesalesStaffScope(activeTelesalesIds, 'not-a-staff-id'), []);
});

test('BK check-ins retain Combo Live bonuses while fetching only required legacy fields', async () => {
  let orderServiceSelect: unknown;
  let balanceSelect: unknown;
  let serviceLanguageSelect: unknown;

  const fastify = {
    log: { error: () => undefined },
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async () => ({ value: JSON.stringify({}) }),
        },
        crmTeam: {
          findMany: async () => [{ members: [{ legacyStaffId: 101, isActive: true }] }],
        },
        crmStaff: {
          findMany: async () => [],
        },
      },
      legacy: {
        $queryRawUnsafe: async (query: string) => {
          if (query.includes('SELECT user_id FROM user_profile')) return [{ user_id: 101 }];
          if (query.includes('FROM user_service_balance_transaction')) {
            return [
              {
                id: 1,
                user_service_balance_id: 71,
                date_created: new Date('2026-08-01T08:00:00.000Z'),
                date_expired: new Date('2026-08-30T00:00:00.000Z'),
                total_normal_count_left: 2,
                total_retain_count_left: 1,
                normal_count: 0,
                retain_count: 0,
                used_staff_id: null,
                order_id: 0,
                o_booking_date_start: new Date('2026-08-01T08:00:00.000Z'),
              },
            ];
          }
          if (query.includes('FROM `order` o')) {
            return [
              {
                orderId: 11,
                bookerId: 101,
                userId: 501,
                bookingDateStart: new Date('2026-08-02T09:00:00.000Z'),
                dateCreated: new Date('2026-08-01T07:00:00.000Z'),
              },
              {
                orderId: 12,
                bookerId: 101,
                userId: 501,
                bookingDateStart: new Date('2026-08-03T09:00:00.000Z'),
                dateCreated: new Date('2026-08-01T07:00:00.000Z'),
              },
            ];
          }
          return [];
        },
        order_service: {
          findMany: async ({ select }: { select: unknown }) => {
            orderServiceSelect = select;
            return [
              {
                order_id: 11,
                service_id: 1,
                service_price: 500000,
                service_type: 'Normal',
                discount_amount: 0,
              },
              {
                order_id: 12,
                service_id: 1,
                service_price: 500000,
                service_type: 'Normal',
                discount_amount: 0,
              },
            ];
          },
        },
        user_service_balance: {
          findMany: async ({ select }: { select: unknown }) => {
            balanceSelect = select;
            return [
              {
                id: 71,
                user_id: 501,
                date_created: new Date('2026-08-01T00:00:00.000Z'),
                date_expired: new Date('2026-08-30T00:00:00.000Z'),
                normal_count: 3,
                retain_count: 0,
              },
            ];
          },
        },
        service_language: {
          findMany: async ({ select }: { select: unknown }) => {
            serviceLanguageSelect = select;
            return [{ service_id: 1, service_name: 'Nối mới' }];
          },
        },
      },
    },
  } as unknown as FastifyInstance;

  const result = await computeBkOrderCheckins(fastify, '2026-08-01', '2026-08-31', [101]);

  assert.equal(result.clientBonusMap.get(101), 2000);
  assert.equal(result.orderCheckinMap.get(11)?.isCombo, true);
  assert.equal(result.orderCheckinMap.get(12)?.isCombo, true);
  assert.deepEqual(orderServiceSelect, {
    order_id: true,
    service_id: true,
    service_price: true,
    service_type: true,
    discount_amount: true,
  });
  assert.deepEqual(balanceSelect, {
    id: true,
    user_id: true,
    date_created: true,
    date_expired: true,
    normal_count: true,
    retain_count: true,
  });
  assert.deepEqual(serviceLanguageSelect, { service_id: true, service_name: true });
});

test('calculateStandardWorkDays calculates non-Sunday working days correctly', () => {
  // August 2026: 31 days - 5 Sundays (Aug 2, 9, 16, 23, 30) = 26 standard days
  assert.equal(calculateStandardWorkDays('2026-08-01', '2026-08-31'), 26);

  // September 2026: 30 days - 4 Sundays (Sep 6, 13, 20, 27) = 26 standard days
  assert.equal(calculateStandardWorkDays('2026-09-01', '2026-09-30'), 26);

  // Partial range: 2026-08-01 (Sat) to 2026-08-07 (Fri) = 7 days - 1 Sunday (Aug 2) = 6 standard days
  assert.equal(calculateStandardWorkDays('2026-08-01', '2026-08-07'), 6);
});

test('fetchBkAttendanceMap returns attendance counts grouped by staffId', async () => {
  let executedSql = '';
  const fastify = {
    log: { error: () => undefined },
    prisma: {
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          executedSql = sql;
          return [
            { staffId: 50670, checkinDays: 18 },
            { staffId: 32268, checkinDays: 16 },
          ];
        },
      },
    },
  } as unknown as FastifyInstance;

  const result = await fetchBkAttendanceMap(fastify, '2026-08-01', '2026-08-31', [50670, 32268]);
  assert.equal(result.get(50670), 18);
  assert.equal(result.get(32268), 16);
  assert.ok(executedSql.includes('FROM `report_staff`'));
});

test('getBkWorkDaysOverrides reads overrides from crmConfig', async () => {
  const fastify = {
    log: { error: () => undefined },
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async ({ where }: { where: { key: string } }) => {
            if (where.key === 'BK_WORK_DAYS_OVERRIDE') {
              return { value: JSON.stringify({ '50670_2026-08': 23 }) };
            }
            return null;
          },
        },
      },
    },
  } as unknown as FastifyInstance;

  const overrides = await getBkWorkDaysOverrides(fastify);
  assert.deepEqual(overrides, { '50670_2026-08': 23 });
});

test('isStaffTelesalesExecutive identifies staff via crmStaff role or team membership', async () => {
  const fastify = {
    log: { warn: () => undefined },
    prisma: {
      crm: {
        crmStaff: {
          findFirst: async ({ where }: { where: { OR: Array<{ legacyStaffId?: number; id?: number }> } }) => {
            const id = where.OR[0]?.legacyStaffId;
            if (id === 50670) return { id: 1, role: 'telesales', legacyStaffId: 50670 };
            if (id === 12345) return { id: 2, role: 'cc', legacyStaffId: 12345 };
            return null;
          },
        },
        crmTeamMember: {
          findFirst: async ({ where }: { where: { legacyStaffId: number } }) => {
            if (where.legacyStaffId === 99999) return { id: 3, legacyStaffId: 99999 };
            return null;
          },
        },
      },
    },
  } as unknown as FastifyInstance;

  assert.equal(await isStaffTelesalesExecutive(fastify, 50670), true);
  assert.equal(await isStaffTelesalesExecutive(fastify, 99999), true);
  assert.equal(await isStaffTelesalesExecutive(fastify, 12345), false);
  assert.equal(await isStaffTelesalesExecutive(fastify, 77777), false);
});

test('canUserManageTelesalesAttendance verifies admin, manager, and user permissions', async () => {
  const fastify = {
    log: { warn: () => undefined },
    prisma: {
      crm: {
        crmStaff: {
          findFirst: async ({ where }: { where: { OR: Array<{ legacyStaffId?: number; id?: number }> } }) => {
            const id = where.OR[0]?.legacyStaffId;
            if (id === 50670) return { id: 1, role: 'telesales', legacyStaffId: 50670 };
            return null;
          },
        },
        crmTeamMember: {
          findFirst: async () => null,
        },
      },
    },
  } as unknown as FastifyInstance;

  // Admin and Super Admin can always manage
  assert.equal(await canUserManageTelesalesAttendance(fastify, { id: 1, role: 'admin' }, 50670), true);
  assert.equal(await canUserManageTelesalesAttendance(fastify, { id: 2, role: 'super_admin' }, 50670), true);

  // Manager can manage Telesales staff
  assert.equal(await canUserManageTelesalesAttendance(fastify, { id: 3, role: 'manager' }, 50670), true);
  // Manager cannot manage non-telesales staff
  assert.equal(await canUserManageTelesalesAttendance(fastify, { id: 3, role: 'manager' }, 99999), false);

  // Regular staff cannot manage
  assert.equal(await canUserManageTelesalesAttendance(fastify, { id: 4, role: 'staff' }, 50670), false);
});

test('upsertTelesalesAttendanceException rejects empty or short reason', async () => {
  const fastify = {
    log: { warn: () => undefined },
    prisma: {
      crm: {
        crmStaff: {
          findFirst: async () => ({ id: 1, role: 'telesales', legacyStaffId: 50670 }),
        },
        crmTelesalesAttendanceException: {
          findUnique: async () => null,
        },
      },
    },
  } as unknown as FastifyInstance;

  await assert.rejects(
    () =>
      upsertTelesalesAttendanceException(fastify, {
        staffId: 50670,
        workDate: '2026-08-10',
        exceptionType: 'OFF_MORNING',
        reason: '  ',
      }),
    /Bắt buộc nhập lý do khi duyệt ngoại lệ chấm công/
  );

  await assert.rejects(
    () =>
      upsertTelesalesAttendanceException(fastify, {
        staffId: 50670,
        workDate: '2026-08-10',
        exceptionType: 'OFF_MORNING',
        reason: 'ok',
      }),
    /Bắt buộc nhập lý do khi duyệt ngoại lệ chấm công/
  );
});

test('upsertTelesalesAttendanceException performs CREATE, UPDATE, and CLEAR with audit logging', async () => {
  let createdException: any = null;
  let updatedException: any = null;
  let deletedExceptionId: number | null = null;
  const auditLogs: any[] = [];

  let mockExisting: any = null;

  const fastify = {
    log: { warn: () => undefined },
    prisma: {
      crm: {
        crmStaff: {
          findFirst: async () => ({ id: 1, role: 'telesales', legacyStaffId: 50670 }),
        },
        crmTelesalesAttendanceException: {
          findUnique: async () => mockExisting,
          create: async ({ data }: { data: any }) => {
            createdException = {
              id: 101,
              ...data,
              createdAt: new Date('2026-08-10T10:00:00Z'),
              updatedAt: new Date('2026-08-10T10:00:00Z'),
            };
            mockExisting = createdException;
            return createdException;
          },
          update: async ({ data }: { data: any }) => {
            updatedException = {
              ...mockExisting,
              ...data,
              updatedAt: new Date('2026-08-10T11:00:00Z'),
            };
            mockExisting = updatedException;
            return updatedException;
          },
          delete: async ({ where }: { where: { id: number } }) => {
            deletedExceptionId = where.id;
            mockExisting = null;
            return { id: where.id };
          },
        },
        crmTelesalesAttendanceExceptionLog: {
          create: async ({ data }: { data: any }) => {
            auditLogs.push(data);
            return { id: auditLogs.length, ...data, createdAt: new Date() };
          },
        },
      },
    },
  } as unknown as FastifyInstance;

  // 1. CREATE exception: OFF_MORNING (0.5 công)
  const res1 = await upsertTelesalesAttendanceException(fastify, {
    staffId: 50670,
    workDate: '2026-08-10',
    exceptionType: 'OFF_MORNING',
    reason: 'Xin nghỉ sáng khám răng',
    performedByStaffId: 99,
    performedByName: 'Admin Danny',
  });
  assert.equal(res1.success, true);
  assert.equal(res1.exception?.workCredit, 0.5);
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0].action, 'CREATE');
  assert.equal(auditLogs[0].newType, 'OFF_MORNING');
  assert.equal(auditLogs[0].newCredit, 0.5);

  // 2. UPDATE exception: change to OFF_FULL_DAY (0 công)
  const res2 = await upsertTelesalesAttendanceException(fastify, {
    staffId: 50670,
    workDate: '2026-08-10',
    exceptionType: 'OFF_FULL_DAY',
    reason: 'Chuyển sang nghỉ nguyên ngày',
    performedByStaffId: 99,
    performedByName: 'Admin Danny',
  });
  assert.equal(res2.success, true);
  assert.equal(res2.exception?.workCredit, 0.0);
  assert.equal(auditLogs.length, 2);
  assert.equal(auditLogs[1].action, 'UPDATE');
  assert.equal(auditLogs[1].previousType, 'OFF_MORNING');
  assert.equal(auditLogs[1].newType, 'OFF_FULL_DAY');
  assert.equal(auditLogs[1].newCredit, 0.0);

  // 3. CLEAR exception: revert to machine records
  const res3 = await upsertTelesalesAttendanceException(fastify, {
    staffId: 50670,
    workDate: '2026-08-10',
    exceptionType: 'CLEAR',
    reason: 'Hủy ngoại lệ do đi làm lại bình thường',
    performedByStaffId: 99,
    performedByName: 'Admin Danny',
  });
  assert.equal(res3.success, true);
  assert.equal(deletedExceptionId, 101);
  assert.equal(auditLogs.length, 3);
  assert.equal(auditLogs[2].action, 'DELETE');
  assert.equal(auditLogs[2].previousType, 'OFF_FULL_DAY');
});

test('fetchBkExceptionAdjustedAttendanceMap accurately recalculates work days combining raw check-ins and exceptions', async () => {
  const baseMap = new Map<number, number>([
    [50670, 20.0],
    [32268, 18.0],
  ]);

  const fastify = {
    log: { warn: () => undefined },
    prisma: {
      crm: {
        crmTelesalesAttendanceException: {
          findMany: async () => [
            // Staff 50670 has 2 exceptions:
            // 2026-08-05: OFF_MORNING (0.5 credit instead of 1.0)
            { staffId: 50670, workDate: '2026-08-05', workCredit: 0.5 },
            // 2026-08-16 (Sunday): OVERTIME_OFF_DAY (+1.0 credit where raw is 0)
            { staffId: 50670, workDate: '2026-08-16', workCredit: 1.0 },
          ],
        },
      },
      legacy: {
        $queryRawUnsafe: async (sql: string) => {
          if (sql.includes('user_id = 50670')) {
            // Raw records for 50670: 20 days checked in (Aug 1 to 21, excluding Sunday Aug 16)
            const rows: Array<{ workDate: string; isCheckIn: number }> = [];
            for (let d = 1; d <= 21; d++) {
              if (d === 16) continue; // Sunday off
              const dayStr = d < 10 ? `0${d}` : `${d}`;
              rows.push({ workDate: `2026-08-${dayStr}`, isCheckIn: 1 });
            }
            return rows;
          }
          return [];
        },
      },
    },
  } as unknown as FastifyInstance;

  const adjustedMap = await fetchBkExceptionAdjustedAttendanceMap(
    fastify,
    '2026-08-01',
    '2026-08-31',
    [50670, 32268],
    baseMap
  );

  // Staff 50670:
  // 19 normal days @ 1.0 = 19.0
  // 2026-08-05 exception @ 0.5 = 0.5
  // 2026-08-16 exception @ 1.0 = 1.0
  // Total = 20.5
  assert.equal(adjustedMap.get(50670), 20.5);

  // Staff 32268 had no exceptions, so retains 18.0
  assert.equal(adjustedMap.get(32268), 18.0);
});
