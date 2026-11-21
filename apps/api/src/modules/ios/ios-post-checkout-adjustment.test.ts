import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {
  canAdjustDoneBookingPostCheckout,
  computePostCheckoutFinancialDelta,
  getVietnamDateYmd,
  SafeAny,
} from '@mos-lab/shared';
import { executeIosBookingAction } from './services/ios-actions.service.js';
import { createInMemoryConfigStore, createOverrideRepository } from './services/ios-overrides.service.js';
import { reconcileAndSettlePostCheckoutOrderWithLegacyPhp } from './services/ios-post-checkout-bridge.service.js';
import { LegacyOrderCatalogSnapshot } from './services/ios-legacy-payload.mapper.js';

function createCatalogSnapshot(overrides: Partial<LegacyOrderCatalogSnapshot> = {}): LegacyOrderCatalogSnapshot {
  return {
    orderExists: true,
    orderId: 888001,
    customerUserId: 90001,
    clientStoreId: 6,
    currentOrderState: 'Consultation',
    promotionId: null,
    userUrlId: 1201,
    existingOrderServiceIds: [501001],
    upperService: {
      serviceId: 115,
      serviceGroup: 'LashesTop',
      singlePriceId: 1150,
      singlePriceAmount: 550000,
      balancePriceId: 1159,
      staffSurveySetId: 3,
      customerSurveySetId: 4,
    },
    underService: undefined,
    upperCombo: {
      serviceId: 115,
      servicePriceId: 9115,
      comboPriceAmount: 2200000,
    },
    underCombo: undefined,
    products: [],
    staffFiveStarSurveyAnswers: {
      '6': [{ survey_answer_id: '24', survey_answer: '5' }],
    },
    customerHappySurveyAnswers: {},
    ...overrides,
  };
}

function createMockPoolAndRecorder(options?: {
  bookingId?: number;
  withPriorUsedCombo?: boolean;
  withPriorPurchasedCombo?: boolean;
  withCashbackReward?: boolean;
}) {
  const bookingId = options?.bookingId ?? 888001;
  const sqlCalls: Array<{ sql: string; params: SafeAny[] }> = [];
  let orderState = 'Completed';

  const fakePool = {
    query: async (sql: string, params: SafeAny[] = []) => {
      const cleanSql = sql.replace(/\s+/g, ' ').trim();
      sqlCalls.push({ sql: cleanSql, params });

      if (cleanSql.startsWith('SELECT id, user_id, client_store_id, order_state, booking_date_start FROM `order`')) {
        return [
          [
            {
              id: bookingId,
              user_id: 90001,
              client_store_id: 6,
              order_state: orderState,
              booking_date_start: '2026-11-19 09:00:00',
            },
          ],
        ];
      }
      if (cleanSql.includes('FROM `order` o LEFT JOIN order_service')) {
        return [
          [
            {
              id: bookingId,
              user_id: 90001,
              order_state: orderState,
              total_price: 550000,
              booking_date_start: `${getVietnamDateYmd()} 09:00:00`,
              assigned_staff_id: 13783,
              check_in_staff_id: 13783,
              check_out_staff_id: 13783,
              upgrade_price: 0,
              service_name: 'HyperLight 550',
              assigned_name: 'Khanh Cao',
              check_in_name: 'Khanh Cao',
              check_out_name: 'Khanh Cao',
            },
          ],
        ];
      }
      if (cleanSql.includes('FROM order_payment WHERE order_id = ?')) {
        return [
          [
            {
              paid_cash_amount: 594000,
              paid_credit_card_amount: 0,
              paid_bank_transfer_amount: 0,
              paid_credit_amount: 0,
              tip_amount: 0,
            },
          ],
        ];
      }
      if (cleanSql.includes('FROM user_service_balance_transaction WHERE order_id = ? AND used_staff_id IS NOT NULL')) {
        return [
          options?.withPriorUsedCombo
            ? [
                {
                  id: 7101,
                  user_service_balance_id: 6101,
                  normal_count: 1,
                  retain_count: 0,
                  normal_balance_amount: 440000,
                  retain_balance_amount: 0,
                  date_expired: '2027-05-01',
                },
              ]
            : [],
        ];
      }
      if (cleanSql.includes('FROM order_service_combo osc')) {
        return [
          options?.withPriorPurchasedCombo
            ? [
                {
                  id: 8101,
                  service_id: 115,
                  service_price_id: 9115,
                  normal_count: 3,
                  retain_count: 2,
                  per_normal_price: 440000,
                  per_retain_price: 440000,
                  parent_service_id: null,
                },
              ]
            : [],
        ];
      }
      if (cleanSql.includes('FROM user_service_balance WHERE user_id = ? AND service_id = ?')) {
        return [[{ id: 6201 }]];
      }
      if (cleanSql.includes('FROM user_balance_transaction ubt')) {
        return [
          options?.withCashbackReward
            ? [
                {
                  id: 9101,
                  user_balance_id: 5101,
                  amount: 120,
                  tracking_key: JSON.stringify({ order_id: bookingId }),
                },
              ]
            : [],
        ];
      }
      if (cleanSql.includes("FROM staff_bonus WHERE order_id = ? AND bonus_type = 'BonusPoint'")) {
        return [[{ user_id: 13783, pts: 35 }]];
      }
      if (cleanSql.includes("FROM order_state WHERE order_id = ? AND order_state = 'CheckIn'")) {
        return [[{ date_created: '2026-11-19 08:55:00' }]];
      }
      if (cleanSql.includes('FROM order_product WHERE order_id = ?')) {
        return [[]];
      }
      if (cleanSql.startsWith("UPDATE `order` SET order_state = 'CheckOut'")) {
        orderState = 'CheckOut';
      }
      return [{ affectedRows: 1 }];
    },
  } as unknown as mysql.Pool;

  return { fakePool, sqlCalls };
}

