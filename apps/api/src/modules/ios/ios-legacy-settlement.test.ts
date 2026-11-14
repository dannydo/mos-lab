import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {
  calculateDualComboTierBonus,
  calculateIosItemizedPromotionDiscounts,
  calculateIosPromotionDiscount,
  IosPromotionOption,
  SafeAny,
} from '@mos-lab/shared';
import { buildCheckoutAttributionSqlCondition, resolveCvTipSplitFromRows } from '../career/career.service.js';
import { executeIosBookingAction } from './services/ios-actions.service.js';
import { settleIosOrderWithLegacyPhp } from './services/ios-legacy-bridge.service.js';
import {
  buildLegacyOrderPayloads,
  buildUnderLashAttributeMap,
  buildUpperLashAttributeMap,
  inferComboTotalSessions,
  inferLegacyUpperServiceKeyCandidates,
  LegacyOrderCatalogSnapshot,
  resolveDiamondCreditUnits,
  shouldAutoCompleteLegacyOrder,
} from './services/ios-legacy-payload.mapper.js';
import { createInMemoryConfigStore, createOverrideRepository } from './services/ios-overrides.service.js';

function createMockCatalogSnapshot(overrides: Partial<LegacyOrderCatalogSnapshot> = {}): LegacyOrderCatalogSnapshot {
  return {
    orderExists: true,
    orderId: 140282,
    customerUserId: 88991,
    clientStoreId: 6,
    currentOrderState: 'Consultation',
    promotionId: 19,
    userUrlId: 8801,
    existingOrderServiceIds: [501001, 501002],
    upperService: {
      serviceId: 115,
      serviceGroup: 'LashesTop',
      singlePriceId: 1150,
      singlePriceAmount: 770000,
      balancePriceId: 1159,
      staffSurveySetId: 3,
      customerSurveySetId: 4,
    },
    underService: {
      serviceId: 127,
      serviceGroup: 'LashesUnder',
      singlePriceId: 1270,
      singlePriceAmount: 390000,
      balancePriceId: 1279,
      staffSurveySetId: 3,
      customerSurveySetId: 4,
    },
    upperCombo: {
      serviceId: 115,
      servicePriceId: 9115,
      comboPriceAmount: 4190000,
    },
    underCombo: {
      serviceId: 127,
      servicePriceId: 9127,
      comboPriceAmount: 780000,
    },
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
    staffFiveStarSurveyAnswers: {
      '6': [{ survey_answer_id: '24', survey_answer: '5' }],
    },
    customerHappySurveyAnswers: {},
    ...overrides,
  };
}

test('A1: buildLegacyOrderPayloads maps Dual Combos, integer Diamond credits, 8% VAT (0% on Tip), and omits order_contract', () => {
  const catalog = createMockCatalogSnapshot();
  const built = buildLegacyOrderPayloads({
    orderId: 140282,
    assignedStaffId: 46272,
    serviceName: 'HyperLight 4X 770',
    servicePrice: 770000,
    hasUnderMink: true,
    underMinkServiceType: 'Normal',
    selectedCombo: {
      id: '7+3-hyperlight-770',
      name: 'Combo 7 tặng 3',
      price: 4190000,
      todaySingleServiceWaived: true,
    },
    selectedUnderCombo: {
      id: '2+1-under-390',
      name: 'Combo 2 tặng 1 Mi Dưới',
      price: 780000,
      todaySingleServiceWaived: true,
    },
    cartProducts: [
      {
        productId: 42,
        productName: 'Dưỡng Mi Yeppeum Korea',
        price: 1100000,
        quantity: 1,
      },
    ],
    billing: {
      paymentMethod: 'VIETQR',
      tipAmount: 100000,
      diamondDiscountAmount: 50000,
      bankTransferRef: 'FT26316998877',
    },
    catalog,
  });

  // Both today's single services waived by newly bought combos -> balance price IDs selected
  assert.equal(built.selectedService.length, 2);
  assert.equal(built.selectedService[0].service_price_id, '1159');
  assert.equal(built.selectedService[1].service_price_id, '1279');

  // Dual combo index alignment: [0] Upper, [1] Under
  assert.equal(built.selectedServiceCombo.length, 2);
  assert.equal(built.selectedServiceCombo[0].service_price_id, '9115');
  assert.equal(built.selectedServiceCombo[1].service_price_id, '9127');

  // Subtotal = 4,190,000 + 780,000 + 1,100,000 = 6,070,000; 8% VAT = 485,600 (Tip 100k is 0% VAT)
  assert.equal(built.subtotal, 6070000);
  assert.equal(built.vatAmount, 485600);
  assert.equal(built.tipAmount, 100000);

  // Diamond conversion: 50,000đ -> 50 integer credit points (NOT 50000)
  assert.equal(resolveDiamondCreditUnits(undefined, 50000), 50);
  assert.equal(built.diamondCredits, 50);
  assert.equal(built.paymentUpdatePayload.paid_credit_amount, '50');
  assert.equal(built.grandTotal, 6070000 + 485600 + 100000 - 50000);
  assert.equal(built.paymentUpdatePayload.paid_bank_transfer_transaction_id, 'FT26316998877');

  // Must NOT send empty order_contract so existing digital contracts are never wiped
  assert.equal('order_contract' in built.consultationPayload, false);
  assert.equal('order_contract' in built.paymentUpdatePayload, false);
});

