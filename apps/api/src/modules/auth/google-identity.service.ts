import axios from 'axios';

const DEFAULT_GOOGLE_CLIENT_ID = '648958464510-tedkbs4n8dmrgfjhqegcien7r0u7ed9g.apps.googleusercontent.com';
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

export interface GoogleIdentity {
  subject: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface GoogleTokenInfo {
  aud?: unknown;
  email?: unknown;
  email_verified?: unknown;
  exp?: unknown;
  iss?: unknown;
  name?: unknown;
  given_name?: unknown;
  picture?: unknown;
  sub?: unknown;
}

export class GoogleIdentityError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 401) {
    super(message);
    this.name = 'GoogleIdentityError';
    this.statusCode = statusCode;
  }
}

export function googleClientId(): string {
  return String(process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID).trim();
}

export function validateGoogleTokenInfo(
  tokenInfo: GoogleTokenInfo,
  expectedAudience = googleClientId(),
  nowSeconds = Math.floor(Date.now() / 1000)
): GoogleIdentity {
  if (String(tokenInfo.aud || '') !== expectedAudience) {
    throw new GoogleIdentityError('Google credential không thuộc ứng dụng này.');
  }
  if (!GOOGLE_ISSUERS.has(String(tokenInfo.iss || ''))) {
    throw new GoogleIdentityError('Google credential có nhà phát hành không hợp lệ.');
  }
  if (!['true', '1'].includes(String(tokenInfo.email_verified || '').toLowerCase())) {
    throw new GoogleIdentityError('Email Google chưa được xác minh.');
  }
  const expiresAt = Number(tokenInfo.exp);
  if (!Number.isFinite(expiresAt) || expiresAt <= nowSeconds) {
    throw new GoogleIdentityError('Google credential đã hết hạn.');
  }

  const subject = String(tokenInfo.sub || '').trim();
  const email = String(tokenInfo.email || '')
    .trim()
    .toLowerCase();
  if (!subject || !email || !email.includes('@')) {
    throw new GoogleIdentityError('Google credential thiếu thông tin tài khoản.');
  }

  return {
    subject,
    email,
    name: String(tokenInfo.name || tokenInfo.given_name || email.split('@')[0] || 'Google User').trim(),
    avatarUrl: String(tokenInfo.picture || '').trim() || null,
  };
}

export async function verifyGoogleCredential(credential: unknown): Promise<GoogleIdentity> {
  const token = String(credential || '').trim();
  if (!token) throw new GoogleIdentityError('Google credential là bắt buộc.', 400);

  try {
    const response = await axios.get<GoogleTokenInfo>('https://oauth2.googleapis.com/tokeninfo', {
      params: { id_token: token },
      timeout: 10_000,
    });
    return validateGoogleTokenInfo(response.data);
  } catch (cause) {
    if (cause instanceof GoogleIdentityError) throw cause;
    throw new GoogleIdentityError('Google credential không hợp lệ hoặc không thể xác minh.');
  }
}
