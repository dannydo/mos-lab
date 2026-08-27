import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import axios from 'axios';

const ZALO_AUTHORIZE_URL = 'https://oauth.zaloapp.com/v4/permission';
const ZALO_TOKEN_URL = 'https://oauth.zaloapp.com/v4/access_token';
const ZALO_PROFILE_URL = 'https://graph.zalo.me/v2.0/me';
const OAUTH_TTL_SECONDS = 10 * 60;

export interface ZaloSocialConfiguration {
  appId: string;
  secretKey: string;
  redirectUri: string;
}

export interface ZaloSocialIdentity {
  subject: string;
  name: string;
  avatarUrl: string | null;
}

type OAuthStatePayload = {
  kind: 'ACADEMY_WORKSHOP_ZALO_OAUTH_STATE';
  registrationCode: string;
  nonce: string;
  expiresAt: number;
};

type OAuthCookiePayload = {
  kind: 'ACADEMY_WORKSHOP_ZALO_OAUTH_COOKIE';
  nonce: string;
  codeVerifier: string;
  expiresAt: number;
};

export type ZaloWorkshopOAuthSession = {
  state: string;
  cookie: string;
  codeChallenge: string;
  maxAgeSeconds: number;
};

export class ZaloSocialIdentityError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'ZaloSocialIdentityError';
    this.statusCode = statusCode;
  }
}

function clean(value: unknown) {
  return String(value || '').trim();
}

function base64urlJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function oauthSigningSecret() {
  return clean(
    process.env.ZALO_SOCIAL_STATE_SECRET ||
      process.env.ACADEMY_WORKSHOP_PARTICIPANT_JWT_SECRET ||
      process.env.JWT_SECRET ||
      'academy_workshop_zalo_oauth_development_secret_change_me'
  );
}

function sign(value: string, signingSecret = oauthSigningSecret()) {
  return createHmac('sha256', signingSecret).update(value).digest('base64url');
}

function signedPayload(value: unknown, signingSecret?: string) {
  const encoded = base64urlJson(value);
  return `${encoded}.${sign(encoded, signingSecret)}`;
}

function readSignedPayload<T>(token: unknown, signingSecret?: string): T {
  const raw = clean(token);
  const [encoded, signature, ...extra] = raw.split('.');
  if (!encoded || !signature || extra.length)
    throw new ZaloSocialIdentityError('Phiên đăng nhập Zalo không hợp lệ.', 401);
  const expected = Buffer.from(sign(encoded, signingSecret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new ZaloSocialIdentityError('Phiên đăng nhập Zalo không hợp lệ.', 401);
  }
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
  } catch {
    throw new ZaloSocialIdentityError('Phiên đăng nhập Zalo không hợp lệ.', 401);
  }
}

function validRegistrationCode(value: string) {
  return /^[A-Za-z0-9_-]{12,48}$/.test(value);
}

export function getZaloSocialConfiguration(
  environment: NodeJS.ProcessEnv = process.env
): ZaloSocialConfiguration | null {
  const appId = clean(environment.ZALO_SOCIAL_APP_ID);
  const secretKey = clean(environment.ZALO_SOCIAL_SECRET_KEY);
  const redirectUri = clean(environment.ZALO_SOCIAL_REDIRECT_URI);
  if (!appId || !secretKey || !redirectUri) return null;
  try {
    const url = new URL(redirectUri);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
  } catch {
    return null;
  }
  return { appId, secretKey, redirectUri };
}

export function isZaloSocialLoginConfigured() {
  return Boolean(getZaloSocialConfiguration());
}

export function requireZaloSocialConfiguration() {
  const configuration = getZaloSocialConfiguration();
  if (!configuration) {
    throw new ZaloSocialIdentityError('Zalo Auth chưa được Academy cấu hình.', 503);
  }
  return configuration;
}

export function createZaloWorkshopOAuthSession(
  rawRegistrationCode: unknown,
  now = Date.now(),
  signingSecret?: string
): ZaloWorkshopOAuthSession {
  const registrationCode = clean(rawRegistrationCode);
  if (!validRegistrationCode(registrationCode)) {
    throw new ZaloSocialIdentityError('Link đăng ký workshop không hợp lệ.', 404);
  }
  const expiresAt = Math.floor(now / 1000) + OAUTH_TTL_SECONDS;
  const nonce = randomBytes(24).toString('base64url');
  const codeVerifier = randomBytes(32).toString('base64url');
  const state = signedPayload(
    { kind: 'ACADEMY_WORKSHOP_ZALO_OAUTH_STATE', registrationCode, nonce, expiresAt } satisfies OAuthStatePayload,
    signingSecret
  );
  const cookie = signedPayload(
    { kind: 'ACADEMY_WORKSHOP_ZALO_OAUTH_COOKIE', nonce, codeVerifier, expiresAt } satisfies OAuthCookiePayload,
    signingSecret
  );
  return {
    state,
    cookie,
    codeChallenge: createHash('sha256').update(codeVerifier, 'ascii').digest('base64url'),
    maxAgeSeconds: OAUTH_TTL_SECONDS,
  };
}