test('A1: buildLegacyOrderPayloads inserts placeholder {} at index 0 when buying Under Combo without Upper Combo', () => {
  const catalog = createMockCatalogSnapshot({
    upperCombo: undefined,
    products: [],
  });

  const built = buildLegacyOrderPayloads({
    orderId: 140282,
    assignedStaffId: 46272,
    serviceName: 'HyperLight 4X 770',
    servicePrice: 770000,
    hasUnderMink: true,
    selectedCombo: null,
    selectedUnderCombo: {
      id: '2+1-under-390',
      name: 'Combo 2 tặng 1 Mi Dưới',
      price: 780000,
      todaySingleServiceWaived: true,
    },
    billing: {
      paymentMethod: 'CASH',
    },
    catalog,
  });

  assert.equal(built.selectedService.length, 2);
  assert.equal(built.selectedService[0].service_price_id, '1150'); // Single upper service
  assert.equal(built.selectedService[1].service_price_id, '1279'); // Balance under service

  assert.equal(built.selectedServiceCombo.length, 2);
  assert.deepEqual(built.selectedServiceCombo[0], {});
  assert.equal(built.selectedServiceCombo[1].service_price_id, '9127');
  assert.equal(shouldAutoCompleteLegacyOrder('CASH', built.grandTotal, 'CVL'), false);
  assert.equal(shouldAutoCompleteLegacyOrder('POS', built.grandTotal, 'CVLL'), false);
  assert.equal(shouldAutoCompleteLegacyOrder('CASH', built.grandTotal, 'CC'), true);
  assert.equal(shouldAutoCompleteLegacyOrder('POS', built.grandTotal, 'ADMIN'), true);
  assert.equal(shouldAutoCompleteLegacyOrder('CASH', 0, 'CVL'), true);
  assert.equal(shouldAutoCompleteLegacyOrder('VIETQR', built.grandTotal, 'CVL'), true);
});

test('A2 & A3: Cash/POS stops at CheckOut (PENDING_COUNTER_SETTLEMENT); upgrade to VIETQR settles Completed with full idempotency', async () => {
  const store = createInMemoryConfigStore();
  const repo = createOverrideRepository(store);
  const phpCalls: Array<{ path: string; payload: Record<string, SafeAny> }> = [];
  const fakePool = {} as unknown as mysql.Pool;

  const bridgeDeps = {
    getPool: () => fakePool,
    resolveCatalog: async () => createMockCatalogSnapshot({ products: [] }),
    resolveAuthToken: async () => ({ authUserId: 46272, loginToken: 'tok-thao-ly' }),
    callEndpoint: async (endpointPath: string, payload: Record<string, SafeAny>) => {
      phpCalls.push({ path: endpointPath, payload });
      return { ok: true, status: '1', code: '0000', message: 'OK' };
    },
  };

  const cvlUser = {
    id: 77,
    username: 'thaoly',
    role: 'cvl',
    careerTier: 'CVL' as const,
    legacyStaffId: 46272,
    displayName: 'Thảo Ly',
  };

  // 1) CASH > 0đ -> must sync up to CheckOut, lock check_out_staff_id = 46272, and NOT call /order/payment/update
  const cashRes = await executeIosBookingAction(
    cvlUser,
    {
      bookingId: 140282,
      action: 'COMPLETE_ORDER',
      billing: {
        paymentMethod: 'CASH',
        subtotal: 4970000,
        vatAmount: 397600,
        tipAmount: 100000,
        grandTotal: 5467600,
      },
      selectedCombo: { id: '7+3', name: 'Combo 7 tặng 3', price: 4190000, todaySingleServiceWaived: true },
      selectedUnderCombo: { id: '2+1', name: 'Combo 2 tặng 1 Mi Dưới', price: 780000, todaySingleServiceWaived: true },
    },
    repo,
    bridgeDeps
  );

  assert.equal(cashRes.statusCode, 200);
  assert.equal(cashRes.payload.settlementStatus, 'PENDING_COUNTER_SETTLEMENT');
  assert.equal(cashRes.payload.override.orderState, 'CheckOut');
  assert.equal(
    phpCalls.some((c) => c.path === '/order/payment/update'),
    false,
    'CASH > 0đ must never auto-call /order/payment/update before Reception collects cash'
  );
  const checkOutCall = phpCalls.find((c) => c.path === '/order/survey/customer/done');
  assert.ok(checkOutCall);
  assert.equal(checkOutCall.payload.modify_staff_id, '46272');

  // 2) Duplicate CASH retry -> idempotent hit, zero extra PHP calls
  const callCountAfterCash = phpCalls.length;
  const dupCashRes = await executeIosBookingAction(
    cvlUser,
    {
      bookingId: 140282,
      action: 'COMPLETE_ORDER',
      billing: {
        paymentMethod: 'CASH',
        grandTotal: 5467600,
      },
    },
    repo,
    bridgeDeps
  );
  assert.equal(dupCashRes.payload.settlementStatus, 'PENDING_COUNTER_SETTLEMENT');
  assert.equal(phpCalls.length, callCountAfterCash);

  // 2b) Pending CASH booking edited to new grandTotal (or switched CASH -> POS) -> must re-sync & update receipt (not short-circuit)
  const editedCashRes = await executeIosBookingAction(
    cvlUser,
    {
      bookingId: 140282,
      action: 'COMPLETE_ORDER',
      billing: {
        paymentMethod: 'POS',
        subtotal: 4970000,
        vatAmount: 397600,
        tipAmount: 200000,
        grandTotal: 5567600,
      },
      selectedCombo: { id: '7+3', name: 'Combo 7 tặng 3', price: 4190000, todaySingleServiceWaived: true },
      selectedUnderCombo: { id: '2+1', name: 'Combo 2 tặng 1 Mi Dưới', price: 780000, todaySingleServiceWaived: true },
    },
    repo,
    bridgeDeps
  );
  assert.equal(editedCashRes.payload.settlementStatus, 'PENDING_COUNTER_SETTLEMENT');
  assert.equal(editedCashRes.payload.override.orderState, 'CheckOut');
  assert.ok(
    phpCalls.length > callCountAfterCash,
    'Edited pending order must re-sync Legacy PHP consultation & checkout'
  );
  assert.equal(
    phpCalls.some((c) => c.path === '/order/payment/update'),
    false,
    'POS > 0đ must still pause at CheckOut waiting for Reception settlement'
  );
  const updatedPendingReceipt = await repo.loadSettlementReceipt(140282);
  assert.equal(updatedPendingReceipt?.paymentMethod, 'POS');
  assert.equal(updatedPendingReceipt?.grandTotal, 5567600);

  // 3) Customer switches from CASH to VIETQR -> upgrades to SETTLED_COMPLETED & calls /order/payment/update + /order/booking/generate/report
  const vietQrRes = await executeIosBookingAction(
    cvlUser,
    {
      bookingId: 140282,
      action: 'COMPLETE_ORDER',
      billing: {
        paymentMethod: 'VIETQR',
        subtotal: 4970000,
        vatAmount: 397600,
        tipAmount: 100000,
        grandTotal: 5467600,
        bankTransferRef: 'FT26316001122',
      },
      selectedCombo: { id: '7+3', name: 'Combo 7 tặng 3', price: 4190000, todaySingleServiceWaived: true },
      selectedUnderCombo: { id: '2+1', name: 'Combo 2 tặng 1 Mi Dưới', price: 780000, todaySingleServiceWaived: true },
    },
    repo,
    bridgeDeps
  );
  assert.equal(vietQrRes.payload.settlementStatus, 'SETTLED_COMPLETED');
  assert.equal(vietQrRes.payload.override.orderState, 'Completed');
  assert.equal(phpCalls.filter((c) => c.path === '/order/payment/update').length, 1);
  assert.equal(phpCalls.filter((c) => c.path === '/order/booking/generate/report').length, 1);

  // 4) Subsequent retry after SETTLED_COMPLETED -> strictly blocked by IOS_LEGACY_SETTLE:140282 idempotency guard
  const callCountAfterSettled = phpCalls.length;
  const retrySettled = await executeIosBookingAction(
    cvlUser,
    {
      bookingId: 140282,
      action: 'COMPLETE_ORDER',
      billing: { paymentMethod: 'VIETQR', grandTotal: 5467600 },
    },
    repo,
    bridgeDeps
  );
  assert.equal(retrySettled.payload.settlementStatus, 'SETTLED_COMPLETED');
  assert.equal(phpCalls.length, callCountAfterSettled);
});

