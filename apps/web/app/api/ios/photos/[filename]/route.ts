import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

function getLashUploadsDir(): string {
  const cwd = process.cwd();
  if (cwd.endsWith('apps/web')) {
    return path.resolve(cwd, 'public/uploads/lash-progress');
  }
  return path.resolve(cwd, 'apps/web/public/uploads/lash-progress');
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params;
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Invalid filename', { status: 400 });
    }

    const primaryDir = getLashUploadsDir();
    const primaryPath = path.join(primaryDir, filename);

    let fileBuffer: Buffer | null = null;
    try {
      fileBuffer = await fs.readFile(primaryPath);
    } catch {
      // Check VPS mirror directory
      try {
        const vpsPath = path.join('/home/web/mos-data/lash-progress', filename);
        fileBuffer = await fs.readFile(vpsPath);
      } catch {
        fileBuffer = null;
      }
    }

    if (!fileBuffer) {
      return new NextResponse('File not found', { status: 404 });
    }

    const ext = path.extname(filename).toLowerCase().replace('.', '');
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: any) {
    return new NextResponse(err.message || 'Internal error', { status: 500 });
  }
}
