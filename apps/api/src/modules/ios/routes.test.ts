import test from 'node:test';
import assert from 'node:assert/strict';
import { FastifyInstance } from 'fastify';
import {
  calculateCvComboTierBonus,
  calculateCvSerumTierBonus,
  canAccessIosConsultationApp,
  canViewUnmaskedCustomerPhone,
  filterBookingsForCvlScope,
  formatComboName,
  IosBookingItem,
  IosPromotionOption,
  maskPhoneNumber,
  normalizeCvFeatherRole,
  resolveIosCustomerTypeIcon,
  resolveIosHasDiscountTag,
} from '@mos-lab/shared';
import { INITIAL_BOOKINGS } from './mock-data.js';
import {
  hasAnyNaturalLashAttribute,
  hasCompleteNaturalLashAttributes,
  validateNaturalLashConsultationSave,
} from './routes.js';
import { registerIosPoolShutdown } from './services/db-pools.js';
import { executeIosBookingAction } from './services/ios-actions.service.js';
import {
  applyIosScopeAndCounts,
  buildDemoModeBookings,
  mapLiveOrdersToBookings,
} from './services/ios-bookings-mapper.service.js';
import { resolveBookingStatusFromState, resolveStaffAvatar } from './services/ios-bookings-formatters.js';
import { isIosDemoModeRequested, queryIosBookingsList } from './services/ios-bookings-query.service.js';
import { createEmptyCustomerEnrichmentContext, RawIosOrderSnapshot } from './services/ios-bookings-sql.service.js';
import {
  BOOKING_OVERRIDE_KEY_PREFIX,
  createInMemoryConfigStore,
  createOverrideRepository,
  CUSTOMER_AVATAR_KEY_PREFIX,
  CUSTOMER_NATURAL_LASH_KEY_PREFIX,
  LEGACY_CUSTOMER_AVATARS_KEY,
  LEGACY_LIVE_OVERRIDES_KEY,
} from './services/ios-overrides.service.js';
import { buildDemoStaffMonthlyStats, createInitialLiveStaffStats } from './services/ios-staff-stats.service.js';
import { resolveCanViewGlobalPromotions } from './services/ios-promotions.service.js';

test('iOS Consultation App Auth & Role Guards (Kinh Thánh mOS Điều răn UI-010)', () => {
  // CVL (cv_plus) must have access
  assert.equal(canAccessIosConsultationApp('cv_plus'), true);
  assert.equal(canAccessIosConsultationApp('cvl'), true);
  assert.equal(canAccessIosConsultationApp('CVL'), true);

  // CVLL must have access
  assert.equal(canAccessIosConsultationApp('cvll'), true);
  assert.equal(canAccessIosConsultationApp('cv_plus_plus'), true);

  // CC must have access
  assert.equal(canAccessIosConsultationApp('cc'), true);

  // Admin / Super Admin must have access
  assert.equal(canAccessIosConsultationApp('admin'), true);
  assert.equal(canAccessIosConsultationApp('super_admin'), true);

  // Standard CV (technician) and other staff must NOT have access
  assert.equal(canAccessIosConsultationApp('cv'), false);
  assert.equal(canAccessIosConsultationApp('technician'), false);
  assert.equal(canAccessIosConsultationApp('telesales'), false);
  assert.equal(canAccessIosConsultationApp('manager'), false);
  assert.equal(canAccessIosConsultationApp('cs'), false);
  assert.equal(canAccessIosConsultationApp('hr'), false);
  assert.equal(canAccessIosConsultationApp('qa'), false);
});

test('CV Feather Role Normalization', () => {
  assert.equal(normalizeCvFeatherRole('cv_plus'), 'CVL');
  assert.equal(normalizeCvFeatherRole('cvl'), 'CVL');
  assert.equal(normalizeCvFeatherRole('CVL'), 'CVL');
  assert.equal(normalizeCvFeatherRole('cv_plus_plus'), 'CVLL');
  assert.equal(normalizeCvFeatherRole('cvll'), 'CVLL');
});

test('Combo Name Formatting', () => {
  const formatted = formatComboName('Gói Combo Mi', '4+1-hyperlight-770');
  assert.ok(formatted.includes('HyperLight') || formatted.includes('Combo'));
});

test('calculateCvComboTierBonus calculation accuracy', () => {
  assert.equal(calculateCvComboTierBonus(0), 0);
  assert.equal(calculateCvComboTierBonus(1500000), 50000); // < 2M
  assert.equal(calculateCvComboTierBonus(2500000), 100000); // 2M - 3M
  assert.equal(calculateCvComboTierBonus(3500000), 150000); // 3M - 4M
  assert.equal(calculateCvComboTierBonus(4500000), 200000); // 4M - 5M (+50k per extra 1M)
});

test('calculateCvSerumTierBonus calculation accuracy', () => {
  assert.equal(calculateCvSerumTierBonus(0, 0), 0);
  assert.equal(calculateCvSerumTierBonus(390000, 1), 10000); // < 550k
  assert.equal(calculateCvSerumTierBonus(650000, 2), 100000); // 50k per unit for > 550k * 2
  assert.equal(calculateCvSerumTierBonus(1200000, 3), 300000); // 100k per unit for >= 1M * 3
});