test('A3-CC: CC / Admin confirming CASH on a pending booking (or spoofing blocked for CVL) settles straight to Completed', async () => {
  const store = createInMemoryConfigStore();
  const repo = createOverrideRepository(store);
  const phpCalls: Array<{ path: string; payload: Record<string, SafeAny> }> = [];
  const fakePool = {} as unknown as mysql.Pool;

  const bridgeDeps = {
    getPool: () => fakePool,
    resolveCatalog: async () => createMockCatalogSnapshot({ products: [] }),
    resolveAuthToken: async () => ({ authUserId: 37790, loginToken: 'tok-diem-huong' }),
    callEndpoint: async (endpointPath: string, payload: Record<string, SafeAny>) => {
      phpCalls.push({ path: endpointPath, payload });
      return { ok: true, status: '1', code: '0000', message: 'OK' };
    },
  };

  const cvlUser = {
    id: 77,
    username: 'thaoly',
    role: 'cvl',
    careerTier: 'CVL' as const,
    legacyStaffId: 46272,
    displayName: 'Thảo Ly',
  };

  const ccUser = {
    id: 88,
    username: 'diemhuong',
    role: 'cc',
    careerTier: 'CC' as const,
    legacyStaffId: 37790,
    displayName: 'Diễm Hương',
  };

  // 1) Even if CVL passes actorStaffTier: 'CC' in payload, backend locks CVL -> stays PENDING_COUNTER_SETTLEMENT
  const spoofAttempt = await executeIosBookingAction(
    cvlUser,
    {
      bookingId: 339300,
      action: 'COMPLETE_ORDER',
      actorStaffTier: 'CC',
      billing: {
        paymentMethod: 'CASH',
        subtotal: 4980000,
        vatAmount: 398400,
        tipAmount: 100000,
        grandTotal: 5478400,
      },
      selectedCombo: { id: '7+3', name: 'Combo 10+6', price: 4980000, todaySingleServiceWaived: false },
    },
    repo,
    bridgeDeps
  );
  assert.equal(spoofAttempt.payload.settlementStatus, 'PENDING_COUNTER_SETTLEMENT');
  assert.equal(spoofAttempt.payload.override.orderState, 'CheckOut');
  assert.equal(
    phpCalls.some((c) => c.path === '/order/payment/update'),
    false
  );

  // 2) CC user taps "Xác Nhận Thu Tiền Mặt" on /ios-app -> immediately settles Completed & calls /order/payment/update
  const ccCashRes = await executeIosBookingAction(
    ccUser,
    {
      bookingId: 339300,
      action: 'COMPLETE_ORDER',
      actorStaffTier: 'CC',
      billing: {
        paymentMethod: 'CASH',
        subtotal: 4980000,
        vatAmount: 398400,
        tipAmount: 100000,
        grandTotal: 5478400,
      },
      selectedCombo: { id: '7+3', name: 'Combo 10+6', price: 4980000, todaySingleServiceWaived: false },
    },
    repo,
    bridgeDeps
  );
  assert.equal(ccCashRes.statusCode, 200);
  assert.equal(ccCashRes.payload.settlementStatus, 'SETTLED_COMPLETED');
  assert.equal(ccCashRes.payload.override.orderState, 'Completed');
  const paymentCall = phpCalls.find((c) => c.path === '/order/payment/update');
  assert.ok(paymentCall, 'CC confirming CASH must immediately invoke /order/payment/update');
  assert.equal(paymentCall.payload.paid_cash_amount, '5478400');
  assert.equal(paymentCall.payload.paid_bank_transfer_amount, '0');
  assert.equal(phpCalls.filter((c) => c.path === '/order/booking/generate/report').length, 1);
});

