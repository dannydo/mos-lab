import assert from 'node:assert/strict';
import test from 'node:test';
import { getPancakeSyncConfiguration, pancakeConfigurationError } from './pancake-sync.service.js';

test('requires explicit server-side Pancake source configuration', () => {
  const config = getPancakeSyncConfiguration({ PANCAKE_JWT: 'session-token' });

  assert.equal(config.automaticSyncEnabled, false);
  assert.equal(
    pancakeConfigurationError(config),
    'Thiếu cấu hình Pancake Academy: ACADEMY_PANCAKE_POS_SHOP_ID, ACADEMY_PANCAKE_FACEBOOK_PAGE_IDS, ACADEMY_PANCAKE_TIKTOK_PAGE_IDS.'
  );
});

test('uses the hourly default and enables only an explicitly opted-in scheduler', () => {
  const config = getPancakeSyncConfiguration({
    PANCAKE_JWT: 'session-token',
    ACADEMY_PANCAKE_POS_SHOP_ID: 'academy-shop',
    ACADEMY_PANCAKE_FACEBOOK_PAGE_IDS: ' facebook-1, facebook-2 ',
    ACADEMY_PANCAKE_TIKTOK_PAGE_IDS: 'tiktok-1',
    ACADEMY_PANCAKE_SYNC_ENABLED: 'TRUE',
    ACADEMY_PANCAKE_SYNC_INTERVAL_MINUTES: 'invalid',
  });

  assert.equal(pancakeConfigurationError(config), null);
  assert.equal(config.automaticSyncEnabled, true);
  assert.deepEqual(config.facebookPageIds, ['facebook-1', 'facebook-2']);
  assert.deepEqual(config.tiktokPageIds, ['tiktok-1']);
  assert.equal(config.intervalMs, 60 * 60 * 1000);
});

test('does not accept a scheduler interval shorter than fifteen minutes', () => {
  const config = getPancakeSyncConfiguration({ ACADEMY_PANCAKE_SYNC_INTERVAL_MINUTES: '5' });
  assert.equal(config.intervalMs, 60 * 60 * 1000);
});
