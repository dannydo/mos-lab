import { FastifyReply, FastifyRequest } from 'fastify';
import fs from 'node:fs/promises';
import path from 'node:path';

export function getLashUploadsDir(): string {
  return '/home/web/mos-data/lash-progress';
}

export function getLocalFallbackDir(): string {
  return path.resolve(process.cwd(), 'uploads/lash-progress');
}

export async function persistProgressPhotoToCloud(bookingId: number, type: string, dataUrl: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  try {
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches || matches.length < 3) {
      return dataUrl;
    }

    const ext = matches[1].replace('jpeg', 'jpg');
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `${bookingId}_${type}_${Date.now()}.${ext}`;

    const isProduction = process.env.NODE_ENV === 'production';
    const targetDir = isProduction ? getLashUploadsDir() : getLocalFallbackDir();

    try {
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(path.join(targetDir, filename), buffer);
    } catch {
      const fallbackDir = getLocalFallbackDir();
      await fs.mkdir(fallbackDir, { recursive: true });
      await fs.writeFile(path.join(fallbackDir, filename), buffer);
    }

    return `/api/ios/photos/${filename}`;
  } catch (err) {
    console.warn('[modules/ios/photos] Failed to save progress photo:', err);
    return dataUrl;
  }
}

export async function serveProgressPhoto(request: FastifyRequest, reply: FastifyReply) {
  const { filename } = request.params as { filename: string };
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return reply.status(400).send({ error: 'Invalid filename' });
  }

  const vpsPath = path.join(getLashUploadsDir(), filename);
  const localPath = path.join(getLocalFallbackDir(), filename);

  let fileBuffer: Buffer | null = null;
  try {
    fileBuffer = await fs.readFile(vpsPath);
  } catch {
    try {
      fileBuffer = await fs.readFile(localPath);
    } catch {
      fileBuffer = null;
    }
  }

  if (!fileBuffer) {
    return reply.status(404).send({ error: 'File not found' });
  }

  const ext = path.extname(filename).toLowerCase().replace('.', '');
  const contentType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

  return reply
    .header('Content-Type', contentType)
    .header('Cache-Control', 'public, max-age=31536000, immutable')
    .send(fileBuffer);
}
