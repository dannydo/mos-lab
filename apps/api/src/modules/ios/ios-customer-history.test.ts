import test from 'node:test';
import assert from 'node:assert/strict';
import type mysql from 'mysql2/promise';
import {
  formatDaysAgoLabel,
  getIosCustomerHistory,
  mapOrderStateDisplay,
} from './services/ios-customer-history.service.js';
import type { IosAuthContext } from './services/ios-auth.service.js';

function createMockPool(responses: {
  profile?: Record<string, unknown>[];
  contact?: Record<string, unknown>[];
  balance?: Record<string, unknown>[];
  orders?: Record<string, unknown>[];
  reportOrders?: Record<string, unknown>[];
  payments?: Record<string, unknown>[];
  services?: Record<string, unknown>[];
  reportServices?: Record<string, unknown>[];
  combos?: Record<string, unknown>[];
  products?: Record<string, unknown>[];
  diamondTxns?: Record<string, unknown>[];
  orderCcNotes?: Record<string, unknown>[];
  throwOnComboQuery?: boolean;
}): mysql.Pool {
  return {
    async query(sql: string) {
      if (sql.includes('FROM user_profile up')) return [responses.profile || [], []];
      if (sql.includes('FROM user_contact uc')) return [responses.contact || [], []];
      if (sql.includes('FROM user_balance_transaction ubt')) return [responses.diamondTxns || [], []];
      if (sql.includes('FROM user_balance ')) return [responses.balance || [], []];
      if (sql.includes('FROM `order` o')) return [responses.orders || [], []];
      if (sql.includes('FROM report_order ro')) return [responses.reportOrders || [], []];
      if (sql.includes('FROM order_payment')) return [responses.payments || [], []];
      if (sql.includes('FROM order_service os')) return [responses.services || [], []];
      if (sql.includes('FROM report_order_service ros')) return [responses.reportServices || [], []];
      if (sql.includes('FROM order_service_combo osc')) {
        if (responses.throwOnComboQuery) throw new Error('Simulated secondary table error');
        return [responses.combos || [], []];
      }
      if (sql.includes('FROM order_product op')) return [responses.products || [], []];
      if (sql.includes('FROM user_note un') && sql.includes("note_field_key = 'order_note'")) {
        return [responses.orderCcNotes || [], []];
      }
      return [[], []];
    },
  } as unknown as mysql.Pool;
}

