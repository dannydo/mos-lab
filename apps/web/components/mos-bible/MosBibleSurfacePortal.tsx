'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const MosBibleSurface = dynamic(() => import('./MosBibleSurface').then((m) => m.MosBibleSurface), { ssr: false });

export function MosBibleSurfacePortal() {
  const pathname = usePathname() || '';
  if (
    pathname.startsWith('/wings-garden') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/academy/workshops/')
  ) {
    return null;
  }
  return <MosBibleSurface />;
}

export default MosBibleSurfacePortal;
