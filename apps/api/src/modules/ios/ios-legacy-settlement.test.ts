import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { calculateDualComboTierBonus, SafeAny } from '@mos-lab/shared';
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
  assert.equal(shouldAutoCompleteLegacyOrder('CASH', built.grandTotal), false);
  assert.equal(shouldAutoCompleteLegacyOrder('POS', built.grandTotal), false);
  assert.equal(shouldAutoCompleteLegacyOrder('CASH', 0), true);
  assert.equal(shouldAutoCompleteLegacyOrder('VIETQR', built.grandTotal), true);
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
