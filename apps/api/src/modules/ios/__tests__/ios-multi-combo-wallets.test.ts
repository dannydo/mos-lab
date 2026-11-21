import test from 'node:test';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {
  getVietnamDateYmd,
  resolveActiveBookingComboWallets,
  type IosCustomerComboWalletItem,
  type SafeAny,
} from '@mos-lab/shared';
import {
  createEmptyCustomerEnrichmentContext,
  enrichCustomerComboMapsFromRows,
} from '../services/ios-customer-enrichment.service.js';
import { syncSettledComboExpiryInLegacyDb } from '../services/ios-combo-expiry.service.js';
import {
  buildLegacyWalletReconciliationPlan,
  pinSelectedWalletTransactionsBeforeReport,
  reconcileSelectedWalletDeductionInLegacyDb,
  refundSkippedWalletDeductionInLegacyDb,
} from '../services/ios-legacy-wallet-reconciler.service.js';
import { executeIosBookingAction } from '../services/ios-actions.service.js';
import { createInMemoryConfigStore, createOverrideRepository } from '../services/ios-overrides.service.js';
import type { LegacyOrderCatalogSnapshot } from '../services/ios-legacy-payload.mapper.js';

function makeWallet(overrides: Partial<IosCustomerComboWalletItem>): IosCustomerComboWalletItem {
  return {
    balanceId: 101,
    serviceId: 115,
    servicePriceId: 9115,
    serviceGroup: 'upper',
    comboName: 'Combo 4 tặng 1 · HyperLight 4X 770',
    serviceKey: 'hyperlight-4x-770',
    normalRemaining: 2,
    retainRemaining: 2,
    remainingSessions: 4,
    dateExpired: '2026-12-20',
    isFrozen: false,
    isExpired: false,
    isExpiringSoon: false,
    daysRemaining: 25,
    avgDaysPerSession: 6.3,
    expiryState: 'ACTIVE',
    retainDaysLimit: 25,
    ...overrides,
  };
}

test('resolveActiveBookingComboWallets enforces selection priority, expired lock, and retail skip mode', () => {
  const walletClassic = makeWallet({
    balanceId: 101,
    serviceId: 101,
    comboName: 'Combo Classic 1D 550',
    serviceKey: 'classic-1d-550',
    dateExpired: '2026-12-25',
    daysRemaining: 30,
  });
  const walletHyperFefo = makeWallet({
    balanceId: 102,
    serviceId: 115,
    comboName: 'Combo HyperLight 4X 770',
    serviceKey: 'hyperlight-4x-770',
    dateExpired: '2026-12-01',
    daysRemaining: 10,
  });
  const walletExpired = makeWallet({
    balanceId: 103,
    comboName: 'Combo Volume 3D 660',
    serviceKey: 'volume-3d-660',
    dateExpired: '2026-10-01',
    isExpired: true,
    expiryState: 'EXPIRED',
    daysRemaining: -30,
  });

  // 1. Explicit selection overrides booked & FEFO
  const explicit = resolveActiveBookingComboWallets({
    comboWallets: [walletClassic, walletHyperFefo, walletExpired],
    selectedUpperComboBalanceId: 101,
    bookedServiceName: 'HyperLight 4X 770',
    todayYmd: '2026-11-19',
  });
  assert.equal(explicit.selectedUpperComboBalanceId, 101);
  assert.equal(explicit.activeUpperWallet?.balanceId, 101);
  assert.equal(explicit.isRedeemingUpperToday, true);

  // 2. Booked service match beats FEFO & last visit
  const bookedMatch = resolveActiveBookingComboWallets({
    comboWallets: [walletClassic, walletHyperFefo],
    bookedServiceName: 'Classic 1D 550',
    lastVisitServiceKey: 'hyperlight-4x-770',
    todayYmd: '2026-11-19',
  });
  assert.equal(bookedMatch.selectedUpperComboBalanceId, 101);

  // 3. Last visit match beats FEFO when no booked match
  const lastVisitMatch = resolveActiveBookingComboWallets({
    comboWallets: [walletClassic, walletHyperFefo],
    bookedServiceName: 'Ivylight 880',
    lastVisitServiceKey: 'classic-1d-550',
    todayYmd: '2026-11-19',
  });
  assert.equal(lastVisitMatch.selectedUpperComboBalanceId, 101);

  // 4. FEFO fallback when neither booked nor last visit matches
  const fefoFallback = resolveActiveBookingComboWallets({
    comboWallets: [walletClassic, walletHyperFefo],
    bookedServiceName: 'Ivylight 880',
    todayYmd: '2026-11-19',
  });
  assert.equal(fefoFallback.selectedUpperComboBalanceId, 102);

  // 5. Selecting an expired wallet never marks isComboLive true
  const selectedExpired = resolveActiveBookingComboWallets({
    comboWallets: [walletExpired],
    selectedUpperComboBalanceId: 103,
    todayYmd: '2026-11-19',
  });
  assert.equal(selectedExpired.isRedeemingUpperToday, false);
  assert.equal(selectedExpired.activeUpperWallet, null);
  assert.equal(selectedExpired.displayUpperWallet?.balanceId, 103);
  assert.equal(selectedExpired.effectiveComboLiveStatus.isComboLive, false);

  // 6. Skip mode falls back to 21-day retail limit while keeping wallets selectable
  const skipped = resolveActiveBookingComboWallets({
    comboWallets: [walletClassic, walletHyperFefo],
    skipUpperCombo: true,
    todayYmd: '2026-11-19',
  });
  assert.equal(skipped.skipUpperCombo, true);
  assert.equal(skipped.selectedUpperComboBalanceId, null);
  assert.equal(skipped.isRedeemingUpperToday, false);
  assert.equal(skipped.effectiveComboLiveStatus.retainDaysLimit, 21);
  assert.equal(skipped.upperWallets.length, 2);
});

