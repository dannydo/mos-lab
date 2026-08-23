import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { isAdminOrSuperAdminRole, isCanonicalSuperAdminIdentity, isSuperAdminRole } from '@mos-lab/shared';
import { requireSuperAdmin } from './auth.js';

test('Super Admin inherits ordinary Admin authorization while remaining explicit', () => {
  assert.equal(isAdminOrSuperAdminRole('super_admin'), true);
  assert.equal(isAdminOrSuperAdminRole('admin'), true);
  assert.equal(isSuperAdminRole('admin'), false);
  assert.equal(isSuperAdminRole('super_admin'), true);
});

test('only Danny Do canonical account identities bootstrap as Super Admin', () => {
  assert.equal(isCanonicalSuperAdminIdentity({ username: 'admin' }), true);
  assert.equal(isCanonicalSuperAdminIdentity({ email: 'danny.do@wingslashes.com' }), true);
  assert.equal(isCanonicalSuperAdminIdentity({ username: 'another-admin' }), false);
});

test('ordinary Admin is rejected by a Super Admin-only guard', async () => {
  let statusCode = 0;
  let payload: unknown;
  const reply = {
    status: (code: number) => {
      statusCode = code;
      return {
        send: (body: unknown) => {
          payload = body;
        },
      };
    },
  };

  await requireSuperAdmin(
    { user: { id: 2, username: 'ops-admin', displayName: 'Ops Admin', role: 'admin' } } as unknown as FastifyRequest,
    reply as unknown as FastifyReply
  );

  assert.equal(statusCode, 403);
  assert.deepEqual(payload, {
    error: 'Forbidden',
    message: 'Chỉ Super Admin mới có quyền truy cập khu vực này.',
  });
});