test('resolveIosCustomerTypeIcon and resolveIosHasDiscountTag dynamic classification', () => {
  // Discount/wake up tag
  assert.equal(resolveIosCustomerTypeIcon('Khách hẹn ưu đãi [50%]', 1, 0), '🙃');
  assert.equal(resolveIosCustomerTypeIcon('Khách wake up', 5, 0), '🙃');
  assert.equal(resolveIosHasDiscountTag('uu dai 50%', 0, null), true);

  // New customer
  assert.equal(resolveIosCustomerTypeIcon('', 1, 1), '☕');
  assert.equal(resolveIosCustomerTypeIcon('', 0, 1), '☕');

  // Returning customer
  assert.equal(resolveIosCustomerTypeIcon('', 3, 0), '🔄');
});

test('CVL customer privacy invariant (Kinh Thánh mOS Điều răn UI-010)', () => {
  const myStaffId = 13783;
  const mockBookings = [
    { id: 1, isUnassignedQueue: true, status: 'INCOMING', assignedStaffId: 0 },
    { id: 2, isUnassignedQueue: true, status: 'INCOMING', assignedStaffId: 0 },
    { id: 3, isUnassignedQueue: false, status: 'INCOMING', assignedStaffId: myStaffId },
    { id: 4, isUnassignedQueue: false, status: 'INCOMING', assignedStaffId: 99999 }, // Other CV
  ] as unknown as IosBookingItem[];

  const filtered = filterBookingsForCvlScope(mockBookings, myStaffId);

  // Must include booking 3 (own) and ONLY booking 1 (the first unassigned / đầu tua)
  // Booking 2 (subsequent unassigned) and Booking 4 (other staff) must be blocked!
  assert.equal(filtered.length, 2);
  assert.equal(
    filtered.some((b) => b.id === 1),
    true
  );
  assert.equal(
    filtered.some((b) => b.id === 3),
    true
  );
  assert.equal(
    filtered.some((b) => b.id === 2),
    false
  );
  assert.equal(
    filtered.some((b) => b.id === 4),
    false
  );

  // When 2+ unassigned customers share the same upcoming slot, ALL of them in that head slot are shown; later slots stay hidden.
  const now1045 = new Date('2026-11-13T10:45:00+07:00');
  const sameSlotBookings = [
    { id: 10, isUnassignedQueue: true, status: 'INCOMING', assignedStaffId: 0, timeSlot: '11:00 - 12:30' },
    { id: 11, isUnassignedQueue: true, status: 'INCOMING', assignedStaffId: 0, timeSlot: '11:00 - 12:00' },
    { id: 12, isUnassignedQueue: true, status: 'INCOMING', assignedStaffId: 0, timeSlot: '11:30 - 13:00' },
    { id: 13, isUnassignedQueue: false, status: 'INCOMING', assignedStaffId: 99999, timeSlot: '11:00 - 12:30' },
  ] as unknown as IosBookingItem[];
  const sameSlotFiltered = filterBookingsForCvlScope(sameSlotBookings, myStaffId, {
    targetDate: '2026-11-13',
    todayVn: '2026-11-13',
    now: now1045,
  });
  assert.deepEqual(
    sameSlotFiltered.map((b) => b.id),
    [10, 11]
  );

  // When a customer is past start time and still INCOMING (late), show late customer(s) AND the next upcoming slot.
  const lateAndNextBookings = [
    { id: 20, isUnassignedQueue: true, status: 'INCOMING', assignedStaffId: 0, timeSlot: '10:30 - 12:00' },
    { id: 21, isUnassignedQueue: true, status: 'INCOMING', assignedStaffId: 0, timeSlot: '11:00 - 12:30' },
    { id: 22, isUnassignedQueue: true, status: 'INCOMING', assignedStaffId: 0, timeSlot: '11:00 - 12:30' },
    { id: 23, isUnassignedQueue: true, status: 'INCOMING', assignedStaffId: 0, timeSlot: '11:30 - 13:00' },
  ] as unknown as IosBookingItem[];
  const lateAndNextFiltered = filterBookingsForCvlScope(lateAndNextBookings, myStaffId, {
    targetDate: '2026-11-13',
    todayVn: '2026-11-13',
    now: now1045,
  });
  assert.deepEqual(
    lateAndNextFiltered.map((b) => b.id),
    [20, 21, 22]
  );

  // Viewing a future date (e.g., tomorrow) must NOT treat morning slots as late.
  const tomorrowFiltered = filterBookingsForCvlScope(lateAndNextBookings, myStaffId, {
    targetDate: '2026-11-14',
    todayVn: '2026-11-13',
    now: now1045,
  });
  assert.deepEqual(
    tomorrowFiltered.map((b) => b.id),
    [20]
  );
});

test('Customer phone privacy masking rules for CVL vs Admin', () => {
  const rawPhone = '0901234567';
  assert.equal(canViewUnmaskedCustomerPhone('CVL'), false);
  assert.equal(canViewUnmaskedCustomerPhone('ADMIN'), true);

  const masked = maskPhoneNumber(rawPhone);
  assert.ok(masked.includes('***') || masked.includes('****'));
  assert.notEqual(masked, rawPhone);
});

