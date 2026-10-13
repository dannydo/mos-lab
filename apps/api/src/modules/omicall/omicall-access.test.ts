import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isAdminOrSuperAdminRole,
  isCanonicalSuperAdminIdentity,
  isSuperAdminRole,
  isTelesalesRole,
} from '@mos-lab/shared';

test('OmiCall role and identity access permissions', () => {
  // Telesales & Booker belong to Growth role by definition
  assert.equal(isTelesalesRole('telesales'), true);
  assert.equal(isTelesalesRole('booker'), true);
  assert.equal(isTelesalesRole('cv'), false);
  assert.equal(isTelesalesRole('cc'), false);
  assert.equal(isTelesalesRole('cs'), false);
  assert.equal(isTelesalesRole('hr'), false);

  // Admin and Super Admin
  assert.equal(isAdminOrSuperAdminRole('admin'), true);
  assert.equal(isAdminOrSuperAdminRole('super_admin'), true);
  assert.equal(isSuperAdminRole('super_admin'), true);
  assert.equal(isSuperAdminRole('admin'), false);
  assert.equal(isAdminOrSuperAdminRole('cv'), false);
  assert.equal(isAdminOrSuperAdminRole('telesales'), false);

  // Canonical Super Admin identities
  assert.equal(isCanonicalSuperAdminIdentity({ username: 'admin' }), true);
  assert.equal(isCanonicalSuperAdminIdentity({ email: 'danny.do@wingslashes.com' }), true);
  assert.equal(isCanonicalSuperAdminIdentity({ username: 'telesales1' }), false);
});
