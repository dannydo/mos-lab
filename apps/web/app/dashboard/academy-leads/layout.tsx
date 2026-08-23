'use client';

import React from 'react';
import AcademyAccessGate from './components/AcademyAccessGate';

export default function AcademyLeadsLayout({ children }: { children: React.ReactNode }) {
  return <AcademyAccessGate>{children}</AcademyAccessGate>;
}
