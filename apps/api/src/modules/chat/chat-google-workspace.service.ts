import crypto from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  columnIndexToLetter,
  extractGoogleWorkspaceLinksFromText,
  isCanonicalSuperAdminIdentity,
  parseGoogleWorkspaceUrl,
  type MosChatGoogleDocHeading,
  type MosChatGoogleDocSection,
  type MosChatGoogleSheetActiveTabData,
  type MosChatGoogleSheetTabSummary,
  type MosChatGoogleWorkspaceAccessStatus,
  type MosChatGoogleWorkspacePreviewResponse,
  type ParsedGoogleWorkspaceLink,
} from '@mos-lab/shared';

export const DEFAULT_GOOGLE_WORKSPACE_SA_EMAIL = 'wings-sheets-sa@wings-lashes.iam.gserviceaccount.com';
const CACHE_TTL_MS = 45_000;
const MAX_CACHE_ENTRIES = 120;
const REQUEST_TIMEOUT_MS = 8_000;

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

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface CachedWorkspaceEntry {
  expiresAt: number;
  isPublicLink: boolean;
  response: MosChatGoogleWorkspacePreviewResponse;
}

type FetchFn = typeof fetch;

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

function getFetch(): FetchFn {
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

async function getServiceAccountAccessToken(): Promise<{ token: string; clientEmail: string } | null> {
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

export function decodeBasicHtmlEntities(input: string): string {
  if (!input) return '';
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    });
}

function stripTags(html: string): string {
  return decodeBasicHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, ' ')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseCsvRows(csvText: string, maxRows = 300, maxCols = 52): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      if (row.length < maxCols) row.push(cell);
      cell = '';
    } else if (ch === '\r' && next === '\n') {
      if (row.length < maxCols) row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
      if (rows.length >= maxRows) break;
    } else if (ch === '\n' || ch === '\r') {
      if (row.length < maxCols) row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      if (rows.length >= maxRows) break;
    } else {
      cell += ch;
    }
  }

  if (rows.length < maxRows && (cell.length > 0 || row.length > 0)) {
    if (row.length < maxCols) row.push(cell);
    rows.push(row);
  }

  return rows;
}

export function buildSheetSnippet(
  rows: string[][],
  parsedRange?: ParsedGoogleWorkspaceLink['parsedRange']
): {
  snippetRowStart: number;
  snippetRows: Array<{ rowNumber: number; cells: string[] }>;
  snippetColStart: number;
  snippetColHeaders: string[];
} {
  if (!rows || rows.length === 0) {
    return {
      snippetRowStart: 1,
      snippetRows: [],
      snippetColStart: 0,
      snippetColHeaders: [],
    };
  }

  const maxRowCols = rows.reduce((acc, r) => Math.max(acc, r.length), 0);
  const effectiveCols = Math.max(1, maxRowCols);

  let rowStart1Based = 1;
  let colStart0Based = 0;
  const maxSnippetCols = 5;
  const maxSnippetRows = 5;

  if (parsedRange) {
    rowStart1Based = Math.max(1, Math.min(rows.length, parsedRange.startRow - 1));
    if (rowStart1Based + maxSnippetRows - 1 > rows.length) {
      rowStart1Based = Math.max(1, rows.length - maxSnippetRows + 1);
    }
    colStart0Based = Math.max(0, parsedRange.startCol - 1);
    if (colStart0Based + maxSnippetCols > Math.max(effectiveCols, parsedRange.endCol + 1)) {
      colStart0Based = Math.max(0, Math.max(effectiveCols, parsedRange.endCol + 1) - maxSnippetCols);
    }
  } else {
    const firstNonEmptyIdx = rows.findIndex((r) => r.some((c) => String(c || '').trim().length > 0));
    rowStart1Based = firstNonEmptyIdx >= 0 ? firstNonEmptyIdx + 1 : 1;
  }

  const rowEnd1Based = Math.min(rows.length, rowStart1Based + maxSnippetRows - 1);
  const colEnd0Based = Math.min(Math.max(effectiveCols - 1, colStart0Based), colStart0Based + maxSnippetCols - 1);

  const snippetColHeaders: string[] = [];
  for (let c = colStart0Based; c <= colEnd0Based; c++) {
    snippetColHeaders.push(columnIndexToLetter(c));
  }

  const snippetRows: Array<{ rowNumber: number; cells: string[] }> = [];
  for (let r = rowStart1Based; r <= rowEnd1Based; r++) {
    const rawRow = rows[r - 1] || [];
    const slice: string[] = [];
    for (let c = colStart0Based; c <= colEnd0Based; c++) {
      slice.push(String(rawRow[c] ?? ''));
    }
    snippetRows.push({ rowNumber: r, cells: slice });
  }

  return {
    snippetRowStart: rowStart1Based,
    snippetRows,
    snippetColStart: colStart0Based,
    snippetColHeaders,
  };
}

