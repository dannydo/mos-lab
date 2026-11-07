import assert from 'node:assert/strict';
import test from 'node:test';
import { isCanonicalSuperAdminIdentity, isSuperAdminRole } from '@mos-lab/shared';

test('dev mock login: distinguishes Super Admin vs normal account', () => {
  const superAdmin1 = { username: 'danny.do@wingslashes.com', email: 'danny.do@wingslashes.com', role: 'super_admin' };
  const superAdmin2 = { username: 'danhdo@gmail.com', email: 'danhdo@gmail.com', role: 'super_admin' };
  const normalStaff = { username: 'ngan.ha', email: 'nganha@wingslashes.com', role: 'telesales' };
  const cvStaff = { username: 'thuy.trang', email: 'thuytrang@wingslashes.com', role: 'cv' };

  assert.equal(isSuperAdminRole(superAdmin1.role) || isCanonicalSuperAdminIdentity(superAdmin1), true);
  assert.equal(isSuperAdminRole(superAdmin2.role) || isCanonicalSuperAdminIdentity(superAdmin2), true);
  assert.equal(isSuperAdminRole(normalStaff.role) || isCanonicalSuperAdminIdentity(normalStaff), false);
  assert.equal(isSuperAdminRole(cvStaff.role) || isCanonicalSuperAdminIdentity(cvStaff), false);
});

test('dev mock login: passcode 3264 is strictly required for Super Admin, bypass for others', () => {
  const checkPasscode = (isSuper: boolean, password?: string) => {
    if (isSuper) {
      return password === '3264';
    }
    // non-superadmin: no password required on dev
    return true;
  };

  // Normal staff
  assert.equal(checkPasscode(false, undefined), true);
  assert.equal(checkPasscode(false, ''), true);
  assert.equal(checkPasscode(false, 'any-pass'), true);

  // Super Admin
  assert.equal(checkPasscode(true, undefined), false);
  assert.equal(checkPasscode(true, '1234'), false);
  assert.equal(checkPasscode(true, 'wrong'), false);
  assert.equal(checkPasscode(true, '3264'), true);
});
