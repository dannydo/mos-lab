import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateImpersonationPolicy } from './impersonation-policy.js';

const superAdmin = { id: 1, role: 'super_admin', isActive: true };
const admin = { id: 2, role: 'admin', isActive: true };
const telesales = { id: 3, role: 'telesales', isActive: true };

test('permits Super Admin to switch into an active Admin account', () => {
  const result = evaluateImpersonationPolicy({ actor: superAdmin, target: admin, isAlreadyImpersonating: false });
  assert.equal(result.allowed, true);
});

test('keeps Admin from switching into another Admin account', () => {
  const result = evaluateImpersonationPolicy({
    actor: admin,
    target: { ...admin, id: 4 },
    isAlreadyImpersonating: false,
  });
  assert.deepEqual(result, {
    allowed: false,
    statusCode: 403,
    message: 'Chỉ Super Admin mới được đăng nhập dưới quyền của Admin.',
  });
});

test('keeps all actors from switching into a Super Admin account', () => {
  const result = evaluateImpersonationPolicy({
    actor: superAdmin,
    target: { id: 4, role: 'super_admin', isActive: true },
    isAlreadyImpersonating: false,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.statusCode, 403);
});

test('rejects a locked target and nested account switching', () => {
  const lockedTarget = evaluateImpersonationPolicy({
    actor: superAdmin,
    target: { ...telesales, isActive: false },
    isAlreadyImpersonating: false,
  });
  assert.equal(lockedTarget.statusCode, 400);

  const nestedSwitch = evaluateImpersonationPolicy({
    actor: superAdmin,
    target: telesales,
    isAlreadyImpersonating: true,
  });
  assert.equal(nestedSwitch.statusCode, 409);
});
