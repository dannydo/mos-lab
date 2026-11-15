import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { SafeAny } from '@mos-lab/shared';
import { INITIAL_BOOKINGS } from './mock-data.js';
import { executeIosBookingAction } from './services/ios-actions.service.js';
import { IosAuthContext } from './services/ios-auth.service.js';
import { createEmptyCustomerEnrichmentContext, RawIosOrderSnapshot } from './services/ios-bookings-sql.service.js';
import { mapLiveOrdersToBookings } from './services/ios-bookings-mapper.service.js';
import { LegacyOrderCatalogSnapshot } from './services/ios-legacy-payload.mapper.js';
import { createInMemoryConfigStore, createOverrideRepository } from './services/ios-overrides.service.js';

const COMPLETE_ATTRS = {
  naturalLashLength: '9-10mm',
  naturalLashThickness: 'Mỏng vừa',
  naturalLashCount: 'Trung bình',
  naturalLashDensity: 'Trung bình',
  lashTrail: 'Hơi xuống',
  eyeShape: 'Mắt 2 mí',
  lashHealth: 'Khỏe',
  medicalProblem: 'Không có',
  isNewClientDiagnosticDone: true,
};

function createCatalogSnapshot(overrides: Partial<LegacyOrderCatalogSnapshot> = {}): LegacyOrderCatalogSnapshot {
  return {
    orderExists: true,
    orderId: 140282,
    customerUserId: 88991,
    clientStoreId: 6,
    currentOrderState: 'Confirmed',
    promotionId: null,
    userUrlId: null,
    existingOrderServiceIds: [501001],
    upperService: {
      serviceId: 115,
      serviceGroup: 'LashesTop',
      singlePriceId: 1150,
      singlePriceAmount: 770000,
      balancePriceId: 1159,
      staffSurveySetId: 3,
      customerSurveySetId: 4,
    },
    products: [],
    staffFiveStarSurveyAnswers: {
      '6': [{ survey_answer_id: '24', survey_answer: '5' }],
    },
    customerHappySurveyAnswers: {},
    ...overrides,
  };
}

function createBridgeHarness(
  initialState: string = 'Confirmed',
  catalogOverrides: Partial<LegacyOrderCatalogSnapshot> = {}
) {
  const phpCalls: Array<{ endpoint: string; payload: Record<string, SafeAny> }> = [];
  let currentLegacyState = initialState;

  const setLegacyState = (next: string) => {
    currentLegacyState = next;
  };

  const deps = {
    getPool: () => ({}) as mysql.Pool,
    resolveCatalog: async (_pool: mysql.Pool, orderId: number) =>
      createCatalogSnapshot({
        orderId,
        currentOrderState: currentLegacyState,
        ...catalogOverrides,
      }),
    resolveAuthToken: async () => ({ authUserId: 3879, loginToken: 'tok-live-step' }),
    waitNextSecond: async () => {},
    callEndpoint: async (endpoint: string, payload: Record<string, SafeAny>) => {
      phpCalls.push({ endpoint, payload });
      if (endpoint === '/order/booking/check-in') currentLegacyState = 'CheckIn';
      if (endpoint === '/order/booking/consultation' && payload.assigned_staff_id) {
        currentLegacyState = 'Consultation';
      }
      if (endpoint === '/order/service/progress/update') {
        currentLegacyState = String(payload.service_state || currentLegacyState);
      }
      if (endpoint === '/order/service/done') currentLegacyState = 'ServiceCompleted';
      if (endpoint === '/order/booking/check-out/product') currentLegacyState = 'CheckOut';
      if (endpoint === '/order/booking/update/incoming') currentLegacyState = 'Confirmed';
      return { ok: true, status: '1', code: '0000', message: 'OK' };
    },
  };

  return { phpCalls, deps, setLegacyState };
}

const cvlActor: IosAuthContext = {
  id: 11,
  legacyStaffId: 46272,
  displayName: 'Thao Ly',
  role: 'cvl',
  careerTier: 'CVL',
};

