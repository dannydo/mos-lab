import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { registerBookingRoutes } from './booking.routes.js';
import { registerCustomerDetailRoutes } from './customer-detail.routes.js';
import { TeamService } from '../../teams/team.service.js';
import { SafeAny } from '@mos-lab/shared';

test('MOS-BUG-123 & CARE-001: Lash cycle excludes Fix, Log, Adjust warranty orders from booking slots', async (t) => {
  const app = Fastify();

  app.decorateRequest('user', null as SafeAny);
  app.decorateRequest('jwtVerify', async function () {
    this.user = { id: 1, username: 'test_admin', role: 'admin', displayName: 'Test Admin' };
  });

  t.mock.method(TeamService, 'getActiveStaffIdsWithFallback', async () => [48308]);

  const executedSqls: string[] = [];

  const mockLegacy = {
    $queryRawUnsafe: async (sql: string, ...params: SafeAny[]) => {
      executedSqls.push(sql);

      // CV profiles
      if (sql.includes('SELECT user_id as id, full_name as name, client_store_id')) {
        return [{ id: 48308, name: 'Huyền Nguyễn', client_store_id: 16 }];
      }

      // Day off stores
      if (sql.includes('FROM staff_day_off_schedule') && sql.includes('SELECT user_id, client_store_id')) {
        return [{ user_id: 48308, client_store_id: 16 }];
      }

      // Weekly day off
      if (sql.includes('FROM staff_day_off_schedule') && sql.includes('weekday = ?')) {
        return [];
      }

      // Date leaves
      if (sql.includes('FROM staff_day_off')) {
        return [];
      }

      // Working shifts
      if (sql.includes('FROM staff_working_shift ') || sql.includes('FROM staff_working_shift\n')) {
        return [];
      }

      if (sql.includes('FROM staff_working_shift_schedule')) {
        return [
          { user_id: 48308, type: 'Day', type_value: 'All', start_time_str: '09:00:00', end_time_str: '20:00:00' },
        ];
      }

      // Live order for Huyền Nguyễn on 2026-10-19 14:00 (Customer 48916 Hà Phương)
      if (sql.includes('active_orders.assigned_staff_id = ?')) {
        return [
          {
            id: 337999,
            user_id: 48916,
            total_price: 650000,
            booking_note: 'Khách quen dặm mi',
            order_state: 'Confirmed',
            start_str: '2026-10-19 14:00:00',
            duration: 90,
            assigned_staff_id: 48308,
          },
        ];
      }

      // Customer profiles
      if (sql.includes('FROM user_profile') && sql.includes('WHERE user_id IN')) {
        return [
          {
            user_id: 48916,
            full_name: 'Hà Phương',
            avatar: null,
            avatar_internal: null,
          },
        ];
      }

      // Customer contacts
      if (sql.includes('FROM user_contact') && sql.includes('WHERE user_id IN')) {
        return [{ user_id: 48916, phone_number: '0988776655' }];
      }

      // Current order services
      if (sql.includes('FROM order_service os') && sql.includes('WHERE os.order_id IN')) {
        return [{ order_id: 337999, service_name: 'Dặm Mi Thiết Kế' }];
      }

      // Previous completed bookings query:
      // Notice: the query must contain the NOT EXISTS clause excluding Fix/Log/Adjust!
      if (sql.includes("AND o.order_state = 'Completed'") && sql.includes('AND o.booking_date_start < ?')) {
        // Assert that SQL contains warranty exclusion
        assert.ok(
          sql.includes("os_w.service_type IN ('Fix', 'Log', 'Adjust')"),
          'Query for previous bookings MUST exclude Fix, Log, Adjust warranty orders'
        );
        // Previous regular order on 2026-09-25 (Order 335000).
        // (A warranty order 336856 on 2026-10-02 was excluded by the SQL!)
        return [
          {
            id: 335000,
            user_id: 48916,
            booking_date_start: '2026-09-25 10:00:00',
            client_store_id: 16,
            service_name: 'Nối Mi Mới Thiết Kế',
            cv_name: 'Huyền Nguyễn',
          },
        ];
      }

      // Next scheduled bookings
      if (sql.includes("AND o.order_state != 'Cancelled'") && sql.includes('AND o.booking_date_start > ?')) {
        return [];
      }

      // Recent lash sets
      if (sql.includes("AND o.order_state = 'Completed'") && sql.includes('WHERE o.user_id IN')) {
        return [];
      }

      if (sql.includes('FROM `order` o')) {
        return [];
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

  const res = await app.inject({
    method: 'GET',
    url: '/customers/booking-slots?date=2026-10-19&storeId=16&technicianId=48308',
    headers: { authorization: 'Bearer test' },
  });

  assert.equal(res.statusCode, 200);
  const matrix = JSON.parse(res.body);
  const booking = matrix['14:00']?.bookings?.[0];

  assert.ok(booking, 'Booking at 14:00 must be found');
  assert.equal(booking.customerId, 48916);
  assert.equal(booking.customerName, 'Hà Phương');
  // From 2026-09-25 to 2026-10-19 is 24 days (NOT 17 days from the 2026-10-02 Fix order!)
  assert.equal(booking.cycleDays, 24, 'Cycle days must be calculated from 2026-09-25 (24 days), skipping Fix order');
  assert.equal(booking.previousBooking.serviceName, 'Nối Mi Mới Thiết Kế');
});

test('MOS-BUG-123 & CARE-001: Customer detail bookings endpoint marks warranty and provides serviceTypes', async () => {
  const app = Fastify();

  app.decorateRequest('user', null as SafeAny);
  app.decorateRequest('jwtVerify', async function () {
    this.user = { id: 1, username: 'test_admin', role: 'admin', displayName: 'Test Admin' };
  });

  const mockLegacy = {
    $queryRawUnsafe: async (sql: string) => {
      // Bookings count
      if (sql.includes('SELECT COUNT(*) as cnt FROM `order`')) {
        return [{ cnt: 2 }];
      }
      // Bookings raw list
      if (sql.includes('FROM `order` o') && sql.includes('ORDER BY o.booking_date_start DESC')) {
        return [
          {
            id: 336856,
            orderKey: 'ORD-336856',
            bookingDate: '2026-10-02T10:00:00Z',
            bookingNote: 'Bảo hành dặm chỉnh vài sợi mi',
            orderState: 'Completed',
            totalPrice: 0,
            technicianId: 48308,
            storeId: 16,
            branchName: 'Estella',
          },
          {
            id: 335000,
            orderKey: 'ORD-335000',
            bookingDate: '2026-09-25T10:00:00Z',
            bookingNote: 'Nối mi mới',
            orderState: 'Completed',
            totalPrice: 650000,
            technicianId: 48308,
            storeId: 16,
            branchName: 'Estella',
          },
        ];
      }
      // Order services
      if (sql.includes('FROM order_service os') && sql.includes('WHERE os.order_id IN')) {
        return [
          {
            orderId: 336856,
            serviceName: 'Bảo hành kỹ thuật',
            userServiceType: 'Normal',
            serviceType: 'Fix',
          },
          {
            orderId: 335000,
            serviceName: 'Nối Mi Mới Thiết Kế',
            userServiceType: 'Normal',
            serviceType: 'Normal',
          },
        ];
      }
      // Staff profile
      if (sql.includes('FROM user_profile') && sql.includes('WHERE user_id IN')) {
        return [{ userId: 48308, fullName: 'Huyền Nguyễn', isDisabled: 0, isLeaved: 0 }];
      }
      return [];
    },
    order_service: {
      findMany: async () => [],
    },
    user_contact: {
      findMany: async () => [],
    },
  };

  app.decorate('prisma', {
    crm: {
      crmBookingLog: {
        groupBy: async () => [],
      },
    },
    legacy: mockLegacy,
  } as SafeAny);

  await app.register(registerCustomerDetailRoutes);

  const res = await app.inject({
    method: 'GET',
    url: '/customers/48916/bookings?page=1&limit=10',
    headers: { authorization: 'Bearer test' },
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.items.length, 2);

  const warrantyBooking = body.items[0];
  assert.equal(warrantyBooking.id, 336856);
  assert.equal(warrantyBooking.isWarranty, true, 'Order with Fix serviceType must be flagged as isWarranty=true');
  assert.deepEqual(warrantyBooking.serviceTypes, ['Fix']);

  const normalBooking = body.items[1];
  assert.equal(normalBooking.id, 335000);
  assert.equal(normalBooking.isWarranty, false, 'Order with Normal serviceType must not be warranty');
  assert.deepEqual(normalBooking.serviceTypes, ['Normal']);
});