test('enrichCustomerComboMapsFromRows keeps 2 live Mi Dưới wallets independent instead of summing sessions', () => {
  const ctx = createEmptyCustomerEnrichmentContext();
  enrichCustomerComboMapsFromRows({
    ctx,
    todayYmd: '2026-11-19',
    upperRows: [],
    underRows: [
      {
        id: 601,
        user_id: 2001,
        service_id: 210,
        service_price_id: 9210,
        normal_remaining: 1,
        retain_remaining: 1,
        combo_name: 'Combo Mi Dưới 390 #A',
        service_key: 'under-mink-390',
        package_key: '4+1-under-390',
        date_expired: '2026-12-01 23:59:59',
      },
      {
        id: 602,
        user_id: 2001,
        service_id: 210,
        service_price_id: 9211,
        normal_remaining: 2,
        retain_remaining: 1,
        combo_name: 'Combo Mi Dưới 390 #B',
        service_key: 'under-mink-390',
        package_key: '4+1-under-390',
        date_expired: '2026-12-20 23:59:59',
      },
    ],
  });

  const primaryUnder = ctx.underMinkComboMap.get(2001);
  assert.ok(primaryUnder);
  // FEFO selects #601 (2 remaining), NEVER summed to 5
  assert.equal(primaryUnder.balanceId, 601);
  assert.equal(primaryUnder.remainingSessions, 2);
  assert.equal(primaryUnder.normalRemaining, 1);
  assert.equal(primaryUnder.retainRemaining, 1);

  const wallets = ctx.comboWalletsMap.get(2001) || [];
  assert.equal(wallets.length, 2);
  assert.deepEqual(
    wallets.map((w) => ({
      id: w.balanceId,
      serviceId: w.serviceId,
      servicePriceId: w.servicePriceId,
      rem: w.remainingSessions,
    })),
    [
      { id: 601, serviceId: 210, servicePriceId: 9210, rem: 2 },
      { id: 602, serviceId: 210, servicePriceId: 9211, rem: 3 },
    ]
  );
});

