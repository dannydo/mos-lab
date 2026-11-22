import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isCanonicalSuperAdminIdentity, type MosChatGoogleWorkspacePreviewResponse } from '@mos-lab/shared';

export const DEFAULT_GOOGLE_WORKSPACE_SA_EMAIL = 'wings-sheets-sa@wings-lashes.iam.gserviceaccount.com';
export const CANVA_BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
export const CANVA_ALLOWED_HOSTS = new Set(['canva.link', 'www.canva.link', 'canva.com', 'www.canva.com']);
export const CACHE_TTL_MS = 45_000;
const MAX_CACHE_ENTRIES = 120;
export const REQUEST_TIMEOUT_MS = 8_000;

const PRIVILEGED_ROLES = new Set([
  'admin',
  'super_admin',
  'superadmin',
  'manager',
  'fm',
  'cho',
  'boss',
  'quan_ly',
  'quản_lý',
]);

export interface GoogleWorkspaceActorContext {
  id?: number | string | null;
  role?: string | null;
  username?: string | null;
  displayName?: string | null;
  email?: string | null;
}

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export interface CachedWorkspaceEntry {
  expiresAt: number;
  isPublicLink: boolean;
  response: MosChatGoogleWorkspacePreviewResponse;
}

export type FetchFn = typeof fetch;

let customFetchForTests: FetchFn | null = null;
let customCredentialsForTests: ServiceAccountCredentials | null | undefined = undefined;
let cachedSaToken: { token: string; expiresAt: number; clientEmail: string } | null = null;
const previewCache = new Map<string, CachedWorkspaceEntry>();

export function setGoogleWorkspaceTestOverrides(overrides?: {
  fetchImpl?: FetchFn | null;
  credentials?: ServiceAccountCredentials | null;
  clearCache?: boolean;
}): void {
  if (!overrides) {
    customFetchForTests = null;
    customCredentialsForTests = undefined;
    cachedSaToken = null;
    previewCache.clear();
    return;
  }
  if ('fetchImpl' in overrides) {
    customFetchForTests = overrides.fetchImpl ?? null;
  }
  if ('credentials' in overrides) {
    customCredentialsForTests = overrides.credentials;
    cachedSaToken = null;
  }
  if (overrides.clearCache) {
    previewCache.clear();
  }
}

export function getFetch(): FetchFn {
  return customFetchForTests || fetch;
}

export function normalizeRoleKey(role?: string | null): string {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function isPrivilegedWorkspaceActor(actor?: GoogleWorkspaceActorContext | null): boolean {
  if (!actor) return false;
  const roleKey = normalizeRoleKey(actor.role);
  if (PRIVILEGED_ROLES.has(roleKey)) return true;
  return isCanonicalSuperAdminIdentity({
    username: actor.username ?? undefined,
    email: actor.email ?? undefined,
  });
}

function loadServiceAccountCredentials(): ServiceAccountCredentials | null {
  if (customCredentialsForTests !== undefined) {
    return customCredentialsForTests;
  }

  const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (inlineJson) {
    try {
      const parsed = JSON.parse(inlineJson) as Partial<ServiceAccountCredentials>;
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
          token_uri: parsed.token_uri || 'https://oauth2.googleapis.com/token',
        };
      }
    } catch {
      // fall through to file paths
    }
  }

  const candidates = [
    process.env.GOOGLE_SERVICE_ACCOUNT_PATH?.trim(),
    resolve(process.cwd(), 'service-account.json'),
    resolve(process.cwd(), '../../service-account.json'),
    resolve(process.cwd(), '../../../service-account.json'),
  ].filter((p): p is string => Boolean(p));

  for (const filePath of candidates) {
    try {
      if (!existsSync(filePath)) continue;
      const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<ServiceAccountCredentials>;
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
          token_uri: parsed.token_uri || 'https://oauth2.googleapis.com/token',
        };
      }
    } catch {
      // try next path
    }
  }

  return null;
}

export function getGoogleWorkspaceServiceAccountEmail(): string {
  const creds = loadServiceAccountCredentials();
  return creds?.client_email || DEFAULT_GOOGLE_WORKSPACE_SA_EMAIL;
}

export async function getServiceAccountAccessToken(): Promise<{ token: string; clientEmail: string } | null> {
  const creds = loadServiceAccountCredentials();
  if (!creds) return null;

  if (
    cachedSaToken &&
    cachedSaToken.clientEmail === creds.client_email &&
    cachedSaToken.expiresAt > Date.now() + 60_000
  ) {
    return { token: cachedSaToken.token, clientEmail: cachedSaToken.clientEmail };
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const tokenUri = creds.token_uri || 'https://oauth2.googleapis.com/token';
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const claim = Buffer.from(
      JSON.stringify({
        iss: creds.client_email,
        scope: 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly',
        aud: tokenUri,
        iat: now,
        exp: now + 3600,
      })
    ).toString('base64url');

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${claim}`);
    const signature = signer.sign(creds.private_key, 'base64url');
    const assertion = `${header}.${claim}.${signature}`;

    const res = await getFetch()(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return null;

    const ttlMs = Math.max(60_000, ((json.expires_in ?? 3600) - 300) * 1000);
    cachedSaToken = {
      token: json.access_token,
      clientEmail: creds.client_email,
      expiresAt: Date.now() + ttlMs,
    };
    return { token: json.access_token, clientEmail: creds.client_email };
  } catch {
    return null;
  }
}

export function isGoogleLoginHtml(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes('accounts.google.com/servicelogin') ||
    lower.includes('name="identifier"') ||
    lower.includes('signin/v2/identifier')
  );
}

export function clearPreviewCache(): void {
  previewCache.clear();
}

export function getCachedPreviewEntry(cacheKey: string): CachedWorkspaceEntry | undefined {
  return previewCache.get(cacheKey);
}

export function setCacheEntry(cacheKey: string, entry: CachedWorkspaceEntry): void {
  if (previewCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = previewCache.keys().next().value;
    if (firstKey) previewCache.delete(firstKey);
  }
  previewCache.set(cacheKey, entry);
}

export function applyRoleSecurityGate(
  entry: { isPublicLink: boolean; response: MosChatGoogleWorkspacePreviewResponse },
  viewer?: GoogleWorkspaceActorContext | null,
  sender?: GoogleWorkspaceActorContext | null
): MosChatGoogleWorkspacePreviewResponse {
  if (entry.isPublicLink) {
    return entry.response;
  }
  if (entry.response.accessStatus === 'SERVICE_ACCOUNT') {
    const allowed = isPrivilegedWorkspaceActor(viewer) || isPrivilegedWorkspaceActor(sender);
    if (!allowed) {
      return {
        success: false,
        kind: entry.response.kind,
        fileId: entry.response.fileId,
        canonicalUrl: entry.response.canonicalUrl,
        embedUrl: entry.response.embedUrl,
        title: entry.response.title || 'Tài liệu nội bộ Wings',
        accessStatus: 'RESTRICTED_ROLE',
        serviceAccountEmail: entry.response.serviceAccountEmail,
        statusMessage:
          'Tài liệu nội bộ đọc qua Service Account chỉ hiển thị trực tiếp khi người gửi hoặc người xem giữ vai trò Quản lý / Admin.',
        requestedGid: entry.response.requestedGid,
        requestedRange: entry.response.requestedRange,
        parsedRange: entry.response.parsedRange,
        fetchedAt: entry.response.fetchedAt,
      };
    }
  }
  return entry.response;
}
