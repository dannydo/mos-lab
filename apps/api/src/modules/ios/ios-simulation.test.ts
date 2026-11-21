import test from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import {
  CVL_TRAINING_MENTORSHIP_CONFIG_KEY,
  isIosSyntheticSimBookingId,
  IosBookingAttributes,
  IosBookingItem,
} from '@mos-lab/shared';
import { IosAuthContext } from './services/ios-auth.service.js';
import {
  createInMemoryConfigStore,
  getBookingOverrideKey,
  getCustomerNaturalLashKey,
  getLegacySettleKey,
} from './services/ios-overrides.service.js';
import {
  enrichSimulationBookings,
  getSimAttemptsKey,
  getSimNaturalLashKey,
  getSimulationOverrideRepository,
  IosSimulationForbiddenError,
  listAccessibleSimulationMentees,
  loadSimulationAttempts,
  resolveSimulationContextActor,
  updateSimulationAttempt,
} from './services/ios-simulation.service.js';
import {
  executeIosSimulationBookingAction,
  loadOrReconcileSimulationAttemptsForActor,
  SIM_TRAINING_SAMPLE_PHOTOS,
} from './services/ios-simulation-actions.service.js';
import { resolveCustomerBookingTab } from '@mos-lab/shared';
import { createIosDualModeBooking } from './services/ios-booking-create.service.js';
import { CvlTrainingMentorshipService } from '../kpi/services/cvl-training-mentorship.service.js';

const COMPLETE_NLASH_ATTRS: IosBookingAttributes = {
  naturalLashLength: '8-9mm',
  naturalLashThickness: '0.07',
  naturalLashCount: 'Trung Bình (120-160)',
  naturalLashDensity: 'Trung Bình',
  lashTrail: 'Mắt Ngang',
  eyeShape: 'Mắt Hạnh Nhân',
  lashHealth: 'Khỏe Mạnh',
  medicalProblem: 'Không có',
  isNewClientDiagnosticDone: true,
  style: 'Natural',
  curl: 'C',
  length: '10-11mm',
  thickness: '0.07',
};

const CVL_A: IosAuthContext = {
  id: 101,
  legacyStaffId: 46272,
  clientStoreId: 6,
  username: 'cvl_a',
  displayName: 'Thảo Ly',
  role: 'cvl',
  careerTier: 'CVL',
};

const CVL_B: IosAuthContext = {
  id: 102,
  legacyStaffId: 49999,
  clientStoreId: 6,
  username: 'cvl_b',
  displayName: 'Minh Thư',
  role: 'cvl',
  careerTier: 'CVL',
};

const CC_MENTOR: IosAuthContext = {
  id: 201,
  legacyStaffId: 37790,
  clientStoreId: 6,
  username: 'cc_mentor',
  displayName: 'Châu CC',
  role: 'cc',
  careerTier: 'CC',
};

const CC_UNPAIRED: IosAuthContext = {
  id: 202,
  legacyStaffId: 34295,
  clientStoreId: 6,
  username: 'cc_other',
  displayName: 'Hà CC',
  role: 'cc',
  careerTier: 'CC',
};

const BASE_NGOC_PHAM: IosBookingItem = {
  id: 771121,
  orderNumber: '771121',
  customerName: 'Ngọc Phạm',
  customerPhone: '0933...207',
  customerId: 50021,
  customerVisits: 21,
  customerNote: '7/11 c book',
  timeSlot: '11:00 (90m)',
  serviceName: 'Classic 1D',
  servicePrice: 550000,
  serviceDuration: 90,
  assignedStaffId: 0,
  isUnassignedQueue: true,
  status: 'INCOMING',
  comboLiveStatus: { isComboLive: true, remainingSessions: 4, comboName: 'Combo Classic 1D', upsellOpportunity: false },
};

