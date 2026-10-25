import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { registerBookingRoutes } from './booking.routes.js';
import { CustomerCreationService } from '../services/customer-creation.service.js';
import { BookingReschedulePermissionService } from '../services/booking-reschedule-permission.service.js';
import { BookingAuditService } from '../services/booking-audit.service.js';
import { SafeAny } from '@mos-lab/shared';

test('MOS-BUG-150: PUT /customers/booking/:id succeeds when logged in user has legacy_staff_id: null', async (t) => {
  const app = Fastify();

  app.decorateRequest('user', null as SafeAny);
  app.decorateRequest('jwtVerify', async function () {
    this.user = { id: 6, username: 'khai.nguyen@wingslashes.com', role: 'admin', displayName: 'Nguyễn Quang Khải' };
  });

  t.mock.method(CustomerCreationService, 'resolveLegacyStaffId', async () => 45103);
  t.mock.method(BookingReschedulePermissionService, 'evaluate', async () => ({
    allowed: true,
    reason: 'ALLOWED',
    message: '',
  }));
  t.mock.method(BookingAuditService, 'logAction', async () => {});

  const executedSqls: string[] = [];

  const mockLegacy = {
    $queryRawUnsafe: async (sql: string, ...params: SafeAny[]) => {
      executedSqls.push(sql);

      // Order query
      if (sql.includes('FROM `order` WHERE id = ?')) {
        return [
          {
            id: 338302,
            user_id: 38150,
            created_staff_id: 32268,
            client_store_id: 6,
            assigned_staff_id: 25337,
            booking_date_start: new Date('2026-10-25T17:30:00.000Z'),
            booking_note: 'Test note',
            booking_duration_minute: 90,
            total_price: 350000,
            order_state: 'New',
            promotion_id: null,
            selected_promotion_id: null,
            campaign_id: null,
          },
        ];
      }

      // Existing services
      if (sql.includes('FROM order_service WHERE order_id = ?')) {
        return [
          {
            id: 12345,
            service_id: 1,
            service_group: 'LashesTop',
            service_price: 350000,
            discount_amount: 0,
            total_price: 350000,
            promotion_id: null,
          },
        ];
      }

      // Service info
      if (sql.includes('FROM service s')) {
        return [
          {
            duration: 90,
            price: 350000,
            serviceGroup: 'LashesTop',
          },
        ];
      }

      return [];
    },
    $executeRawUnsafe: async (sql: string, ...params: SafeAny[]) => {
      executedSqls.push(sql);
      return 1;
    },
    $transaction: async (cb: (tx: SafeAny) => Promise<SafeAny>) => {
      return cb(mockLegacy);
    },
  };

  const mockCrm = {
    crmStaff: {
      findUnique: async () => ({
        id: 6,
        displayName: 'Nguyễn Quang Khải',
        username: 'khai.nguyen@wingslashes.com',
        legacyStaffId: null,
      }),
      update: async () => ({ id: 6 }),
    },
  };

  app.decorate('prisma', {
    legacy: mockLegacy as SafeAny,
    crm: mockCrm as SafeAny,
  });

  await registerBookingRoutes(app);

  const res = await app.inject({
    method: 'PUT',
    url: '/customers/booking/338302',
    payload: {
      bookingNote: 'Cập nhật ghi chú mới',
    },
  });

  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
  assert.equal(data.orderId, 338302);
});

test('MOS-BUG-150: DELETE /customers/booking/:id succeeds when logged in user has legacy_staff_id: null', async (t) => {
  const app = Fastify();

  app.decorateRequest('user', null as SafeAny);
  app.decorateRequest('jwtVerify', async function () {
    this.user = { id: 6, username: 'khai.nguyen@wingslashes.com', role: 'admin', displayName: 'Nguyễn Quang Khải' };
  });

  t.mock.method(CustomerCreationService, 'resolveLegacyStaffId', async () => 45103);
  t.mock.method(BookingAuditService, 'logAction', async () => {});

  const executedSqls: string[] = [];

  const mockLegacy = {
    $queryRawUnsafe: async (sql: string) => {
      executedSqls.push(sql);
      if (sql.includes('FROM `order` WHERE id = ?')) {
        return [
          {
            id: 338302,
            user_id: 38150,
            created_staff_id: 32268,
            client_store_id: 6,
            assigned_staff_id: 25337,
            booking_date_start: new Date('2026-10-25T17:30:00.000Z'),
            booking_note: 'Test note',
          },
        ];
      }
      return [];
    },
    $executeRawUnsafe: async (sql: string) => {
      executedSqls.push(sql);
      return 1;
    },
  };

  app.decorate('prisma', {
    legacy: mockLegacy as SafeAny,
    crm: {} as SafeAny,
  });

  await registerBookingRoutes(app);

  const res = await app.inject({
    method: 'DELETE',
    url: '/customers/booking/338302',
    payload: {
      reasonCategory: 'Khách bận',
      reasonNote: 'Hẹn lại hôm sau',
    },
  });

  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
  assert.equal(data.orderId, 338302);
});
