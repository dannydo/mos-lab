'use client';

import React from 'react';
import { formatSelectionChangeCountdown } from './registrationUtils';

export function useWorkshopSelectionChangeCountdown(deadlineAt: string | null | undefined, startsAt: string) {
  const deadlineAtMs = React.useMemo(() => {
    const configuredDeadlineMs = new Date(String(deadlineAt || '')).getTime();
    if (Number.isFinite(configuredDeadlineMs)) return configuredDeadlineMs;

    return new Date(startsAt).getTime();
  }, [deadlineAt, startsAt]);
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, [deadlineAtMs]);

  const remainingSeconds = Number.isFinite(deadlineAtMs) ? Math.max(0, Math.ceil((deadlineAtMs - now) / 1_000)) : null;

  return {
    locked: remainingSeconds === 0,
    label: remainingSeconds == null ? 'Chưa xác định hạn' : `Còn ${formatSelectionChangeCountdown(remainingSeconds)}`,
  };
}