test('Simulation Sandbox isolates concurrent CVLs on #771121 and never mutates live keys', async () => {
  const store = createInMemoryConfigStore();

  // CVL A checks in & saves consultation on #771121 inside Simulation Sandbox
  const resA1 = await executeIosSimulationBookingAction(
    null,
    CVL_A,
    {
      bookingId: 771121,
      customerId: 50021,
      action: 'SAVE_CONSULTATION',
      attributes: COMPLETE_NLASH_ATTRS,
      serviceName: 'Classic 1D',
      servicePrice: 550000,
      simBookingMeta: {
        customerId: 50021,
        customerName: 'Ngọc Phạm',
        orderNumber: '771121',
        serviceName: 'Classic 1D',
        servicePrice: 550000,
      },
    },
    store
  );
  assert.equal(resA1.statusCode, 200);

  // CVL B simultaneously practices on the same booking #771121 in CVL B's namespace
  const resB1 = await executeIosSimulationBookingAction(
    null,
    CVL_B,
    {
      bookingId: 771121,
      customerId: 50021,
      action: 'SAVE_CONSULTATION',
      attributes: { ...COMPLETE_NLASH_ATTRS, style: 'Baby Doll', curl: 'CC' },
      serviceName: 'Flawless Mink 1D',
      servicePrice: 880000,
    },
    store
  );
  assert.equal(resB1.statusCode, 200);

  const repoA = getSimulationOverrideRepository(CVL_A.legacyStaffId!, store);
  const repoB = getSimulationOverrideRepository(CVL_B.legacyStaffId!, store);
  const ovrA = await repoA.loadBookingOverride(771121);
  const ovrB = await repoB.loadBookingOverride(771121);

  assert.equal(ovrA?.attributes?.style, 'Natural');
  assert.equal(ovrB?.attributes?.style, 'Baby Doll');

  // Verify LIVE keys are 100% untouched
  assert.equal(await store.getOne(getBookingOverrideKey(771121)), null);
  assert.equal(await store.getOne(getCustomerNaturalLashKey(50021)), null);
  assert.equal(await store.getOne(getLegacySettleKey(771121)), null);
});

