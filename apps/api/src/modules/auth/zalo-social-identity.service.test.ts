import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createZaloWorkshopOAuthSession,
  getZaloSocialConfiguration,
  verifyZaloWorkshopOAuthSession,
  zaloAuthorizationUrl,
} from './zalo-social-identity.service.js';

const REGISTRATION_CODE = 'M9gLQPLhoeElZ5ORDGTuoasv';
const SIGNING_SECRET = 'test_zalo_workshop_oauth_secret';
const NOW = Date.UTC(2026, 7, 27, 2, 0, 0);

test('only enables Zalo Social Login with all required Academy configuration', () => {
  assert.equal(getZaloSocialConfiguration({}), null);
  assert.equal(
    getZaloSocialConfiguration({
      ZALO_SOCIAL_APP_ID: 'app_123',
      ZALO_SOCIAL_SECRET_KEY: 'secret_123',
      ZALO_SOCIAL_REDIRECT_URI: 'not-a-url',
    }),
    null
  );
  assert.deepEqual(
    getZaloSocialConfiguration({
      ZALO_SOCIAL_APP_ID: 'app_123',
      ZALO_SOCIAL_SECRET_KEY: 'secret_123',
      ZALO_SOCIAL_REDIRECT_URI: 'https://crm.example.com/api/academy/workshops/registration/zalo/callback',
    }),
    {
      appId: 'app_123',
      secretKey: 'secret_123',
      redirectUri: 'https://crm.example.com/api/academy/workshops/registration/zalo/callback',
    }
  );
});

test('binds Zalo OAuth state to an HttpOnly cookie with PKCE and a short expiration', () => {
  const session = createZaloWorkshopOAuthSession(REGISTRATION_CODE, NOW, SIGNING_SECRET);
  const verified = verifyZaloWorkshopOAuthSession(session.state, session.cookie, NOW + 30_000, SIGNING_SECRET);

  assert.equal(verified.registrationCode, REGISTRATION_CODE);
  assert.match(verified.codeVerifier, /^[A-Za-z0-9_-]{43}$/);
  assert.match(session.codeChallenge, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(session.maxAgeSeconds, 600);

  assert.throws(
    () => verifyZaloWorkshopOAuthSession(session.state, `${session.cookie}tampered`, NOW + 30_000, SIGNING_SECRET),
    /không hợp lệ/
  );
  assert.throws(
    () => verifyZaloWorkshopOAuthSession(session.state, session.cookie, NOW + 601_000, SIGNING_SECRET),
    /hết hạn/
  );
});

test('builds the official Zalo authorization URL with state and PKCE challenge', () => {
  const session = createZaloWorkshopOAuthSession(REGISTRATION_CODE, NOW, SIGNING_SECRET);
  const url = new URL(
    zaloAuthorizationUrl(
      {
        appId: 'app_123',
        secretKey: 'secret_123',
        redirectUri: 'https://crm.example.com/api/academy/workshops/registration/zalo/callback',
      },
      session
    )
  );

  assert.equal(url.origin, 'https://oauth.zaloapp.com');
  assert.equal(url.pathname, '/v4/permission');
  assert.equal(url.searchParams.get('app_id'), 'app_123');
  assert.equal(
    url.searchParams.get('redirect_uri'),
    'https://crm.example.com/api/academy/workshops/registration/zalo/callback'
  );
  assert.equal(url.searchParams.get('code_challenge'), session.codeChallenge);
  assert.equal(url.searchParams.get('state'), session.state);
});