test('Zero-default & mandatory 7/7 natural lash check invariants (Kinh Thánh mOS Điều răn OPS-003)', () => {
  // 1. Backend mock bookings must NOT pre-fill fake default natural lash values for unmeasured clients
  const walkInNewClient = INITIAL_BOOKINGS.find((b) => b.customerVisits === 1);
  assert.ok(walkInNewClient);
  assert.equal(walkInNewClient.attributes?.isNewClientDiagnosticDone, false);
  assert.equal(walkInNewClient.attributes?.naturalLashLength, undefined);
  assert.equal(walkInNewClient.attributes?.naturalLashThickness, undefined);
  assert.equal(walkInNewClient.attributes?.naturalLashCount, undefined);
  assert.equal(walkInNewClient.attributes?.lashTrail, undefined);
  assert.equal(walkInNewClient.attributes?.eyeShape, undefined);
  assert.equal(walkInNewClient.attributes?.lashHealth, undefined);
  assert.equal(walkInNewClient.attributes?.medicalProblem, undefined);

  // 2. Complete 7/7 natural lash attribute helper checks
  const full7Attrs = {
    naturalLashLength: '8 - 10 mm',
    naturalLashThickness: '0.07 - 0.10 mm',
    naturalLashCount: '80 - 100',
    lashTrail: 'Chúc xuống (Downwards)',
    eyeShape: 'hooded',
    lashHealth: 'Khách mới lần đầu nối mi (Virgin Lashes)',
    medicalProblem: 'Mắt thường / Không kích ứng (Normal)',
    isNewClientDiagnosticDone: true,
  };
  assert.equal(hasAnyNaturalLashAttribute({}), false);
  assert.equal(hasCompleteNaturalLashAttributes({}), false);
  assert.equal(hasAnyNaturalLashAttribute({ naturalLashLength: '8mm' }), true);
  assert.equal(hasCompleteNaturalLashAttributes({ naturalLashLength: '8mm' }), false);
  assert.equal(hasCompleteNaturalLashAttributes(full7Attrs), true);

  // 3. New client must be rejected if unconfirmed or missing any of the 7 natural lash fields
  assert.equal(
    validateNaturalLashConsultationSave({
      customerVisits: 1,
      existingAttributes: { isNewClientDiagnosticDone: false },
      incomingAttributes: { isNewClientDiagnosticDone: false },
    }).valid,
    false
  );
  assert.equal(
    validateNaturalLashConsultationSave({
      customerVisits: 1,
      existingAttributes: { isNewClientDiagnosticDone: false },
      incomingAttributes: { isNewClientDiagnosticDone: true },
    }).valid,
    false
  );
  assert.equal(
    validateNaturalLashConsultationSave({
      customerVisits: 1,
      existingAttributes: { isNewClientDiagnosticDone: false },
      incomingAttributes: { ...full7Attrs, medicalProblem: '' },
    }).valid,
    false
  );

  // 4. Partial natural lash measurement (1..6/7) must be rejected for any customer
  assert.equal(
    validateNaturalLashConsultationSave({
      customerVisits: 4,
      incomingAttributes: { naturalLashLength: '8 - 10 mm', eyeShape: 'hooded' },
    }).valid,
    false
  );

  // 5. Unmeasured returning client (e.g. Lần 4 / Lần 10 with CHƯA ĐO 0/7) MUST ALSO be rejected (OPS-003 v1.2.0)
  assert.equal(
    validateNaturalLashConsultationSave({
      customerVisits: 10,
      incomingAttributes: {},
    }).valid,
    false
  );

  // 6. Valid saves: new client with all 7/7 fields confirmed, or returning client with existing saved 7/7 profile
  assert.equal(
    validateNaturalLashConsultationSave({
      customerVisits: 1,
      existingAttributes: { isNewClientDiagnosticDone: false },
      incomingAttributes: full7Attrs,
    }).valid,
    true
  );
  assert.equal(
    validateNaturalLashConsultationSave({
      customerVisits: 10,
      existingAttributes: full7Attrs,
      incomingAttributes: { style: 'Doll' } as unknown as Record<string, string>,
    }).valid,
    true
  );
});

