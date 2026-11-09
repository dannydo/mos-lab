import { NextRequest, NextResponse } from 'next/server';

function getApiBaseUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://api.lab.masteros.app/api' : 'http://localhost:4001/api');
  return envUrl.replace(/\/$/, '');
}

export async function GET(request: NextRequest) {
  try {
    const apiBase = getApiBaseUrl();
    const url = new URL(request.url);
    const targetUrl = `${apiBase}/ios/bookings${url.search}`;

    const headers: Record<string, string> = {};
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['authorization'] = authHeader;

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error('Error forwarding GET /api/ios/bookings to Fastify API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error communicating with backend API',
        counts: { incoming: 0, servicing: 0, done: 0, cancel: 0 },
        bookings: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiBase = getApiBaseUrl();
    const targetUrl = `${apiBase}/ios/bookings`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['authorization'] = authHeader;

    const body = await request.text();

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error('Error forwarding POST /api/ios/bookings to Fastify API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error communicating with backend API',
      },
      { status: 500 }
    );
  }
}
