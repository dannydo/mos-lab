/** Public version only; no secrets or user context. Never cache an old production alias. */
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { commitSha: process.env.NEXT_PUBLIC_APP_COMMIT_SHA || null },
    {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  );
}