test('Attempt #1 requires full workflow; Two-Level Revert preserves 7/7 nlash and unlocks Fast-Forward on PA #2', async () => {
  const store = createInMemoryConfigStore();

  // Attempt #1: Fast-Forward MUST fail before completing 1st attempt
  const blockedFf = await executeIosSimulationBookingAction(
    null,
    CVL_A,
    {
      bookingId: 771121,
      customerId: 50021,
      action: 'SIM_FAST_FORWARD_TO_UPSELL',
      attributes: COMPLETE_NLASH_ATTRS,
    },
    store
  );
  assert.equal(blockedFf.statusCode, 400);

  // Save consultation + complete checkout for Attempt #1
  await executeIosSimulationBookingAction(
    null,
    CVL_A,
    {
      bookingId: 771121,
      customerId: 50021,
      action: 'SAVE_CONSULTATION',
      attributes: COMPLETE_NLASH_ATTRS,
      serviceName: 'Classic 1D',
      servicePrice: 550000,
      simBookingMeta: {
        customerId: 50021,
        customerName: 'Ngọc Phạm',
        orderNumber: '771121',
        serviceName: 'Classic 1D',
        servicePrice: 550000,
      },
    },
    store
  );

  const completeRes = await executeIosSimulationBookingAction(
    null,
    CVL_A,
    {
      bookingId: 771121,
      customerId: 50021,
      action: 'COMPLETE_ORDER',
      paymentMethod: 'VIETQR',
      billing: {
        totalAmount: 550000,
        grandTotal: 594000,
        vatAmount: 44000,
        tipAmount: 50000,
        paymentMethod: 'VIETQR',
      },
      simBookingMeta: {
        customerId: 50021,
        customerName: 'Ngọc Phạm',
        orderNumber: '771121',
        serviceName: 'Classic 1D',
        servicePrice: 550000,
      },
    },
    store
  );
  assert.equal(completeRes.statusCode, 200);
  const attemptsAfter1 = await loadSimulationAttempts(CVL_A.legacyStaffId!, 771121, store);
  assert.equal(attemptsAfter1.length, 1);
  assert.equal(attemptsAfter1[0].attemptNumber, 1);

  // Level 1 Revert: SIM_REVERT_CONSULTATION keeps CHECKED_IN + 7/7 nlash and clears styling/billing
  const revertConsultRes = await executeIosSimulationBookingAction(
    null,
    CVL_A,
    { bookingId: 771121, customerId: 50021, action: 'SIM_REVERT_CONSULTATION' },
    store
  );
  assert.equal(revertConsultRes.statusCode, 200);
  assert.equal(revertConsultRes.payload.simulationFastForwardUnlocked, true);
  const afterRevertOvr = revertConsultRes.payload.updatedOverride;
  assert.equal(afterRevertOvr?.status, 'CHECKED_IN');
  assert.equal(afterRevertOvr?.attributes?.naturalLashLength, '8-9mm');
  assert.equal(afterRevertOvr?.attributes?.style, undefined);
  assert.equal(afterRevertOvr?.billing, undefined);

  // Attempt #2: Now Fast-Forward to Step 12 MUST succeed using 7/7 saved natural lash profile
  const ffRes = await executeIosSimulationBookingAction(
    null,
    CVL_A,
    {
      bookingId: 771121,
      customerId: 50021,
      action: 'SIM_FAST_FORWARD_TO_UPSELL',
      selectedCombo: { id: 'c5', name: 'Combo 4+1 HyperLight', price: 2200000, sessions: 5 },
    },
    store
  );
  assert.equal(ffRes.statusCode, 200);
  assert.equal(ffRes.payload.nextStep, 12);
  assert.equal(ffRes.payload.updatedOverride?.progress?.beforePhotoUrl, SIM_TRAINING_SAMPLE_PHOTOS.beforePhotoUrl);
  assert.equal(ffRes.payload.updatedOverride?.progress?.currentStep, 12);

  // Level 2 Revert: SIM_RESET_TO_INCOMING tombstones natural lash profile & returns to INCOMING
  const resetRes = await executeIosSimulationBookingAction(
    null,
    CVL_A,
    { bookingId: 771121, customerId: 50021, action: 'SIM_RESET_TO_INCOMING' },
    store
  );
  assert.equal(resetRes.statusCode, 200);
  assert.equal(resetRes.payload.updatedOverride?.status, 'INCOMING');

  const rawNlTombstone = await store.getOne(getSimNaturalLashKey(CVL_A.legacyStaffId!, 50021));
  assert.ok(rawNlTombstone?.includes('"__simCleared":true'));

  // Enrichment strips internal _simForceIncoming flags and exposes attempt count cleanly
  const repoA = getSimulationOverrideRepository(CVL_A.legacyStaffId!, store);
  const simOvrs = await repoA.loadBookingOverridesBatch([771121]);
  const simNl = await repoA.loadCustomerNaturalLashProfilesBatch([50021]);
  const enriched = enrichSimulationBookings({
    mappedBookings: [{ ...BASE_NGOC_PHAM, status: 'DONE', assignedStaffId: CVL_A.legacyStaffId! }],
    customDraftBookings: [],
    simOverridesMap: simOvrs,
    simNaturalLashMap: simNl,
    attemptMetaMap: new Map([[771121, { count: 2, latestAttemptId: 'a2' }]]),
    targetStaffId: CVL_A.legacyStaffId!,
    isReadOnlyMentorView: false,
  });
  assert.equal(enriched[0].status, 'INCOMING');
  assert.equal(enriched[0].simulationAttemptCount, 2);
  assert.equal(enriched[0].simulationFastForwardUnlocked, true);
  assert.equal(enriched[0].isSimulationBooking, true);
});