const SAMPLE_MOCK_DB = {
  profile: [{ user_id: 33732, full_name: 'Thanh', first_name: 'Thanh', last_name: null, passcode: 'W936746' }],
  contact: [{ phone_number: '0933936746' }],
  balance: [{ amount: 150 }],
  orders: [
    {
      order_id: 9001,
      order_state: 'New',
      booking_date_start: '2026-11-16T06:00:00.000Z',
      date_created: '2026-11-16T05:00:00.000Z',
      total_price: 770000,
      booking_note: 'Khách hẹn làm combo mới',
      client_store_id: 16,
      is_debt: 0,
      order_assigned_staff_id: 0,
      branch_name: 'Estella Place',
    },
    {
      order_id: 8002,
      order_state: 'Completed',
      booking_date_start: '2026-10-07T07:00:00.000Z',
      date_created: '2026-10-07T06:00:00.000Z',
      total_price: 770000,
      booking_note: 'Combo giữ chân cũ',
      client_store_id: 6,
      is_debt: 0,
      order_assigned_staff_id: 13783,
      branch_name: 'De Tham',
    },
    {
      order_id: 8001,
      order_state: 'Completed',
      booking_date_start: '2026-09-10T03:30:00.000Z',
      date_created: '2026-09-10T03:00:00.000Z',
      total_price: 712800,
      booking_note: 'Fix dặm góc ngoài bên phải',
      client_store_id: 16,
      is_debt: 0,
      order_assigned_staff_id: 14001,
      branch_name: 'Estella Place',
    },
    {
      order_id: 7999,
      order_state: 'Canceled',
      booking_date_start: '2026-08-15T04:00:00.000Z',
      date_created: '2026-08-15T03:00:00.000Z',
      total_price: 0,
      booking_note: 'Khách bận đổi lịch',
      client_store_id: 6,
      is_debt: 0,
      order_assigned_staff_id: 14001,
      branch_name: 'De Tham',
    },
  ],
  payments: [
    {
      order_id: 8002,
      paid_cash_amount: 0,
      paid_credit_card_amount: 0,
      paid_bank_transfer_amount: 0,
      paid_credit_amount: 100,
      discount_amount: 660000,
      prepaid_amount: 0,
      debt_amount: 0,
      tip_amount: 0,
    },
    {
      order_id: 8001,
      paid_cash_amount: 0,
      paid_credit_card_amount: 712800,
      paid_bank_transfer_amount: 0,
      paid_credit_amount: 0,
      discount_amount: 0,
      prepaid_amount: 0,
      debt_amount: 0,
      tip_amount: 50000,
    },
  ],
  services: [
    {
      order_id: 9001,
      service_id: 101,
      service_type: 'Normal',
      user_service_type: 'Normal',
      user_service_balance_transaction_id: null,
      total_price: 770000,
      assigned_staff_id: 0,
      check_in_staff_id: null,
      check_out_staff_id: null,
      service_name: 'Hyperlight 770',
      assigned_staff_name: null,
      assigned_staff_avatar: null,
      check_in_staff_name: null,
      check_in_staff_avatar: null,
      check_out_staff_name: null,
      check_out_staff_avatar: null,
    },
    {
      order_id: 8002,
      service_id: 101,
      service_type: 'Retain',
      user_service_type: 'COMBO',
      user_service_balance_transaction_id: 555,
      total_price: 770000,
      assigned_staff_id: 13783,
      check_in_staff_id: 13783,
      check_out_staff_id: 13783,
      service_name: 'Hyperlight 770 (Combo)',
      assigned_staff_name: 'Minh Anh',
      assigned_staff_avatar: null,
      check_in_staff_name: 'Minh Anh',
      check_in_staff_avatar: null,
      check_out_staff_name: 'Minh Anh',
      check_out_staff_avatar: null,
    },
    {
      order_id: 8001,
      service_id: 202,
      service_type: 'FIX',
      user_service_type: 'FIX',
      user_service_balance_transaction_id: null,
      total_price: 712800,
      assigned_staff_id: 14001,
      check_in_staff_id: null,
      check_out_staff_id: 14001,
      service_name: 'Fix dặm mi cao cấp',
      assigned_staff_name: 'Thảo Vy',
      assigned_staff_avatar: null,
      check_in_staff_name: null,
      check_in_staff_avatar: null,
      check_out_staff_name: 'Thảo Vy',
      check_out_staff_avatar: null,
    },
  ],
  diamondTxns: [
    {
      id: 7002,
      amount: -100,
      balance: 150,
      description: 'Đổi 100 KC trừ hóa đơn',
      method: 'SPEND',
      tracking_key: JSON.stringify({ order_id: 8002 }),
      date_created: '2026-10-07T08:00:00.000Z',
    },
    {
      id: 7001,
      amount: 10,
      balance: 250,
      description: 'Tích lũy hoàn thành đơn #8001',
      method: 'EARN',
      tracking_key: JSON.stringify({ order_id: 8001 }),
      date_created: '2026-09-10T05:00:00.000Z',
    },
  ],
};

test('Customer history formatter helpers compute VN days-ago label and status tone accurately', () => {
  const now = new Date('2026-11-16T04:00:00.000Z');
  assert.equal(formatDaysAgoLabel('2026-11-16', now), 'Hôm Nay');
  assert.equal(formatDaysAgoLabel('2026-10-07', now), '40 ngày trước');
  assert.equal(mapOrderStateDisplay('Completed').statusTone, 'completed');
  assert.equal(mapOrderStateDisplay('Canceled').statusTone, 'canceled');
  assert.equal(mapOrderStateDisplay('CheckIn').statusTone, 'servicing');
});

