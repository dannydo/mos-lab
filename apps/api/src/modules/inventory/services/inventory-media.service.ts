import fs from 'node:fs/promises';
import path from 'node:path';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RowDataPacket } from 'mysql2/promise';
import { queryInventory } from './inventory-db.js';

interface UserScanCodeMediaRow extends RowDataPacket {
  id: number;
  filename: string | null;
  extension: string | null;
}

export function getInventoryScansProdDir(): string {
  return '/home/web/mos-data/inventory-scans';
}

export function getInventoryScansLocalDir(): string {
  return path.resolve(process.cwd(), 'uploads/inventory-scans');
}

function getLegacyScanPhotoUrl(scanCodeId: number, filename: string, extension: string): string {
  const cleanName = filename.replace(/^\/+/, '');
  const ext = extension.replace(/^\.+/, '');
  return `https://wingslashes.com/upload/user/scan-code/${scanCodeId}/${cleanName}.${ext}`;
}

export async function saveInventoryScanPhoto(
  scanCodeId: number,
  rawImage: string
): Promise<{ filename: string; extension: string } | null> {
  const trimmed = String(rawImage || '').trim();
  if (!trimmed) return null;

  const dataUriMatch = trimmed.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/s);
  const extRaw = dataUriMatch ? dataUriMatch[1].replace('jpeg', 'jpg').toLowerCase() : 'jpg';
  const ext = extRaw === 'png' || extRaw === 'webp' ? extRaw : 'jpg';
  const base64Body = (dataUriMatch ? dataUriMatch[2] : trimmed).replace(/\s+/g, '');

  if (!base64Body) return null;

  const buffer = Buffer.from(base64Body, 'base64');
  if (buffer.length === 0) return null;

  const filename = `scan_${scanCodeId}_${Date.now()}`;
  const fileWithExt = `${filename}.${ext}`;
  const isProd = process.env.NODE_ENV === 'production';
  const primaryDir = isProd ? getInventoryScansProdDir() : getInventoryScansLocalDir();

  try {
    await fs.mkdir(primaryDir, { recursive: true });
    await fs.writeFile(path.join(primaryDir, fileWithExt), buffer);
  } catch {
    const fallbackDir = getInventoryScansLocalDir();
    await fs.mkdir(fallbackDir, { recursive: true });
    await fs.writeFile(path.join(fallbackDir, fileWithExt), buffer);
  }

  return { filename, extension: ext };
}

export async function serveInventoryScanMedia(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as { scanCodeId?: string };
  const scanCodeId = Number(params?.scanCodeId);
  if (!Number.isInteger(scanCodeId) || scanCodeId <= 0) {
    return reply.status(400).send({ success: false, error: 'Invalid scanCodeId' });
  }

  const rows = await queryInventory<UserScanCodeMediaRow[]>(
    `SELECT id, filename, extension FROM user_scan_code WHERE id = ? LIMIT 1`,
    [scanCodeId]
  );
  const record = rows[0];
  if (!record || !record.filename) {
    return reply.status(404).send({ success: false, error: 'Scan image not found' });
  }

  const safeFilename = path.basename(record.filename);
  const safeExt = (record.extension || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
  const candidateNames = safeFilename.includes('.') ? [safeFilename] : [`${safeFilename}.${safeExt}`, safeFilename];

  for (const dir of [getInventoryScansProdDir(), getInventoryScansLocalDir()]) {
    for (const candidate of candidateNames) {
      try {
        const buf = await fs.readFile(path.join(dir, candidate));
        const contentType = safeExt === 'png' ? 'image/png' : safeExt === 'webp' ? 'image/webp' : 'image/jpeg';
        return reply
          .header('Content-Type', contentType)
          .header('Cache-Control', 'public, max-age=31536000, immutable')
          .send(buf);
      } catch {
        // Not stored locally on this host; fall through to next directory or legacy URL
      }
    }
  }

  // Historical ~584k records remain hosted on legacy CDN/origin
  return reply.redirect(getLegacyScanPhotoUrl(scanCodeId, safeFilename, safeExt));
}
