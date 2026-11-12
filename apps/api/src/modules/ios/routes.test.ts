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
import { buildDemoModeBookings, mapLiveOrdersToBookings } from './services/ios-bookings-mapper.service.js';
import { isIosDemoModeRequested } from './services/ios-bookings-query.service.js';
import { createEmptyCustomerEnrichmentContext, RawIosOrderSnapshot } from './services/ios-bookings-sql.service.js';
import {
  BOOKING_OVERRIDE_KEY_PREFIX,
  createInMemoryConfigStore,
  createOverrideRepository,
  CUSTOMER_AVATAR_KEY_PREFIX,
  LEGACY_CUSTOMER_AVATARS_KEY,
  LEGACY_LIVE_OVERRIDES_KEY,
} from './services/ios-overrides.service.js';
import { buildDemoStaffMonthlyStats, createInitialLiveStaffStats } from './services/ios-staff-stats.service.js';

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

  // 5. Valid saves: new client with all 7/7 fields confirmed, or returning client with 0/7 untouched natural lash fields
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
      customerVisits: 4,
      incomingAttributes: {},
    }).valid,
    true
  );
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