test('Dual-Mode Booking Creation in Simulation Sandbox creates synthetic ID >= 900M with UI-010 RBAC', async () => {
  const store = createInMemoryConfigStore();

  // CV (non-privileged) must be rejected 403
  const forbiddenRes = await createIosDualModeBooking(
    null,
    { ...CVL_A, role: 'cv', careerTier: 'CVL' },
    { simulationMode: true, customerMode: 'NEW', customerName: 'Chị Test' },
    store
  );
  assert.equal(forbiddenRes.statusCode, 403);

  const created = await createIosDualModeBooking(
    null,
    CVL_A,
    {
      simulationMode: true,
      customerMode: 'NEW',
      customerName: 'Chị Minh Anh',
      customerPhone: '0909123456',
      date: '2026-11-15',
      timeSlot: '15:00',
      storeId: 6,
      bookingNote: 'Tập tư vấn khách Lần 1',
    },
    store
  );
  assert.equal(created.statusCode, 200);
  assert.equal(created.payload.simulationMode, true);
  assert.ok(isIosSyntheticSimBookingId(created.payload.bookingId));
  assert.equal(created.payload.booking?.isSimulationDraftBooking, true);
  assert.equal(created.payload.booking?.assignedStaffId, CVL_A.legacyStaffId);
  // UI-010: Phone masked for CVL
  assert.ok(!String(created.payload.booking?.customerPhone).includes('0909123456'));
});

test('UI-010 & CC Mentorship RBAC: Mentors read-only on paired CVL, blocked on unpaired or writes', async () => {
  const store = createInMemoryConfigStore();
  CvlTrainingMentorshipService.clearCache();

  const todayYmd = '2026-11-15';
  const mockFastify = {
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async ({ where }: { where: { key: string } }) => {
            if (where.key !== CVL_TRAINING_MENTORSHIP_CONFIG_KEY) return null;
            return {
              key: where.key,
              value: JSON.stringify({
                pairs: [
                  {
                    id: 'pair-1',
                    menteeLegacyStaffId: CVL_A.legacyStaffId,
                    menteeDisplayName: 'Thảo Ly',
                    mentorLegacyStaffId: CC_MENTOR.legacyStaffId,
                    mentorDisplayName: 'Châu CC',
                    storeCode: 'DT',
                    startDate: '2026-11-01',
                    endDate: '2026-11-30',
                    isActive: true,
                  },
                ],
              }),
            };
          },
        },
      },
    },
    log: { warn: () => {} },
  } as unknown as FastifyInstance;

  // Paired CC Mentor resolves Mentee sandbox strictly read-only
  const ctxMentor = await resolveSimulationContextActor(mockFastify, CC_MENTOR, CVL_A.legacyStaffId, todayYmd);
  assert.equal(ctxMentor.targetStaffId, CVL_A.legacyStaffId);
  assert.equal(ctxMentor.isReadOnlyMentorView, true);

  const menteesForMentor = await listAccessibleSimulationMentees(mockFastify, CC_MENTOR, todayYmd);
  assert.equal(menteesForMentor.length, 1);
  assert.equal(menteesForMentor[0].menteeStaffId, CVL_A.legacyStaffId);

  // Unpaired CC Mentor must throw IosSimulationForbiddenError
  await assert.rejects(
    () => resolveSimulationContextActor(mockFastify, CC_UNPAIRED, CVL_A.legacyStaffId, todayYmd),
    IosSimulationForbiddenError
  );

  // CVL cannot inspect another CVL's sandbox
  await assert.rejects(
    () => resolveSimulationContextActor(mockFastify, CVL_A, CVL_B.legacyStaffId, todayYmd),
    IosSimulationForbiddenError
  );

  // Mentor attempting a POST mutation with menteeStaffId receives 403 Read-Only
  const writeAttempt = await executeIosSimulationBookingAction(
    mockFastify,
    CC_MENTOR,
    {
      bookingId: 771121,
      menteeStaffId: CVL_A.legacyStaffId,
      action: 'SIM_REVERT_CONSULTATION',
    },
    store
  );
  assert.equal(writeAttempt.statusCode, 403);

  // Cleanup singleton cache so other test files aren't affected
  CvlTrainingMentorshipService.clearCache();

  // Verify attempt key prefix helper works cleanly
  assert.equal(getSimAttemptsKey(CVL_A.legacyStaffId!, 771121), 'IOS_SIM_ATTEMPTS:46272:771121');
});