test('P1: canAdjustDoneBookingPostCheckout enforces same-day window, DONE status, and CVL ownership', () => {
  const today = '2026-11-19';

  assert.equal(
    canAdjustDoneBookingPostCheckout({
      status: 'DONE',
      bookingDateYmd: today,
      todayVnYmd: today,
      actorTier: 'CVL',
      actorStaffId: 13783,
      assignedStaffId: 13783,
    }).allowed,
    true
  );

  assert.equal(
    canAdjustDoneBookingPostCheckout({
      status: 'DONE',
      bookingDateYmd: today,
      todayVnYmd: today,
      actorTier: 'CVL',
      actorStaffId: 46272,
      assignedStaffId: 13783,
      checkInStaffId: 13783,
      checkOutStaffId: 46272,
    }).allowed,
    true
  );

  assert.equal(
    canAdjustDoneBookingPostCheckout({
      status: 'DONE',
      bookingDateYmd: today,
      todayVnYmd: today,
      actorTier: 'CVL',
      actorStaffId: 46272,
      assignedStaffId: 13783,
      checkInStaffId: 13783,
      checkOutStaffId: 13783,
    }).allowed,
    false
  );

  for (const tier of ['CVLL', 'CC', 'ADMIN']) {
    assert.equal(
      canAdjustDoneBookingPostCheckout({
        status: 'DONE',
        bookingDateYmd: today,
        todayVnYmd: today,
        actorTier: tier,
        actorStaffId: 99999,
        assignedStaffId: 13783,
      }).allowed,
      true
    );
  }

  assert.equal(
    canAdjustDoneBookingPostCheckout({
      status: 'DONE',
      bookingDateYmd: '2026-11-18',
      todayVnYmd: today,
      actorTier: 'CC',
      actorStaffId: 37790,
      assignedStaffId: 13783,
    }).allowed,
    false
  );
});

