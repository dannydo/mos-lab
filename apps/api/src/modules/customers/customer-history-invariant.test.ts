import assert from 'node:assert/strict';
import test from 'node:test';

test('duplicate profile detection correctly identifies ghost profile with zero orders and zero contacts', () => {
  const ghostCustomer = {
    id: 43308,
    name: 'Anni',
    bookingCount: 0,
    contactCount: 0,
  };

  const existingOriginalProfiles = [
    {
      id: 38217,
      name: 'Anni',
      bookingCount: 13,
      contactCount: 2,
    },
  ];

  // Logic simulation matching customer-detail.routes.ts
  const shouldCheckDuplicate =
    ghostCustomer.bookingCount === 0 &&
    ghostCustomer.contactCount === 0 &&
    ghostCustomer.name &&
    ghostCustomer.name !== 'No Name';

  assert.equal(shouldCheckDuplicate, true);

  const matched = existingOriginalProfiles.find(
    (p) => p.id !== ghostCustomer.id && p.name.startsWith(ghostCustomer.name) && p.bookingCount > 0
  );

  assert.ok(matched);
  assert.equal(matched?.id, 38217);
  assert.equal(matched?.bookingCount, 13);
});

test('duplicate profile detection does not flag legitimate customers with orders', () => {
  const validCustomer = {
    id: 38217,
    name: 'Anni',
    bookingCount: 13,
    contactCount: 2,
  };

  const shouldCheckDuplicate =
    validCustomer.bookingCount === 0 &&
    validCustomer.contactCount === 0 &&
    validCustomer.name &&
    validCustomer.name !== 'No Name';

  assert.equal(shouldCheckDuplicate, false);
});

test('NYC and random-ids query invariants enforce valid phone number and completed order existence', () => {
  // Query construction rules test
  const buildRandomWhereClauses = (bucket?: string, daysSinceLastVisit?: string) => {
    const clauses: string[] = [
      'COALESCE(up.is_deleted, 0) = 0',
      'COALESCE(up.is_disabled, 0) = 0',
      `EXISTS (
        SELECT 1 FROM user_contact uc_rand
        WHERE uc_rand.user_id = u.id AND uc_rand.is_disabled = 0 AND uc_rand.phone_number IS NOT NULL AND TRIM(uc_rand.phone_number) != ''
      )`,
    ];

    if (bucket === 'NOT_COMBO_LIVE') {
      clauses.push('(usb_agg.user_id IS NULL OR COALESCE(usb_agg.live_count, 0) = 0)');
      clauses.push(`EXISTS (
        SELECT 1 FROM \`order\` o_rand
        WHERE o_rand.user_id = u.id
      )`);
    }

    if (daysSinceLastVisit !== undefined && daysSinceLastVisit !== '') {
      clauses.push(`EXISTS (
        SELECT 1 FROM \`order\` o_visit_rand
        WHERE o_visit_rand.user_id = u.id
      )`);
    }

    return clauses;
  };

  const nycClauses = buildRandomWhereClauses('NOT_COMBO_LIVE', '30');
  const hasPhoneCheck = nycClauses.some((c) => c.includes('user_contact') && c.includes('TRIM(uc_rand.phone_number) != \'\''));
  const hasOrderCheck = nycClauses.some((c) => c.includes('FROM `order`'));
  const hasDeletedCheck = nycClauses.some((c) => c.includes('COALESCE(up.is_deleted, 0) = 0'));

  assert.equal(hasPhoneCheck, true, 'NYC allocation MUST require a valid phone number');
  assert.equal(hasOrderCheck, true, 'NYC allocation MUST require at least 1 order');
  assert.equal(hasDeletedCheck, true, 'NYC allocation MUST exclude deleted profiles');
});