test('OPS-003 v1.2.0: Universal 7/7 gate blocks unmeasured returning clients & persists IOS_CUST_NLASH per customer', async () => {
  const store = createInMemoryConfigStore();
  const repo = createOverrideRepository(store);
  const actor = { id: 11, legacyStaffId: 46272, displayName: 'Thảo Ly', role: 'cvl', careerTier: 'CVL' as const };

  // 1. Returning client Hà (order 339319, customerId 34290, Lần 10) with CHƯA ĐO (0/7) MUST be blocked on SAVE_CONSULTATION & START_SERVICE
  const blockedSave = await executeIosBookingAction(
    actor,
    {
      bookingId: 339319,
      customerId: 34290,
      customerVisits: 10,
      action: 'SAVE_CONSULTATION',
      attributes: { style: 'Doll', curl: 'C', length: '10-12 mm', thickness: '0.05 mm' },
    },
    repo
  );
  assert.equal(blockedSave.statusCode, 400);

  const blockedStart = await executeIosBookingAction(
    actor,
    { bookingId: 339319, customerId: 34290, action: 'START_SERVICE' },
    repo
  );
  assert.equal(blockedStart.statusCode, 400);

  const blockedPrep = await executeIosBookingAction(
    actor,
    {
      bookingId: 339319,
      customerId: 34290,
      action: 'UPDATE_PROGRESS',
      orderState: 'Preparation',
      progress: { currentStep: 7 },
    },
    repo
  );
  assert.equal(blockedPrep.statusCode, 400);

  // 2. Saving consultation WITH complete 7/7 persists IOS_CUST_NLASH:34290 and unlocks subsequent visits
  const full7 = {
    style: 'Doll',
    curl: 'C',
    length: '10-12 mm',
    thickness: '0.05 mm',
    naturalLashLength: '9-10mm',
    naturalLashThickness: '0.10-0.12mm',
    naturalLashCount: '90-110',
    lashTrail: 'Thẳng (Straight)',
    eyeShape: 'Hai mí chuẩn (Almond)',
    lashHealth: 'Khỏe mạnh (Healthy)',
    medicalProblem: 'Bình thường (Good)',
    isNewClientDiagnosticDone: true,
  };
  const okSave = await executeIosBookingAction(
    actor,
    {
      bookingId: 339319,
      customerId: 34290,
      customerVisits: 10,
      action: 'SAVE_CONSULTATION',
      attributes: full7,
    },
    repo
  );
  assert.equal(okSave.statusCode, 200);
  assert.ok(store.dump()[`${CUSTOMER_NATURAL_LASH_KEY_PREFIX}34290`]);

  // 3. Future live order 340500 for customer 34290 automatically hydrates saved 7/7 natural lash profile
  const custProfiles = await repo.loadCustomerNaturalLashProfilesBatch([34290]);
  const futureOrder: RawIosOrderSnapshot = {
    id: 340500,
    order_number: '340500',
    order_state: 'Confirmed',
    booking_date_start: '2026-12-01T10:00:00',
    booking_duration_minute: 90,
    total_price: 550000,
    client_store_id: 6,
    booking_note: '11/11 chi tham gia Friday',
    user_id: 34290,
    combo_sale_required: 0,
    is_new: 0,
    promotion_id: null,
    customer_name: 'Hà',
    customer_phone: '0900260172',
    customer_avatar: null,
    booker_name: 'Ngọc Điệp',
    booker_avatar: null,
    service_name: 'Hyperlight 550',
    service_key: 'hyperlight-550',
    is_temporary: 0,
    service_type: 'Retain',
    staff_name: 'Thảo Ly',
    staff_avatar: null,
    assigned_staff_id: 46272,
    booked_staff_id: 46272,
    check_in_staff_id: null,
    check_out_staff_id: null,
    check_in_staff_name: null,
    check_in_staff_avatar: null,
    check_out_staff_name: null,
    check_out_staff_avatar: null,
    total_visits: 11,
  };
  const hydratedBookings = mapLiveOrdersToBookings({
    orders: [futureOrder],
    customerContext: createEmptyCustomerEnrichmentContext(),
    overrides: {},
    customerAvatarMap: {},
    customerNaturalLashMap: custProfiles,
    storeId: 6,
    targetDate: '2026-12-01',
    todayVn: '2026-12-01',
    activeStaffId: 46272,
    canViewFullPhone: false,
  });
  assert.equal(hydratedBookings.length, 1);
  assert.equal(hasCompleteNaturalLashAttributes(hydratedBookings[0].attributes), true);
  assert.equal(hydratedBookings[0].attributes?.isNewClientDiagnosticDone, true);
  assert.equal(hydratedBookings[0].attributes?.naturalLashLength, '9-10mm');
});

test('BUG-01 Fix: Atomic per-booking overrides prevent concurrent lost updates & preserve legacy fallback', async () => {
  // Seed legacy JSON blob with in-flight bookings 101, 202, and 303
  const store = createInMemoryConfigStore(
    {
      [LEGACY_LIVE_OVERRIDES_KEY]: JSON.stringify({
        '101': { status: 'INCOMING', notes: 'legacy-101' },
        '202': { status: 'INCOMING', notes: 'legacy-202' },
        '303': { status: 'CHECKED_IN', checkInStaffName: 'Legacy Staff' },
      }),
      [LEGACY_CUSTOMER_AVATARS_KEY]: JSON.stringify({
        '9001': 'https://cdn.wingslashes.com/legacy-9001.jpg',
      }),
    },
    10 // 10ms artificial async delay so Promise.all interleaves reads and writes
  );
  const repo = createOverrideRepository(store);

  // Concurrent actions on booking 101 and booking 202 from two different Chuyên Viên tablets
  const [res101, res202] = await Promise.all([
    executeIosBookingAction(
      { id: 10, legacyStaffId: 13783, displayName: 'Khanh Cao', role: 'cvl', careerTier: 'CVL' },
      { bookingId: 101, action: 'CHECK_IN' },
      repo
    ),
    executeIosBookingAction(
      { id: 11, legacyStaffId: 46272, displayName: 'Thảo Ly', role: 'cvl', careerTier: 'CVL' },
      { bookingId: 202, action: 'CHECK_IN' },
      repo
    ),
  ]);

  assert.equal(res101.statusCode, 200);
  assert.equal(res202.statusCode, 200);

  // Verify each booking is stored under its own atomic crm_config key <= 50 chars
  const rawDump = store.dump();
  assert.ok(rawDump[`${BOOKING_OVERRIDE_KEY_PREFIX}101`]);
  assert.ok(rawDump[`${BOOKING_OVERRIDE_KEY_PREFIX}202`]);
  assert.ok(`${BOOKING_OVERRIDE_KEY_PREFIX}336695`.length <= 25);

  // Batch load must overlay atomic keys (101, 202) while preserving untouched legacy fallback (303)
  const batch = await repo.loadBookingOverridesBatch([101, 202, 303]);
  assert.equal(batch['101']?.status, 'CHECKED_IN');
  assert.equal(batch['101']?.checkInStaffId, 13783);
  assert.equal(batch['101']?.notes, 'legacy-101');
  assert.equal(batch['202']?.status, 'CHECKED_IN');
  assert.equal(batch['202']?.checkInStaffId, 46272);
  assert.equal(batch['202']?.notes, 'legacy-202');
  assert.equal(batch['303']?.status, 'CHECKED_IN');
  assert.equal(batch['303']?.checkInStaffName, 'Legacy Staff');

  // Atomic per-customer avatar save, batch overlay, and empty deletion
  await repo.saveCustomerAvatar(9002, 'https://cdn.wingslashes.com/new-9002.jpg');
  assert.ok(store.dump()[`${CUSTOMER_AVATAR_KEY_PREFIX}9002`]);
  const avatars = await repo.loadCustomerAvatarsBatch([9001, 9002]);
  assert.equal(avatars['9001'], 'https://cdn.wingslashes.com/legacy-9001.jpg');
  assert.equal(avatars['9002'], 'https://cdn.wingslashes.com/new-9002.jpg');

  await repo.saveCustomerAvatar(9001, '');
  const avatarsAfterDelete = await repo.loadCustomerAvatarsBatch([9001, 9002]);
  assert.equal(avatarsAfterDelete['9001'], undefined);
  assert.equal(avatarsAfterDelete['9002'], 'https://cdn.wingslashes.com/new-9002.jpg');

  // RESET_DEMO cleans both atomic key and legacy fallback entry so stale state never resurrects
  await executeIosBookingAction(
    { id: 1, legacyStaffId: 13783, displayName: 'Admin', role: 'admin', careerTier: 'ADMIN' },
    { bookingId: 101, action: 'RESET_DEMO' },
    repo
  );
  assert.equal(await repo.loadBookingOverride(101), null);
  assert.equal((await repo.loadBookingOverride(202))?.checkInStaffId, 46272);
});