test('A4: Payroll Tip Split & Checkout Attribution prevent 115.7% inflation and duplicate CVL/CC combo bonus', () => {
  // 1) Self-service CVL order (90% of 100k tip = 90,000đ recorded by StaffTipRunner)
  const selfServiceSplit = resolveCvTipSplitFromRows([{ tip_amount: 90000, tip_percentage: 90 }], 'ACTUAL_PAYROLL');
  assert.equal(selfServiceSplit.totalLedgerTip, 90000);
  assert.equal(selfServiceSplit.baseTechTip, 70000);
  assert.equal(selfServiceSplit.consultDeltaTip, 20000);
  assert.equal(selfServiceSplit.tipCvPlus, 90000); // Never inflated to 90000 * 9/7 = 115,714đ!

  // 2) Partial check-out CVL + cross-consult tip rows (80% + 10% + 70%)
  const mixedSplit = resolveCvTipSplitFromRows(
    [
      { tip_amount: 80000, tip_percentage: 80 },
      { tip_amount: 10000, tip_percentage: 10 },
      { tip_amount: 70000, tip_percentage: 70 },
    ],
    'ACTUAL_PAYROLL'
  );
  assert.equal(mixedSplit.totalLedgerTip, 160000);
  assert.equal(mixedSplit.baseTechTip, 140000); // 70k from 80% row + 70k from 70% row
  assert.equal(mixedSplit.consultDeltaTip, 20000); // 10k from 80% row + 10k from 10% row

  // 3) Simulation mode projects 70% rows to 90% without inflating already-90% rows
  const simSplit = resolveCvTipSplitFromRows(
    [
      { tip_amount: 70000, tip_percentage: 70 },
      { tip_amount: 90000, tip_percentage: 90 },
    ],
    'SIMULATION'
  );
  assert.equal(simSplit.tipCvPlus, 180000);

  // 4) Dual-combo combined tier bonus: 4.19M + 780K = 4.97M (4M-<5M) -> 200k
  const dual = calculateDualComboTierBonus(4190000, 780000);
  assert.equal(dual.combinedPrice, 4970000);
  assert.equal(dual.upperBonus, 200000);
  assert.equal(dual.underBonus, 0);
  assert.equal(dual.totalBonus, 200000);
  assert.equal(calculateDualComboTierBonus(4579200, 4212000).totalBonus, 400000); // Linh: 8.791.200đ -> 400k
  assert.equal(calculateDualComboTierBonus(2304400, 1684800).totalBonus, 150000); // Đoan: 3.989.200đ -> 150k

  // 5) ACTUAL_PAYROLL SQL strictly attributes to check_out_staff_id (excludes CC checkout)
  const actualSql = buildCheckoutAttributionSqlCondition('ACTUAL_PAYROLL');
  assert.ok(actualSql.includes('os.check_out_staff_id = ?'));
  assert.ok(actualSql.includes('os.check_out_staff_id IS NULL OR os.check_out_staff_id = 0'));
});

test('A5: Online Any-Service resolution, PHP check-in vs consultation attribute_value, and promotion preservation', () => {
  const inferred = inferLegacyUpperServiceKeyCandidates({
    serviceName: 'New HyperLight 770K (70 fan) + Mi Dưới (Mới 390K)',
    servicePrice: 1160000,
    serviceType: 'Normal',
    attributes: { material: 'HyperLight', curl: 'C', design: 'Natural', length: '10 - 12mm' },
    hasUnderMink: true,
    underMinkServiceType: 'Normal',
    selectedCombo: { id: 'HyperLight_4X:4_tặng_1:770', name: 'Combo 4 tặng 1 · HyperLight 4X 770', price: 2180000 },
  });
  assert.equal(inferred.prefix, 'new');
  assert.equal(inferred.lineSlug, 'hyperlight');
  assert.ok(inferred.candidateKeys.includes('new-hyperlight-770'));
  assert.equal(inferComboTotalSessions({ name: 'Combo 4 tặng 1 · Mi Dưới 390' }), 5);
  assert.equal(inferComboTotalSessions({ id: '7+3-hyperlight-770' }), 10);

  const built = buildLegacyOrderPayloads({
    orderId: 338781,
    assignedStaffId: 46272,
    serviceName: 'New HyperLight 770K (70 fan) + Mi Dưới (Mới 390K)',
    servicePrice: 1160000,
    attributes: { material: 'HyperLight', curl: 'C', design: 'Natural', length: '9 - 12mm', lashCount: 70 },
    hasUnderMink: true,
    underMinkServiceType: 'Normal',
    selectedCombo: { id: 'HyperLight_4X:4_tặng_1:770', price: 2180000, todaySingleServiceWaived: true },
    selectedUnderCombo: { id: 'Flawless_Mink:4_tặng_1:390', price: 1560000, todaySingleServiceWaived: true },
    billing: { paymentMethod: 'VIETQR', grandTotal: 3989200, diamondUsed: 50 },
    catalog: createMockCatalogSnapshot(),
  });

  // Check-in requires group-keyed object { LashesTop, LashesUnder } while Consultation requires [upperMap, underMap]
  assert.ok('LashesTop' in built.checkInAttributeValue);
  assert.ok('LashesUnder' in built.checkInAttributeValue);
  assert.equal(Array.isArray(built.consultationPayload.attribute_value), true);
  assert.equal(built.consultationPayload.attribute_value.length, 2);
  assert.equal(built.consultationPayload.attribute_value[1]['12'][0].attribute_option_value, '20');
  assert.equal(built.paymentUpdatePayload.promotion_id, '19');
  assert.equal(built.paymentUpdatePayload.user_url_id, '8801');
});

