'use client';

import React from 'react';
import { FmSimulatorAccessGuard } from '../../../components/fm-simulator/FmSimulatorAccessGuard';
import { FmSimulatorStudio } from '../../../components/fm-simulator/FmSimulatorStudio';

export default function DashboardFmSimulatorPage() {
  return (
    <FmSimulatorAccessGuard guardPathname="/dashboard/fm-simulator">
      <FmSimulatorStudio standaloneMobile={false} />
    </FmSimulatorAccessGuard>
  );
}
