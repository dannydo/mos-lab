import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyCustomerEnrichmentContext,
  enrichCustomerComboMapsFromRows,
} from './services/ios-customer-enrichment.service.js';
import {
  applyCustomerComboExpiryOverridesToBooking,
  executeAdminComboExpiryAction,
} from './services/ios-combo-expiry.service.js';
import { createInMemoryConfigStore, createOverrideRepository } from './services/ios-overrides.service.js';
import { INITIAL_BOOKINGS } from './mock-data.js';
import { IosBookingItem } from '@mos-lab/shared';

test('Customer Combo Enrichment locks expired combos (isComboLive: false, isExpired: true) and preserves frozen/active wallets', () => {
  const ctx = createEmptyCustomerEnrichmentContext();
  enrichCustomerComboMapsFromRows({
    ctx,
    todayYmd: '2026-11-13',
    upperRows: [
      {
        id: 501,
        user_id: 1001,
        normal_remaining: 1,
        retain_remaining: 2,
        combo_name: 'New HyperLight 770',
        service_key: 'new-hyperlight-770',
        package_key: '4+1-hyperlight-770',
        date_expired: '2026-10-01 23:59:59',
      },
      {
        id: 502,
        user_id: 1002,
        normal_remaining: 2,
        retain_remaining: 3,
        combo_name: 'New Flawless Mink 770',
        service_key: 'new-flawless-mink-770',
        package_key: '4+1-mink-770',
        date_expired: null, // Frozen combo
      },
    ],
    underRows: [
      {
        id: 601,
        user_id: 1001,
        normal_remaining: 1,
        retain_remaining: 1,
        combo_name: 'Under Mink 390',
        service_key: 'under-mink-390',
        package_key: '4+1-under-390',
        date_expired: '2026-10-15 23:59:59',
      },
    ],
  });

  // User 1001: Expired Upper & Expired Under -> both locked from 0d deduction
  const expiredUpper = ctx.comboBalanceMap.get(1001);
  assert.ok(expiredUpper);
  assert.equal(expiredUpper.isComboLive, false);
  assert.equal(expiredUpper.isExpired, true);
  assert.equal(expiredUpper.expiryState, 'EXPIRED');
  assert.equal(expiredUpper.remainingSessions, 3);
  assert.equal(expiredUpper.upsellOpportunity, true);

  const expiredUnder = ctx.underMinkComboMap.get(1001);
  assert.ok(expiredUnder);
  assert.equal(expiredUnder.hasUnderCombo, false);
  assert.equal(expiredUnder.isExpired, true);
  assert.equal(expiredUnder.remainingSessions, 2);

  const user1001Wallets = ctx.comboWalletsMap.get(1001) || [];
  assert.equal(user1001Wallets.length, 2);

  // User 1002: Frozen Upper (date_expired = null) -> active & marked FROZEN
  const frozenUpper = ctx.comboBalanceMap.get(1002);
  assert.ok(frozenUpper);
  assert.equal(frozenUpper.isComboLive, true);
  assert.equal(frozenUpper.isFrozen, true);
  assert.equal(frozenUpper.expiryState, 'FROZEN');
});

test('Admin Combo Expiry Action enforces strict Admin-only RBAC (403 for CVL/CVLL/CC, 200 for Admin)', async () => {
  const store = createInMemoryConfigStore();
  const repo = createOverrideRepository(store);

  for (const blockedRole of [
    { role: 'cvl', careerTier: 'CVL' as const },
    { role: 'cvll', careerTier: 'CVLL' as const },
    { role: 'cc', careerTier: 'CC' as const },
  ]) {
    const denied = await executeAdminComboExpiryAction(
      {
        id: 99,
        legacyStaffId: 13783,
        username: 'staff_user',
        displayName: 'Nhân Sự',
        role: blockedRole.role,
        careerTier: blockedRole.careerTier,
      },
      {
        action: 'ADD_DAYS',
        balanceId: 90102,
        customerId: 26902,
        extendDays: 30,
        reason: 'Xin gia hạn hỗ trợ khách',
      },
      {
        getPool: () => null,
        saveOverride: (cid, entry) => repo.saveCustomerComboExpiryOverride(cid, entry),
        todayYmd: '2026-11-13',
      }
    );
    assert.equal(denied.statusCode, 403);
    assert.equal(denied.payload.success, false);
  }

  // Admin extends expired combo by +30 days -> unlocks it to ACTIVE (2026-12-13)
  const allowedExtend = await executeAdminComboExpiryAction(
    {
      id: 1,
      legacyStaffId: 3879,
      username: 'danny_admin',
      displayName: 'Danny Admin',
      role: 'admin',
      careerTier: 'ADMIN',
    },
    {
      action: 'ADD_DAYS',
      balanceId: 90102,
      customerId: 26902,
      serviceGroup: 'upper',
      targetDateExpired: '2026-10-01',
      extendDays: 30,
      reason: 'Khách đi công tác nước ngoài có báo trước',
    },
    {
      getPool: () => null,
      saveOverride: (cid, entry) => repo.saveCustomerComboExpiryOverride(cid, entry),
      todayYmd: '2026-11-13',
    }
  );
  assert.equal(allowedExtend.statusCode, 200);
  assert.equal(allowedExtend.payload.success, true);
  assert.equal(allowedExtend.payload.dateExpired, '2026-12-13');
  assert.equal(allowedExtend.payload.isFrozen, false);

  const loadedOverrides = await repo.loadCustomerComboExpiryOverridesBatch([26902]);
  const updatedBooking = applyCustomerComboExpiryOverridesToBooking(
    INITIAL_BOOKINGS[2] as unknown as IosBookingItem,
    loadedOverrides['26902'],
    '2026-11-13'
  );
  assert.equal(updatedBooking.comboLiveStatus?.isComboLive, true);
  assert.equal(updatedBooking.comboLiveStatus?.isExpired, false);
  assert.equal(updatedBooking.comboLiveStatus?.dateExpired, '2026-12-13');
  assert.equal(updatedBooking.comboLiveStatus?.avgDaysPerSession, 10);

  // Admin freezes combo -> dateExpired = null, isFrozen = true
  const allowedFreeze = await executeAdminComboExpiryAction(
    {
      id: 1,
      legacyStaffId: 3879,
      username: 'danny_admin',
      displayName: 'Danny Admin',
      role: 'super_admin',
      careerTier: 'ADMIN',
    },
    {
      action: 'FREEZE',
      balanceId: 90102,
      customerId: 26902,
      serviceGroup: 'upper',
      reason: 'Khách bầu xin bảo lưu gói combo',
    },
    {
      getPool: () => null,
      saveOverride: (cid, entry) => repo.saveCustomerComboExpiryOverride(cid, entry),
      todayYmd: '2026-11-13',
    }
  );
  assert.equal(allowedFreeze.statusCode, 200);
  assert.equal(allowedFreeze.payload.isFrozen, true);
  assert.equal(allowedFreeze.payload.dateExpired, null);
});
