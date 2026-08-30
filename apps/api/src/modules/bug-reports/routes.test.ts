import assert from 'node:assert/strict';
import test from 'node:test';
import { canManageBugInbox, isValidAgentAuthorization } from './routes.js';

test('only Danny canonical Super Admin can manage Bug Inbox', () => {
  assert.equal(canManageBugInbox({ role: 'super_admin', username: 'danhdo@gmail.com' }), true);
  assert.equal(canManageBugInbox({ role: 'super_admin', username: 'another-admin' }), false);
  assert.equal(canManageBugInbox({ role: 'admin', username: 'danhdo@gmail.com' }), false);
  assert.equal(canManageBugInbox({ role: 'manager', username: 'manager' }), false);
});

test('Agent bridge requires an exact independent bearer token', () => {
  const token = 'agent-token-that-is-definitely-over-32-characters';
  assert.equal(isValidAgentAuthorization(`Bearer ${token}`, token), true);
  assert.equal(isValidAgentAuthorization('Bearer wrong-token', token), false);
  assert.equal(isValidAgentAuthorization(`Basic ${token}`, token), false);
  assert.equal(isValidAgentAuthorization(`Bearer ${token}`, 'short'), false);
});
