import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmptyCustomerEnrichmentContext,
  RawIosOrderSnapshot,
  resolveCustomerVisitNumber,
} from './services/ios-bookings-sql.service.js';
import { enrichCustomerComboMapsFromRows } from './services/ios-customer-enrichment.service.js';
import { mapLiveOrdersToBookings } from './services/ios-bookings-mapper.service.js';

function createBaseOrder(partial: Partial<RawIosOrderSnapshot> = {}): RawIosOrderSnapshot {
  return {
    id: 806834,
    order_number: '806834',
    order_state: 'Confirmed',
    booking_date_start: '2026-11-13T15:00:00',
    booking_duration_minute: 90,
    total_price: 770000,
    client_store_id: 6,
    booking_note: '9/ 11 chị book, AM 50% tặng 3 chị đi',
    user_id: 50123,
    combo_sale_required: 0,
    is_new: 0,
    promotion_id: null,
    customer_name: 'Ngoan',
    customer_phone: '0909123456',
    customer_avatar: null,
    booker_name: 'Tâm Nguyễn',
    booker_avatar: null,
    service_name: 'Any - Lashes',
    service_key: 'any-lashes',
    is_temporary: 1,
    service_type: 'Normal',
    staff_name: 'Khanh Cao',
    staff_avatar: null,
    assigned_staff_id: 13783,
    booked_staff_id: 13783,
    check_in_staff_id: null,
    check_out_staff_id: null,
    check_in_staff_name: null,
    check_in_staff_avatar: null,
    check_out_staff_name: null,
    check_out_staff_avatar: null,
    total_visits: 3,
    ...partial,
  };
}

test('Any - Lashes temporary order for Classic 1D 70 customer never falls back to New Flawless Mink 770', () => {
  const ctx = createEmptyCustomerEnrichmentContext();
  ctx.lastVisitSpecsMap.set(50123, {
    serviceKey: 'new-classic-440',
    material: 'New Classic',
    volume: '1D',
    count: '70 sợi',
  });
  ctx.lashHistoryMap.set(50123, [{ date: '05/09/2026', serviceName: 'Any - Lashes', staffName: 'Khanh Cao' }]);

  const [mapped] = mapLiveOrdersToBookings({
    orders: [createBaseOrder()],
    customerContext: ctx,
    overrides: {},
    customerAvatarMap: {},
    storeId: 6,
    targetDate: '2026-11-13',
    todayVn: '2026-11-13',
    activeStaffId: 13783,
    canViewFullPhone: true,
  });

  assert.equal(mapped.serviceName, 'New Classic 1D 440');
  assert.equal(mapped.attributes?.material, 'New Classic');
  assert.equal(mapped.attributes?.volume, '1D');
  assert.equal(mapped.attributes?.count, '70 sợi');
});

test('Temporary order preserves valid customerHistory and consultation override.serviceName', () => {
  const ctx = createEmptyCustomerEnrichmentContext();
  ctx.lashHistoryMap.set(50123, [{ date: '05/09/2026', serviceName: 'New Classic 440', staffName: 'Khanh Cao' }]);
  ctx.lastVisitSpecsMap.set(50123, {
    serviceKey: 'new-classic-440',
    material: 'New Classic',
    volume: '1D',
    count: '70 sợi',
  });

  const [fromHistory] = mapLiveOrdersToBookings({
    orders: [createBaseOrder()],
    customerContext: ctx,
    overrides: {},
    customerAvatarMap: {},
    storeId: 6,
    targetDate: '2026-11-13',
    todayVn: '2026-11-13',
    activeStaffId: 13783,
    canViewFullPhone: true,
  });
  assert.equal(fromHistory.serviceName, 'New Classic 440');

  const [fromOverride] = mapLiveOrdersToBookings({
    orders: [createBaseOrder()],
    customerContext: ctx,
    overrides: {
      '806834': { serviceName: 'New Classic 1D 440K (70 sợi)' },
    },
    customerAvatarMap: {},
    storeId: 6,
    targetDate: '2026-11-13',
    todayVn: '2026-11-13',
    activeStaffId: 13783,
    canViewFullPhone: true,
  });
  assert.equal(fromOverride.serviceName, 'New Classic 1D 440K (70 sợi)');
});

test('Concrete booked SKU does not mix cross-family lastVisitSpecs attributes', () => {
  const ctx = createEmptyCustomerEnrichmentContext();
  ctx.lastVisitSpecsMap.set(50123, {
    serviceKey: 'new-classic-440',
    material: 'New Classic',
    volume: '1D',
    count: '70 sợi',
  });

  const [mapped] = mapLiveOrdersToBookings({
    orders: [
      createBaseOrder({
        service_name: 'New Flawless Mink 770',
        service_key: 'new-flawless-mink-770',
        is_temporary: 0,
      }),
    ],
    customerContext: ctx,
    overrides: {},
    customerAvatarMap: {},
    storeId: 6,
    targetDate: '2026-11-13',
    todayVn: '2026-11-13',
    activeStaffId: 13783,
    canViewFullPhone: true,
  });

  assert.equal(mapped.serviceName, 'New Flawless Mink 770');
  assert.equal(mapped.attributes?.material, 'Flawless Mink');
  assert.equal(mapped.attributes?.volume, '1D');
  assert.equal(mapped.attributes?.count, '60 sợi');
});

