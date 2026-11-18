'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const MosBibleSurface = dynamic(() => import('./MosBibleSurface').then((m) => m.MosBibleSurface), { ssr: false });

export function MosBibleSurfacePortal() {
  return <MosBibleSurface />;
}

export default MosBibleSurfacePortal;