test('MOS-FEAT-228: updateSimulationAttempt and SIM_APPLY_ATTEMPT workflow', async () => {
  const store = createInMemoryConfigStore();
  const staffId = CVL_A.legacyStaffId!;
  const bookingId = 88228;

  // 1. Create completed attempt
  const completeRes = await executeIosSimulationBookingAction(
    null,
    CVL_A,
    {
      bookingId,
      customerId: 60228,
      action: 'COMPLETE_ORDER',
      paymentMethod: 'VIETQR',
      billing: {
        totalAmount: 500000,
        grandTotal: 500000,
        tipAmount: 0,
        paymentMethod: 'VIETQR',
      },
      simBookingMeta: {
        customerId: 60228,
        customerName: 'Trang Đỗ',
        orderNumber: '88228',
        serviceName: 'Thiết Kế Wings 1D',
        servicePrice: 500000,
      },
    },
    store
  );
  assert.equal(completeRes.statusCode, 200);

  const initialAttempts = await loadSimulationAttempts(staffId, bookingId, store);
  assert.equal(initialAttempts.length, 1);
  const targetAttempt = initialAttempts[0];
  assert.equal(targetAttempt.notes, undefined);

  // 2. Update saved scenario notes, combo, upsell, discount, and tip
  const updated = await updateSimulationAttempt(
    staffId,
    bookingId,
    targetAttempt.attemptId,
    {
      bookingId,
      notes: 'Kịch bản Chốt Combo 5L VIP + Serum dưỡng mi',
      selectedStyle: 'Katun',
      selectedComboName: 'Gói 5 Lần',
      selectedComboPrice: 1850000,
      selectedUnderComboName: 'Mi Dưới 3 Lần',
      selectedUnderComboPrice: 450000,
      upsellProducts: [{ productName: 'Dưỡng Mi Yeppeum Korea', quantity: 1, totalPrice: 1100000 }],
      promotionName: 'Tri Ân Khách Cũ',
      promotionDiscountAmount: 100000,
      tipAmount: 50000,
    },
    store
  );

  assert.equal(updated.notes, 'Kịch bản Chốt Combo 5L VIP + Serum dưỡng mi');
  assert.equal(updated.selectedStyle, 'Katun');
  assert.equal(updated.selectedComboName, 'Gói 5 Lần');
  assert.equal(updated.selectedComboPrice, 1850000);
  assert.equal(updated.selectedUnderComboName, 'Mi Dưới 3 Lần');
  assert.equal(updated.selectedUnderComboPrice, 450000);
  assert.equal(updated.upsellTotal, 1100000);
  assert.equal(updated.promotionDiscountAmount, 100000);
  assert.equal(updated.tipAmount, 50000);
  // grandTotal = 500000 (service) + 1850000 (combo) + 450000 (under) + 1100000 (upsell) - 100000 (promo) + 50000 (tip) = 3850000
  assert.equal(updated.grandTotal, 3850000);
  // comboBonus = 50000, serumBonus = 100000 (Yeppeum >= 1M), tipShare = 40000, serviceShare = 50000 -> 240000
  assert.equal(updated.comboBonusAmount, 50000);
  assert.equal(updated.serumBonusAmount, 100000);
  assert.equal(updated.totalEstimatedReward, 240000);

  // 3. Verify updating nonexistent attempt throws 404
  await assert.rejects(
    () => updateSimulationAttempt(staffId, bookingId, 'nonexistent-id', { bookingId }, store),
    (err: any) => err.statusCode === 404
  );

  // 3b. Verify saving a draft attempt creates and appends it gracefully
  const draftCreated = await updateSimulationAttempt(
    staffId,
    bookingId,
    `draft_${bookingId}`,
    {
      bookingId,
      notes: 'Kịch bản mới từ form trống',
      selectedComboName: 'Gói 3 Lần (Tiết kiệm)',
      selectedComboPrice: 1170000,
    },
    store
  );
  assert.ok(draftCreated.attemptId.startsWith('sim_att_'));
  assert.equal(draftCreated.selectedComboName, 'Gói 3 Lần (Tiết kiệm)');
  assert.equal(draftCreated.notes, 'Kịch bản mới từ form trống');

  // 4. Test SIM_APPLY_ATTEMPT: Load the updated scenario back into the active booking
  const applyRes = await executeIosSimulationBookingAction(
    null,
    CVL_A,
    {
      bookingId,
      customerId: 60228,
      action: 'SIM_APPLY_ATTEMPT',
      attemptId: targetAttempt.attemptId,
    },
    store
  );
  assert.equal(applyRes.statusCode, 200);
  assert.equal(applyRes.payload.nextStep, 3);
  const appliedOverride = applyRes.payload.updatedOverride;
  assert.equal(appliedOverride.status, 'CHECKED_IN');
  assert.equal(appliedOverride.selectedCombo?.name, 'Gói 5 Lần');
  assert.equal(appliedOverride.selectedUnderCombo?.name, 'Mi Dưới 3 Lần');
  assert.equal(appliedOverride.cartProducts?.length, 1);
  assert.equal(appliedOverride.cartProducts?.[0]?.productName, 'Dưỡng Mi Yeppeum Korea');
  assert.equal(appliedOverride.billing?.grandTotal, 3850000);
});