test('P2: computePostCheckoutFinancialDelta handles TOP_UP MIXED split, 0đ redeemed order, and VOID_AND_RECOLLECT rules', () => {
  const retailToCombo = computePostCheckoutFinancialDelta({
    previousPaidTotal: 594000,
    previousPaymentMethod: 'CASH',
    newGrandTotal: 2376000,
    requestedMode: 'TOP_UP',
    deltaPaymentMethod: 'VIETQR',
    isAlreadySettledCompleted: true,
    actorTier: 'CVL',
  });
  assert.equal(retailToCombo.effectiveMode, 'TOP_UP');
  assert.equal(retailToCombo.deltaAmount, 1782000);
  assert.equal(retailToCombo.amountToCollectNow, 1782000);
  assert.equal(retailToCombo.combinedPaymentMethod, 'MIXED');
  assert.deepEqual(retailToCombo.combinedPaymentBreakdown, {
    cashAmount: 594000,
    posAmount: 0,
    vietqrAmount: 1782000,
  });
  assert.equal(retailToCombo.requiresCounterApproval, false);

  const zeroOrderAddCombo = computePostCheckoutFinancialDelta({
    previousPaidTotal: 0,
    previousPaymentMethod: 'VIETQR',
    newGrandTotal: 2376000,
    requestedMode: 'TOP_UP',
    deltaPaymentMethod: 'VIETQR',
    isAlreadySettledCompleted: true,
    actorTier: 'CVL',
  });
  assert.equal(zeroOrderAddCombo.deltaAmount, 2376000);
  assert.equal(zeroOrderAddCombo.amountToCollectNow, 2376000);

  const cvlVoid = computePostCheckoutFinancialDelta({
    previousPaidTotal: 594000,
    previousPaymentMethod: 'CASH',
    newGrandTotal: 2376000,
    requestedMode: 'VOID_AND_RECOLLECT',
    deltaPaymentMethod: 'VIETQR',
    isAlreadySettledCompleted: true,
    actorTier: 'CVL',
  });
  assert.equal(cvlVoid.requiresReason, true);
  assert.equal(cvlVoid.requiresCounterApproval, true);

  const ccVoid = computePostCheckoutFinancialDelta({
    previousPaidTotal: 594000,
    previousPaymentMethod: 'CASH',
    newGrandTotal: 2376000,
    requestedMode: 'VOID_AND_RECOLLECT',
    deltaPaymentMethod: 'CASH',
    isAlreadySettledCompleted: true,
    actorTier: 'CC',
  });
  assert.equal(ccVoid.requiresReason, true);
  assert.equal(ccVoid.requiresCounterApproval, false);
});

