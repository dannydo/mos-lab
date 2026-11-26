'use client';

import React from 'react';
import { FmSimulatorAccessGuard } from '../../components/fm-simulator/FmSimulatorAccessGuard';
import { FmSimulatorStudio } from '../../components/fm-simulator/FmSimulatorStudio';

export default function MobileFmSimulatorPage() {
  return (
    <FmSimulatorAccessGuard guardPathname="/fm-simulator">
      <FmSimulatorStudio standaloneMobile />
    </FmSimulatorAccessGuard>
  );
}
