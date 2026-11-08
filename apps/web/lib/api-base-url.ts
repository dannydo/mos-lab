function isPrivateLanHostname(hostname: string): boolean {
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname)) return true;
  const match = hostname.match(/^172\.(\d{1,2})\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

export function resolveApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL;
  if (configuredUrl) return configuredUrl;

  if (typeof window !== 'undefined') {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return '/api';
    }
  }

  return 'http://localhost:4001/api';
}

export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }

  const apiBase = resolveApiBaseUrl();
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    try {
      const origin = new URL(apiBase).origin;
      return `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
    } catch {
      return trimmed;
    }
  }

  // When running on production frontend (e.g. lab.masteros.app) where apiBase is '/api',
  // resolve media files directly to the production API origin so video streaming,
  // audio, and images load with proper HTTP 206 byte-ranges without proxy overhead.
  if (typeof window !== 'undefined' && window.location.hostname.includes('masteros.app')) {
    const origin = 'https://api.lab.masteros.app';
    return `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
  }

  return trimmed;
}