test('syncSettledComboExpiryInLegacyDb unfreezes ONLY targeted balanceId for upper and under without touching sibling wallets', async () => {
  const queries: Array<{ sql: string; params: SafeAny[] }> = [];
  const fakePool = {
    query: async (sql: string, params: SafeAny[] = []) => {
      const clean = sql.replace(/\s+/g, ' ').trim();
      queries.push({ sql: clean, params });
      return [{ affectedRows: 1 }];
    },
  } as unknown as mysql.Pool;

  await syncSettledComboExpiryInLegacyDb(fakePool, {
    customerUserId: 9001,
    staffId: 13783,
    comboRedemption: { balanceId: 102, redeemSession: true },
    selectedUpperComboBalanceId: 102,
    selectedUnderComboBalanceId: 202,
    hasUnderMinkComboRedemption: true,
  });

  const unfreezeQueries = queries.filter((q) => q.sql.includes('UPDATE user_service_balance usb'));
  assert.equal(unfreezeQueries.length, 2);
  assert.ok(unfreezeQueries[0].sql.includes('WHERE usb.id = ? AND usb.user_id = ? AND usb.date_expired IS NULL'));
  assert.deepEqual(unfreezeQueries[0].params, [13783, 102, 9001]);
  assert.ok(unfreezeQueries[1].sql.includes('WHERE usb.id = ? AND usb.user_id = ? AND usb.date_expired IS NULL'));
  assert.deepEqual(unfreezeQueries[1].params, [13783, 202, 9001]);
  assert.equal(
    unfreezeQueries.some((q) => q.sql.includes('ORDER BY usb.id DESC LIMIT 1')),
    false
  );
});

