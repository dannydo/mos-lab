import assert from 'node:assert/strict';
import test from 'node:test';
import { canManageBugInbox, canOverrideBugReview, isValidAgentAuthorization } from './routes.js';

test('only Danny canonical Super Admin can manage Bug Inbox', () => {
  assert.equal(canManageBugInbox({ role: 'super_admin', username: 'danhdo@gmail.com' }), true);
  assert.equal(canManageBugInbox({ role: 'super_admin', username: 'another-admin' }), false);
  assert.equal(canManageBugInbox({ role: 'admin', username: 'danhdo@gmail.com' }), false);
  assert.equal(canManageBugInbox({ role: 'manager', username: 'manager' }), false);
});

test('Admin and Super Admin can override reporter review without gaining Danny triage authority', () => {
  assert.equal(canOverrideBugReview({ role: 'super_admin' }), true);
  assert.equal(canOverrideBugReview({ role: 'admin' }), true);
  assert.equal(canOverrideBugReview({ role: 'manager' }), false);
  assert.equal(canOverrideBugReview({ role: 'telesales' }), false);
});

test('Agent bridge requires an exact independent bearer token', () => {
  const token = 'agent-token-that-is-definitely-over-32-characters';
  assert.equal(isValidAgentAuthorization(`Bearer ${token}`, token), true);
  assert.equal(isValidAgentAuthorization('Bearer wrong-token', token), false);
  assert.equal(isValidAgentAuthorization(`Basic ${token}`, token), false);
  assert.equal(isValidAgentAuthorization(`Bearer ${token}`, 'short'), false);
});