const ccActor: IosAuthContext = {
  id: 12,
  legacyStaffId: 37790,
  displayName: 'Diem Huong',
  role: 'cc',
  careerTier: 'CC',
};

test('Live CHECK_IN: CVL self-assigns while CC unassigned Dau tua omits assigned_staff_id and preserves DB sync', async () => {
  const store = createInMemoryConfigStore();
  const repo = createOverrideRepository(store);

  const cvlHarness = createBridgeHarness('Confirmed');
  const cvlRes = await executeIosBookingAction(
    cvlActor,
    { bookingId: 140282, customerId: 88991, action: 'CHECK_IN' },
    repo,
    cvlHarness.deps
  );

  assert.equal(cvlRes.statusCode, 200);
  assert.equal(cvlRes.payload.legacyStepSyncStatus, 'SYNCED');
  assert.equal(cvlRes.payload.override.legacySyncedOrderState, 'CheckIn');
  assert.equal(cvlHarness.phpCalls.length, 1);
  assert.equal(cvlHarness.phpCalls[0].endpoint, '/order/booking/check-in');
  assert.equal(cvlHarness.phpCalls[0].payload.modify_staff_id, '46272');
  assert.equal(cvlHarness.phpCalls[0].payload.selected_service[0].assigned_staff_id, '46272');

  const ccHarness = createBridgeHarness('Parking');
  const ccRes = await executeIosBookingAction(
    ccActor,
    { bookingId: 140283, customerId: 88992, action: 'CHECK_IN' },
    repo,
    ccHarness.deps
  );

  assert.equal(ccRes.statusCode, 200);
  assert.equal(ccRes.payload.legacyStepSyncStatus, 'SYNCED');
  assert.equal(ccRes.payload.override.assignedStaffId, 0);
  assert.equal(ccHarness.phpCalls.length, 1);
  assert.equal(ccHarness.phpCalls[0].endpoint, '/order/booking/check-in');
  assert.equal(ccHarness.phpCalls[0].payload.modify_staff_id, '37790');
  assert.equal('assigned_staff_id' in ccHarness.phpCalls[0].payload.selected_service[0], false);

  const dbAssignedAfterLegacyApp: RawIosOrderSnapshot = {
    id: 140283,
    order_number: '140283',
    order_state: 'CheckIn',
    booking_date_start: '2026-11-15T11:00:00',
    booking_duration_minute: 90,
    total_price: 770000,
    client_store_id: 6,
    booking_note: '',
    user_id: 88992,
    combo_sale_required: 0,
    is_new: 0,
    promotion_id: null,
    customer_name: 'Ngoc Pham',
    customer_phone: '0909111222',
    customer_avatar: null,
    booker_name: 'CS',
    booker_avatar: null,
    service_name: 'HyperLight 4X 770',
    service_key: 'new-hyperlight-770',
    is_temporary: 0,
    service_type: 'Normal',
    staff_name: 'Tuyet',
    staff_avatar: null,
    assigned_staff_id: 744,
    booked_staff_id: null,
    check_in_staff_id: 37790,
    check_out_staff_id: null,
    check_in_staff_name: 'Diem Huong',
    check_in_staff_avatar: null,
    check_out_staff_name: null,
    check_out_staff_avatar: null,
    total_visits: 10,
  };

  const [mapped] = mapLiveOrdersToBookings({
    orders: [dbAssignedAfterLegacyApp],
    customerContext: createEmptyCustomerEnrichmentContext(),
    overrides: { '140283': ccRes.payload.override },
    customerAvatarMap: {},
    storeId: 6,
    targetDate: '2026-11-15',
    todayVn: '2026-11-15',
    activeStaffId: 37790,
    canViewFullPhone: true,
  });

  assert.equal(mapped.assignedStaffId, 744);
  assert.equal(mapped.assignedStaffName, 'Tuyet');
});

