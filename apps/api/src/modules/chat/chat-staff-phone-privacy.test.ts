import assert from 'node:assert/strict';
import test from 'node:test';
import type { MosChatStaffMember } from '@mos-lab/shared';
import type { JwtUserPayload } from '../../middlewares/auth.js';
import { mergeStaffPhones, normalizePhoneList } from '../staff/staff-extra-phones.service.js';
import { canViewerSeeStaffPhonesForOmiCall, sanitizeStaffDirectoryForViewer } from './chat-staff-directory.service.js';

const sampleStaff: MosChatStaffMember[] = [
  {
    id: 1,
    username: 'danhdo@gmail.com',
    displayName: 'Danny Do',
    role: 'super_admin',
    phone: '0901111222',
    phones: ['0901111222'],
  },
  {
    id: 13,
    username: 'han.huynh@wingslashes.com',
    displayName: 'Bảo Hân',
    role: 'admin',
    phone: '0702610128',
    phones: ['0702610128', '0989062401'],
  },
];

test('canViewerSeeStaffPhonesForOmiCall only grants phone access to super_admin or canonical Danny identity', () => {
  assert.equal(
    canViewerSeeStaffPhonesForOmiCall({
      id: 1,
      username: 'danny',
      displayName: 'Danny',
      role: 'super_admin',
    }),
    true
  );
  assert.equal(
    canViewerSeeStaffPhonesForOmiCall({
      id: 1,
      username: 'danhdo@gmail.com',
      displayName: 'Danny Do',
      role: 'admin',
      email: 'danhdo@gmail.com',
    }),
    true
  );

  for (const role of ['admin', 'cc', 'cv', 'telesales', 'booker'] as const) {
    assert.equal(
      canViewerSeeStaffPhonesForOmiCall({
        id: 13,
        username: `user_${role}`,
        displayName: 'Staff User',
        role,
      } as JwtUserPayload),
      false
    );
  }
  assert.equal(canViewerSeeStaffPhonesForOmiCall(undefined), false);
});

test('sanitizeStaffDirectoryForViewer preserves phone for super_admin / canonical Danny and strips phone key for others', () => {
  const superAdminView = sanitizeStaffDirectoryForViewer(sampleStaff, {
    id: 1,
    username: 'danny',
    displayName: 'Danny',
    role: 'super_admin',
  });
  assert.equal(superAdminView[1]?.phone, '0702610128');
  assert.deepEqual(superAdminView[1]?.phones, ['0702610128', '0989062401']);

  const dannyByEmailView = sanitizeStaffDirectoryForViewer(sampleStaff, {
    id: 1,
    username: 'danhdo@gmail.com',
    displayName: 'Danny Do',
    role: 'admin',
    email: 'danhdo@gmail.com',
  });
  assert.equal(dannyByEmailView[1]?.phone, '0702610128');
  assert.deepEqual(dannyByEmailView[1]?.phones, ['0702610128', '0989062401']);

  for (const role of ['admin', 'cc', 'cv', 'telesales'] as const) {
    const restrictedView = sanitizeStaffDirectoryForViewer(sampleStaff, {
      id: 20,
      username: `staff_${role}`,
      displayName: 'Restricted User',
      role,
    } as JwtUserPayload);
    assert.equal(restrictedView.length, 2);
    for (const member of restrictedView) {
      assert.equal('phone' in member, false);
      assert.equal('phones' in member, false);
    }
  }

  const unauthenticatedView = sanitizeStaffDirectoryForViewer(sampleStaff, undefined);
  for (const member of unauthenticatedView) {
    assert.equal('phone' in member, false);
    assert.equal('phones' in member, false);
  }
});

test('normalizePhoneList and mergeStaffPhones deduplicate digits while keeping display order', () => {
  assert.deepEqual(normalizePhoneList('0702 610 128, 1234, 0989062401; 0989-062-401'), ['0702 610 128', '0989062401']);
  assert.deepEqual(mergeStaffPhones('0702610128', ['0702 610 128', '0989062401']), ['0702610128', '0989062401']);
});
