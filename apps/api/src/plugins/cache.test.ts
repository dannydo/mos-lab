import assert from 'node:assert/strict';
import test from 'node:test';
import { MemoryCache } from './cache.js';

test('keeps the in-memory request cache bounded and preserves recently read entries', () => {
  const cache = new MemoryCache(2);
  cache.set('first', 1);
  cache.set('second', 2);

  assert.equal(cache.get('first'), 1);
  cache.set('third', 3);

  assert.equal(cache.get('first'), 1);
  assert.equal(cache.get('second'), null);
  assert.equal(cache.get('third'), 3);
  assert.equal(cache.size, 2);
});

test('does not retain non-positive TTL entries and supports global regex invalidation', () => {
  const cache = new MemoryCache();
  cache.set('expired', 'value', 0);
  cache.set('dashboard:one', 1);
  cache.set('dashboard:two', 2);

  cache.invalidatePattern(/^dashboard:/g);

  assert.equal(cache.get('expired'), null);
  assert.equal(cache.get('dashboard:one'), null);
  assert.equal(cache.get('dashboard:two'), null);
});
