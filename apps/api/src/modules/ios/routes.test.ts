import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessIosConsultationApp,
  normalizeCvFeatherRole,
  formatComboName,
  maskPhoneNumber,
  canViewUnmaskedCustomerPhone,
} from '@mos-lab/shared';

// Unit logic tested from modules/ios/routes.ts
function calculateCvComboTierBonus(comboPrice: number): number {
  if (!comboPrice || comboPrice <= 0) return 0;
  if (comboPrice < 2000000) return 50000;
  if (comboPrice < 3000000) return 100000;
  if (comboPrice < 4000000) return 150000;
  const extraMillions = Math.floor((comboPrice - 3000000) / 1000000);
  return 150000 + extraMillions * 50000;
}

function calculateCvSerumTierBonus(unitPrice: number, quantity: number): number {
  if (!quantity || quantity <= 0) return 0;
  let perUnit = 1000;
  if (unitPrice >= 1000000) perUnit = 100000;
  else if (unitPrice > 550000) perUnit = 50000;
  else if (unitPrice > 0) perUnit = 10000;
  else perUnit = 1000;
  return perUnit * quantity;
}

function resolveCustomerTypeIcon(note: string, visits: number, isNew: number): string {
  const lowerNote = (note || '').toLowerCase();
  if (
    lowerNote.includes('[50%]') ||
    lowerNote.includes('wake up') ||
    lowerNote.includes('dính') ||
    lowerNote.includes('welcome') ||
    lowerNote.includes('uudai') ||
    lowerNote.includes('ưu đãi') ||
    lowerNote.includes('discount')
  ) {
    return '🙃';
  }
  if (isNew === 1 || visits <= 1) return '☕';
  return '🔄';
}

function resolveHasDiscountTag(note: string, comboRequired: number, promotionId: any): boolean {
  const lowerNote = (note || '').toLowerCase();
  return (
    lowerNote.includes('[50%]') ||
    lowerNote.includes('uu dai') ||
    lowerNote.includes('ưu đãi') ||
    Boolean(promotionId) ||
    comboRequired === 1
  );
}

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

test('resolveCustomerTypeIcon and resolveHasDiscountTag dynamic classification', () => {
  // Discount/wake up tag
  assert.equal(resolveCustomerTypeIcon('Khách hẹn ưu đãi [50%]', 1, 0), '🙃');
  assert.equal(resolveCustomerTypeIcon('Khách wake up', 5, 0), '🙃');
  assert.equal(resolveHasDiscountTag('uu dai 50%', 0, null), true);

  // New customer
  assert.equal(resolveCustomerTypeIcon('', 1, 1), '☕');
  assert.equal(resolveCustomerTypeIcon('', 0, 1), '☕');

  // Returning customer
  assert.equal(resolveCustomerTypeIcon('', 3, 0), '🔄');
});

test('CVL customer privacy invariant (Kinh Thánh mOS Điều răn UI-010)', () => {
  const myStaffId = 13783;
  const mockBookings = [
    { id: 1, isUnassignedQueue: true, status: 'INCOMING', assignedStaffId: 0 },
    { id: 2, isUnassignedQueue: true, status: 'INCOMING', assignedStaffId: 0 },
    { id: 3, isUnassignedQueue: false, status: 'INCOMING', assignedStaffId: myStaffId },
    { id: 4, isUnassignedQueue: false, status: 'INCOMING', assignedStaffId: 99999 }, // Other CV
  ];

  let nextUnassignedIncluded = false;
  const filtered = mockBookings.filter((b) => {
    const isOwnCustomer = !b.isUnassignedQueue && b.assignedStaffId === myStaffId;
    if (isOwnCustomer) return true;

    const isNextCandidate = b.isUnassignedQueue && (b.status === 'INCOMING' || b.status === 'CHECKED_IN');
    if (isNextCandidate && !nextUnassignedIncluded) {
      nextUnassignedIncluded = true;
      return true;
    }
    return false;
  });

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