test('P3: executeIosBookingAction processes CVL VIETQR top-up + checkout transfer, Counter approval/reject, and 403/400 guards', async () => {
  const store = createInMemoryConfigStore();
  const repo = createOverrideRepository(store);
  const today = getVietnamDateYmd();

  const seedOverride = {
    bookingId: 888001,
    status: 'DONE' as const,
    bookingDateYmd: today,
    assignedStaffId: 13783,
    assignedStaffName: 'Khanh Cao',
    assignedStaffTier: 'CVL',
    checkInStaffId: 13783,
    checkInStaffName: 'Khanh Cao',
    checkOutStaffId: 13783,
    checkOutStaffName: 'Khanh Cao',
    checkOutStaffTier: 'CVL',
    servicePrice: 550000,
    serviceName: 'HyperLight 550',
    orderState: 'Completed',
    billing: {
      subtotal: 550000,
      serviceTotal: 550000,
      productTotal: 0,
      vatAmount: 44000,
      tipAmount: 0,
      diamondUsed: 0,
      diamondDiscountAmount: 0,
      grandTotal: 594000,
      paymentMethod: 'CASH' as const,
      paymentBreakdown: { vietqrAmount: 0, posAmount: 0, cashAmount: 594000 },
      settlementStatus: 'SETTLED_COMPLETED' as const,
    },
  };
  await repo.saveBookingOverride(888001, seedOverride);
  await repo.saveBookingOverride(888002, { ...seedOverride, bookingId: 888002 });

  const { fakePool } = createMockPoolAndRecorder({ bookingId: 888001 });
  const phpCalls: Array<{ path: string; payload: Record<string, SafeAny> }> = [];
  const bridgeDeps = {
    getPool: () => fakePool,
    resolveCatalog: async () => createCatalogSnapshot({ orderId: 888001 }),
    resolveAuthToken: async () => ({ authUserId: 46272, loginToken: 'tok-thao-ly' }),
    callEndpoint: async (endpointPath: string, payload: Record<string, SafeAny>) => {
      phpCalls.push({ path: endpointPath, payload });
      return { ok: true, status: '1', code: '0000', message: 'OK' };
    },
  };

  const khanhCvl = {
    id: 1,
    username: 'khanhcao',
    role: 'cvl',
    careerTier: 'CVL' as const,
    legacyStaffId: 13783,
    displayName: 'Khanh Cao',
  };
  const thaoLyOtherCvl = {
    id: 2,
    username: 'thaoly',
    role: 'cvl',
    careerTier: 'CVL' as const,
    legacyStaffId: 46272,
    displayName: 'Thảo Ly',
  };
  const ccCounter = {
    id: 3,
    username: 'diemhuong',
    role: 'cc',
    careerTier: 'CC' as const,
    legacyStaffId: 37790,
    displayName: 'Diễm Hương',
  };

  // Unauthorized other CVL -> 403
  const forbiddenRes = await executeIosBookingAction(
    thaoLyOtherCvl,
    { bookingId: 888001, action: 'SUBMIT_POST_CHECKOUT_ADJUSTMENT', paymentMode: 'TOP_UP' },
    repo,
    bridgeDeps
  );
  assert.equal(forbiddenRes.statusCode, 403);

  // Past-date booking -> 400
  const pastRes = await executeIosBookingAction(
    ccCounter,
    {
      bookingId: 888001,
      action: 'SUBMIT_POST_CHECKOUT_ADJUSTMENT',
      bookingDateYmd: '2026-01-01',
      paymentMode: 'TOP_UP',
    },
    repo,
    bridgeDeps
  );
  assert.equal(pastRes.statusCode, 400);

  // CVL submits VIETQR TOP_UP + transfers Checkout owner to Thảo Ly (46272)
  const topUpRes = await executeIosBookingAction(
    khanhCvl,
    {
      bookingId: 888001,
      action: 'SUBMIT_POST_CHECKOUT_ADJUSTMENT',
      targetCheckOutStaffId: 46272,
      targetCheckOutStaffName: 'Thảo Ly',
      targetCheckOutStaffTier: 'CVL',
      selectedCombo: {
        id: 'HyperLight_4X:4_tặng_1:550',
        name: 'Combo 4 tặng 1 · HyperLight 4X 550',
        price: 2200000,
        todaySingleServiceWaived: true,
      },
      paymentMode: 'TOP_UP',
      deltaPaymentMethod: 'VIETQR',
    },
    repo,
    bridgeDeps
  );
  assert.equal(topUpRes.statusCode, 200);
  assert.equal(topUpRes.payload.settlementStatus, 'SETTLED_COMPLETED');
  assert.equal(topUpRes.payload.override.checkOutStaffId, 46272);
  assert.equal(topUpRes.payload.override.checkOutStaffName, 'Thảo Ly');
  assert.equal(topUpRes.payload.override.billing.previousPaidGrandTotal, 594000);
  assert.equal(topUpRes.payload.override.billing.paymentMethod, 'MIXED');
  assert.equal(topUpRes.payload.override.postCheckoutAdjustments.length, 1);
  assert.equal(topUpRes.payload.override.postCheckoutAdjustments[0].status, 'APPLIED');
  assert.equal(topUpRes.payload.override.postCheckoutAdjustments[0].checkOutStaffReplaced, true);

  // VOID_AND_RECOLLECT without reason -> 400
  const noReasonRes = await executeIosBookingAction(
    khanhCvl,
    {
      bookingId: 888002,
      action: 'SUBMIT_POST_CHECKOUT_ADJUSTMENT',
      targetCheckOutStaffId: 13783,
      targetCheckOutStaffName: 'Khanh Cao',
      targetCheckOutStaffTier: 'CVL',
      paymentMode: 'VOID_AND_RECOLLECT',
      deltaPaymentMethod: 'CASH',
    },
    repo,
    bridgeDeps
  );
  assert.equal(noReasonRes.statusCode, 400);

  // VOID_AND_RECOLLECT with reason -> enters PENDING_POST_CHECKOUT_ADJUSTMENT -> CC approves
  const pendingRes = await executeIosBookingAction(
    khanhCvl,
    {
      bookingId: 888002,
      action: 'SUBMIT_POST_CHECKOUT_ADJUSTMENT',
      targetCheckOutStaffId: 46272,
      targetCheckOutStaffName: 'Thảo Ly',
      targetCheckOutStaffTier: 'CVL',
      selectedCombo: {
        id: 'HyperLight_4X:4_tặng_1:550',
        name: 'Combo 4 tặng 1 · HyperLight 4X 550',
        price: 2200000,
        todaySingleServiceWaived: true,
      },
      paymentMode: 'VOID_AND_RECOLLECT',
      deltaPaymentMethod: 'CASH',
      reason: 'Khách đổi sang thanh toán lại toàn bộ gói',
    },
    repo,
    bridgeDeps
  );
  assert.equal(pendingRes.statusCode, 200);
  assert.equal(pendingRes.payload.settlementStatus, 'PENDING_POST_CHECKOUT_ADJUSTMENT');

  const approveRes = await executeIosBookingAction(
    ccCounter,
    { bookingId: 888002, action: 'APPROVE_POST_CHECKOUT_ADJUSTMENT' },
    repo,
    bridgeDeps
  );
  assert.equal(approveRes.statusCode, 200);
  assert.equal(approveRes.payload.settlementStatus, 'SETTLED_COMPLETED');
  assert.equal(approveRes.payload.override.postCheckoutAdjustments[0].status, 'APPLIED');
  assert.equal(approveRes.payload.override.postCheckoutAdjustments[0].approvedByStaffId, 37790);

  // Separate booking: submit pending -> REJECT_POST_CHECKOUT_ADJUSTMENT restores state
  await repo.saveBookingOverride(888003, { ...seedOverride, bookingId: 888003 });
  await executeIosBookingAction(
    khanhCvl,
    {
      bookingId: 888003,
      action: 'SUBMIT_POST_CHECKOUT_ADJUSTMENT',
      targetCheckOutStaffId: 13783,
      targetCheckOutStaffName: 'Khanh Cao',
      targetCheckOutStaffTier: 'CVL',
      paymentMode: 'VOID_AND_RECOLLECT',
      deltaPaymentMethod: 'CASH',
      reason: 'Sai phương thức thu',
    },
    repo,
    bridgeDeps
  );
  const rejectRes = await executeIosBookingAction(
    ccCounter,
    { bookingId: 888003, action: 'REJECT_POST_CHECKOUT_ADJUSTMENT', rejectionReason: 'Quầy kiểm tra chưa hợp lệ' },
    repo,
    bridgeDeps
  );
  assert.equal(rejectRes.statusCode, 200);
  assert.equal(rejectRes.payload.settlementStatus, 'SETTLED_COMPLETED');
  assert.equal(rejectRes.payload.override.postCheckoutAdjustments[0].status, 'REJECTED');
  assert.equal(rejectRes.payload.override.postCheckoutAdjustments[0].rejectionReason, 'Quầy kiểm tra chưa hợp lệ');
});

