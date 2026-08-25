import assert from 'node:assert/strict';
import test from 'node:test';
import { GoogleIdentityError, validateGoogleTokenInfo } from './google-identity.service.js';

const VALID_TOKEN_INFO = {
  aud: 'client-id.apps.googleusercontent.com',
  iss: 'https://accounts.google.com',
  sub: 'google-subject-123',
  email: 'Student@Gmail.com',
  email_verified: 'true',
  exp: '2000',
  name: 'Student Google',
  picture: 'https://lh3.googleusercontent.com/avatar',
};

test('validates Google audience, issuer, expiry, and verified email before returning identity', () => {
  assert.deepEqual(validateGoogleTokenInfo(VALID_TOKEN_INFO, VALID_TOKEN_INFO.aud, 1_000), {
    subject: 'google-subject-123',
    email: 'student@gmail.com',
    name: 'Student Google',
    avatarUrl: 'https://lh3.googleusercontent.com/avatar',
  });
});

test('rejects Google credentials issued for another OAuth client', () => {
  assert.throws(
    () => validateGoogleTokenInfo(VALID_TOKEN_INFO, 'another-client.apps.googleusercontent.com', 1_000),
    (cause) => cause instanceof GoogleIdentityError && /không thuộc ứng dụng/.test(cause.message)
  );
});

test('rejects expired or unverified Google credentials', () => {
  assert.throws(
    () => validateGoogleTokenInfo({ ...VALID_TOKEN_INFO, exp: '900' }, VALID_TOKEN_INFO.aud, 1_000),
    /hết hạn/
  );
  assert.throws(
    () => validateGoogleTokenInfo({ ...VALID_TOKEN_INFO, email_verified: 'false' }, VALID_TOKEN_INFO.aud, 1_000),
    /chưa được xác minh/
  );
});