test('A6: CV Xoay attribute isolation (2-step consultation group_key) & Upper/Under Lash SKU/attribute parity', async () => {
  // 1) Upper Lash attributes: /ios-app style, string count ('90 fan'), 2X/3L/5L volume, Flawless/Volume 2D, and English '+ New Flawless Under Mink 390' stripping
  const dollHyper2X = buildUpperLashAttributeMap({
    serviceName: 'New Hyperlight 770 + New Flawless Under Mink 390',
    attributes: {
      material: 'HyperLight',
      style: 'Doll',
      count: '90 fan',
      volume: '2X',
      thickness: '0.05 mm',
      lengths: [9, 11, 12],
      color: 'Nâu Highlight',
    },
  });
  assert.equal(dollHyper2X['10'][0].attribute_option_id, '102'); // Doll (+7 pts)
  assert.equal(dollHyper2X['12'][0].attribute_option_id, '69'); // 90 (+29 pts)
  assert.equal(dollHyper2X['13'][0].attribute_option_id, '86'); // 2X -> 3d (+1 pt, NOT polluted by '+ New Flawless Under Mink')
  assert.equal(dollHyper2X['14'][0].attribute_option_id, '35'); // Brown/Highlight (+5 pts)
  assert.equal(dollHyper2X['15'][0].attribute_option_id, '91'); // 0.05mm
  assert.deepEqual(
    dollHyper2X['11'].map((x) => x.attribute_option_value),
    ['9', '11', '12']
  );

  assert.equal(
    buildUpperLashAttributeMap({ attributes: { material: 'Flawless Mink', style: 'Wing', count: '110 sợi' } })['13'][0]
      .attribute_option_id,
    '84' // 1D (0 pts)
  );
  assert.equal(
    buildUpperLashAttributeMap({ attributes: { material: 'New Volume 2D', style: 'Kim K' } })['13'][0]
      .attribute_option_id,
    '85' // 2D (0 pts)
  );
  assert.equal(
    buildUpperLashAttributeMap({ attributes: { material: 'Ivylight', volume: '5L', count: '90 nhịp' } })['13'][0]
      .attribute_option_id,
    '88' // 5D (+3 pts)
  );

  // 2) Under Mink attributes stay clamped to natural (49), 20 lashes (210 -> +17 pts), 1D (84 -> 0 pts), black (34 -> 0 pts)
  const underMap = buildUnderLashAttributeMap({
    underMinkCurl: 'C',
    underMinkLength: '7mm',
    underMinkThickness: '0.10 mm',
  });
  assert.equal(underMap['9'][0].attribute_option_id, '46');
  assert.equal(underMap['10'][0].attribute_option_id, '49');
  assert.equal(underMap['11'][0].attribute_option_value, '7');
  assert.equal(underMap['12'][0].attribute_option_id, '210');
  assert.equal(underMap['13'][0].attribute_option_id, '84');
  assert.equal(underMap['14'][0].attribute_option_id, '34');
  assert.equal(underMap['15'][0].attribute_option_id, '93');

  // 3) Legacy service_key candidates: -refill suffix, Flawless Mink dot key, Ivylight Normal-only key, Under Mink 250K refill deduction
  const hyperRefill = inferLegacyUpperServiceKeyCandidates({
    serviceName: 'Dặm HyperLight 470K (70 fan) + Mi Dưới (Dặm 250K)',
    servicePrice: 720000,
    serviceType: 'Retain',
    hasUnderMink: true,
    underMinkServiceType: 'Retain',
    selectedCombo: { id: 'HyperLight_4X:4_tặng_1:770' },
  });
  assert.equal(hyperRefill.isRetain, true);
  assert.ok(hyperRefill.candidateKeys.includes('new-hyperlight-770-refill'));

  const flawlessRefill = inferLegacyUpperServiceKeyCandidates({
    serviceName: 'Nối Mới (Giá Dặm) Flawless Mink 530K (110 sợi)',
    servicePrice: 530000,
    serviceType: 'Retain',
    attributes: { material: 'Flawless Mink' },
    selectedCombo: { id: 'Flawless_Mink:4_tặng_1:880' },
  });
  assert.ok(flawlessRefill.candidateKeys.includes('new-flawless.mink-880-refill'));

  const ivyCandidate = inferLegacyUpperServiceKeyCandidates({
    serviceName: 'Nối Mới (Giá Dặm) Ivylight 680K (70 nhịp)',
    servicePrice: 680000,
    serviceType: 'Retain',
    attributes: { material: 'Ivylight', volume: '5L' },
    selectedCombo: { id: 'Ivylight_5L:4_tặng_1:1110' },
  });
  assert.ok(ivyCandidate.candidateKeys.includes('ivylight-5L-1110'));
  assert.equal(
    ivyCandidate.candidateKeys.some((k) => k.endsWith('-refill')),
    false
  );

  // 4) Bridge 2-step consultation isolates Upper Lash (T) vs Under Mink (T+1) attribute_group_key; single-service calls once
  const dualConsultCalls: Array<SafeAny[]> = [];
  let waitCount = 0;
  await settleIosOrderWithLegacyPhp(
    {
      bookingId: 338781,
      mergedOverride: {
        bookingId: 338781,
        serviceName: 'New HyperLight 770K (70 fan) + Mi Dưới (Mới 390K)',
        servicePrice: 1160000,
        attributes: {
          material: 'HyperLight',
          volume: '4X',
          count: '70 fan',
          hasUnderMink: true,
          underMinkServiceType: 'Normal',
        },
        billing: { paymentMethod: 'VIETQR', grandTotal: 0 },
      } as SafeAny,
      checkInStaffId: 46272,
      assignedStaffId: 46272,
      checkOutStaffId: 46272,
    },
    {
      loadSettlementReceipt: async () => null,
      saveSettlementReceipt: async () => {},
      getPool: () => ({}) as unknown as mysql.Pool,
      resolveCatalog: async () =>
        createMockCatalogSnapshot({ products: [], upperCombo: undefined, underCombo: undefined }),
      resolveAuthToken: async () => ({ authUserId: 46272, loginToken: 'tok' }),
      waitNextSecond: async () => {
        waitCount += 1;
      },
      callEndpoint: async (path, payload) => {
        if (path === '/order/booking/consultation') {
          dualConsultCalls.push(payload.attribute_value);
        }
        return { ok: true, status: '1', code: '0000', message: 'OK' };
      },
    }
  );
  assert.equal(dualConsultCalls.length, 2);
  assert.equal(waitCount, 1);
  assert.deepEqual(dualConsultCalls[0][1], {}); // Step 2A: Upper Lash only (Under Mink slot empty)
  assert.equal(dualConsultCalls[1][1]['12'][0].attribute_option_id, '210'); // Step 2B (T+1): Under Mink 20 lashes (+17 pts)
  assert.equal(dualConsultCalls[1][1]['13'][0].attribute_option_id, '84'); // Step 2B (T+1): Under Mink 1D (+0 pts)

  const singleBuilt = buildLegacyOrderPayloads({
    orderId: 338782,
    assignedStaffId: 46272,
    serviceName: 'New HyperLight 770K (70 fan)',
    servicePrice: 770000,
    hasUnderMink: false,
    catalog: createMockCatalogSnapshot({
      underService: undefined,
      underCombo: undefined,
      existingOrderServiceIds: [501001],
    }),
  });
  assert.equal(singleBuilt.preConsultationUpperAttrPayload, undefined);
});