test('1-tap Quick Check-in Combo Live runs check-in then consultation immediately from Confirmed', async () => {
  const store = createInMemoryConfigStore();
  const repo = createOverrideRepository(store);
  const harness = createBridgeHarness('Confirmed');

  const res = await executeIosBookingAction(
    cvlActor,
    {
      bookingId: 140290,
      customerId: 771121,
      action: 'SAVE_CONSULTATION',
      attributes: COMPLETE_ATTRS,
      comboRedemption: { redeemSession: true, deductMode: 'NORMAL' },
      skuPricing: { skuName: 'Classic 1D 550', skuPrice: 550000, serviceType: 'Normal' },
    },
    repo,
    harness.deps
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.legacyStepSyncStatus, 'SYNCED');
  assert.equal(res.payload.override.legacySyncedOrderState, 'Consultation');
  assert.deepEqual(
    harness.phpCalls.map((c) => c.endpoint),
    ['/order/booking/check-in', '/order/booking/consultation']
  );
  assert.equal(harness.phpCalls[1].payload.assigned_staff_id, '46272');
});

test('ASSIGN_OTHER consultation keeps CheckIn without assigned_staff until ASSIGN_STAFF supplies technician', async () => {
  const store = createInMemoryConfigStore();
  const repo = createOverrideRepository(store);
  const harness = createBridgeHarness('CheckIn');

  const consultRes = await executeIosBookingAction(
    ccActor,
    {
      bookingId: 140291,
      customerId: 771122,
      action: 'SAVE_CONSULTATION',
      assignmentMode: 'ASSIGN_OTHER',
      attributes: COMPLETE_ATTRS,
      skuPricing: { skuName: 'HyperLight 4X 770', skuPrice: 770000, serviceType: 'Normal' },
    },
    repo,
    harness.deps
  );

  assert.equal(consultRes.statusCode, 200);
  assert.equal(consultRes.payload.legacyStepSyncStatus, 'SYNCED');
  assert.equal(consultRes.payload.override.legacySyncedOrderState, 'CheckIn');
  assert.equal(harness.phpCalls.length, 1);
  assert.equal(harness.phpCalls[0].endpoint, '/order/booking/consultation');
  assert.equal('assigned_staff' in harness.phpCalls[0].payload, false);
  assert.equal('assigned_staff_id' in harness.phpCalls[0].payload, false);
  assert.equal('assigned_staff_id' in harness.phpCalls[0].payload.selected_service[0], false);

  const assignRes = await executeIosBookingAction(
    ccActor,
    {
      bookingId: 140291,
      action: 'ASSIGN_STAFF',
      assignedStaffId: 46272,
      assignedStaffName: 'Thao Ly',
      assignedBed: 'Giuong 02',
    },
    repo,
    harness.deps
  );

  assert.equal(assignRes.statusCode, 200);
  assert.equal(assignRes.payload.legacyStepSyncStatus, 'SYNCED');
  assert.equal(assignRes.payload.override.legacySyncedOrderState, 'Consultation');
  assert.equal(harness.phpCalls.length, 2);
  assert.equal(harness.phpCalls[1].endpoint, '/order/booking/consultation');
  assert.equal(harness.phpCalls[1].payload.assigned_staff_id, '46272');
  assert.deepEqual(harness.phpCalls[1].payload.assigned_staff, [{ user_id: '46272' }]);
});

