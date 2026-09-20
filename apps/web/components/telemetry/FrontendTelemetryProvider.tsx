'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { initFrontendObserver, recordBreadcrumb } from '../../lib/telemetry/frontend-observer';

export function FrontendTelemetryProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize global click and error observers once
  useEffect(() => {
    const cleanup = initFrontendObserver();
    return cleanup;
  }, []);

  // Record route transitions
  useEffect(() => {
    if (pathname) {
      recordBreadcrumb('navigation', 'route_change', pathname, {
        query: searchParams?.toString() || '',
        title: typeof document !== 'undefined' ? document.title : '',
      });
    }
  }, [pathname, searchParams]);

  return null;
}