test('MOS-BUG-230: reconciles missing attempts for completed/checked-out scenarios and preserves state across reopen & apply', async () => {
  const store = createInMemoryConfigStore();
  const staffId = CVL_A.legacyStaffId!;
  const bookingId = 339580;
  const simRepo = getSimulationOverrideRepository(staffId, store);

  // 1. Reproduce #BK-28 state: completed progress + checkedOutAt + combo sale, but IOS_SIM_ATTEMPTS is empty
  await simRepo.saveBookingOverride(bookingId, {
    status: 'SERVICING',
    orderState: 'Photo after auto-saved',
    assignedStaffId: staffId,
    assignedStaffName: CVL_A.displayName,
    serviceName: 'Volume 2D',
    servicePrice: 550000,
    checkedOutAt: '2026-11-15T06:00:00.189Z',
    selectedCombo: { id: 'c10', name: 'Combo 10 tặng 6 · Volume 2D 550', price: 4240000, sessions: 16 },
    comboRedemption: { isRedeemed: true, comboName: 'Combo Volume 2D', deductSessions: 1 },
    attributes: { ...COMPLETE_NLASH_ATTRS, style: 'Classic' },
    progress: { elapsedSeconds: 3000, timerRunning: false, completedAt: '2026-11-15T05:58:00.000Z' },
  });

  // enrichSimulationBookings must reflect >= 1 attempt so UI banner & list count match
  const simOvrs = await simRepo.loadBookingOverridesBatch([bookingId]);
  const enrichedBefore = enrichSimulationBookings({
    mappedBookings: [
      {
        ...BASE_NGOC_PHAM,
        id: bookingId,
        orderNumber: 'BK-28',
        customerName: 'Trâm',
        status: 'DONE',
        orderState: 'Completed',
        assignedStaffId: staffId,
      },
    ],
    customDraftBookings: [],
    simOverridesMap: simOvrs,
    simNaturalLashMap: {},
    attemptMetaMap: new Map(),
    targetStaffId: staffId,
    isReadOnlyMentorView: false,
  });
  assert.equal(enrichedBefore[0].simulationAttemptCount, 1);

  // Reconcile when user opens IosSimulationHistorySheet -> must not be empty!
  const reconciled = await loadOrReconcileSimulationAttemptsForActor(staffId, bookingId, {
    actorStaffName: CVL_A.displayName,
    baseStore: store,
  });
  assert.equal(reconciled.length, 1);
  assert.equal(reconciled[0].attemptNumber, 1);
  assert.equal(reconciled[0].selectedComboName, 'Combo 10 tặng 6 · Volume 2D 550');
  assert.equal(reconciled[0].selectedComboPrice, 4240000);
  assert.ok(reconciled[0].grandTotal >= 4240000);

  // Applying that reconciled PA #1 clears completedAt/progress so live 'Completed' order stays CHECKED_IN
  const applyRes = await executeIosSimulationBookingAction(
    null,
    CVL_A,
    {
      bookingId,
      customerId: 50415,
      action: 'SIM_APPLY_ATTEMPT',
      attemptId: reconciled[0].attemptId,
    },
    store
  );
  assert.equal(applyRes.statusCode, 200);
  const appliedOvr = applyRes.payload.updatedOverride;
  assert.equal(appliedOvr?.status, 'CHECKED_IN');
  assert.equal(appliedOvr?.progress, undefined);
  assert.equal(appliedOvr?.completedAt, undefined);

  const enrichedAfterApply = enrichSimulationBookings({
    mappedBookings: [
      {
        ...BASE_NGOC_PHAM,
        id: bookingId,
        orderNumber: 'BK-28',
        customerName: 'Trâm',
        status: 'DONE',
        orderState: 'Completed',
        assignedStaffId: staffId,
      },
    ],
    customDraftBookings: [],
    simOverridesMap: await simRepo.loadBookingOverridesBatch([bookingId]),
    simNaturalLashMap: {},
    attemptMetaMap: new Map([[bookingId, { count: reconciled.length, latestAttemptId: reconciled[0].attemptId }]]),
    targetStaffId: staffId,
    isReadOnlyMentorView: false,
  });
  assert.equal(enrichedAfterApply[0].status, 'CHECKED_IN');
  assert.equal(resolveCustomerBookingTab(enrichedAfterApply[0]), 'SERVICING');

  // 2. Step 13 payment + Step 14 tip COMPLETE_ORDER updates same attempt without duplication
  const bookingId2 = 88230;
  await executeIosSimulationBookingAction(
    null,
    CVL_A,
    {
      bookingId: bookingId2,
      customerId: 60230,
      action: 'COMPLETE_ORDER',
      paymentMethod: 'VIETQR',
      billing: { totalAmount: 550000, grandTotal: 594000, tipAmount: 0, paymentMethod: 'VIETQR' },
      simBookingMeta: {
        customerId: 60230,
        customerName: 'Khách Tip',
        orderNumber: 'BK-230',
        serviceName: 'Volume 2D',
        servicePrice: 550000,
      },
    },
    store
  );
  await executeIosSimulationBookingAction(
    null,
    CVL_A,
    {
      bookingId: bookingId2,
      customerId: 60230,
      action: 'COMPLETE_ORDER',
      paymentMethod: 'VIETQR',
      billing: { totalAmount: 550000, grandTotal: 694000, tipAmount: 100000, paymentMethod: 'VIETQR' },
    },
    store
  );
  // Late UPDATE_PROGRESS after checkout must NOT downgrade status back to SERVICING
  const lateProgressRes = await executeIosSimulationBookingAction(
    null,
    CVL_A,
    {
      bookingId: bookingId2,
      action: 'UPDATE_PROGRESS',
      orderState: 'Photo after auto-saved',
      progress: { elapsedSeconds: 3000, timerRunning: false },
    },
    store
  );
  assert.equal(lateProgressRes.statusCode, 200);
  assert.equal(lateProgressRes.payload.updatedOverride?.status, 'DONE');

  const attempts2 = await loadSimulationAttempts(staffId, bookingId2, store);
  assert.equal(attempts2.length, 1);
  assert.equal(attempts2[0].tipAmount, 100000);
  assert.equal(attempts2[0].serviceName, 'Volume 2D');
});
