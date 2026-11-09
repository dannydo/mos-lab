import { NextRequest, NextResponse } from 'next/server';

function getApiBaseUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://api.lab.masteros.app/api' : 'http://localhost:4001/api');
  return envUrl.replace(/\/$/, '');
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const { filename } = await params;
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Invalid filename', { status: 400 });
    }

    const apiBase = getApiBaseUrl();
    const targetUrl = `${apiBase}/ios/photos/${encodeURIComponent(filename)}`;

    const res = await fetch(targetUrl);
    if (!res.ok) {
      return new NextResponse('File not found', { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: any) {
    return new NextResponse('Error fetching photo', { status: 500 });
  }
}