test('GET customer history blocks unauthorized non-iOS roles with 403', async () => {
  const blockedActor: IosAuthContext = { id: 99, role: 'telesale', legacyStaffId: 999 };
  const result = await getIosCustomerHistory(
    blockedActor,
    33732,
    {},
    { getPool: () => createMockPool(SAMPLE_MOCK_DB) }
  );
  assert.equal(result.statusCode, 403);
  assert.equal(result.payload.success, false);
});

test('Admin receives unmasked phone, complete visits, spending summary, fix visits, and diamond rewards', async () => {
  const adminActor: IosAuthContext = {
    id: 1,
    legacyStaffId: 13783,
    role: 'super_admin',
    careerTier: 'ADMIN',
  };
  const result = await getIosCustomerHistory(
    adminActor,
    33732,
    { bookingId: 9001, now: new Date('2026-11-16T07:00:00.000Z') },
    { getPool: () => createMockPool(SAMPLE_MOCK_DB) }
  );

  assert.equal(result.statusCode, 200);
  assert.equal(result.payload.success, true);
  assert.equal(result.payload.customerName, 'Thanh');
  assert.equal(result.payload.customerPhone, '0933936746');
  assert.equal(result.payload.summary.totalSpent, 712800);
  assert.equal(result.payload.summary.completedVisits, 2);
  assert.equal(result.payload.summary.totalBookings, 4);
  assert.equal(result.payload.summary.canceledBookings, 1);
  assert.equal(result.payload.summary.fixCount, 1);
  assert.equal(result.payload.summary.avgSpendPerVisit, 356400);
  assert.equal(result.payload.summary.diamondBalance, 150);
  assert.equal(result.payload.visits.length, 4);
  assert.equal(result.payload.payments.length, 2);
  assert.equal(result.payload.fixVisits.length, 1);
  assert.equal(result.payload.diamondTransactions.length, 2);
  assert.equal(result.payload.visits[0].daysAgoLabel, 'Hôm Nay');
  assert.equal(result.payload.visits[1].paymentMethodLabel, 'Trừ Combo / Ưu đãi');
});

test('CVL privacy guard masks phone, allows Đầu tua or own served customer, and blocks other staff customers', async () => {
  const pool = createMockPool({
    ...SAMPLE_MOCK_DB,
    orders: [
      {
        order_id: 8500,
        order_state: 'New',
        booking_date_start: '2026-11-16T06:00:00.000Z',
        date_created: '2026-11-16T05:00:00.000Z',
        total_price: 770000,
        booking_note: null,
        client_store_id: 6,
        is_debt: 0,
        order_assigned_staff_id: 14001,
        branch_name: 'De Tham',
      },
    ],
    services: [
      {
        order_id: 8500,
        service_id: 101,
        service_type: 'Normal',
        user_service_type: 'Normal',
        user_service_balance_transaction_id: null,
        total_price: 770000,
        assigned_staff_id: 14001,
        check_in_staff_id: null,
        check_out_staff_id: null,
        service_name: 'Hyperlight 770',
      },
    ],
  });

  const cvlActor: IosAuthContext = {
    id: 22,
    legacyStaffId: 13783,
    role: 'cvl',
    careerTier: 'CVL',
  };

  // Blocked when customer belongs strictly to staff 14001
  const blockedRes = await getIosCustomerHistory(cvlActor, 33732, { bookingId: 8500 }, { getPool: () => pool });
  assert.equal(blockedRes.statusCode, 403);

  // Allowed when consulting unassigned Đầu tua booking #9001 with masked phone
  const allowedRes = await getIosCustomerHistory(
    cvlActor,
    33732,
    { bookingId: 9001 },
    { getPool: () => createMockPool(SAMPLE_MOCK_DB) }
  );
  assert.equal(allowedRes.statusCode, 200);
  assert.notEqual(allowedRes.payload.customerPhone, '0933936746');
  assert.ok(allowedRes.payload.customerPhone.includes('*'));
});