test('Full Live lifecycle syncs progress (with dedupe), service/done, upsell checkout, and REVERT_TO_INCOMING', async () => {
  const store = createInMemoryConfigStore();
  const repo = createOverrideRepository(store);
  const harness = createBridgeHarness('Consultation', {
    products: [
      {
        productId: 42,
        inventoryWarehouseItemId: 8001,
        firstInventoryWarehouseOrderItemId: 9001,
        unitPrice: 1100000,
        quantity: 1,
        discountAmount: 0,
      },
    ],
  });

  await executeIosBookingAction(
    cvlActor,
    { bookingId: 140292, customerId: 88991, action: 'SAVE_CONSULTATION', attributes: COMPLETE_ATTRS },
    repo,
    harness.deps
  );
  harness.phpCalls.length = 0;

  const startRes = await executeIosBookingAction(
    cvlActor,
    { bookingId: 140292, action: 'START_SERVICE' },
    repo,
    harness.deps
  );
  assert.equal(startRes.payload.legacyStepSyncStatus, 'SYNCED');
  assert.equal(startRes.payload.override.progress.lastLegacyProgressState, 'ServiceStart');
  assert.equal(harness.phpCalls.length, 1);
  assert.equal(harness.phpCalls[0].endpoint, '/order/service/progress/update');
  assert.equal(harness.phpCalls[0].payload.service_state, 'ServiceStart');

  // Repeat same state (e.g. photo autosave) -> deduplicated, 0 PHP calls
  const dupRes = await executeIosBookingAction(
    cvlActor,
    {
      bookingId: 140292,
      action: 'UPDATE_PROGRESS',
      orderState: 'Service Start',
      progress: { beforePhotoUrl: 'https://cdn.wingslashes.com/before.jpg' },
    },
    repo,
    harness.deps
  );
  assert.equal(dupRes.payload.legacyStepSyncStatus, 'SKIPPED');
  assert.equal(harness.phpCalls.length, 1);

  const cleanedRes = await executeIosBookingAction(
    cvlActor,
    { bookingId: 140292, action: 'UPDATE_PROGRESS', orderState: 'Service Cleaned', progress: {} },
    repo,
    harness.deps
  );
  assert.equal(cleanedRes.payload.legacyStepSyncStatus, 'SYNCED');
  assert.equal(cleanedRes.payload.override.progress.lastLegacyProgressState, 'ServiceCleaned');
  assert.equal(harness.phpCalls[1].payload.service_state, 'ServiceCleaned');

  const surveyRes = await executeIosBookingAction(
    cvlActor,
    { bookingId: 140292, action: 'COMPLETE_SURVEY', survey: { rating: 5 } },
    repo,
    harness.deps
  );
  assert.equal(surveyRes.payload.legacyStepSyncStatus, 'SYNCED');
  assert.deepEqual(
    harness.phpCalls.slice(2).map((c) => c.endpoint),
    ['/order/service/done', '/order/survey/staff/update']
  );

  const checkoutRes = await executeIosBookingAction(
    ccActor,
    {
      bookingId: 140292,
      action: 'SAVE_UPSELL_AND_CHECKOUT',
      cartProducts: [{ productId: 42, productName: 'Yeppeum Serum', price: 1100000, quantity: 1 }],
    },
    repo,
    harness.deps
  );
  assert.equal(checkoutRes.payload.legacyStepSyncStatus, 'SYNCED');
  assert.equal(checkoutRes.payload.override.legacySyncedOrderState, 'CheckOut');
  assert.deepEqual(
    harness.phpCalls.slice(4).map((c) => c.endpoint),
    ['/order/product/update', '/order/survey/customer/done', '/order/booking/check-out/product']
  );

  const revertRes = await executeIosBookingAction(
    ccActor,
    { bookingId: 140292, action: 'REVERT_TO_INCOMING' },
    repo,
    harness.deps
  );
  assert.equal(revertRes.payload.legacyStepSyncStatus, 'SYNCED');
  assert.equal(revertRes.payload.override.status, 'INCOMING');
  assert.equal(revertRes.payload.override.legacySyncedOrderState, 'Confirmed');
  assert.equal(harness.phpCalls[7].endpoint, '/order/booking/update/incoming');
  assert.equal(harness.phpCalls[7].payload.order_service_index, '0');
});