test('BUG-02 Fix: Live Mode 100% data purity vs explicit ?demo=1 separation', () => {
  // 1. Demo mode query parsing is strictly opt-in
  assert.equal(isIosDemoModeRequested(undefined), false);
  assert.equal(isIosDemoModeRequested('0'), false);
  assert.equal(isIosDemoModeRequested('false'), false);
  assert.equal(isIosDemoModeRequested('1'), true);
  assert.equal(isIosDemoModeRequested('true'), true);
  assert.equal(isIosDemoModeRequested(true), true);

  // 2. Live Mode with 0 SQL orders returns [] — NEVER leaks INITIAL_BOOKINGS even if overrides exist for demo IDs
  const emptyLiveList = mapLiveOrdersToBookings({
    orders: [],
    customerContext: createEmptyCustomerEnrichmentContext(),
    overrides: {
      '336695': { status: 'SERVICING', assignedStaffId: 13783 },
    },
    customerAvatarMap: {},
    storeId: 6,
    targetDate: '2026-11-12',
    todayVn: '2026-11-12',
    activeStaffId: 13783,
    canViewFullPhone: true,
  });
  assert.equal(emptyLiveList.length, 0);

  // 3. Live Mode returning customer with empty lashHistoryMap gets [] — NEVER fabricated '01/10/2026' or '19/10/2026'
  const sampleLiveOrder: RawIosOrderSnapshot = {
    id: 880001,
    order_number: '880001',
    order_state: 'Confirmed',
    booking_date_start: '2026-11-12T09:30:00',
    booking_duration_minute: 90,
    total_price: 770000,
    client_store_id: 6,
    booking_note: 'Khách quen đặt lịch',
    user_id: 77701,
    combo_sale_required: 0,
    is_new: 0,
    promotion_id: null,
    customer_name: 'Chị Lan',
    customer_phone: '0909123456',
    customer_avatar: null,
    booker_name: 'Tâm Nguyễn',
    booker_avatar: null,
    service_name: 'New Flawless Mink 770',
    service_key: 'new-flawless-mink-770',
    is_temporary: 0,
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
    total_visits: 6,
  };

  const mappedLive = mapLiveOrdersToBookings({
    orders: [sampleLiveOrder],
    customerContext: createEmptyCustomerEnrichmentContext(),
    overrides: {},
    customerAvatarMap: {},
    storeId: 6,
    targetDate: '2026-11-12',
    todayVn: '2026-11-12',
    activeStaffId: 13783,
    canViewFullPhone: true,
  });
  assert.equal(mappedLive.length, 1);
  assert.deepEqual(mappedLive[0].lashHistory, []);

  // 4. Live Mode initial staffStats starts at honest 0 đ / 0 shifts — NEVER fake 16.253.200 đ / 9 shifts
  const initialStats = createInitialLiveStaffStats(13783, '2026-11-12');
  assert.equal(initialStats.monthlyRevenue, 0);
  assert.equal(initialStats.monthlyRevenueFormatted, '0 đ');
  assert.equal(initialStats.completedShiftsCount, 0);
  assert.equal(initialStats.month, 11);

  // 5. Demo Mode (?demo=1) cleanly builds INITIAL_BOOKINGS + overrides + honest demo stats
  const demoList = buildDemoModeBookings({
    overrides: {
      '339086': { status: 'DONE', assignedStaffId: 13783 },
    },
    customerAvatarMap: {},
    storeId: 6,
    activeStaffId: 13783,
    canViewFullPhone: true,
  });
  assert.equal(demoList.length, INITIAL_BOOKINGS.length);
  const demoStats = buildDemoStaffMonthlyStats(demoList, 13783, '2026-11-12');
  assert.equal(demoStats.completedShiftsCount, 1);
  assert.equal(demoStats.monthlyRevenue, 280000);
});

test('DB pool shutdown hook registers idempotently per Fastify instance', () => {
  let hookCount = 0;
  const fakeFastify = {
    addHook(name: string) {
      if (name === 'onClose') hookCount += 1;
    },
  } as unknown as FastifyInstance;

  registerIosPoolShutdown(fakeFastify);
  registerIosPoolShutdown(fakeFastify);
  assert.equal(hookCount, 1);
});

