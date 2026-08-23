'use client';

import React from 'react';
import type { AcademyTalentLadderConfiguration, UpdateAcademyTalentLadderConfigurationRequest } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

/**
 * Shared global ladder policy for both Academy entry points. The API owns the
 * persisted state; this hook only keeps the currently open workshop current.
 */
export function useAcademyTalentLadderConfiguration(enabled: boolean) {
  const [configuration, setConfiguration] = React.useState<AcademyTalentLadderConfiguration | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const requestVersion = React.useRef(0);

  const refresh = React.useCallback(async () => {
    if (!enabled) return null;
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const next = await apiClient.academySales.getTalentLadderConfiguration();
      if (version === requestVersion.current) setConfiguration(next);
      return next;
    } catch (caught) {
      if (version === requestVersion.current) {
        setError(caught instanceof Error ? caught.message : 'Không thể tải cấu hình bậc thang Academy.');
      }
      return null;
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [enabled]);

  React.useEffect(() => {
    if (!enabled) {
      setConfiguration(null);
      setError(null);
      setLoading(false);
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  const save = React.useCallback(async (input: UpdateAcademyTalentLadderConfigurationRequest) => {
    const response = await apiClient.academySales.updateTalentLadderConfiguration(input);
    setConfiguration(response.data);
    setError(null);
    return response.data;
  }, []);

  return { configuration, loading, error, refresh, save };
}
