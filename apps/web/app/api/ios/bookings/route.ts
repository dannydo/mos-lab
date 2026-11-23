import { NextRequest, NextResponse } from 'next/server';

function getApiBaseUrl(): string {
  const candidates = [
    process.env.API_URL,
    process.env.PERFORMANCE_QA_API_ORIGIN
      ? `${process.env.PERFORMANCE_QA_API_ORIGIN.replace(/\/$/, '')}/api`
      : undefined,
    process.env.NEXT_PUBLIC_API_URL,
  ];
  for (const candidate of candidates) {
    if (candidate && /^https?:\/\//i.test(candidate.trim())) {
      return candidate.trim().replace(/\/$/, '');
    }
  }
  return process.env.NODE_ENV === 'production' && process.env.PERFORMANCE_QA_PROXY !== '1'
    ? 'https://api.lab.masteros.app/api'
    : 'http://127.0.0.1:4001/api';
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
