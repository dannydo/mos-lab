import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { registerBookingRoutes } from './booking.routes.js';
import { TeamService } from '../../teams/team.service.js';
import { SafeAny } from '@mos-lab/shared';

test('GET /customers/booking-slots correctly calculates roster, live booked orders, and available slots (MOS-BUG-35)', async (t) => {
  const app = Fastify();

  // Mock authentication decorator
  app.decorateRequest('user', null as SafeAny);
  app.decorateRequest('jwtVerify', async function () {
    this.user = { id: 1, username: 'test_admin', role: 'admin', displayName: 'Test Admin' };
  });

  // Mock active CVs
  t.mock.method(TeamService, 'getActiveStaffIdsWithFallback', async () => [47510, 48308, 34806, 45515, 47950]);

  // Mock legacy Prisma queries
  const mockLegacy = {
    $queryRawUnsafe: async (sql: string, ...params: SafeAny[]) => {
      // 1. CV profiles
      if (sql.includes('SELECT user_id as id, full_name as name, client_store_id')) {
        return [
          { id: 47510, name: 'HânEmBé', client_store_id: 16 },
          { id: 48308, name: 'Huyền Nguyễn', client_store_id: 16 },
          { id: 34806, name: 'Kim Ngân', client_store_id: 16 },
          { id: 45515, name: 'Tuyết Ngọc ☘️', client_store_id: 16 },
          { id: 47950, name: 'Cẩm Tiên', client_store_id: 16 },
        ];
      }

      // 2. Day off stores
      if (sql.includes('SELECT user_id, client_store_id') && sql.includes('FROM staff_day_off_schedule')) {
        return [
          { user_id: 47510, client_store_id: 16 },
          { user_id: 48308, client_store_id: 16 },
          { user_id: 34806, client_store_id: 16 },
          { user_id: 45515, client_store_id: 16 },
          { user_id: 47950, client_store_id: 16 },
        ];
      }

      // 3. Weekly recurring day-offs (Tuesday 2026-09-22 is weekday 2; Cẩm Tiên has weekday 2)
      if (sql.includes('SELECT user_id FROM staff_day_off_schedule') && sql.includes('weekday = ?')) {
        const weekday = params[0];
        if (weekday === 2) {
          return [{ user_id: 47950 }]; // Cẩm Tiên is OFF on Tuesdays
        }
        return [];
      }

      // 4. Approved date leave requests
      if (sql.includes('SELECT from_user_id FROM staff_day_off')) {
        return []; // No ad-hoc leaves
      }

      // 5. Instantiated shifts
      if (sql.includes('FROM staff_working_shift ') || sql.includes('FROM staff_working_shift\n')) {
        return []; // None instantiated, fall back to schedule templates
      }

      // 6. Shift schedule templates
      if (sql.includes('FROM staff_working_shift_schedule')) {
        return [
          { user_id: 47510, type: 'Day', type_value: 'All', start_time_str: '09:00:00', end_time_str: '18:00:00' },
          { user_id: 48308, type: 'Day', type_value: 'All', start_time_str: '09:00:00', end_time_str: '20:00:00' },
          { user_id: 34806, type: 'Day', type_value: 'All', start_time_str: '11:00:00', end_time_str: '20:00:00' },
          { user_id: 45515, type: 'Day', type_value: 'All', start_time_str: '09:00:00', end_time_str: '20:00:00' },
          { user_id: 47950, type: 'Day', type_value: 'All', start_time_str: '09:00:00', end_time_str: '20:00:00' },
        ];
      }

      // 7. Live orders
      if (sql.includes('FROM `order` o')) {
        return [
          { id: 336272, start_str: '2026-09-22 09:00:00', duration: 108, assigned_staff_id: null },
          { id: 336320, start_str: '2026-09-22 09:00:00', duration: 71, assigned_staff_id: null },
        ];
      }

      return [];
    },
  };

  app.decorate('prisma', {
    crm: {
      crmStaff: {
        findUnique: async () => ({ role: 'admin', isActive: true }),
        update: async () => ({}),
      },
    },
    legacy: mockLegacy,
  } as SafeAny);
  await app.register(registerBookingRoutes);

  // Test 1: Query by storeName='Estella' on 2026-09-22
  const response = await app.inject({
    method: 'GET',
    url: '/customers/booking-slots?date=2026-09-22&storeName=Estella',
    headers: { authorization: 'Bearer test' },
  });

  assert.equal(response.statusCode, 200);
  const matrix = JSON.parse(response.body);

  // At 09:00:
  // - Roster: 3 CVs (HânEmBé, Huyền Nguyễn, Tuyết Ngọc; Kim Ngân starts at 11:00; Cẩm Tiên is weekly OFF)
  // - Booked: 2 orders (Order 336272 and 336320)
  // - Available: 3 - 2 = 1 (Resolves MOS-BUG-35 where system erroneously showed 3)
  assert.equal(matrix['09:00'].roster, 3, 'Roster at 09:00 should be 3 CVs');
  assert.equal(matrix['09:00'].booked, 2, 'Booked at 09:00 should be 2 orders');
  assert.equal(matrix['09:00'].available, 1, 'Available at 09:00 should be 3 - 2 = 1');

  // At 11:00:
  // - Kim Ngân is now working (roster = 4)
  // - Order 336320 (71 mins, 09:00 - 10:11) has finished!
  // - Order 336272 (108 mins, 09:00 - 10:48) has finished!
  // - Booked: 0
  // - Available: 4
  assert.equal(matrix['11:00'].roster, 4, 'Roster at 11:00 should be 4 CVs');
  assert.equal(matrix['11:00'].booked, 0, 'Booked at 11:00 should be 0');
  assert.equal(matrix['11:00'].available, 4, 'Available at 11:00 should be 4');

  // Test 2: Query by storeId=16
  const respStoreId = await app.inject({
    method: 'GET',
    url: '/customers/booking-slots?date=2026-09-22&storeId=16',
    headers: { authorization: 'Bearer test' },
  });
  assert.equal(respStoreId.statusCode, 200);
  const matrixStoreId = JSON.parse(respStoreId.body);
  assert.equal(matrixStoreId['09:00'].available, 1);

  // Test 3: Query with technicianId=48308 (Huyền Nguyễn)
  const respTech = await app.inject({
    method: 'GET',
    url: '/customers/booking-slots?date=2026-09-22&storeId=16&technicianId=48308',
    headers: { authorization: 'Bearer test' },
  });
  assert.equal(respTech.statusCode, 200);
  const matrixTech = JSON.parse(respTech.body);
  assert.equal(matrixTech['09:00'].roster, 1, 'Only Huyền Nguyễn should be in roster');

  // Test 4: Validation error when parameters are missing
  const respInvalid = await app.inject({
    method: 'GET',
    url: '/customers/booking-slots',
    headers: { authorization: 'Bearer test' },
  });
  assert.equal(respInvalid.statusCode, 400);
});