test('Promotion Discount Math & Legacy PHP /order/payment/update Payload Sync (single/combo/upgrade/all + Diamond Lock)', async () => {
  const pctSinglePromo: IosPromotionOption = {
    promotionId: 19,
    promotionKey: 'GIRL-DAY-20',
    promotionType: 'normal',
    promotionApply: 'single',
    serviceGroup: null,
    name: 'Ưu đãi 20% Dịch Vụ Mi',
    shortName: 'Giảm 20%',
    discountPercentage: 20,
    discountAmount: 0,
    exactlyAmount: 0,
    isOldUserDisabled: false,
    isApprovalRequired: false,
    isPublic: true,
    isSystem: false,
    isCreditAllowed: false,
    dateExpired: null,
    position: 1,
  };

  // 1) Percentage single promo: 20% of 880,000 = 176,000; afterDisc = 704,000; VAT 8% = 56,320
  const singleBreakdown = calculateIosPromotionDiscount({
    promotion: pctSinglePromo,
    serviceAmount: 880000,
    comboAmount: 0,
    productAmount: 100000,
    vatRate: 0.08,
  });
  assert.equal(singleBreakdown.serviceDiscount, 176000);
  assert.equal(singleBreakdown.productDiscount, 0);
  assert.equal(singleBreakdown.totalDiscount, 176000);
  assert.equal(singleBreakdown.subtotalAfterDiscount, 804000);
  assert.equal(singleBreakdown.vatAmount, Math.round(804000 * 0.08));

  // 2) Fixed discount_amount uses pre-tax division by (1 + vatRate) matching legacy Common.swift
  const fixedAllPromo: IosPromotionOption = {
    ...pctSinglePromo,
    promotionId: 25,
    promotionApply: 'all',
    discountPercentage: 0,
    discountAmount: 108000,
    isCreditAllowed: true,
  };
  const fixedBreakdown = calculateIosPromotionDiscount({
    promotion: fixedAllPromo,
    serviceAmount: 770000,
    comboAmount: 0,
    productAmount: 0,
    vatRate: 0.08,
  });
  assert.equal(fixedBreakdown.totalDiscount, 100000); // 108,000 / 1.08
  assert.equal(fixedBreakdown.subtotalAfterDiscount, 670000);
  assert.equal(fixedBreakdown.vatAmount, Math.round(670000 * 0.08));

  // 3) exactly_amount overrides price down to target amount
  const exactPromo: IosPromotionOption = {
    ...pctSinglePromo,
    promotionId: 33,
    promotionApply: 'single',
    discountPercentage: 0,
    discountAmount: 0,
    exactlyAmount: 500000,
  };
  const exactBreakdown = calculateIosPromotionDiscount({
    promotion: exactPromo,
    serviceAmount: 880000,
    comboAmount: 0,
    productAmount: 0,
  });
  assert.equal(exactBreakdown.serviceDiscount, 380000);
  assert.equal(exactBreakdown.subtotalAfterDiscount, 500000);

  // 4) Legacy PHP payload carries promotion_id, discount_amount, tax_amount AND locks diamond when isCreditAllowed=false
  const builtWithPromo = buildLegacyOrderPayloads({
    orderId: 339901,
    assignedStaffId: 46272,
    serviceName: 'HyperLight 4X 880',
    servicePrice: 880000,
    promotionId: pctSinglePromo.promotionId,
    appliedPromotion: pctSinglePromo,
    billing: {
      paymentMethod: 'VIETQR',
      diamondUsed: 120,
      diamondDiscountAmount: 120000,
      tipAmount: 50000,
    },
    catalog: createMockCatalogSnapshot({
      underService: undefined,
      underCombo: undefined,
      products: [],
      existingOrderServiceIds: [501001],
    }),
  });

  assert.equal(builtWithPromo.promotionId, 19);
  assert.equal(builtWithPromo.discountAmount, 176000);
  assert.equal(builtWithPromo.diamondCredits, 0); // Locked because isCreditAllowed === false
  assert.equal(builtWithPromo.paymentUpdatePayload.promotion_id, '19');
  assert.equal(builtWithPromo.paymentUpdatePayload.discount_amount, '176000');
  assert.equal(builtWithPromo.paymentUpdatePayload.paid_credit_amount, '0');
  assert.equal(builtWithPromo.selectedService[0].promotion_id, '19');
  assert.equal(builtWithPromo.selectedService[0].discount_amount, '176000');

  // 5) SAVE_PROMOTION action rejects isOldUserDisabled when customerVisits > 1, accepts for first-visit
  const repo = createOverrideRepository(createInMemoryConfigStore());
  const newOnlyPromo: IosPromotionOption = { ...pctSinglePromo, promotionId: 77, isOldUserDisabled: true };
  const ccUser = { id: 88, role: 'cc', careerTier: 'CC' as const, legacyStaffId: 37790, displayName: 'Diễm Hương' };

  const oldGuestReject = await executeIosBookingAction(
    ccUser,
    { bookingId: 339901, action: 'SAVE_PROMOTION', promotionId: 77, appliedPromotion: newOnlyPromo, customerVisits: 5 },
    repo
  );
  assert.equal(oldGuestReject.statusCode, 400);

  const newGuestOk = await executeIosBookingAction(
    ccUser,
    { bookingId: 339901, action: 'SAVE_PROMOTION', promotionId: 77, appliedPromotion: newOnlyPromo, customerVisits: 1 },
    repo
  );
  assert.equal(newGuestOk.statusCode, 200);
  assert.equal(newGuestOk.payload.override.promotionId, 77);
  assert.equal(newGuestOk.payload.override.billing.diamondUsed, 0);
});