test('P4: reconcileAndSettlePostCheckoutOrderWithLegacyPhp reverses wallet/ledger tables, re-attributes check_out_staff_id, and re-settles PHP', async () => {
  const { fakePool, sqlCalls } = createMockPoolAndRecorder({
    bookingId: 888001,
    withPriorUsedCombo: true,
    withPriorPurchasedCombo: true,
    withCashbackReward: true,
  });
  const phpCalls: Array<{ path: string; payload: Record<string, SafeAny> }> = [];

  const result = await reconcileAndSettlePostCheckoutOrderWithLegacyPhp(
    {
      bookingId: 888001,
      previousOverride: {},
      nextOverride: {
        bookingId: 888001,
        serviceName: 'HyperLight 550',
        servicePrice: 550000,
        selectedCombo: {
          id: 'HyperLight_4X:4_tặng_1:550',
          name: 'Combo 4 tặng 1 · HyperLight 4X 550',
          price: 2200000,
          todaySingleServiceWaived: true,
        },
        billing: {
          subtotal: 2200000,
          vatAmount: 176000,
          tipAmount: 0,
          grandTotal: 2376000,
          paymentMethod: 'MIXED',
          paymentBreakdown: { cashAmount: 594000, posAmount: 0, vietqrAmount: 1782000 },
        },
      },
      checkInStaffId: 13783,
      assignedStaffId: 13783,
      previousCheckOutStaffId: 13783,
      newCheckOutStaffId: 46272,
      settlementActorTier: 'ADMIN',
    },
    {
      getPool: () => fakePool,
      loadSettlementReceipt: async () => null,
      saveSettlementReceipt: async () => {},
      deleteSettlementReceipt: async () => {},
      resolveCatalog: async () => createCatalogSnapshot({ orderId: 888001 }),
      resolveAuthToken: async () => ({ authUserId: 46272, loginToken: 'tok-thao-ly' }),
      callEndpoint: async (endpointPath, payload) => {
        phpCalls.push({ path: endpointPath, payload });
        return { ok: true, status: '1', code: '0000', message: 'OK' };
      },
    }
  );

  assert.equal(result.settlementStatus, 'SETTLED_COMPLETED');
  const joinedSql = sqlCalls.map((c) => c.sql).join('\n');
  assert.ok(joinedSql.includes('UPDATE user_service_balance SET normal_count = normal_count + ?'));
  assert.ok(joinedSql.includes("SET cancelled_staff_id = ?, cancel_note = 'POST_CHECKOUT_RECONCILE'"));
  assert.ok(joinedSql.includes('UPDATE user_service_balance SET normal_count = GREATEST(0, normal_count - ?)'));
  assert.ok(joinedSql.includes('DELETE FROM user_balance_transaction WHERE id = ?'));
  assert.ok(joinedSql.includes('DELETE FROM report_order_service WHERE order_id = ?'));
  assert.ok(joinedSql.includes('DELETE FROM staff_tip WHERE order_id = ?'));
  assert.ok(joinedSql.includes('DELETE FROM staff_bonus WHERE order_id = ?'));
  assert.ok(joinedSql.includes("UPDATE `order` SET order_state = 'CheckOut' WHERE id = ?"));
  assert.ok(joinedSql.includes('UPDATE order_service SET check_out_staff_id = ? WHERE order_id = ?'));
  assert.ok(
    joinedSql.includes(
      'UPDATE order_service_combo SET check_in_staff_id = ?, check_out_staff_id = ? WHERE order_id = ?'
    )
  );
  assert.ok(joinedSql.includes('UPDATE report_order_service SET check_out_staff_id = ? WHERE order_id = ?'));
  assert.equal(phpCalls.filter((c) => c.path === '/order/payment/update').length, 1);
  assert.equal(phpCalls.filter((c) => c.path === '/order/booking/generate/report').length, 1);
});
