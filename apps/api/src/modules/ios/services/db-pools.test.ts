import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStatementTimeoutSec } from './db-pools.js';

describe('resolveStatementTimeoutSec', () => {
  it('defaults to 30s when unset or blank', () => {
    assert.equal(resolveStatementTimeoutSec(undefined), 30);
    assert.equal(resolveStatementTimeoutSec(''), 30);
    assert.equal(resolveStatementTimeoutSec('   '), 30);
  });

  it('accepts a custom non-negative value and floors decimals', () => {
    assert.equal(resolveStatementTimeoutSec('45'), 45);
    assert.equal(resolveStatementTimeoutSec('12.9'), 12);
  });

  it('allows 0 to disable the guard', () => {
    assert.equal(resolveStatementTimeoutSec('0'), 0);
  });

  it('falls back to 30s on invalid input', () => {
    assert.equal(resolveStatementTimeoutSec('abc'), 30);
    assert.equal(resolveStatementTimeoutSec('-5'), 30);
  });
});