test('Legacy wallet reconciler handles 2 same-service wallets, cross-line upgrades, independent under wallet, and skip refund', async () => {
  // In-memory mock Legacy DB state
  const balances = new Map<number, SafeAny>([
    [
      101,
      {
        id: 101,
        user_id: 9001,
        service_id: 115,
        normal_count: 2,
        retain_count: 1,
        total_normal_balance_amount: 880000,
        total_retain_balance_amount: 340000,
        date_expired: '2026-12-01 23:59:59',
      },
    ],
    [
      102,
      {
        id: 102,
        user_id: 9001,
        service_id: 115,
        normal_count: 3,
        retain_count: 2,
        total_normal_balance_amount: 1320000,
        total_retain_balance_amount: 680000,
        date_expired: '2026-12-20 23:59:59',
      },
    ],
    [
      202,
      {
        id: 202,
        user_id: 9001,
        service_id: 210,
        normal_count: 1,
        retain_count: 2,
        total_normal_balance_amount: 350000,
        total_retain_balance_amount: 450000,
        date_expired: '2026-12-15 23:59:59',
      },
    ],
  ]);

  const transactions = new Map<number, SafeAny>([
    [
      7001,
      {
        id: 7001,
        user_service_balance_id: 101,
        user_id: 9001,
        normal_count: 1,
        retain_count: 0,
        normal_balance_amount: 440000,
        retain_balance_amount: 0,
        used_staff_id: null,
        changed_staff_id: null,
        cancelled_staff_id: null,
        order_id: null,
        order_service_id: null,
        date_expired: '2026-12-01 23:59:59',
      },
    ],
    [
      7002,
      {
        id: 7002,
        user_service_balance_id: 102,
        user_id: 9001,
        normal_count: 1,
        retain_count: 0,
        normal_balance_amount: 440000,
        retain_balance_amount: 0,
        used_staff_id: null,
        changed_staff_id: null,
        cancelled_staff_id: null,
        order_id: null,
        order_service_id: null,
        date_expired: '2026-12-20 23:59:59',
      },
    ],
    [
      7022,
      {
        id: 7022,
        user_service_balance_id: 202,
        user_id: 9001,
        normal_count: 0,
        retain_count: 1,
        normal_balance_amount: 0,
        retain_balance_amount: 225000,
        used_staff_id: null,
        changed_staff_id: null,
        cancelled_staff_id: null,
        order_id: null,
        order_service_id: null,
        date_expired: '2026-12-15 23:59:59',
      },
    ],
  ]);

  const orderServices = new Map<number, SafeAny>([
    [5001, { id: 5001, order_id: 777001, user_service_balance_transaction_id: null, balance_price: 0 }],
    [5002, { id: 5002, order_id: 777001, user_service_balance_transaction_id: null, balance_price: 0 }],
  ]);

  const fakePool = {
    query: async (sql: string, params: SafeAny[] = []) => {
      const clean = sql.replace(/\s+/g, ' ').trim();
      if (clean.startsWith('SELECT id, user_service_balance_transaction_id FROM order_service WHERE id = ?')) {
        const os = orderServices.get(Number(params[0]));
        return [os ? [os] : []];
      }
      if (clean.includes('FROM user_service_balance_transaction WHERE id = ?')) {
        const tx = transactions.get(Number(params[0]));
        return [tx ? [tx] : []];
      }
      if (clean.includes('FROM user_service_balance_transaction WHERE user_service_balance_id = ? AND user_id = ?')) {
        const [balId, userId, preferredServiceType] = params;
        const list = Array.from(transactions.values())
          .filter(
            (t) =>
              t.user_service_balance_id === Number(balId) &&
              t.user_id === Number(userId) &&
              !t.used_staff_id &&
              !t.changed_staff_id &&
              !t.cancelled_staff_id &&
              (t.normal_count > 0 || t.retain_count > 0)
          )
          .sort((a, b) => {
            const aMatch = preferredServiceType === 'Retain' ? a.retain_count > 0 : a.normal_count > 0;
            const bMatch = preferredServiceType === 'Retain' ? b.retain_count > 0 : b.normal_count > 0;
            if (aMatch !== bMatch) return aMatch ? -1 : 1;
            return a.id - b.id;
          });
        return [list.slice(0, 1)];
      }
      if (
        clean.startsWith(
          'UPDATE order_service SET user_service_balance_transaction_id = ?, balance_price = ? WHERE id = ?'
        )
      ) {
        const [txId, price, osId] = params;
        const os = orderServices.get(Number(osId));
        if (os) {
          os.user_service_balance_transaction_id = txId;
          os.balance_price = price;
        }
        return [{ affectedRows: 1 }];
      }
      if (clean.includes('FROM user_service_balance_transaction WHERE order_id = ? AND used_staff_id IS NOT NULL')) {
        const bookingId = Number(params[0]);
        return [Array.from(transactions.values()).filter((t) => t.order_id === bookingId && t.used_staff_id !== null)];
      }
      if (clean.startsWith('UPDATE user_service_balance SET normal_count = normal_count + ?')) {
        const [incN, incR, incNAmt, incRAmt, _exp, _staff, balId] = params;
        const bal = balances.get(Number(balId));
        if (bal) {
          bal.normal_count += Number(incN);
          bal.retain_count += Number(incR);
          bal.total_normal_balance_amount += Number(incNAmt);
          bal.total_retain_balance_amount += Number(incRAmt);
        }
        return [{ affectedRows: 1 }];
      }
      if (clean.startsWith('UPDATE user_service_balance SET normal_count = GREATEST(0, normal_count - ?)')) {
        const [decN, decR, decNAmt, decRAmt, _dn2, _dr2, _staff, balId] = params;
        const bal = balances.get(Number(balId));
        if (bal) {
          bal.normal_count = Math.max(0, bal.normal_count - Number(decN));
          bal.retain_count = Math.max(0, bal.retain_count - Number(decR));
          bal.total_normal_balance_amount = Math.max(0, bal.total_normal_balance_amount - Number(decNAmt));
          bal.total_retain_balance_amount = Math.max(0, bal.total_retain_balance_amount - Number(decRAmt));
        }
        return [{ affectedRows: 1 }];
      }
      if (
        clean.startsWith(
          'SELECT normal_count, retain_count, total_normal_balance_amount, total_retain_balance_amount FROM user_service_balance WHERE id = ?'
        )
      ) {
        const bal = balances.get(Number(params[0]));
        return [bal ? [bal] : []];
      }
      if (clean.startsWith('UPDATE user_service_balance_transaction SET used_staff_id = NULL')) {
        const tx = transactions.get(Number(params[0]));
        if (tx) {
          tx.used_staff_id = null;
          tx.order_id = null;
          tx.order_service_id = null;
        }
        return [{ affectedRows: 1 }];
      }
      if (clean.startsWith('UPDATE user_service_balance_transaction SET used_staff_id = ?')) {
        const [staffId, orderId, osId, leftN, leftR, _laN, _laR, txId] = params;
        const tx = transactions.get(Number(txId));
        if (tx) {
          tx.used_staff_id = staffId;
          tx.order_id = orderId;
          tx.order_service_id = osId;
          tx.total_normal_count_left = leftN;
          tx.total_retain_count_left = leftR;
        }
        return [{ affectedRows: 1 }];
      }
      if (
        clean.startsWith(
          'UPDATE order_service SET user_service_balance_transaction_id = NULL, balance_price = 0 WHERE id = ?'
        )
      ) {
        const os = orderServices.get(Number(params[0]));
        if (os) {
          os.user_service_balance_transaction_id = null;
          os.balance_price = 0;
        }
        return [{ affectedRows: 1 }];
      }
      return [[]];
    },
  } as unknown as mysql.Pool;

  // A. Pin #102 & #202 before report even when #101 & #102 share the same service_id
  const slots = [
    { orderServiceId: 5001, targetBalanceId: 102, preferredServiceType: 'Normal' as const },
    { orderServiceId: 5002, targetBalanceId: 202, preferredServiceType: 'Retain' as const },
  ];
  await pinSelectedWalletTransactionsBeforeReport(fakePool, { customerUserId: 9001, slots });
  assert.equal(orderServices.get(5001)?.user_service_balance_transaction_id, 7002);
  assert.equal(orderServices.get(5002)?.user_service_balance_transaction_id, 7022);

  // B. Simulate PHP ignoring pin and deducting #101 instead of #102
  const tx101 = transactions.get(7001)!;
  tx101.used_staff_id = 13783;
  tx101.order_id = 777001;
  tx101.order_service_id = 5001;
  balances.get(101)!.normal_count -= 1;
  balances.get(101)!.total_normal_balance_amount -= 440000;

  await reconcileSelectedWalletDeductionInLegacyDb(fakePool, {
    bookingId: 777001,
    customerUserId: 9001,
    staffId: 13783,
    slots,
  });

  // #101 is refunded cleanly; #102 and #202 are deducted accurately
  assert.equal(balances.get(101)?.normal_count, 2);
  assert.equal(tx101.used_staff_id, null);
  assert.equal(balances.get(102)?.normal_count, 2);
  assert.equal(transactions.get(7002)?.used_staff_id, 13783);
  assert.equal(orderServices.get(5001)?.user_service_balance_transaction_id, 7002);
  assert.equal(balances.get(202)?.retain_count, 1);
  assert.equal(transactions.get(7022)?.used_staff_id, 13783);
  assert.equal(orderServices.get(5002)?.user_service_balance_transaction_id, 7022);

  // C. Skip mode: buildLegacyWalletReconciliationPlan + refundSkippedWalletDeductionInLegacyDb refunds unintended deduction
  const plan = buildLegacyWalletReconciliationPlan({
    mergedOverride: {
      bookingId: 777001,
      skipUpperCombo: true,
      skipUnderCombo: false,
      attributes: { hasUnderMink: true, underMinkServiceType: 'Retain' },
    },
    walletFlags: {
      selectedUpperBalanceId: null,
      selectedUnderBalanceId: 202,
      skipUpperCombo: true,
      skipUnderCombo: false,
      effectiveRedeemUpper: false,
      effectiveRedeemUnder: true,
    },
    effectiveComboRedemption: null,
    activeOrderServiceIds: [5001, 5002],
  });
  assert.deepEqual(plan.skippedOrderServiceIds, [5001]);
  assert.equal(plan.targetWalletSlots.length, 1);
  assert.equal(plan.targetWalletSlots[0]?.targetBalanceId, 202);

  // Suppose PHP auto-deducted #102 on 5001 even though upper was skipped -> refund restores #102 back to 3!
  await refundSkippedWalletDeductionInLegacyDb(fakePool, {
    bookingId: 777001,
    staffId: 13783,
    skippedOrderServiceIds: plan.skippedOrderServiceIds,
  });
  assert.equal(balances.get(102)?.normal_count, 3);
  assert.equal(transactions.get(7002)?.used_staff_id, null);
  assert.equal(orderServices.get(5001)?.user_service_balance_transaction_id, null);
  assert.equal(orderServices.get(5001)?.balance_price, 0);
});

