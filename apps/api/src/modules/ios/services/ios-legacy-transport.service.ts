import http from 'node:http';
import https from 'node:https';
import mysql from 'mysql2/promise';
import type { SafeAny } from '@mos-lab/shared';
import { INITIAL_BOOKINGS } from '../mock-data.js';

export interface LegacyStaffAuthToken {
  authUserId: number;
  loginToken: string;
}

export interface LegacyPhpTransportResult {
  ok: boolean;
  status: string;
  code: string;
  message: string;
  data?: SafeAny;
}

export type LegacyPhpEndpointCaller = (
  endpointPath: string,
  payload: Record<string, SafeAny>
) => Promise<LegacyPhpTransportResult>;

export const DEMO_BOOKING_IDS = new Set<number>(INITIAL_BOOKINGS.map((b) => Number(b.id)));

export function resolveLegacyPhpApiConfig(): {
  baseUrl: string;
  hostHeader?: string;
  extraHeaders?: Record<string, string>;
} {
  const explicit = String(process.env.LEGACY_PHP_API_URL || '').trim();
  const explicitHost = String(process.env.LEGACY_PHP_HOST_HEADER || '').trim();
  if (explicit) {
    const baseUrl = explicit.replace(/\/+$/, '');
    try {
      const parsed = new URL(baseUrl);
      if (parsed.protocol === 'http:' && (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost')) {
        const effectiveHost = explicitHost || 'api.wingslashes.com';
        return {
          baseUrl,
          hostHeader: effectiveHost,
          ...(effectiveHost === 'api.wingslashes.com' ? { extraHeaders: { 'X-Forwarded-Proto': 'https' } } : {}),
        };
      }
    } catch {
      // Fall through if explicit URL is malformed
    }
    return {
      baseUrl,
      ...(explicitHost ? { hostHeader: explicitHost } : {}),
    };
  }

  const dbUrl = String(process.env.LEGACY_DATABASE_URL || '');
  const hostMatch = dbUrl.match(/@([^:/?#]+)/);
  const dbHost = hostMatch?.[1] || '';

  if (dbHost === '127.0.0.1' || dbHost === 'localhost') {
    return {
      baseUrl: 'http://127.0.0.1/1',
      hostHeader: 'api.wingslashes.com',
      extraHeaders: { 'X-Forwarded-Proto': 'https' },
    };
  }

  if (dbHost.startsWith('192.168.')) {
    return {
      baseUrl: `http://${dbHost}/1`,
      hostHeader: 'api.orb',
    };
  }

  return { baseUrl: 'https://api.wingslashes.com/1' };
}

export async function defaultCallLegacyPhpEndpoint(
  endpointPath: string,
  payload: Record<string, SafeAny>
): Promise<LegacyPhpTransportResult> {
  const { baseUrl, hostHeader, extraHeaders } = resolveLegacyPhpApiConfig();
  const normalizedPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
  const targetUrl = new URL(`${baseUrl}${normalizedPath}`);
  const bodyStr = JSON.stringify(payload);
  const client = targetUrl.protocol === 'https:' ? https : http;

  const headers: Record<string, string | number> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Content-Length': Buffer.byteLength(bodyStr),
    ...(extraHeaders || {}),
  };
  if (hostHeader) {
    headers.Host = hostHeader;
  }

  return new Promise<LegacyPhpTransportResult>((resolve, reject) => {
    const req = client.request(
      targetUrl,
      {
        method: 'POST',
        headers,
        timeout: 10_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const rawText = Buffer.concat(chunks).toString('utf8');
          let json: SafeAny;
          try {
            json = JSON.parse(rawText);
          } catch {
            json = null;
          }
          const httpOk = (res.statusCode || 500) >= 200 && (res.statusCode || 500) < 300;
          const status = String(json?.status ?? '0');
          const code = String(json?.code ?? String(res.statusCode || 500));
          const ok = httpOk && (status === '1' || status.toLowerCase() === 'success') && code === '0000';
          const fallbackMessage = `HTTP ${res.statusCode || 500}${res.headers.location ? ` -> ${res.headers.location}` : ''} on ${normalizedPath}`;
          resolve({
            ok,
            status,
            code,
            message: String(json?.message || (!ok ? fallbackMessage : '')),
            data: json?.data,
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error(`Legacy PHP endpoint timeout: ${normalizedPath}`));
    });
    req.on('error', (err) => reject(err));
    req.write(bodyStr);
    req.end();
  });
}

export async function resolveActiveLegacyStaffToken(
  pool: mysql.Pool,
  preferredStaffIds: number[]
): Promise<LegacyStaffAuthToken | null> {
  const validIds = Array.from(new Set(preferredStaffIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (validIds.length > 0) {
    const placeholders = validIds.map(() => '?').join(',');
    const [preferredRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT uat.user_id, uat.access_token
       FROM user_access_token uat
       JOIN user_profile up ON up.user_id = uat.user_id
       WHERE uat.access_token IS NOT NULL
         AND uat.access_token != ''
         AND (up.user_group_id != 1 OR uat.user_id = 3879)
         AND uat.user_id IN (${placeholders})
       ORDER BY (uat.date_expired > NOW()) DESC, uat.id DESC
       LIMIT 1`,
      validIds
    );
    if (preferredRows.length > 0) {
      return {
        authUserId: Number(preferredRows[0].user_id),
        loginToken: String(preferredRows[0].access_token),
      };
    }
  }

  const [fallbackRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT uat.user_id, uat.access_token
     FROM user_access_token uat
     JOIN user_profile up ON up.user_id = uat.user_id
     WHERE uat.access_token IS NOT NULL
       AND uat.access_token != ''
       AND (up.user_group_id != 1 OR uat.user_id = 3879)
     ORDER BY (uat.date_expired > NOW()) DESC, uat.id DESC
     LIMIT 1`
  );
  if (!fallbackRows.length) return null;

  return {
    authUserId: Number(fallbackRows[0].user_id),
    loginToken: String(fallbackRows[0].access_token),
  };
}

export async function waitForReportOrderServiceRow(pool: mysql.Pool, orderId: number): Promise<boolean> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM report_order_service WHERE order_id = ?`,
      [orderId]
    );
    if (Number(rows?.[0]?.cnt || 0) > 0) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}
