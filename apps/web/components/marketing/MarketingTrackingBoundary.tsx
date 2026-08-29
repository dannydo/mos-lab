'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { apiClient } from '../../lib/api-client';

export interface MarketingTrackingBoundaryProps {
  activationId: number;
  enabled?: boolean;
  children: ReactNode;
}

export function MarketingTrackingBoundary({ activationId, enabled = true, children }: MarketingTrackingBoundaryProps) {
  const trackedActivation = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || trackedActivation.current === activationId) return;
    trackedActivation.current = activationId;
    apiClient.uiExperiences.recordEvent({ activationId, eventType: 'VIEW' }).catch(() => {
      trackedActivation.current = null;
    });
  }, [activationId, enabled]);

  return children;
}