test('Simulation Mode & Demo Mode bookings trigger zero Legacy PHP requests at every step', async () => {
  const store = createInMemoryConfigStore();
  const repo = createOverrideRepository(store);
  const harness = createBridgeHarness('Confirmed');

  for (const [action, extra] of [
    ['CHECK_IN', {}],
    ['SAVE_CONSULTATION', { attributes: COMPLETE_ATTRS }],
    ['START_SERVICE', {}],
    ['COMPLETE_SURVEY', { survey: { rating: 5 } }],
    ['SAVE_UPSELL_AND_CHECKOUT', {}],
    ['REVERT_TO_INCOMING', {}],
  ] as const) {
    await executeIosBookingAction(
      cvlActor,
      { bookingId: 140295, customerId: 88991, action, ...extra },
      repo,
      harness.deps,
      { simulationMode: true }
    );
  }
  assert.equal(harness.phpCalls.length, 0);

  await executeIosBookingAction(
    cvlActor,
    { bookingId: INITIAL_BOOKINGS[0].id, customerId: 771121, action: 'CHECK_IN' },
    repo,
    harness.deps
  );
  await executeIosBookingAction(
    cvlActor,
    { bookingId: 140296, customerId: 771121, action: 'CHECK_IN', demoMode: true },
    repo,
    harness.deps
  );
  await executeIosBookingAction(
    cvlActor,
    { bookingId: 900000001, customerId: 771121, action: 'CHECK_IN' },
    repo,
    harness.deps
  );
  assert.equal(harness.phpCalls.length, 0);
});

test('Graceful non-blocking fallback marks legacyStepSyncStatus as DEFERRED and still returns 200', async () => {
  const store = createInMemoryConfigStore();
  const repo = createOverrideRepository(store);
  const failingDeps = {
    ...createBridgeHarness('Confirmed').deps,
    callEndpoint: async () => {
      throw new Error('Legacy PHP timeout');
    },
  };

  const res = await executeIosBookingAction(
    cvlActor,
    { bookingId: 140299, customerId: 88991, action: 'CHECK_IN' },
    repo,
    failingDeps
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.legacyStepSyncStatus, 'DEFERRED');
  assert.match(String(res.payload.override.legacyStepSyncWarning || ''), /timeout/i);
  const persisted = await repo.loadBookingOverride(140299);
  assert.equal(persisted?.status, 'CHECKED_IN');
  assert.equal(persisted?.legacyStepSyncStatus, 'DEFERRED');
});

