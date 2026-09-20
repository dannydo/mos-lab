function isPrivateLanHostname(hostname: string): boolean {
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname)) return true;
  const match = hostname.match(/^172\.(\d{1,2})\./);
  return Boolean(match && Number(match[1]) >= 16 && Number(match[1]) <= 31);
}

export function resolveApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL;
  if (configuredUrl) return configuredUrl;

  if (typeof window !== 'undefined' && isPrivateLanHostname(window.location.hostname)) {
    return '/api';
  }

  return 'http://localhost:4001/api';
}
