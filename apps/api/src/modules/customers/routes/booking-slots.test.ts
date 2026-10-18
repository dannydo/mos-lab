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

      // 7. Live orders (active_orders when technicianId is provided, or base order query)
      if (sql.includes('active_orders.assigned_staff_id = ?')) {
        return [
          {
            id: 336272,
            user_id: 9999,
            total_price: 650000,
            booking_note: 'Khách quen nối mi',
            order_state: 'Confirmed',
            start_str: '2026-09-22 09:00:00',
            duration: 90,
            assigned_staff_id: 48308,
          },
        ];
      }

      // Customer profiles
      if (sql.includes('FROM user_profile') && sql.includes('WHERE user_id IN')) {
        return [
          {
            user_id: 9999,
            full_name: 'Chị Lan Ngọc',
            avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/99/thumbnail/9999.jpg',
            avatar_internal: null,
          },
        ];
      }

      // Customer contacts
      if (sql.includes('FROM user_contact') && sql.includes('WHERE user_id IN')) {
        return [{ user_id: 9999, phone_number: '0901234567' }];
      }

      // Current order services
      if (sql.includes('FROM order_service os') && sql.includes('WHERE os.order_id IN')) {
        return [{ order_id: 336272, service_name: 'Mi Thiết Kế Wispy' }];
      }

      // Previous completed bookings
      if (sql.includes("AND o.order_state = 'Completed'") && sql.includes('AND o.booking_date_start < ?')) {
        return [
          {
            id: 335100,
            user_id: 9999,
            booking_date_start: '2026-08-25 09:00:00',
            client_store_id: 16,
            service_name: 'Mi Thiết Kế Wispy',
            cv_name: 'Huyền Nguyễn',
          },
        ];
      }

      // Next scheduled bookings
      if (sql.includes("AND o.order_state != 'Cancelled'") && sql.includes('AND o.booking_date_start > ?')) {
        return [
          {
            id: 337500,
            user_id: 9999,
            booking_date_start: '2026-10-20 09:00:00',
            client_store_id: 16,
            service_name: 'Mi Katun 3D',
            cv_name: 'Huyền Nguyễn',
          },
        ];
      }

      // Recent completed lash sets
      if (sql.includes("AND o.order_state = 'Completed'") && sql.includes('WHERE o.user_id IN')) {
        return [
          {
            id: 335100,
            user_id: 9999,
            booking_date_start: '2026-08-25 09:00:00',
            order_state: 'Completed',
            client_store_id: 16,
            total_price: 650000,
            booking_note: 'Bộ mi rất đẹp',
            service_name: 'Mi Thiết Kế Wispy',
            cv_name: 'Huyền Nguyễn',
          },
        ];
      }

      // Photos for recent orders
      if (sql.includes('FROM order_service_progress') && sql.includes('WHERE order_id IN')) {
        return [
          {
            id: 1380123,
            order_id: 335100,
            service_state: 'ServiceStart',
            image_filename: '1380123',
            image_extension: 'jpg',
          },
          {
            id: 1380145,
            order_id: 335100,
            service_state: 'ServiceEnd',
            image_filename: '1380145',
            image_extension: 'jpg',
          },
        ];
      }

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

  // Test 3: Query with technicianId=48308 (Huyền Nguyễn) - includes customer avatar, cycle days, and lash sets with before/after photos (MOS-FEAT-113)
  const respTech = await app.inject({
    method: 'GET',
    url: '/customers/booking-slots?date=2026-09-22&storeId=16&technicianId=48308',
    headers: { authorization: 'Bearer test' },
  });
  assert.equal(respTech.statusCode, 200);
  const matrixTech = JSON.parse(respTech.body);
  assert.equal(matrixTech['09:00'].roster, 1, 'Only Huyền Nguyễn should be in roster');
  assert.equal(matrixTech['09:00'].booked, 1, '1 order booked for Huyền Nguyễn at 09:00');
  assert.ok(matrixTech['09:00'].bookings, 'Slot 09:00 should contain bookings array');
  assert.equal(matrixTech['09:00'].bookings.length, 1);

  const booking = matrixTech['09:00'].bookings[0];
  assert.equal(booking.customerId, 9999);
  assert.equal(booking.customerName, 'Chị Lan Ngọc');
  assert.equal(booking.customerAvatar, 'https://cdn.wingslashes.com/uploads/user/avatar/99/thumbnail/9999.jpg');
  assert.equal(booking.customerPhone, '0901234567');
  assert.equal(booking.serviceName, 'Mi Thiết Kế Wispy');
  assert.equal(booking.cycleDays, 28, 'Cycle days between 2026-08-25 and 2026-09-22 is 28 days');
  assert.ok(booking.previousBooking, 'Previous booking must exist');
  assert.equal(booking.previousBooking.serviceName, 'Mi Thiết Kế Wispy');
  assert.ok(booking.nextBooking, 'Next booking must exist');
  assert.equal(booking.nextBooking.inDays, 28);
  assert.equal(booking.recentLashSets.length, 1);
  assert.ok(booking.recentLashSets[0].beforePhotoUrl?.includes('1380123.jpg'));
  assert.ok(booking.recentLashSets[0].afterPhotoUrl?.includes('1380145.jpg'));

  // Test 4: Validation error when parameters are missing
  const respInvalid = await app.inject({
    method: 'GET',
    url: '/customers/booking-slots',
    headers: { authorization: 'Bearer test' },
  });
  assert.equal(respInvalid.statusCode, 400);
});