test('Merges archived report_order & report_order_service lifetime history and tolerates secondary query failure', async () => {
  const adminActor: IosAuthContext = {
    id: 1,
    legacyStaffId: 13783,
    role: 'super_admin',
    careerTier: 'ADMIN',
  };

  const pool = createMockPool({
    ...SAMPLE_MOCK_DB,
    throwOnComboQuery: true,
    reportOrders: [
      {
        order_id: 6100,
        order_state: 'Completed',
        booking_date_start: '2025-05-16T06:30:00.000Z',
        date_created: '2025-05-16T06:30:00.000Z',
        total_price: 660000,
        booking_note: null,
        client_store_id: 6,
        is_debt: 0,
        order_assigned_staff_id: 0,
        branch_name: 'De Tham',
        paid_cash_amount: 612800,
        paid_credit_card_amount: 0,
        paid_bank_transfer_amount: 0,
        paid_credit_amount: 100,
        discount_amount: 100000,
        prepaid_amount: 0,
        debt_amount: 0,
        tip_amount: 0,
      },
    ],
    reportServices: [
      {
        os_id: 77100,
        order_id: 6100,
        service_id: 55,
        service_group: 'Lashes',
        attribute_group_key: null,
        service_type: 'Normal',
        user_service_type: 'Normal',
        user_service_balance_transaction_id: null,
        total_price: 660000,
        assigned_staff_id: 14002,
        check_in_staff_id: 14003,
        check_out_staff_id: null,
        service_name: 'Ultralight 660 - Normal',
        assigned_staff_name: 'Diễm Hương',
        assigned_staff_avatar: null,
        check_in_staff_name: 'Mi Na',
        check_in_staff_avatar: null,
        check_out_staff_name: null,
        check_out_staff_avatar: null,
      },
    ],
  });

  const result = await getIosCustomerHistory(
    adminActor,
    33732,
    { bookingId: 9001, now: new Date('2026-11-16T07:00:00.000Z') },
    { getPool: () => pool }
  );

  assert.equal(result.statusCode, 200);
  assert.equal(result.payload.success, true);
  assert.equal(result.payload.visits.length, 5);
  assert.equal(result.payload.summary.completedVisits, 3);
  assert.equal(result.payload.summary.totalSpent, 712800 + 612800);
  const archivedVisit = result.payload.visits.find((v) => v.orderId === 6100);
  assert.ok(archivedVisit);
  assert.equal(archivedVisit.serviceName, 'Ultralight 660 - Normal');
  assert.equal(archivedVisit.paidAmount, 612800);
  assert.equal(archivedVisit.paymentMethodLabel, 'Tiền mặt');
  assert.deepEqual(archivedVisit.staffNames, ['Diễm Hương', 'Mi Na']);
});

test('MOS-FEAT-249: attaches order_note CC consultant note only to completed visits', async () => {
  const ccActor: IosAuthContext = {
    id: 38,
    legacyStaffId: 38,
    role: 'consultant',
    careerTier: 'CC',
  };

  const pool = createMockPool({
    ...SAMPLE_MOCK_DB,
    orderCcNotes: [
      {
        order_id: 8002,
        note: '💎150\nCb 3r\n-MD: chị không làm, đổi qua sauna\n-CB: 1n 1/10/24',
        date_created: '2026-10-07T08:15:00.000Z',
        staff_name: 'Nguyễn Quang Khải',
      },
      {
        order_id: 9001,
        note: 'Note nháp chưa done không được hiển thị',
        date_created: '2026-11-16T05:30:00.000Z',
        staff_name: 'Nguyễn Quang Khải',
      },
    ],
  });

  const result = await getIosCustomerHistory(
    ccActor,
    33732,
    { bookingId: 9001, now: new Date('2026-11-16T07:00:00.000Z') },
    { getPool: () => pool }
  );

  assert.equal(result.statusCode, 200);
  const completedVisit = result.payload.visits.find((v) => v.orderId === 8002);
  const upcomingVisit = result.payload.visits.find((v) => v.orderId === 9001);
  assert.equal(
    completedVisit?.ccNote,
    '💎150\nCb 3r\n-MD: chị không làm, đổi qua sauna\n-CB: 1n 1/10/24'
  );
  assert.equal(completedVisit?.ccNoteStaffName, 'Nguyễn Quang Khải');
  assert.equal(upcomingVisit?.ccNote, null);
});
