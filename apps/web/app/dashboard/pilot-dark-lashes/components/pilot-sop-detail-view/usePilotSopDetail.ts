'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DARK_LASHES_SOP_7_STEPS_DETAILED, type PilotSopStepEmpiricalStat } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  EMPTY_PREVIEW_MEDIA,
  filterSopSteps,
  summarizeSopTimeStats,
  type PilotRealStepMedia,
  type PreviewMediaState,
} from './pilot-sop-detail-helpers';

export function usePilotSopDetail() {
  const [selectedStepOrder, setSelectedStepOrder] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<number, PilotSopStepEmpiricalStat>>({});
  const [totalSessions, setTotalSessions] = useState<number>(18);
  const [filterQuery, setFilterQuery] = useState('');

  // UI state for interactivity: Accordion expand/collapse, glossary, deep dive, image preview
  const [expandedStepOrders, setExpandedStepOrders] = useState<Set<number>>(() => new Set([1, 2, 3, 4, 5, 6, 7]));
  const [showGlossary, setShowGlossary] = useState<boolean>(false);
  const [expandedDeepDives, setExpandedDeepDives] = useState<Record<number, boolean>>({});
  const [previewMedia, setPreviewMedia] = useState<PreviewMediaState>(EMPTY_PREVIEW_MEDIA);

  const fetchEmpiricalStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.pilot.getSopEmpiricalStats({ pilotCode: 'DARK_LASHES' });
      if (res && Array.isArray(res.stats)) {
        const mapped: Record<number, PilotSopStepEmpiricalStat> = {};
        for (const st of res.stats) {
          mapped[st.stepOrder] = st;
        }
        setStats(mapped);
        if (typeof res.totalSessionsCount === 'number') {
          setTotalSessions(res.totalSessionsCount);
        }
      }
    } catch {
      // Non-blocking fallback: empirical metrics can load from cache
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmpiricalStats();
  }, [fetchEmpiricalStats]);

  const { totalTargetMinutes, totalEmpiricalAvgSeconds, stepsWithStats } = useMemo(
    () => summarizeSopTimeStats(DARK_LASHES_SOP_7_STEPS_DETAILED, stats),
    [stats]
  );

  const filteredSteps = useMemo(
    () => filterSopSteps(DARK_LASHES_SOP_7_STEPS_DETAILED, selectedStepOrder, filterQuery),
    [selectedStepOrder, filterQuery]
  );

  const selectAndExpandStep = useCallback((stepOrder: number) => {
    setSelectedStepOrder(stepOrder);
    setExpandedStepOrders((prev) => new Set([...prev, stepOrder]));
  }, []);

  const toggleStepExpand = useCallback((order: number) => {
    setExpandedStepOrders((prev) => {
      const next = new Set(prev);
      if (next.has(order)) {
        next.delete(order);
      } else {
        next.add(order);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandedStepOrders(new Set(DARK_LASHES_SOP_7_STEPS_DETAILED.map((s) => s.stepOrder)));
  }, []);

  const handleCollapseAll = useCallback(() => {
    setExpandedStepOrders(new Set());
  }, []);

  const toggleDeepDive = useCallback((stepOrder: number) => {
    setExpandedDeepDives((prev) => ({
      ...prev,
      [stepOrder]: !prev[stepOrder],
    }));
  }, []);

  const toggleGlossary = useCallback(() => {
    setShowGlossary((prev) => !prev);
  }, []);

  const openPreviewMedia = useCallback((media: PilotRealStepMedia) => {
    setPreviewMedia({
      open: true,
      title: media.label,
      imageUrl: media.photoUrl,
      note: media.sessionNote,
    });
  }, []);

  const closePreviewMedia = useCallback(() => {
    setPreviewMedia(EMPTY_PREVIEW_MEDIA);
  }, []);

  return {
    selectedStepOrder,
    setSelectedStepOrder,
    selectAndExpandStep,
    loading,
    stats,
    totalSessions,
    filterQuery,
    setFilterQuery,
    expandedStepOrders,
    showGlossary,
    toggleGlossary,
    expandedDeepDives,
    previewMedia,
    openPreviewMedia,
    closePreviewMedia,
    fetchEmpiricalStats,
    totalTargetMinutes,
    totalEmpiricalAvgSeconds,
    stepsWithStats,
    filteredSteps,
    toggleStepExpand,
    handleExpandAll,
    handleCollapseAll,
    toggleDeepDive,
  };
}