test('A7-Itemized: Per-item promotions on service/combo/product, partial Diamond credit & SAVE_PROMOTION targetScope', async () => {
  const servicePromoNoCredit: IosPromotionOption = {
    promotionId: 19,
    promotionKey: 'PROMO-SVC-20',
    promotionType: 'normal',
    promotionApply: 'single',
    serviceGroup: null,
    name: 'Giảm 20% Dịch Vụ Mi',
    shortName: 'Giảm 20%',
    discountPercentage: 20,
    discountAmount: 0,
    exactlyAmount: 0,
    isOldUserDisabled: false,
    isApprovalRequired: false,
    isPublic: true,
    isSystem: false,
    isCreditAllowed: false,
    dateExpired: null,
    position: 1,
  };

  const productPromoWithCredit: IosPromotionOption = {
    promotionId: 25,
    promotionKey: 'SERUM-10',
    promotionType: 'normal',
    promotionApply: 'all',
    serviceGroup: null,
    name: 'Giảm 10% Dưỡng Mi',
    shortName: 'Dưỡng -10%',
    discountPercentage: 10,
    discountAmount: 0,
    exactlyAmount: 0,
    isOldUserDisabled: false,
    isApprovalRequired: false,
    isPublic: true,
    isSystem: false,
    isCreditAllowed: true,
    dateExpired: null,
    position: 2,
  };

  const breakdown = calculateIosItemizedPromotionDiscounts({
    serviceAmount: 880000,
    upgradeAmount: 0,
    servicePromotion: servicePromoNoCredit,
    comboAmount: 3000000,
    comboPromotion: null,
    underComboAmount: 0,
    underComboPromotion: null,
    products: [{ productId: 901, amount: 500000, promotion: productPromoWithCredit }],
    vatRate: 0.08,
  });

  // Service: 20% of 880k = 176k (not credit-eligible); Product: 10% of 500k = 50k (credit-eligible)
  assert.equal(breakdown.serviceDiscount, 176000);
  assert.equal(breakdown.totalProductDiscount, 50000);
  assert.equal(breakdown.totalDiscount, 226000);
  assert.equal(breakdown.hasAnyCreditRestrictedItem, true);
  assert.equal(breakdown.isFullCreditLocked, false);
  // Credit-eligible payable = Combo (3,000,000) + Product net (450,000) = 3,450,000 + 8% VAT = 3,726,000
  assert.equal(breakdown.creditEligiblePayableWithVat, Math.round((3000000 + 450000) * 1.08));

  // Build legacy payloads: 200 💎 = 200,000đ <= credit-eligible product payable (486,000đ) -> applied ONLY to product, 0 on service
  const built = buildLegacyOrderPayloads({
    orderId: 339955,
    assignedStaffId: 46272,
    serviceName: 'HyperLight 4X 880',
    servicePrice: 880000,
    servicePromotionId: servicePromoNoCredit.promotionId,
    servicePromotion: servicePromoNoCredit,
    cartProducts: [
      {
        productId: 901,
        productName: 'Dưỡng Mi Cao Cấp',
        price: 500000,
        quantity: 1,
        promotionId: productPromoWithCredit.promotionId,
        appliedPromotion: productPromoWithCredit,
      },
    ],
    billing: {
      paymentMethod: 'CASH',
      diamondUsed: 200,
      diamondDiscountAmount: 200000,
      tipAmount: 0,
    },
    catalog: createMockCatalogSnapshot({
      underService: undefined,
      underCombo: undefined,
      products: [
        {
          productId: 901,
          inventoryWarehouseItemId: 8002,
          firstInventoryWarehouseOrderItemId: 9002,
          unitPrice: 500000,
          quantity: 1,
          discountAmount: 0,
        },
      ],
      existingOrderServiceIds: [501001],
    }),
  });

  assert.equal(built.selectedService[0].promotion_id, '19');
  assert.equal(built.selectedService[0].discount_amount, '176000');
  assert.equal(built.selectedService[0].paid_credit_amount, '0');
  assert.equal(built.selectedProductForPayment[0].promotion_id, '25');
  assert.equal(built.selectedProductForPayment[0].discount_amount, '50000');
  assert.equal(built.selectedProductForPayment[0].paid_credit_amount, '200');
  assert.equal(built.diamondCredits, 200);

  // SAVE_PROMOTION with targetScope mutates service / product / combo independently
  const repo = createOverrideRepository(createInMemoryConfigStore());
  const ccUser = { id: 88, role: 'cc', careerTier: 'CC' as const, legacyStaffId: 37790, displayName: 'Diễm Hương' };

  const afterSvc = await executeIosBookingAction(
    ccUser,
    {
      bookingId: 339955,
      action: 'SAVE_PROMOTION',
      targetScope: 'service',
      promotionId: servicePromoNoCredit.promotionId,
      appliedPromotion: servicePromoNoCredit,
      customerVisits: 5,
    },
    repo
  );
  assert.equal(afterSvc.statusCode, 200);
  assert.equal(afterSvc.payload.override.servicePromotionId, 19);

  // Add product to override via UPDATE_CART first or alongside product promo
  const withCart = await executeIosBookingAction(
    ccUser,
    {
      bookingId: 339955,
      action: 'SAVE_UPSELL',
      cartProducts: [{ productId: 901, productName: 'Dưỡng Mi Cao Cấp', price: 500000, quantity: 1 }],
    },
    repo
  );
  assert.equal(withCart.statusCode, 200);

  const afterProd = await executeIosBookingAction(
    ccUser,
    {
      bookingId: 339955,
      action: 'SAVE_PROMOTION',
      targetScope: 'product',
      productIndex: 0,
      productId: 901,
      promotionId: productPromoWithCredit.promotionId,
      appliedPromotion: productPromoWithCredit,
      customerVisits: 5,
    },
    repo
  );
  assert.equal(afterProd.statusCode, 200);
  assert.equal(afterProd.payload.override.servicePromotionId, 19);
  assert.equal(afterProd.payload.override.cartProducts?.[0]?.promotionId, 25);

  // Clearing service promo preserves product promo
  const afterClearSvc = await executeIosBookingAction(
    ccUser,
    {
      bookingId: 339955,
      action: 'SAVE_PROMOTION',
      targetScope: 'service',
      promotionId: null,
      appliedPromotion: null,
      customerVisits: 5,
    },
    repo
  );
  assert.equal(afterClearSvc.statusCode, 200);
  assert.equal(afterClearSvc.payload.override.servicePromotionId, null);
  assert.equal(afterClearSvc.payload.override.cartProducts?.[0]?.promotionId, 25);

  // Combos are never discounted: reject targetScope='combo' in SAVE_PROMOTION and keep comboDiscount=0 in math
  const comboReject = await executeIosBookingAction(
    ccUser,
    {
      bookingId: 339955,
      action: 'SAVE_PROMOTION',
      targetScope: 'combo' as SafeAny,
      promotionId: servicePromoNoCredit.promotionId,
      appliedPromotion: servicePromoNoCredit,
      customerVisits: 5,
    },
    repo
  );
  assert.equal(comboReject.statusCode, 400);

  const noComboBreakdown = calculateIosItemizedPromotionDiscounts({
    serviceAmount: 880000,
    comboAmount: 3000000,
    comboPromotion: servicePromoNoCredit,
    underComboAmount: 780000,
    underComboPromotion: productPromoWithCredit,
    products: [],
    vatRate: 0.08,
  });
  assert.equal(noComboBreakdown.comboDiscount, 0);
  assert.equal(noComboBreakdown.underComboDiscount, 0);
  assert.equal(noComboBreakdown.totalDiscount, 0);

  const allPromoSkipCombo = calculateIosPromotionDiscount({
    promotion: { ...productPromoWithCredit, promotionApply: 'all' },
    serviceAmount: 880000,
    comboAmount: 3000000,
    productAmount: 500000,
    vatRate: 0.08,
  });
  assert.equal(allPromoSkipCombo.comboDiscount, 0);
  assert.equal(allPromoSkipCombo.serviceDiscount, 88000);
  assert.equal(allPromoSkipCombo.productDiscount, 50000);
});