test('resolveBookingStatusFromState & CVL scope map legacy non-spaced servicing states to SERVICING', () => {
  for (const legacyState of [
    'Preparation',
    'ServiceStart',
    'Service Start',
    'ServiceCleaned',
    'Service Cleaned',
    'ServiceEnd',
    'Service End',
    'ServiceCompleted',
    'Service Completed',
    'In-progress',
  ]) {
    assert.equal(
      resolveBookingStatusFromState(undefined, legacyState, '2026-11-13', '2026-11-13'),
      'SERVICING',
      `Expected ${legacyState} to map to SERVICING`
    );
  }

  const serviceCleanedOrder: RawIosOrderSnapshot = {
    id: 339389,
    order_number: null,
    order_state: 'ServiceCleaned',
    booking_date_start: '2026-11-13T09:30:00',
    booking_duration_minute: 97,
    total_price: 660000,
    client_store_id: 6,
    booking_note: '13/11 chị dời sớm',
    user_id: 21563,
    combo_sale_required: 0,
    is_new: 0,
    promotion_id: null,
    customer_name: 'Hằng',
    customer_phone: '0909123456',
    customer_avatar: null,
    booker_name: 'Diễm Hương',
    booker_avatar: null,
    service_name: 'New Flawless Mink 770',
    service_key: 'new-flawless-mink-770',
    is_temporary: 0,
    service_type: 'Normal',
    staff_name: 'Khanh Cao',
    staff_avatar: null,
    assigned_staff_id: 13783,
    booked_staff_id: null,
    check_in_staff_id: 37790,
    check_out_staff_id: null,
    check_in_staff_name: 'Diễm Hương',
    check_in_staff_avatar: null,
    check_out_staff_name: null,
    check_out_staff_avatar: null,
    total_visits: 12,
  };

  const mapped = mapLiveOrdersToBookings({
    orders: [serviceCleanedOrder],
    customerContext: createEmptyCustomerEnrichmentContext(),
    overrides: {},
    customerAvatarMap: {},
    storeId: 6,
    targetDate: '2026-11-13',
    todayVn: '2026-11-13',
    activeStaffId: 13783,
    canViewFullPhone: false,
  });

  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].status, 'SERVICING');

  const cvlVisible = filterBookingsForCvlScope(mapped, 13783);
  assert.equal(cvlVisible.length, 1);
  assert.equal(cvlVisible[0].status, 'SERVICING');
  assert.equal(cvlVisible[0].bookingAccessTag, 'MY_BOOKED_CUSTOMER');
});

test('CC gets STORE_ALL visibility across INCOMING, SERVICING, DONE and anchors to clientStoreId', async () => {
  const sampleBookings = [
    { ...INITIAL_BOOKINGS[0], id: 901, status: 'INCOMING', assignedStaffId: 0 },
    { ...INITIAL_BOOKINGS[0], id: 902, status: 'SERVICING', assignedStaffId: 13783 },
    { ...INITIAL_BOOKINGS[0], id: 903, status: 'CHECKED_IN', assignedStaffId: 46272 },
    { ...INITIAL_BOOKINGS[0], id: 904, status: 'DONE', assignedStaffId: 25337 },
  ] as unknown as IosBookingItem[];

  const scoped = applyIosScopeAndCounts(sampleBookings, {
    effectiveRole: 'CC',
    scope: 'STORE_ALL',
    activeStaffId: 48026,
    targetDate: '2026-11-13',
    todayVn: '2026-11-13',
  });

  assert.equal(scoped.effectiveList.length, 4);
  assert.deepEqual(scoped.counts, {
    incoming: 1,
    servicing: 2,
    done: 1,
    cancel: 0,
  });

  const store = createInMemoryConfigStore();
  const mockFastify = {
    log: { warn: () => {}, info: () => {}, error: () => {} },
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async ({ where }: { where: { key: string } }) => {
            const val = await store.getOne(where.key);
            return val !== null ? { key: where.key, value: val } : null;
          },
          findMany: async () => [],
        },
      },
    },
  } as unknown as FastifyInstance;

  const res = await queryIosBookingsList(
    mockFastify,
    {
      id: 42,
      legacyStaffId: 48026,
      clientStoreId: 16,
      username: 'yenvy_cc',
      displayName: 'Yến Vy',
      role: 'cc',
      careerTier: 'CC',
    },
    {
      storeId: '6',
      scope: 'MY_CUSTOMERS',
      role: 'CVL',
      segment: 'SERVICING',
      demo: 'true',
    }
  );

  assert.equal(res.success, true);
  assert.equal(res.storeId, 16);
  assert.equal(res.scope, 'STORE_ALL');
  assert.equal(res.role, 'CC');
});