test('executePostCheckoutAdjustmentAction supports 0-delta swap from Wallet #101 to Wallet #102', async () => {
  const store = createInMemoryConfigStore();
  const repo = createOverrideRepository(store);
  const today = getVietnamDateYmd();

  await repo.saveBookingOverride(888099, {
    bookingId: 888099,
    status: 'DONE',
    orderState: 'Completed',
    bookingDateYmd: today,
    assignedStaffId: 13783,
    assignedStaffName: 'Khanh Cao',
    assignedStaffTier: 'CVL',
    checkInStaffId: 13783,
    checkInStaffName: 'Khanh Cao',
    checkOutStaffId: 13783,
    checkOutStaffName: 'Khanh Cao',
    checkOutStaffTier: 'CVL',
    servicePrice: 770000,
    serviceName: 'HyperLight 4X 770',
    selectedUpperComboBalanceId: 101,
    skipUpperCombo: false,
    comboRedemption: {
      balanceId: 101,
      redeemSession: true,
      comboName: 'Combo 4 tặng 1 · HyperLight 4X 770 #1',
      totalCustomerPayToday: 0,
      recognizedRevenueToday: 440000,
    },
    billing: {
      subtotal: 0,
      serviceTotal: 0,
      comboTotal: 0,
      productTotal: 0,
      vatAmount: 0,
      tipAmount: 0,
      diamondUsed: 0,
      diamondDiscountAmount: 0,
      grandTotal: 0,
      paymentMethod: 'VIETQR',
      paymentBreakdown: { vietqrAmount: 0, posAmount: 0, cashAmount: 0 },
      settlementStatus: 'SETTLED_COMPLETED',
    },
  });

  const fakePool = {
    query: async (sql: string) => {
      const clean = sql.replace(/\s+/g, ' ').trim();
      if (clean.startsWith('SELECT id, user_id, client_store_id, order_state')) {
        return [
          [
            {
              id: 888099,
              user_id: 9001,
              client_store_id: 6,
              order_state: 'Completed',
              booking_date_start: `${today} 09:00:00`,
            },
          ],
        ];
      }
      return [[]];
    },
  } as unknown as mysql.Pool;

  const catalog: LegacyOrderCatalogSnapshot = {
    orderExists: true,
    orderId: 888099,
    customerUserId: 9001,
    clientStoreId: 6,
    currentOrderState: 'Consultation',
    promotionId: null,
    userUrlId: 1201,
    existingOrderServiceIds: [501099],
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
    staffFiveStarSurveyAnswers: {},
    customerHappySurveyAnswers: {},
  };

  const khanhCvl = {
    id: 1,
    username: 'khanhcao',
    role: 'cvl',
    careerTier: 'CVL' as const,
    legacyStaffId: 13783,
    displayName: 'Khanh Cao',
  };

  const res = await executeIosBookingAction(
    khanhCvl,
    {
      bookingId: 888099,
      action: 'SUBMIT_POST_CHECKOUT_ADJUSTMENT',
      bookingDateYmd: today,
      targetCheckOutStaffId: 13783,
      targetCheckOutStaffName: 'Khanh Cao',
      targetCheckOutStaffTier: 'CVL',
      selectedUpperComboBalanceId: 102,
      skipUpperCombo: false,
      comboRedemption: {
        balanceId: 102,
        redeemSession: true,
        comboName: 'Combo 4 tặng 1 · HyperLight 4X 770 #2',
        totalCustomerPayToday: 0,
        recognizedRevenueToday: 440000,
      },
      paymentMode: 'TOP_UP',
      deltaPaymentMethod: 'VIETQR',
    },
    repo,
    {
      getPool: () => fakePool,
      resolveCatalog: async () => catalog,
      resolveAuthToken: async () => ({ authUserId: 13783, loginToken: 'tok-khanh' }),
      callEndpoint: async () => ({ ok: true, status: '1', code: '0000', message: 'OK' }),
    }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.override?.billing?.lastAdjustmentDeltaAmount, 0);
  assert.equal(res.payload.override?.selectedUpperComboBalanceId, 102);
  assert.equal(res.payload.override?.comboRedemption?.balanceId, 102);
  assert.equal(res.payload.override?.postCheckoutAdjustments?.length, 1);
  assert.equal(res.payload.override?.postCheckoutAdjustments?.[0]?.deltaAmount, 0);
});

