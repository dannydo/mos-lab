'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const BugReportSurface = dynamic(() => import('./BugReportSurface').then((m) => m.BugReportSurface), { ssr: false });

export function BugReportSurfacePortal() {
  return <BugReportSurface />;
}

export default BugReportSurfacePortal;