export function parseGoogleDocHtmlToStructured(html: string): {
  docTitleFromHtml?: string;
  headings: MosChatGoogleDocHeading[];
  sections: MosChatGoogleDocSection[];
  excerpt: string;
  plainText: string;
} {
  const cleanedHtml = html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');

  const titleMatch = cleanedHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const docTitleFromHtml = titleMatch ? stripTags(titleMatch[1]) : undefined;

  const bodyMatch = cleanedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : cleanedHtml;

  const headings: MosChatGoogleDocHeading[] = [];
  const sections: MosChatGoogleDocSection[] = [];
  const plainChunks: string[] = [];

  // Match headings, tables, lists, and paragraphs in source order
  const blockPattern =
    /<(h[1-4])[^>]*>([\s\S]*?)<\/\1>|<table[^>]*>([\s\S]*?)<\/table>|<(ul|ol)[^>]*>([\s\S]*?)<\/\4>|<p[^>]*>([\s\S]*?)<\/p>/gi;

  let idx = 0;
  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(bodyHtml)) !== null) {
    if (sections.length >= 250) break;

    if (match[1]) {
      const level = Math.min(4, Math.max(1, Number(match[1].slice(1)))) as 1 | 2 | 3 | 4;
      const text = stripTags(match[2] || '');
      if (!text) continue;
      const id = `doc-h-${idx++}`;
      headings.push({ id, level, text });
      sections.push({ id, type: 'heading', level, text });
      plainChunks.push(`${'#'.repeat(level)} ${text}`);
    } else if (match[3] !== undefined) {
      const tableHtml = match[3];
      const rows: string[][] = [];
      const trMatches = tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
      for (const tr of trMatches) {
        const rowCells: string[] = [];
        const cellMatches = tr[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
        for (const td of cellMatches) {
          rowCells.push(stripTags(td[1] || ''));
        }
        if (rowCells.some((c) => c.length > 0)) {
          rows.push(rowCells);
        }
      }
      if (rows.length > 0) {
        const id = `doc-tbl-${idx++}`;
        sections.push({ id, type: 'table', rows: rows.slice(0, 80) });
        plainChunks.push(
          rows
            .slice(0, 15)
            .map((r) => `| ${r.join(' | ')} |`)
            .join('\n')
        );
      }
    } else if (match[4]) {
      const listHtml = match[5] || '';
      const items: string[] = [];
      const liMatches = listHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
      for (const li of liMatches) {
        const text = stripTags(li[1] || '');
        if (text) items.push(text);
      }
      if (items.length > 0) {
        const id = `doc-list-${idx++}`;
        sections.push({ id, type: 'list', items: items.slice(0, 60) });
        plainChunks.push(items.map((item) => `- ${item}`).join('\n'));
      }
    } else if (match[6] !== undefined) {
      const text = stripTags(match[6] || '');
      if (!text) continue;
      const id = `doc-p-${idx++}`;
      sections.push({ id, type: 'paragraph', text });
      plainChunks.push(text);
    }
  }

  if (sections.length === 0) {
    const fallbackText = stripTags(bodyHtml);
    if (fallbackText) {
      sections.push({ id: 'doc-p-0', type: 'paragraph', text: fallbackText.slice(0, 8000) });
      plainChunks.push(fallbackText.slice(0, 8000));
    }
  }

  const plainText = plainChunks.join('\n\n').slice(0, 12_000);
  const firstReadable =
    sections.find((s) => s.type === 'paragraph' && s.text)?.text ||
    sections.find((s) => s.type === 'heading' && s.text)?.text ||
    plainText;
  const excerpt = (firstReadable || '').replace(/\s+/g, ' ').trim().slice(0, 280);

  return {
    docTitleFromHtml,
    headings,
    sections,
    excerpt,
    plainText,
  };
}

