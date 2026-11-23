import assert from 'node:assert/strict';
import test from 'node:test';
import { combinePaymentBreakdowns, computePreCheckoutPaymentSummary } from '@mos-lab/shared';
import type { IosAuthContext } from './services/ios-auth.service.js';
import { executeIosBookingAction } from './services/ios-actions.service.js';
import {
  createOverrideRepository,
  type BookingOverrideRecord,
  type CrmConfigStoreAdapter,
} from './services/ios-overrides.service.js';

function createMemoryStore(seed: Record<string, string> = {}): CrmConfigStoreAdapter {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    async getOne(key) {
      return map.get(key) ?? null;
    },
    async getMany(keys) {
      const out = new Map<string, string>();
      for (const k of keys) {
        const v = map.get(k);
        if (v !== undefined) out.set(k, v);
      }
      return out;
    },
    async getByPrefix(prefix) {
      const out = new Map<string, string>();
      for (const [k, v] of map.entries()) {
        if (k.startsWith(prefix)) out.set(k, v);
      }
      return out;
    },
    async upsert(key, value) {
      map.set(key, value);
    },
    async remove(key) {
      map.delete(key);
    },
    async removeByPrefix(prefix) {
      for (const k of Array.from(map.keys())) {
        if (k.startsWith(prefix)) map.delete(k);
      }
    },
  };
}

const cvlAuth: IosAuthContext = {
  id: 101,
  username: 'thucnghi',
  displayName: 'Thục Nghi',
  role: 'cv_plus',
  careerTier: 'CVL',
  legacyStaffId: 13783,
  clientStoreId: 6,
};

test('computePreCheckoutPaymentSummary and combinePaymentBreakdowns handle full, partial, and tip-only prepaid scenarios', () => {
  const full = computePreCheckoutPaymentSummary({
    grandTotal: 1050400,
    billing: {
      preCheckoutServicePaidAmount: 950400,
      preCheckoutTipAmount: 100000,
      preCheckoutPaymentMethod: 'VIETQR',
      preCheckoutPaymentBreakdown: { vietqrAmount: 1050400, posAmount: 0, cashAmount: 0 },
    },
  });
  assert.equal(full.hasPreCheckoutPayment, true);
  assert.equal(full.isFullyPrepaid, true);
  assert.equal(full.preCheckoutTotalPaid, 1050400);
  assert.equal(full.remainingDue, 0);
  assert.equal(full.overpaidAmount, 0);

  const partial = computePreCheckoutPaymentSummary({
    grandTotal: 1050400,
    billing: {
      preCheckoutServicePaidAmount: 950400,
      preCheckoutTipAmount: 0,
      preCheckoutPaymentMethod: 'VIETQR',
      preCheckoutPaymentBreakdown: { vietqrAmount: 950400, posAmount: 0, cashAmount: 0 },
    },
  });
  assert.equal(partial.isFullyPrepaid, false);
  assert.equal(partial.remainingDue, 100000);

  const combined = combinePaymentBreakdowns(1050400, partial.preCheckoutBreakdown, {
    vietqrAmount: 0,
    posAmount: 0,
    cashAmount: 100000,
  });
  assert.equal(combined.paymentMethod, 'MIXED');
  assert.deepEqual(combined.breakdown, { vietqrAmount: 950400, posAmount: 0, cashAmount: 100000 });
});

test('SAVE_PRE_CHECKOUT_PAYMENT persists pre-paid service & separate tip QR proofs without prematurely completing booking', async () => {
  const store = createMemoryStore();
  const repo = createOverrideRepository(store);

  await repo.saveBookingOverride(900101, {
    status: 'CHECKED_IN',
    orderState: 'Consultation',
    assignedStaffId: 13783,
    assignedStaffName: 'Thục Nghi',
    checkInStaffId: 13783,
    checkInStaffName: 'Thục Nghi',
  } satisfies BookingOverrideRecord);

  const res = await executeIosBookingAction(
    cvlAuth,
    {
      bookingId: 900101,
      action: 'SAVE_PRE_CHECKOUT_PAYMENT',
      preCheckoutServicePaidAmount: 950400,
      preCheckoutTipAmount: 100000,
      preCheckoutPaymentMethod: 'VIETQR',
      preCheckoutPaymentBreakdown: { vietqrAmount: 1050400, posAmount: 0, cashAmount: 0 },
      preCheckoutQrSplitMode: 'SEPARATE',
      preCheckoutTransferProofPhoto: 'https://cdn.example/svc-bill.jpg',
      preCheckoutTipTransferProofPhoto: 'https://cdn.example/tip-bill.jpg',
      preCheckoutNote: 'Khách CK tách 2 bill trước khi vào phòng',
    },
    repo
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);

  const saved = await repo.loadBookingOverride(900101);
  assert.equal(saved?.status, 'CHECKED_IN');
  assert.equal(saved?.billing?.preCheckoutServicePaidAmount, 950400);
  assert.equal(saved?.billing?.preCheckoutTipAmount, 100000);
  assert.equal(saved?.billing?.tipAmount, 100000);
  assert.equal(saved?.billing?.tipCvShare, 70000);
  assert.equal(saved?.billing?.tipCcShare, 20000);
  assert.equal(saved?.billing?.qrSplitTipSeparate, true);
  assert.equal(saved?.billing?.transferProofPhoto, 'https://cdn.example/svc-bill.jpg');
  assert.equal(saved?.billing?.tipTransferProofPhoto, 'https://cdn.example/tip-bill.jpg');
});

test('SAVE_PRE_CHECKOUT_PAYMENT is blocked with 409 when booking is already settled', async () => {
  const store = createMemoryStore();
  const repo = createOverrideRepository(store);

  await repo.saveBookingOverride(900102, {
    status: 'DONE',
    orderState: 'Completed',
    assignedStaffId: 13783,
    billing: {
      settlementStatus: 'SETTLED_COMPLETED',
      grandTotal: 950400,
    },
  } satisfies BookingOverrideRecord);

  const res = await executeIosBookingAction(
    cvlAuth,
    {
      bookingId: 900102,
      action: 'SAVE_PRE_CHECKOUT_PAYMENT',
      preCheckoutServicePaidAmount: 950400,
      preCheckoutTipAmount: 50000,
    },
    repo
  );

  assert.equal(res.statusCode, 409);
  assert.equal(res.payload.success, false);
});