test('Admin inspecting CC view is also locked to STORE_ALL and receives totalStoreCount', async () => {
  const sampleBookings = [
    { ...INITIAL_BOOKINGS[0], id: 911, status: 'INCOMING', assignedStaffId: 0 },
    { ...INITIAL_BOOKINGS[0], id: 912, status: 'SERVICING', assignedStaffId: 13783 },
    { ...INITIAL_BOOKINGS[0], id: 913, status: 'DONE', assignedStaffId: 25337 },
  ] as unknown as IosBookingItem[];

  const ccScoped = applyIosScopeAndCounts(sampleBookings, {
    effectiveRole: 'CC',
    scope: 'MY_CUSTOMERS',
    activeStaffId: 37790,
    targetDate: '2026-11-13',
    todayVn: '2026-11-13',
  });
  assert.equal(ccScoped.effectiveList.length, 3);
  assert.deepEqual(ccScoped.counts, { incoming: 1, servicing: 1, done: 1, cancel: 0 });

  const store = createInMemoryConfigStore();
  const mockFastify = {
    log: { warn: () => {}, info: () => {}, error: () => {} },
    prisma: {
      crm: {
        crmConfig: {
          findUnique: async ({ where }: { where: { key: string } }) => {
            const val = await store.getOne(where.key);
            return val !== null ? { key: where.key, value: val } : null;
          },
          findMany: async () => [],
        },
      },
    },
  } as unknown as FastifyInstance;

  const adminCcRes = await queryIosBookingsList(
    mockFastify,
    {
      id: 1,
      legacyStaffId: 13783,
      clientStoreId: 6,
      username: 'danny_admin',
      displayName: 'Danny',
      role: 'super_admin',
      careerTier: 'ADMIN',
    },
    {
      storeId: '6',
      scope: 'MY_CUSTOMERS',
      role: 'CC',
      staffId: '37790',
      demo: 'true',
    }
  );

  assert.equal(adminCcRes.success, true);
  assert.equal(adminCcRes.role, 'CC');
  assert.equal(adminCcRes.scope, 'STORE_ALL');
  assert.equal(adminCcRes.bookings.length, adminCcRes.totalStoreCount);

  const adminCvllFilteredRes = await queryIosBookingsList(
    mockFastify,
    {
      id: 1,
      legacyStaffId: 13783,
      clientStoreId: 6,
      username: 'danny_admin',
      displayName: 'Danny',
      role: 'super_admin',
      careerTier: 'ADMIN',
    },
    {
      storeId: '6',
      scope: 'MY_CUSTOMERS',
      role: 'CVLL',
      staffId: '13783',
      demo: 'true',
    }
  );
  assert.equal(adminCvllFilteredRes.scope, 'MY_CUSTOMERS');
  assert.ok((adminCvllFilteredRes.totalStoreCount ?? 0) >= adminCvllFilteredRes.bookings.length);

  const cvlRes = await queryIosBookingsList(
    mockFastify,
    {
      id: 2,
      legacyStaffId: 46272,
      clientStoreId: 6,
      username: 'thaoly_cvl',
      displayName: 'Thảo Ly',
      role: 'cvl',
      careerTier: 'CVL',
    },
    {
      storeId: '6',
      scope: 'STORE_ALL',
      role: 'CC',
      demo: 'true',
    }
  );
  assert.equal(cvlRes.role, 'CVL');
  assert.equal(cvlRes.scope, 'MY_CUSTOMERS');
  assert.equal(cvlRes.totalStoreCount, undefined);
});

test('resolveStaffAvatar & mapLiveOrdersToBookings preserve real staff avatar (3744.jpg) and return undefined when unassigned', () => {
  assert.equal(resolveStaffAvatar(null), undefined);
  assert.equal(resolveStaffAvatar(''), undefined);
  assert.equal(
    resolveStaffAvatar('https://cdn.wingslashes.com/uploads/user/avatar/744/thumbnail/3744.jpg'),
    'https://cdn.wingslashes.com/uploads/user/avatar/744/thumbnail/3744.jpg'
  );

  const bookedTuyeOrder: RawIosOrderSnapshot = {
    id: 339492,
    order_number: null,
    order_state: 'New',
    booking_date_start: '2026-11-14T07:30:00.000Z',
    booking_duration_minute: 90,
    total_price: 880000,
    client_store_id: 6,
    booking_note: '13/11 c book Tuyết',
    user_id: 1001,
    combo_sale_required: 0,
    is_new: 0,
    promotion_id: null,
    customer_name: 'Văn Kim Yến',
    customer_phone: '0906814072',
    customer_avatar: null,
    booker_name: 'Thanh Vũ',
    booker_avatar: null,
    service_name: 'HyperLight 4X 880',
    service_key: 'hyperlight-4x-880',
    is_temporary: 0,
    service_type: 'Normal',
    staff_name: 'Ánh Tuyết',
    staff_avatar: 'https://cdn.wingslashes.com/uploads/user/avatar/744/thumbnail/3744.jpg',
    assigned_staff_id: 3832,
    booked_staff_id: 3832,
    check_in_staff_id: null,
    check_out_staff_id: null,
    check_in_staff_name: null,
    check_in_staff_avatar: null,
    check_out_staff_name: null,
    check_out_staff_avatar: null,
    total_visits: 149,
  };

  const unassignedOrder: RawIosOrderSnapshot = {
    ...bookedTuyeOrder,
    id: 339498,
    customer_name: 'Michelle',
    staff_name: 'Chưa phân công',
    staff_avatar: null,
    assigned_staff_id: null,
    booked_staff_id: null,
  };

  const mapped = mapLiveOrdersToBookings({
    orders: [bookedTuyeOrder, unassignedOrder],
    customerContext: createEmptyCustomerEnrichmentContext(),
    overrides: {},
    customerAvatarMap: {},
    storeId: 6,
    targetDate: '2026-11-14',
    todayVn: '2026-11-14',
    activeStaffId: 37790,
    canViewFullPhone: true,
  });

  assert.equal(mapped[0].assignedStaffAvatar, 'https://cdn.wingslashes.com/uploads/user/avatar/744/thumbnail/3744.jpg');
  assert.equal(mapped[0].isBookedInAdvance, true);
  assert.equal(mapped[1].assignedStaffAvatar, undefined);
  assert.equal(mapped[1].isNextQueueCustomer, true);
});

