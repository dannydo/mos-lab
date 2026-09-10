type SafeDevEnvironment = Record<string, string | undefined>;

function isLoopbackDatabaseUrl(value: string | undefined): boolean {
  if (!value) return false;

  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === '127.0.0.1' || host === 'localhost' || host === '::1';
  } catch {
    return false;
  }
}

/**
 * Safe Dev is intentionally opt-in. When enabled, the runtime must use only
 * loopback databases and must not start background work that can reach
 * external systems or mutate a non-disposable data source.
 */
export function isSafeDev(environment: SafeDevEnvironment = process.env): boolean {
  return environment.MOS_SAFE_DEV === 'true';
}

export function assertSafeDevConfiguration(environment: SafeDevEnvironment = process.env): void {
  if (!isSafeDev(environment)) return;

  if (environment.NODE_ENV === 'production') {
    throw new Error('MOS_SAFE_DEV cannot run with NODE_ENV=production');
  }

  for (const key of ['CRM_DATABASE_URL', 'LEGACY_DATABASE_URL'] as const) {
    if (!isLoopbackDatabaseUrl(environment[key])) {
      throw new Error(`MOS_SAFE_DEV requires ${key} to use a loopback database host`);
    }
  }
}

export function runtimeListenHost(environment: SafeDevEnvironment = process.env): string {
  return isSafeDev(environment) ? '127.0.0.1' : '0.0.0.0';
}
