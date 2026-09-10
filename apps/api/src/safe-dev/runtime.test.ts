import assert from 'node:assert/strict';
import test from 'node:test';
import { assertSafeDevConfiguration, isSafeDev, runtimeListenHost } from './runtime.js';

const loopbackDatabases = {
  MOS_SAFE_DEV: 'true',
  NODE_ENV: 'development',
  CRM_DATABASE_URL: 'mysql://local:local@127.0.0.1:13306/mos_lab_phase3',
  LEGACY_DATABASE_URL: 'mysql://local:local@localhost:13306/management_phase3',
};

test('safe dev accepts only an explicit local loopback configuration', () => {
  assert.equal(isSafeDev(loopbackDatabases), true);
  assert.equal(runtimeListenHost(loopbackDatabases), '127.0.0.1');
  assert.doesNotThrow(() => assertSafeDevConfiguration(loopbackDatabases));
});

test('safe dev rejects production mode and non-local database hosts', () => {
  assert.throws(() => assertSafeDevConfiguration({ ...loopbackDatabases, NODE_ENV: 'production' }));
  assert.throws(() =>
    assertSafeDevConfiguration({ ...loopbackDatabases, CRM_DATABASE_URL: 'mysql://db:pw@db.example.com/mos' })
  );
});