test('Promotion Visibility ACL & Booking Promotion Hydration', () => {
  // CC & Admin (without CVL/CVLL preview) see global promotions; CVL/CVLL only see public non-system promos
  assert.equal(resolveCanViewGlobalPromotions({ id: 1, role: 'cc', careerTier: 'CC', legacyStaffId: 37790 }), true);
  assert.equal(
    resolveCanViewGlobalPromotions({ id: 2, role: 'super_admin', careerTier: 'ADMIN', legacyStaffId: 1 }),
    true
  );
  assert.equal(
    resolveCanViewGlobalPromotions({ id: 2, role: 'super_admin', careerTier: 'ADMIN', legacyStaffId: 1 }, 'CVL'),
    false
  );
  assert.equal(resolveCanViewGlobalPromotions({ id: 3, role: 'cvl', careerTier: 'CVL', legacyStaffId: 46272 }), false);
  assert.equal(resolveCanViewGlobalPromotions({ id: 4, role: 'cvll', careerTier: 'CVLL', legacyStaffId: 744 }), false);

  const promoMap = new Map([
    [
      19,
      {
        promotionId: 19,
        promotionKey: 'WELCOME-20',
        promotionType: 'normal',
        promotionApply: 'single' as const,
        serviceGroup: null,
        name: 'Ưu đãi 20% Chào Bạn Mới',
        shortName: 'Giảm 20%',
        discountPercentage: 20,
        discountAmount: 0,
        exactlyAmount: 0,
        isOldUserDisabled: true,
        isApprovalRequired: false,
        isPublic: true,
        isSystem: false,
        isCreditAllowed: false,
        dateExpired: null,
        position: 1,
      },
    ],
  ]);

  const orderWithPromo: RawIosOrderSnapshot = {
    id: 340999,
    order_number: '340999',
    order_state: 'CheckIn',
    booking_date_start: '2026-11-14T08:00:00.000Z',
    booking_duration_minute: 90,
    total_price: 770000,
    client_store_id: 6,
    booking_note: '',
    user_id: 9001,
    combo_sale_required: 0,
    is_new: 1,
    promotion_id: 19,
    customer_name: 'Khách Promo',
    customer_phone: '0909123456',
    customer_avatar: null,
    booker_name: '',
    booker_avatar: null,
    service_name: 'HyperLight 4X 770',
    service_key: 'hyperlight-4x-770',
    is_temporary: 0,
    service_type: 'Normal',
    staff_name: 'Thảo Ly',
    staff_avatar: null,
    assigned_staff_id: 46272,
    booked_staff_id: 46272,
    check_in_staff_id: 37790,
    check_out_staff_id: null,
    check_in_staff_name: 'Diễm Hương',
    check_in_staff_avatar: null,
    check_out_staff_name: null,
    check_out_staff_avatar: null,
    total_visits: 1,
  };

  const mapped = mapLiveOrdersToBookings({
    orders: [orderWithPromo],
    customerContext: createEmptyCustomerEnrichmentContext(),
    overrides: {},
    customerAvatarMap: {},
    promotionsById: promoMap,
    storeId: 6,
    targetDate: '2026-11-14',
    todayVn: '2026-11-14',
    activeStaffId: 37790,
    canViewFullPhone: true,
  });

  assert.equal(mapped[0].promotionId, 19);
  assert.equal(mapped[0].appliedPromotion?.name, 'Ưu đãi 20% Chào Bạn Mới');
  assert.equal(mapped[0].billing?.promotionDiscountAmount, 154000);
  assert.equal(mapped[0].billing?.vatAmount, Math.round((770000 - 154000) * 0.08));

  // Itemized per-service + per-product promotions via legacy os_promotion_id & product_promotion_map
  const productPromo: IosPromotionOption = {
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
  const itemizedPromoMap = new Map<number, IosPromotionOption>([...promoMap.entries(), [25, productPromo]]);

  const itemizedOrder: RawIosOrderSnapshot = {
    ...orderWithPromo,
    id: 341000,
    order_number: '341000',
    promotion_id: null,
    os_promotion_id: 19,
    product_promotion_map: { 901: 25 },
  };

  const mappedItemized = mapLiveOrdersToBookings({
    orders: [itemizedOrder],
    customerContext: createEmptyCustomerEnrichmentContext(),
    overrides: {
      341000: {
        cartProducts: [{ productId: 901, productName: 'Serum Dưỡng Mi', price: 500000, quantity: 1 }],
      },
    },
    customerAvatarMap: {},
    promotionsById: itemizedPromoMap,
    storeId: 6,
    targetDate: '2026-11-14',
    todayVn: '2026-11-14',
    activeStaffId: 37790,
    canViewFullPhone: true,
  });

  assert.equal(mappedItemized[0].servicePromotionId, 19);
  assert.equal(mappedItemized[0].servicePromotion?.name, 'Ưu đãi 20% Chào Bạn Mới');
  assert.equal(mappedItemized[0].cartProducts?.[0]?.promotionId, 25);
  assert.equal(mappedItemized[0].cartProducts?.[0]?.appliedPromotion?.name, 'Giảm 10% Dưỡng Mi');
  // Service discount: 154,000 + Product discount: 50,000 = 204,000
  assert.equal(mappedItemized[0].billing?.promotionDiscountAmount, 204000);
});