test('resolveCustomerVisitNumber counts full lifetime report_order history and next-visit index accurately', () => {
  // Minh Hằng (user_id=40254): 10 historical completed visits in report_order (>6 months ago), today order_state='New'
  assert.equal(
    resolveCustomerVisitNumber({
      completedOrdersCount: 10,
      maxReportOrderNumber: 10,
      orderState: 'New',
      isNew: 0,
      hasPriorOrderBooking: true,
    }),
    11
  );

  // 2nd-time returning client (1 completed past order + today 'New' -> Lần 2, never Lần 1)
  assert.equal(
    resolveCustomerVisitNumber({
      completedOrdersCount: 1,
      maxReportOrderNumber: 1,
      orderState: 'New',
      isNew: 0,
      hasPriorOrderBooking: true,
    }),
    2
  );

  // Already Completed order today is already included inside completedOrdersCount (no double +1)
  assert.equal(
    resolveCustomerVisitNumber({
      completedOrdersCount: 2,
      maxReportOrderNumber: 2,
      orderState: 'Completed',
      isNew: 0,
      hasPriorOrderBooking: true,
    }),
    2
  );

  // Brand-new 1st-visit client before and after checkout stays Lần 1
  assert.equal(
    resolveCustomerVisitNumber({
      completedOrdersCount: 0,
      maxReportOrderNumber: 0,
      orderState: 'New',
      isNew: 1,
      hasPriorOrderBooking: false,
    }),
    1
  );
  assert.equal(
    resolveCustomerVisitNumber({
      completedOrdersCount: 1,
      maxReportOrderNumber: 1,
      orderState: 'Completed',
      isNew: 1,
      hasPriorOrderBooking: true,
    }),
    1
  );

  // Legacy safety floor: is_new=0 with prior order booking never falls back to Lần 1
  assert.equal(
    resolveCustomerVisitNumber({
      completedOrdersCount: 0,
      maxReportOrderNumber: 0,
      orderState: 'New',
      isNew: 0,
      hasPriorOrderBooking: true,
    }),
    2
  );
});

test('mapLiveOrdersToBookings protects returning clients from Lần 1 / first-visit icon and preserves prior lastVisitDate', () => {
  const ctx = createEmptyCustomerEnrichmentContext();
  ctx.lashHistoryMap.set(40254, [
    { date: '13/11/2026', serviceName: 'New Flawless Mink 880', staffName: 'Trang Vũ' },
    { date: '22/01/2025', serviceName: 'New Flawless Mink 880', staffName: 'Trang Vũ' },
  ]);

  const [minhHang] = mapLiveOrdersToBookings({
    orders: [
      createBaseOrder({
        id: 336925,
        user_id: 40254,
        customer_name: 'Minh Hằng',
        booking_note: '5/11 c nói để chị xem rảnh chị qua',
        booking_date_start: '2026-11-13T11:00:00',
        service_name: 'New Flawless Mink 880',
        service_key: 'new-flawless.mink-880',
        is_temporary: 0,
        is_new: 0,
        total_visits: 11,
      }),
    ],
    customerContext: ctx,
    overrides: {},
    customerAvatarMap: {},
    storeId: 6,
    targetDate: '2026-11-13',
    todayVn: '2026-11-13',
    activeStaffId: 13783,
    canViewFullPhone: false,
  });

  assert.equal(minhHang.customerVisits, 11);
  assert.equal(minhHang.customerTypeIcon, '🔄');
  assert.equal(minhHang.lastVisitDate, '22/01/2025');
  assert.equal(minhHang.attributes?.isNewClientDiagnosticDone, undefined);

  // Safety floor when raw total_visits is 0/1 but is_new=0 and prior lashHistory exists
  const [fallbackReturning] = mapLiveOrdersToBookings({
    orders: [
      createBaseOrder({
        id: 336926,
        user_id: 40254,
        customer_name: 'Minh Hằng',
        booking_note: '',
        is_new: 0,
        total_visits: 0,
      }),
    ],
    customerContext: ctx,
    overrides: {},
    customerAvatarMap: {},
    storeId: 6,
    targetDate: '2026-11-13',
    todayVn: '2026-11-13',
    activeStaffId: 13783,
    canViewFullPhone: false,
  });
  assert.equal(fallbackReturning.customerVisits, 2);
  assert.equal(fallbackReturning.customerTypeIcon, '🔄');
});

test('enrichCustomerComboMapsFromRows classifies Flawless Under Mink 390 (new-flawless.mink-390) as under combo', () => {
  const ctx = createEmptyCustomerEnrichmentContext();
  enrichCustomerComboMapsFromRows({
    ctx,
    upperRows: [
      {
        id: 83187,
        user_id: 12885,
        normal_remaining: 1,
        retain_remaining: 9,
        remaining_sessions: 10,
        date_expired: '2027-09-14',
        combo_name: 'New Hyperlight 660',
        service_key: 'new-hyperlight-660',
        package_key: 'combo-10-6',
      },
      {
        id: 82652,
        user_id: 12885,
        normal_remaining: 3,
        retain_remaining: 0,
        remaining_sessions: 3,
        date_expired: '2027-02-15',
        combo_name: 'New Flawless Under Mink 390',
        service_key: 'new-flawless.mink-390',
        package_key: 'combo-4-2',
        note: 'CS cập nhật note Cc',
      },
    ],
    underRows: [],
    todayYmd: '2026-11-13',
  });

  const wallets = ctx.comboWalletsMap.get(12885) || [];
  assert.equal(wallets.length, 2);
  assert.equal(wallets[0].serviceGroup, 'upper');
  assert.equal(wallets[1].serviceGroup, 'under');
  assert.equal(ctx.underMinkComboMap.get(12885)?.hasUnderCombo, true);
  assert.equal(ctx.underMinkComboMap.get(12885)?.remainingSessions, 3);
});
