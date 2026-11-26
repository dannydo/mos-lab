'use client';

import React from 'react';
import { AdminOnlyPnlGuard } from '../../../components/fm-simulator/AdminOnlyPnlGuard';
import { PnlSimulatorStudio } from '../../../components/fm-simulator/PnlSimulatorStudio';

export default function DashboardPnlSimulatorPage() {
  return (
    <AdminOnlyPnlGuard guardPathname="/dashboard/pnl-simulator">
      <PnlSimulatorStudio standaloneMobile={false} />
    </AdminOnlyPnlGuard>
  );
}