function parseTabsFromPublicSheetHtml(html: string): MosChatGoogleSheetTabSummary[] {
  const tabs: MosChatGoogleSheetTabSummary[] = [];
  const seen = new Set<string>();
  const pattern = /items\.push\(\s*\{\s*name\s*:\s*"((?:[^"\\]|\\.)*)"[^}]*?\bgid\s*:\s*"?(\d+)"?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const rawName = match[1];
    const gid = match[2];
    if (seen.has(gid)) continue;
    seen.add(gid);
    let title = rawName;
    try {
      title = JSON.parse(`"${rawName}"`);
    } catch {
      title = rawName;
    }
    tabs.push({
      sheetId: Number(gid),
      gid,
      title,
    });
  }
  return tabs;
}

function isGoogleLoginHtml(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes('accounts.google.com/servicelogin') ||
    lower.includes('name="identifier"') ||
    lower.includes('signin/v2/identifier')
  );
}

function setCacheEntry(cacheKey: string, entry: CachedWorkspaceEntry): void {
  if (previewCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = previewCache.keys().next().value;
    if (firstKey) previewCache.delete(firstKey);
  }
  previewCache.set(cacheKey, entry);
}

function applyRoleSecurityGate(
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

export class ChatGoogleWorkspaceService {
  static clearCache(): void {
    previewCache.clear();
  }

  static async previewLink(params: {
    url: string;
    gid?: string;
    range?: string;
    viewer?: GoogleWorkspaceActorContext | null;
    sender?: GoogleWorkspaceActorContext | null;
    refresh?: boolean;
  }): Promise<MosChatGoogleWorkspacePreviewResponse> {
    const parsedBase = parseGoogleWorkspaceUrl(params.url);
    if (!parsedBase) {
      throw new Error('Đường dẫn Google Sheets hoặc Google Docs không hợp lệ.');
    }

    const effectiveUrl =
      params.gid || params.range
        ? (() => {
            if (parsedBase.kind === 'spreadsheet') {
              const gid = params.gid ?? parsedBase.gid;
              const range = params.range ?? parsedBase.range;
              const q = gid ? `?gid=${encodeURIComponent(gid)}` : '';
              const hashes = [
                gid ? `gid=${encodeURIComponent(gid)}` : '',
                range ? `range=${encodeURIComponent(range)}` : '',
              ].filter(Boolean);
              return `https://docs.google.com/spreadsheets/d/${parsedBase.fileId}/edit${q}${hashes.length ? `#${hashes.join('&')}` : ''}`;
            }
            return parsedBase.canonicalUrl;
          })()
        : parsedBase.rawUrl;

    const parsed = parseGoogleWorkspaceUrl(effectiveUrl) || parsedBase;
    const serviceAccountEmail = getGoogleWorkspaceServiceAccountEmail();
    const cacheKey = `${parsed.kind}:${parsed.fileId}:${parsed.gid || ''}:${parsed.range || ''}`;

    if (!params.refresh) {
      const cached = previewCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        const gated = applyRoleSecurityGate(cached, params.viewer, params.sender);
        return { ...gated, cached: true };
      }
    }

    const fetched =
      parsed.kind === 'spreadsheet'
        ? await this.fetchSpreadsheet(parsed, serviceAccountEmail)
        : await this.fetchDocument(parsed, serviceAccountEmail);

    if (fetched.response.accessStatus === 'PUBLIC_LINK' || fetched.response.accessStatus === 'SERVICE_ACCOUNT') {
      setCacheEntry(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        isPublicLink: fetched.isPublicLink,
        response: fetched.response,
      });
    }

    return applyRoleSecurityGate(fetched, params.viewer, params.sender);
  }

  private static async checkPublicLinkAndDrivePermissions(
    fileId: string,
    kind: 'spreadsheet' | 'document',
    saToken: string | null,
    gid?: string | null
  ): Promise<{
    isPublicLink: boolean;
    driveTitle?: string;
    modifiedTime?: string | null;
    saAccessible: boolean;
    notFoundBoth: boolean;
  }> {
    const fetchImpl = getFetch();
    let isPublicLink = false;
    let driveTitle: string | undefined;
    let modifiedTime: string | null | undefined;
    let saAccessible = false;
    let driveStatus = 0;

    // 1. Check Drive v3 metadata if SA token exists (detects 'anyone' permission + exact title)
    if (saToken) {
      try {
        const driveRes = await fetchImpl(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
            fileId
          )}?fields=id,name,mimeType,modifiedTime,permissions(type,role)&supportsAllDrives=true`,
          {
            headers: { Authorization: `Bearer ${saToken}` },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          }
        );
        driveStatus = driveRes.status;
        if (driveRes.ok) {
          saAccessible = true;
          const meta = (await driveRes.json()) as {
            name?: string;
            modifiedTime?: string;
            permissions?: Array<{ type?: string; role?: string }>;
          };
          if (meta.name) driveTitle = meta.name;
          if (meta.modifiedTime) modifiedTime = meta.modifiedTime;
          if (Array.isArray(meta.permissions) && meta.permissions.some((p) => p.type === 'anyone')) {
            isPublicLink = true;
          }
        }
      } catch {
        // non-blocking
      }
    }

    // 2. Unauthenticated public probe (works even when SA doesn't have direct permission or SA is absent)
    let pubStatus = 0;
    if (!isPublicLink) {
      try {
        const probeUrl =
          kind === 'spreadsheet'
            ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(fileId)}/gviz/tq?tqx=out:csv${
                gid ? `&gid=${encodeURIComponent(gid)}` : ''
              }`
            : `https://docs.google.com/document/d/${encodeURIComponent(fileId)}/export?format=html`;
        const pubRes = await fetchImpl(probeUrl, {
          redirect: 'manual',
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        pubStatus = pubRes.status;
        if (pubRes.ok) {
          const ct = (pubRes.headers.get('content-type') || '').toLowerCase();
          if (kind === 'spreadsheet' && !ct.includes('text/html')) {
            isPublicLink = true;
          } else if (kind === 'document') {
            const sample = await pubRes.text();
            if (!isGoogleLoginHtml(sample)) {
              isPublicLink = true;
            }
          }
        }
      } catch {
        // private or unreachable
      }
    }

    return {
      isPublicLink,
      driveTitle,
      modifiedTime: modifiedTime ?? null,
      saAccessible,
      notFoundBoth: driveStatus === 404 && pubStatus === 404 && !saAccessible && !isPublicLink,
    };
  }

  private static async fetchSpreadsheet(
    parsed: ParsedGoogleWorkspaceLink,
    serviceAccountEmail: string
  ): Promise<{ isPublicLink: boolean; response: MosChatGoogleWorkspacePreviewResponse }> {
    const fetchImpl = getFetch();
    const nowIso = new Date().toISOString();
    const saAuth = await getServiceAccountAccessToken();
    const probe = await this.checkPublicLinkAndDrivePermissions(
      parsed.fileId,
      'spreadsheet',
      saAuth?.token || null,
      parsed.gid
    );

    // Path A: Service Account can read Sheets API v4 (covers both PUBLIC_LINK shared or SA-shared files)
    if (saAuth?.token && probe.saAccessible) {
      try {
        const metaRes = await fetchImpl(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
            parsed.fileId
          )}?fields=properties.title,sheets(properties(sheetId,title,gridProperties))`,
          {
            headers: { Authorization: `Bearer ${saAuth.token}` },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          }
        );

        if (metaRes.ok) {
          const meta = (await metaRes.json()) as {
            properties?: { title?: string };
            sheets?: Array<{
              properties?: {
                sheetId?: number;
                title?: string;
                gridProperties?: { rowCount?: number; columnCount?: number };
              };
            }>;
          };

          const tabs: MosChatGoogleSheetTabSummary[] = (meta.sheets || [])
            .filter((s) => s.properties && typeof s.properties.sheetId === 'number' && s.properties.title)
            .map((s) => ({
              sheetId: Number(s.properties!.sheetId),
              gid: String(s.properties!.sheetId),
              title: String(s.properties!.title),
              rowCount: s.properties!.gridProperties?.rowCount,
              columnCount: s.properties!.gridProperties?.columnCount,
            }));

          const targetTab =
            (parsed.gid ? tabs.find((t) => t.gid === parsed.gid) : undefined) ||
            (parsed.parsedRange?.sheetName
              ? tabs.find((t) => t.title.toLowerCase() === parsed.parsedRange!.sheetName!.toLowerCase())
              : undefined) ||
            tabs[0];

          let rows: string[][] = [];
          if (targetTab) {
            const safeSheetName = `'${targetTab.title.replace(/'/g, "''")}'!A1:AZ300`;
            const valRes = await fetchImpl(
              `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
                parsed.fileId
              )}/values/${encodeURIComponent(safeSheetName)}?valueRenderOption=FORMATTED_VALUE`,
              {
                headers: { Authorization: `Bearer ${saAuth.token}` },
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
              }
            );
            if (valRes.ok) {
              const valJson = (await valRes.json()) as { values?: unknown[][] };
              rows = (valJson.values || []).map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '')) : []));
            }
          }

          const totalRows = Math.max(rows.length, targetTab?.rowCount || 0);
          const maxRowCols = rows.reduce((acc, r) => Math.max(acc, r.length), 0);
          const totalCols = Math.max(maxRowCols, targetTab?.columnCount || 0);
          const snippet = buildSheetSnippet(rows, parsed.parsedRange);

          const activeTab: MosChatGoogleSheetActiveTabData | null = targetTab
            ? {
                gid: targetTab.gid,
                title: targetTab.title,
                totalRows,
                totalCols,
                rows,
                truncated: totalRows > 300 || totalCols > 52,
                snippetRowStart: snippet.snippetRowStart,
                snippetRows: snippet.snippetRows,
                snippetColStart: snippet.snippetColStart,
                snippetColHeaders: snippet.snippetColHeaders,
              }
            : null;

          const accessStatus: MosChatGoogleWorkspaceAccessStatus = probe.isPublicLink
            ? 'PUBLIC_LINK'
            : 'SERVICE_ACCOUNT';

          return {
            isPublicLink: probe.isPublicLink,
            response: {
              success: true,
              kind: 'spreadsheet',
              fileId: parsed.fileId,
              canonicalUrl: parsed.canonicalUrl,
              embedUrl: parsed.embedUrl,
              title: meta.properties?.title || probe.driveTitle || 'Google Sheets',
              accessStatus,
              serviceAccountEmail,
              modifiedTime: probe.modifiedTime ?? null,
              requestedGid: parsed.gid,
              requestedRange: parsed.range,
              parsedRange: parsed.parsedRange,
              tabs,
              activeTab,
              fetchedAt: nowIso,
            },
          };
        }
      } catch {
        // fall through to public CSV reader if applicable
      }
    }

    // Path B: Public Link fallback (Anyone with the link, no SA needed)
    if (probe.isPublicLink) {
      try {
        let tabs: MosChatGoogleSheetTabSummary[] = [];
        let title = probe.driveTitle || 'Google Sheets';

        const htmlRes = await fetchImpl(
          `https://docs.google.com/spreadsheets/d/${encodeURIComponent(parsed.fileId)}/htmlview`,
          {
            redirect: 'manual',
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          }
        );
        if (htmlRes.ok) {
          const html = await htmlRes.text();
          if (!isGoogleLoginHtml(html)) {
            const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            if (titleMatch?.[1]) {
              const cleaned = stripTags(titleMatch[1])
                .replace(/\s*-\s*Google\s+(?:Sheets|Trang tính)\s*$/i, '')
                .trim();
              if (cleaned) title = cleaned;
            }
            tabs = parseTabsFromPublicSheetHtml(html);
          }
        }

        const targetTab =
          (parsed.gid ? tabs.find((t) => t.gid === parsed.gid) : undefined) ||
          (parsed.parsedRange?.sheetName
            ? tabs.find((t) => t.title.toLowerCase() === parsed.parsedRange!.sheetName!.toLowerCase())
            : undefined) ||
          tabs[0] ||
          (parsed.gid
            ? { sheetId: Number(parsed.gid) || 0, gid: parsed.gid, title: 'Trang tính' }
            : { sheetId: 0, gid: '0', title: 'Sheet1' });

        if (tabs.length === 0) {
          tabs = [targetTab];
        }

        const csvRes = await fetchImpl(
          `https://docs.google.com/spreadsheets/d/${encodeURIComponent(parsed.fileId)}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(
            targetTab.gid
          )}`,
          {
            redirect: 'manual',
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          }
        );

        let rows: string[][] = [];
        if (csvRes.ok) {
          const csvText = await csvRes.text();
          rows = parseCsvRows(csvText, 300, 52);
        }

        const maxCols = rows.reduce((acc, r) => Math.max(acc, r.length), 0);
        const snippet = buildSheetSnippet(rows, parsed.parsedRange);

        return {
          isPublicLink: true,
          response: {
            success: true,
            kind: 'spreadsheet',
            fileId: parsed.fileId,
            canonicalUrl: parsed.canonicalUrl,
            embedUrl: parsed.embedUrl,
            title,
            accessStatus: 'PUBLIC_LINK',
            serviceAccountEmail,
            modifiedTime: probe.modifiedTime ?? null,
            requestedGid: parsed.gid,
            requestedRange: parsed.range,
            parsedRange: parsed.parsedRange,
            tabs,
            activeTab: {
              gid: targetTab.gid,
              title: targetTab.title,
              totalRows: rows.length,
              totalCols: maxCols,
              rows,
              truncated: rows.length >= 300 || maxCols >= 52,
              snippetRowStart: snippet.snippetRowStart,
              snippetRows: snippet.snippetRows,
              snippetColStart: snippet.snippetColStart,
              snippetColHeaders: snippet.snippetColHeaders,
            },
            fetchedAt: nowIso,
          },
        };
      } catch {
        // fall through to NEEDS_SHARE / ERROR
      }
    }

    return {
      isPublicLink: false,
      response: {
        success: false,
        kind: 'spreadsheet',
        fileId: parsed.fileId,
        canonicalUrl: parsed.canonicalUrl,
        embedUrl: parsed.embedUrl,
        title: probe.driveTitle || 'Google Sheet (Chưa cấp quyền)',
        accessStatus: 'NEEDS_SHARE',
        serviceAccountEmail,
        statusMessage:
          'Google Sheet đang khóa riêng tư hoặc chưa chia sẻ cho mOS Bot. Hãy chia sẻ quyền Xem cho email bot bên dưới hoặc bật "Bất kỳ ai có liên kết".',
        requestedGid: parsed.gid,
        requestedRange: parsed.range,
        parsedRange: parsed.parsedRange,
        fetchedAt: nowIso,
      },
    };
  }

  private static async fetchDocument(
    parsed: ParsedGoogleWorkspaceLink,
    serviceAccountEmail: string
  ): Promise<{ isPublicLink: boolean; response: MosChatGoogleWorkspacePreviewResponse }> {
    const fetchImpl = getFetch();
    const nowIso = new Date().toISOString();
    const saAuth = await getServiceAccountAccessToken();
    const probe = await this.checkPublicLinkAndDrivePermissions(parsed.fileId, 'document', saAuth?.token || null);

    let htmlContent: string | null = null;
    let accessStatus: MosChatGoogleWorkspaceAccessStatus = 'NEEDS_SHARE';

    // IMPORTANT: Never call docs.googleapis.com/v1 (disabled on wings-lashes project).
    // Always read Google Docs via Drive API v3 export (SA) or public export?format=html.
    if (saAuth?.token && probe.saAccessible) {
      try {
        const exportRes = await fetchImpl(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
            parsed.fileId
          )}/export?mimeType=text/html&supportsAllDrives=true`,
          {
            headers: { Authorization: `Bearer ${saAuth.token}` },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          }
        );
        if (exportRes.ok) {
          htmlContent = await exportRes.text();
          accessStatus = probe.isPublicLink ? 'PUBLIC_LINK' : 'SERVICE_ACCOUNT';
        }
      } catch {
        // fallback to public export if public
      }
    }

    if (!htmlContent && probe.isPublicLink) {
      try {
        const pubRes = await fetchImpl(
          `https://docs.google.com/document/d/${encodeURIComponent(parsed.fileId)}/export?format=html`,
          {
            redirect: 'manual',
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          }
        );
        if (pubRes.ok) {
          const text = await pubRes.text();
          if (!isGoogleLoginHtml(text)) {
            htmlContent = text;
            accessStatus = 'PUBLIC_LINK';
          }
        }
      } catch {
        // fall through
      }
    }

    if (htmlContent) {
      const parsedDoc = parseGoogleDocHtmlToStructured(htmlContent);
      const title = probe.driveTitle || parsedDoc.docTitleFromHtml || 'Google Docs';
      return {
        isPublicLink: probe.isPublicLink,
        response: {
          success: true,
          kind: 'document',
          fileId: parsed.fileId,
          canonicalUrl: parsed.canonicalUrl,
          embedUrl: parsed.embedUrl,
          title,
          accessStatus,
          serviceAccountEmail,
          modifiedTime: probe.modifiedTime ?? null,
          headings: parsedDoc.headings,
          sections: parsedDoc.sections,
          excerpt: parsedDoc.excerpt,
          plainText: parsedDoc.plainText,
          fetchedAt: nowIso,
        },
      };
    }

    return {
      isPublicLink: false,
      response: {
        success: false,
        kind: 'document',
        fileId: parsed.fileId,
        canonicalUrl: parsed.canonicalUrl,
        embedUrl: parsed.embedUrl,
        title: probe.driveTitle || 'Google Docs (Chưa cấp quyền)',
        accessStatus: 'NEEDS_SHARE',
        serviceAccountEmail,
        statusMessage:
          'Google Docs đang khóa riêng tư hoặc chưa chia sẻ cho mOS Bot. Hãy chia sẻ quyền Xem cho email bot bên dưới hoặc bật "Bất kỳ ai có liên kết".',
        fetchedAt: nowIso,
      },
    };
  }

  private static formatSheetRowsCompact(rows: string[][], startRow1Based = 1, maxRows = 25, maxCols = 10): string {
    if (!rows || rows.length === 0) return '(Không có dữ liệu)';
    const lines: string[] = [];
    const slice = rows.slice(0, maxRows);
    for (let i = 0; i < slice.length; i++) {
      const rNum = startRow1Based + i;
      const cells = (slice[i] || []).slice(0, maxCols).map((c) =>
        String(c ?? '')
          .replace(/\s+/g, ' ')
          .trim()
      );
      if (cells.some((c) => c.length > 0)) {
        lines.push(`Row ${rNum}: | ${cells.join(' | ')} |`);
      }
    }
    return lines.length > 0 ? lines.join('\n') : '(Tab trống)';
  }

  /**
   * Builds live Google Workspace context for @AI / @MAI prompts in mOS Chat.
   * Covers all tabs of multi-tab spreadsheets (e.g., NVL + Mi) and Google Docs text.
   */
  static async buildAiContextForText(params: {
    text?: string | null;
    viewer?: GoogleWorkspaceActorContext | null;
    sender?: GoogleWorkspaceActorContext | null;
    maxLinks?: number;
  }): Promise<string> {
    const links = extractGoogleWorkspaceLinksFromText(params.text).slice(0, params.maxLinks ?? 2);
    if (links.length === 0) return '';

    const chunks: string[] = [];
    for (const link of links) {
      try {
        const preview = await Promise.race([
          this.previewLink({
            url: link.rawUrl,
            viewer: params.viewer,
            sender: params.sender,
          }),
          new Promise<null>((resolveTimer) => setTimeout(() => resolveTimer(null), 6500)),
        ]);

        if (!preview) continue;
        if (!preview.success) {
          chunks.push(
            `- [${preview.kind.toUpperCase()}] "${preview.title}" (${preview.canonicalUrl}): Trạng thái ${preview.accessStatus} — ${preview.statusMessage || 'Chưa mở quyền đọc.'}`
          );
          continue;
        }

        if (preview.kind === 'spreadsheet') {
          const tabNames = (preview.tabs || []).map((t) => `${t.title} (gid=${t.gid})`).join(', ');
          const activeTitle = preview.activeTab?.title || 'Tab chính';
          const rangeNote = preview.requestedRange ? ` · Vùng đang trỏ: ${preview.requestedRange}` : '';
          let block = `### 📊 Google Sheet: ${preview.title}\n- URL: ${preview.canonicalUrl}\n- Các tab: ${tabNames || activeTitle}\n- Tab đang mở: ${activeTitle}${rangeNote}\n`;

          if (preview.activeTab?.rows?.length) {
            block += `**Dữ liệu tab "${activeTitle}" (tối đa 25 dòng đầu):**\n${this.formatSheetRowsCompact(
              preview.activeTab.rows,
              1,
              25,
              10
            )}\n`;
          }

          if (preview.activeTab?.snippetRows?.length && preview.parsedRange && preview.parsedRange.startRow > 20) {
            const snippetLines = preview.activeTab.snippetRows.map(
              (sr) => `Row ${sr.rowNumber}: | ${sr.cells.map((c) => c.replace(/\s+/g, ' ').trim()).join(' | ')} |`
            );
            block += `**Vùng quanh ${preview.requestedRange}:**\n${snippetLines.join('\n')}\n`;
          }

          // Also summarize up to 3 sibling tabs (e.g., both NVL and Mi)
          const siblingTabs = (preview.tabs || []).filter((t) => t.gid !== preview.activeTab?.gid).slice(0, 3);
          if (siblingTabs.length > 0) {
            const siblingResults = await Promise.all(
              siblingTabs.map((t) =>
                this.previewLink({
                  url: link.rawUrl,
                  gid: t.gid,
                  viewer: params.viewer,
                  sender: params.sender,
                }).catch(() => null)
              )
            );
            for (const sib of siblingResults) {
              if (sib?.success && sib.activeTab?.rows?.length) {
                block += `**Tab "${sib.activeTab.title}" (15 dòng đầu):**\n${this.formatSheetRowsCompact(
                  sib.activeTab.rows,
                  1,
                  15,
                  10
                )}\n`;
              }
            }
          }

          chunks.push(block.trim());
        } else {
          const headings = (preview.headings || []).map((h) => `${'#'.repeat(h.level)} ${h.text}`).slice(0, 12);
          let block = `### 📄 Google Docs: ${preview.title}\n- URL: ${preview.canonicalUrl}\n`;
          if (headings.length > 0) {
            block += `- Mục lục: ${headings.join(' | ')}\n`;
          }
          if (preview.plainText) {
            block += `**Nội dung trích xuất:**\n${preview.plainText.slice(0, 2200)}\n`;
          }
          chunks.push(block.trim());
        }
      } catch {
        // non-blocking
      }
    }

    if (chunks.length === 0) return '';
    return `[Dữ liệu trực tiếp từ Google Workspace đính kèm]\n${chunks.join('\n\n')}`.slice(0, 6000);
  }

  /**
   * Builds compact Markdown snapshot embedded into mOS Mission tickets when clicking 🚀.
   */
  static async buildMissionSnapshotMarkdown(params: {
    text?: string | null;
    viewer?: GoogleWorkspaceActorContext | null;
    sender?: GoogleWorkspaceActorContext | null;
  }): Promise<string> {
    const links = extractGoogleWorkspaceLinksFromText(params.text).slice(0, 2);
    if (links.length === 0) return '';

    const parts: string[] = [];
    for (const link of links) {
      try {
        const preview = await Promise.race([
          this.previewLink({
            url: link.rawUrl,
            viewer: params.viewer,
            sender: params.sender,
          }),
          new Promise<null>((resolveTimer) => setTimeout(() => resolveTimer(null), 6000)),
        ]);
        if (!preview) continue;
        if (!preview.success) {
          parts.push(
            `- **${preview.title}** (${preview.canonicalUrl}) — Trạng thái: \`${preview.accessStatus}\` (${preview.statusMessage || 'Cần chia sẻ cho ' + preview.serviceAccountEmail})`
          );
          continue;
        }

        if (preview.kind === 'spreadsheet') {
          const tabsList = (preview.tabs || []).map((t) => `\`${t.title}\``).join(', ');
          const active = preview.activeTab;
          let section = `**📊 ${preview.title}** ([Mở Sheet](${preview.canonicalUrl}))\n- **Các tab:** ${tabsList || 'Sheet1'}`;
          if (active) {
            section += `\n- **Tab đang trỏ:** \`${active.title}\`${preview.requestedRange ? ` · Ô/Vùng: \`${preview.requestedRange}\`` : ''}`;
            const headerRow =
              active.rows?.[0]
                ?.slice(0, 8)
                .map((c) => c.trim())
                .filter(Boolean) || [];
            if (headerRow.length > 0) {
              section += `\n- **Cột đầu bảng:** ${headerRow.join(' | ')}`;
            }
            if (active.snippetRows?.length) {
              const sample = active.snippetRows
                .slice(0, 5)
                .map((r) => `  - Dòng ${r.rowNumber}: ${r.cells.map((c) => c.trim() || '—').join(' | ')}`)
                .join('\n');
              section += `\n- **Dữ liệu mẫu quanh vùng trỏ:**\n${sample}`;
            }
          }
          // Include header preview of sibling tabs (e.g. NVL + Mi)
          const siblings = (preview.tabs || []).filter((t) => t.gid !== active?.gid).slice(0, 2);
          if (siblings.length > 0) {
            const sibRes = await Promise.all(
              siblings.map((t) =>
                this.previewLink({
                  url: link.rawUrl,
                  gid: t.gid,
                  viewer: params.viewer,
                  sender: params.sender,
                }).catch(() => null)
              )
            );
            for (const sib of sibRes) {
              if (sib?.success && sib.activeTab?.rows?.length) {
                const sibPreviewRows = sib.activeTab.rows
                  .slice(0, 4)
                  .map(
                    (r, i) =>
                      `  - Dòng ${i + 1}: ${r
                        .slice(0, 6)
                        .map((c) => c.trim() || '—')
                        .join(' | ')}`
                  )
                  .join('\n');
                section += `\n- **Tab \`${sib.activeTab.title}\`:**\n${sibPreviewRows}`;
              }
            }
          }
          parts.push(section);
        } else {
          parts.push(
            `**📄 ${preview.title}** ([Mở Docs](${preview.canonicalUrl}))\n- **Trích đoạn:** ${preview.excerpt || preview.plainText?.slice(0, 300) || '(Trống)'}`
          );
        }
      } catch {
        // non-blocking
      }
    }

    if (parts.length === 0) return '';
    return `### 📊 Dữ liệu Google Workspace đính kèm\n${parts.join('\n\n')}`.slice(0, 2800);
  }
}