test('A8-Split & Custom Diamond: MIXED 3-way payment split syncs paid_*_amount to PHP and respects A3 Cash Gate', () => {
  // 880,000 + 8% VAT (70,400) = 950,400; minus custom 37 diamonds (-37,000) = 913,400
  const breakdown = {
    vietqrAmount: 400000,
    posAmount: 300000,
    cashAmount: 213400,
  };

  // CVL cannot self-settle a MIXED bill containing Cash or POS -> stops at CheckOut
  const cvlBuilt = buildLegacyOrderPayloads({
    orderId: 339988,
    assignedStaffId: 46272,
    serviceName: 'HyperLight 4X 880',
    servicePrice: 880000,
    settlementActorTier: 'CVL',
    billing: {
      paymentMethod: 'MIXED',
      paymentBreakdown: breakdown,
      diamondUsed: 37,
      diamondDiscountAmount: 37000,
      tipAmount: 0,
    },
    catalog: createMockCatalogSnapshot({
      underService: undefined,
      underCombo: undefined,
      products: [],
      existingOrderServiceIds: [501001],
    }),
  });

  assert.equal(cvlBuilt.paymentMethod, 'MIXED');
  assert.equal(cvlBuilt.shouldSettleCompletedImmediately, false);
  assert.equal(cvlBuilt.diamondCredits, 37);
  assert.equal(cvlBuilt.grandTotal, 913400);
  assert.equal(cvlBuilt.paymentUpdatePayload.paid_credit_amount, '37');
  assert.equal(cvlBuilt.paymentUpdatePayload.paid_bank_transfer_amount, '400000');
  assert.equal(cvlBuilt.paymentUpdatePayload.paid_credit_card_amount, '300000');
  assert.equal(cvlBuilt.paymentUpdatePayload.paid_cash_amount, '213400');

  // CC settles immediately to Completed with exact 3-channel PHP split amounts
  const ccBuilt = buildLegacyOrderPayloads({
    orderId: 339988,
    assignedStaffId: 46272,
    serviceName: 'HyperLight 4X 880',
    servicePrice: 880000,
    settlementActorTier: 'CC',
    billing: {
      paymentMethod: 'MIXED',
      paymentBreakdown: breakdown,
      diamondUsed: 37,
      diamondDiscountAmount: 37000,
      tipAmount: 0,
    },
    catalog: createMockCatalogSnapshot({
      underService: undefined,
      underCombo: undefined,
      products: [],
      existingOrderServiceIds: [501001],
    }),
  });

  assert.equal(ccBuilt.shouldSettleCompletedImmediately, true);
  assert.deepEqual(ccBuilt.paymentBreakdown, breakdown);
});