test('MOS-BUG-256: buildLegacyWalletReconciliationPlan maps CONVERTED_REFILL_TO_NEW to Retain slot even for Normal service', () => {
  const mergedOverride = {
    serviceType: 'Normal',
    selectedUpperComboBalanceId: 82863,
    skipUpperCombo: false,
    comboRedemption: {
      balanceId: 82863,
      redeemSession: true,
      deductedBucket: 'CONVERTED_REFILL_TO_NEW',
    },
  } as SafeAny;

  const plan = buildLegacyWalletReconciliationPlan({
    mergedOverride,
    walletFlags: {
      selectedUpperBalanceId: 82863,
      selectedUnderBalanceId: null,
      skipUpperCombo: false,
      skipUnderCombo: true,
      effectiveRedeemUpper: true,
      effectiveRedeemUnder: false,
    },
    effectiveComboRedemption: mergedOverride.comboRedemption,
    activeOrderServiceIds: [501088],
  });

  assert.equal(plan.targetWalletSlots.length, 1);
  assert.equal(plan.targetWalletSlots[0]?.preferredServiceType, 'Retain');
});

test('MOS-BUG-256: reconcileSelectedWalletDeductionInLegacyDb swaps Normal tx mis-deducted by legacy PHP back to Retain tx on same balance', async () => {
  const balances = new Map<number, SafeAny>([
    [
      82863,
      {
        id: 82863,
        normal_count: 1,
        retain_count: 8,
        total_normal_balance_amount: 550000,
        total_retain_balance_amount: 2720000,
        date_expired: '2027-07-15 23:59:59',
      },
    ],
  ]);

  const transactions = new Map<number, SafeAny>([
    // PHP mistakenly consumed Normal tx #90001 on a Retain order because -refill service_price had normal_count = -1
    [
      90001,
      {
        id: 90001,
        user_service_balance_id: 82863,
        user_id: 9648,
        normal_count: 1,
        retain_count: 0,
        normal_balance_amount: 550000,
        retain_balance_amount: 0,
        used_staff_id: 13783,
        changed_staff_id: null,
        cancelled_staff_id: null,
        order_id: 339182,
        order_service_id: 6001,
        date_expired: '2027-07-15 23:59:59',
      },
    ],
    // Correct unused Retain tx #90002 on the same balance
    [
      90002,
      {
        id: 90002,
        user_service_balance_id: 82863,
        user_id: 9648,
        normal_count: 0,
        retain_count: 1,
        normal_balance_amount: 0,
        retain_balance_amount: 340000,
        used_staff_id: null,
        changed_staff_id: null,
        cancelled_staff_id: null,
        order_id: null,
        order_service_id: null,
        date_expired: '2027-07-15 23:59:59',
      },
    ],
  ]);

  const orderServices = new Map<number, SafeAny>([
    [6001, { id: 6001, order_id: 339182, user_service_balance_transaction_id: 90001, balance_price: 550000 }],
  ]);

  const fakePool = {
    query: async (sql: string, params: SafeAny[] = []) => {
      const clean = sql.replace(/\s+/g, ' ').trim();
      if (clean.startsWith('SELECT id, user_service_balance_transaction_id FROM order_service WHERE id = ?')) {
        const os = orderServices.get(Number(params[0]));
        return [os ? [os] : []];
      }
      if (clean.includes('FROM user_service_balance_transaction WHERE id = ?')) {
        const tx = transactions.get(Number(params[0]));
        return [tx ? [tx] : []];
      }
      if (clean.includes('FROM user_service_balance_transaction WHERE user_service_balance_id = ? AND user_id = ?')) {
        const [balId, userId, preferredServiceType] = params;
        const list = Array.from(transactions.values())
          .filter(
            (t) =>
              t.user_service_balance_id === Number(balId) &&
              t.user_id === Number(userId) &&
              !t.used_staff_id &&
              !t.changed_staff_id &&
              !t.cancelled_staff_id &&
              (t.normal_count > 0 || t.retain_count > 0)
          )
          .sort((a, b) => {
            const aMatch = preferredServiceType === 'Retain' ? a.retain_count > 0 : a.normal_count > 0;
            const bMatch = preferredServiceType === 'Retain' ? b.retain_count > 0 : b.normal_count > 0;
            if (aMatch !== bMatch) return aMatch ? -1 : 1;
            return a.id - b.id;
          });
        return [list.slice(0, 1)];
      }
      if (clean.includes('FROM user_service_balance_transaction WHERE order_id = ? AND used_staff_id IS NOT NULL')) {
        const bookingId = Number(params[0]);
        return [Array.from(transactions.values()).filter((t) => t.order_id === bookingId && t.used_staff_id !== null)];
      }
      if (clean.startsWith('UPDATE user_service_balance SET normal_count = normal_count + ?')) {
        const [incN, incR, incNAmt, incRAmt, _exp, _staff, balId] = params;
        const bal = balances.get(Number(balId));
        if (bal) {
          bal.normal_count += Number(incN);
          bal.retain_count += Number(incR);
          bal.total_normal_balance_amount += Number(incNAmt);
          bal.total_retain_balance_amount += Number(incRAmt);
        }
        return [{ affectedRows: 1 }];
      }
      if (clean.startsWith('UPDATE user_service_balance SET normal_count = GREATEST(0, normal_count - ?)')) {
        const [decN, decR, decNAmt, decRAmt, _dn2, _dr2, _staff, balId] = params;
        const bal = balances.get(Number(balId));
        if (bal) {
          bal.normal_count = Math.max(0, bal.normal_count - Number(decN));
          bal.retain_count = Math.max(0, bal.retain_count - Number(decR));
          bal.total_normal_balance_amount = Math.max(0, bal.total_normal_balance_amount - Number(decNAmt));
          bal.total_retain_balance_amount = Math.max(0, bal.total_retain_balance_amount - Number(decRAmt));
        }
        return [{ affectedRows: 1 }];
      }
      if (
        clean.startsWith(
          'SELECT normal_count, retain_count, total_normal_balance_amount, total_retain_balance_amount FROM user_service_balance WHERE id = ?'
        )
      ) {
        const bal = balances.get(Number(params[0]));
        return [bal ? [bal] : []];
      }
      if (clean.startsWith('UPDATE user_service_balance_transaction SET used_staff_id = NULL')) {
        const tx = transactions.get(Number(params[0]));
        if (tx) {
          tx.used_staff_id = null;
          tx.order_id = null;
          tx.order_service_id = null;
        }
        return [{ affectedRows: 1 }];
      }
      if (clean.startsWith('UPDATE user_service_balance_transaction SET used_staff_id = ?')) {
        const [staffId, orderId, osId, leftN, leftR, _laN, _laR, txId] = params;
        const tx = transactions.get(Number(txId));
        if (tx) {
          tx.used_staff_id = staffId;
          tx.order_id = orderId;
          tx.order_service_id = osId;
          tx.total_normal_count_left = leftN;
          tx.total_retain_count_left = leftR;
        }
        return [{ affectedRows: 1 }];
      }
      if (
        clean.startsWith(
          'UPDATE order_service SET user_service_balance_transaction_id = ?, balance_price = ? WHERE id = ?'
        )
      ) {
        const [txId, price, osId] = params;
        const os = orderServices.get(Number(osId));
        if (os) {
          os.user_service_balance_transaction_id = txId;
          os.balance_price = price;
        }
        return [{ affectedRows: 1 }];
      }
      return [[]];
    },
  } as unknown as mysql.Pool;

  await reconcileSelectedWalletDeductionInLegacyDb(fakePool, {
    bookingId: 339182,
    customerUserId: 9648,
    staffId: 13783,
    slots: [{ orderServiceId: 6001, targetBalanceId: 82863, preferredServiceType: 'Retain' }],
  });

  // Mis-deducted Normal tx #90001 must be restored, and Retain tx #90002 must be deducted instead
  assert.equal(transactions.get(90001)?.used_staff_id, null);
  assert.equal(transactions.get(90002)?.used_staff_id, 13783);
  assert.equal(transactions.get(90002)?.order_service_id, 6001);
  assert.equal(orderServices.get(6001)?.user_service_balance_transaction_id, 90002);
  assert.equal(balances.get(82863)?.normal_count, 2);
  assert.equal(balances.get(82863)?.retain_count, 7);
});
