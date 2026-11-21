'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const BugReportSurface = dynamic(() => import('./BugReportSurface').then((m) => m.BugReportSurface), { ssr: false });

export function BugReportSurfacePortal() {
  const pathname = usePathname() || '';
  const shouldMount =
    pathname.startsWith('/dashboard') || pathname.startsWith('/chat') || pathname.startsWith('/ios-app');
  if (!shouldMount) return null;
  return <BugReportSurface />;
}

export default BugReportSurfacePortal;