export function verifyZaloWorkshopOAuthSession(
  stateToken: unknown,
  cookieToken: unknown,
  now = Date.now(),
  signingSecret?: string
) {
  const state = readSignedPayload<OAuthStatePayload>(stateToken, signingSecret);
  const cookie = readSignedPayload<OAuthCookiePayload>(cookieToken, signingSecret);
  const nowSeconds = Math.floor(now / 1000);
  if (
    state.kind !== 'ACADEMY_WORKSHOP_ZALO_OAUTH_STATE' ||
    cookie.kind !== 'ACADEMY_WORKSHOP_ZALO_OAUTH_COOKIE' ||
    !validRegistrationCode(state.registrationCode) ||
    state.expiresAt < nowSeconds ||
    cookie.expiresAt < nowSeconds ||
    state.nonce !== cookie.nonce ||
    !/^[A-Za-z0-9_-]{43}$/.test(cookie.codeVerifier)
  ) {
    throw new ZaloSocialIdentityError('Phiên đăng nhập Zalo đã hết hạn. Vui lòng thử lại.', 401);
  }
  return { registrationCode: state.registrationCode, codeVerifier: cookie.codeVerifier };
}

export function zaloAuthorizationUrl(configuration: ZaloSocialConfiguration, session: ZaloWorkshopOAuthSession) {
  const url = new URL(ZALO_AUTHORIZE_URL);
  url.searchParams.set('app_id', configuration.appId);
  url.searchParams.set('redirect_uri', configuration.redirectUri);
  url.searchParams.set('code_challenge', session.codeChallenge);
  url.searchParams.set('state', session.state);
  return url.toString();
}

function responseMessage(value: unknown) {
  const data = value as { message?: unknown; error_description?: unknown } | null;
  return clean(data?.message || data?.error_description);
}

export async function exchangeZaloAuthorizationCode(
  authorizationCode: unknown,
  codeVerifier: string,
  configuration = requireZaloSocialConfiguration()
): Promise<ZaloSocialIdentity> {
  const code = clean(authorizationCode);
  if (!code) throw new ZaloSocialIdentityError('Zalo không trả về mã xác thực.', 400);
  try {
    const tokenResponse = await axios.post<{
      access_token?: unknown;
      error?: unknown;
      message?: unknown;
      error_description?: unknown;
    }>(
      ZALO_TOKEN_URL,
      new URLSearchParams({
        code,
        app_id: configuration.appId,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
      {
        headers: { secret_key: configuration.secretKey, 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10_000,
      }
    );
    const accessToken = clean(tokenResponse.data.access_token);
    if (!accessToken) {
      throw new ZaloSocialIdentityError(responseMessage(tokenResponse.data) || 'Không thể xác minh Zalo.', 401);
    }
    const profileResponse = await axios.get<{
      error?: unknown;
      message?: unknown;
      id?: unknown;
      name?: unknown;
      picture?: { data?: { url?: unknown } };
      data?: { id?: unknown; name?: unknown; picture?: { data?: { url?: unknown } } };
    }>(ZALO_PROFILE_URL, {
      headers: { access_token: accessToken },
      params: { fields: 'id,name,picture' },
      timeout: 10_000,
    });
    const profile = profileResponse.data.data || profileResponse.data;
    if (Number(profileResponse.data.error || 0) !== 0) {
      throw new ZaloSocialIdentityError(responseMessage(profileResponse.data) || 'Không thể lấy hồ sơ Zalo.', 401);
    }
    const subject = clean(profile.id);
    if (!subject) throw new ZaloSocialIdentityError('Zalo không trả về hồ sơ hợp lệ.', 401);
    return {
      subject,
      name: clean(profile.name) || 'Học viên Zalo',
      avatarUrl: clean(profile.picture?.data?.url) || null,
    };
  } catch (cause) {
    if (cause instanceof ZaloSocialIdentityError) throw cause;
    throw new ZaloSocialIdentityError('Không thể xác minh Zalo. Vui lòng thử lại.', 502);
  }
}