test('MOS-BUG-231: UPDATE_PROGRESS Preparation and Photo before auto-saved assign technician and move legacy order out of Incoming to Preparation', async () => {
  const store = createInMemoryConfigStore();
  const repo = createOverrideRepository(store);
  const harness = createBridgeHarness('Confirmed');
  await repo.saveCustomerNaturalLashProfile(88991, COMPLETE_ATTRS);

  // Technician enters Screen 06 and starts task (Preparation) without explicit prior ASSIGN_STAFF
  const prepRes = await executeIosBookingAction(
    cvlActor,
    {
      bookingId: 140300,
      customerId: 88991,
      action: 'UPDATE_PROGRESS',
      orderState: 'Preparation',
      progress: {
        startedAt: '2026-11-15T15:00:00.000Z',
        timerRunning: true,
        currentStep: 7,
      },
    },
    repo,
    harness.deps
  );

  assert.equal(prepRes.statusCode, 200);
  assert.equal(prepRes.payload.legacyStepSyncStatus, 'SYNCED');
  assert.equal(prepRes.payload.override.assignedStaffId, 46272);
  assert.equal(prepRes.payload.override.legacySyncedOrderState, 'Preparation');
  assert.equal(prepRes.payload.override.progress.lastLegacyProgressState, 'Preparation');

  // Verify full legacy sync chain: check-in -> consultation -> progress/update(Preparation)
  assert.deepEqual(
    harness.phpCalls.map((c) => c.endpoint),
    ['/order/booking/check-in', '/order/booking/consultation', '/order/service/progress/update']
  );
  assert.equal(harness.phpCalls[2].payload.service_state, 'Preparation');
  assert.equal(harness.phpCalls[2].payload.assigned_staff_id, '46272');

  // Now technician takes Before photo: 'Photo before auto-saved'
  // Should deduplicate since legacy is already in Preparation
  const beforePhotoRes = await executeIosBookingAction(
    cvlActor,
    {
      bookingId: 140300,
      customerId: 88991,
      action: 'UPDATE_PROGRESS',
      orderState: 'Photo before auto-saved',
      progress: {
        beforePhotoUrl: 'https://cdn.wingslashes.com/photos/before_140300.jpg',
        currentStep: 7,
      },
    },
    repo,
    harness.deps
  );

  assert.equal(beforePhotoRes.statusCode, 200);
  assert.equal(beforePhotoRes.payload.legacyStepSyncStatus, 'SKIPPED');
  // Deduplicated: no additional PHP call
  assert.equal(harness.phpCalls.length, 3);

  // If a booking directly auto-saves Before Photo without prior Preparation sync:
  const directHarness = createBridgeHarness('Confirmed');
  const directBeforePhotoRes = await executeIosBookingAction(
    cvlActor,
    {
      bookingId: 140301,
      customerId: 88991,
      action: 'UPDATE_PROGRESS',
      orderState: 'Photo before auto-saved',
      progress: {
        beforePhotoUrl: 'https://cdn.wingslashes.com/photos/before_140301.jpg',
        currentStep: 7,
      },
    },
    repo,
    directHarness.deps
  );

  assert.equal(directBeforePhotoRes.statusCode, 200);
  assert.equal(directBeforePhotoRes.payload.legacyStepSyncStatus, 'SYNCED');
  assert.equal(directBeforePhotoRes.payload.override.legacySyncedOrderState, 'Preparation');
  assert.equal(directBeforePhotoRes.payload.override.assignedStaffId, 46272);
  assert.equal(directHarness.phpCalls[2].endpoint, '/order/service/progress/update');
  assert.equal(directHarness.phpCalls[2].payload.service_state, 'Preparation');
});

test('MOS-BUG-231: Photo cleaned auto-saved maps to ServiceCleaned and Photo after auto-saved maps to ServiceEnd', async () => {
  const store = createInMemoryConfigStore();
  const repo = createOverrideRepository(store);
  const harness = createBridgeHarness('Consultation');

  // Cleaned photo autosave
  const cleanedRes = await executeIosBookingAction(
    cvlActor,
    {
      bookingId: 140302,
      action: 'UPDATE_PROGRESS',
      orderState: 'Photo cleaned auto-saved',
      progress: {
        cleanedPhotoUrl: 'https://cdn.wingslashes.com/cleaned.jpg',
      },
    },
    repo,
    harness.deps
  );

  assert.equal(cleanedRes.statusCode, 200);
  assert.equal(cleanedRes.payload.legacyStepSyncStatus, 'SYNCED');
  assert.equal(cleanedRes.payload.override.legacySyncedOrderState, 'ServiceCleaned');
  assert.equal(harness.phpCalls[0].endpoint, '/order/service/progress/update');
  assert.equal(harness.phpCalls[0].payload.service_state, 'ServiceCleaned');

  // After photo autosave
  const afterRes = await executeIosBookingAction(
    cvlActor,
    {
      bookingId: 140302,
      action: 'UPDATE_PROGRESS',
      orderState: 'Photo after auto-saved',
      progress: {
        afterPhotoUrl: 'https://cdn.wingslashes.com/after.jpg',
      },
    },
    repo,
    harness.deps
  );

  assert.equal(afterRes.statusCode, 200);
  assert.equal(afterRes.payload.legacyStepSyncStatus, 'SYNCED');
  assert.equal(afterRes.payload.override.legacySyncedOrderState, 'ServiceEnd');
  assert.equal(harness.phpCalls[1].endpoint, '/order/service/progress/update');
  assert.equal(harness.phpCalls[1].payload.service_state, 'ServiceEnd');
});
