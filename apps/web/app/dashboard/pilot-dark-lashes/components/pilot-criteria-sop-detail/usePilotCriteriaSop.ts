'use client';

import { useMemo, useState } from 'react';
import type { PilotSession } from '@mos-lab/shared';
import { computeCriteriaStats, filterCriteriaSessions, mergeDisplaySessions } from './pilot-criteria-sop.helpers';
import type { EvidenceFilterType, PreviewPhotoState } from './pilot-criteria-sop.types';

const ALL_CRITERIA_IDS = [1, 2, 3, 4, 5];

/** Interactive state and memoized datasets for PilotCriteriaSopDetail. */
export function usePilotCriteriaSop(sessions?: PilotSession[]) {
  // Default all criteria expanded for thorough viewing
  const [expandedCriteria, setExpandedCriteria] = useState<number[]>(ALL_CRITERIA_IDS);
  const [expandedDeepDives, setExpandedDeepDives] = useState<number[]>([]);
  const [showGlossary, setShowGlossary] = useState<boolean>(false);

  // Evidence filtering & searching
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Photo preview modal state
  const [previewPhoto, setPreviewPhoto] = useState<PreviewPhotoState | null>(null);

  const toggleCriterion = (id: number) => {
    setExpandedCriteria((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const expandAllCriteria = () => setExpandedCriteria(ALL_CRITERIA_IDS);
  const collapseAllCriteria = () => setExpandedCriteria([]);

  const toggleDeepDive = (id: number) => {
    setExpandedDeepDives((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleGlossary = () => setShowGlossary((prev) => !prev);
  const closePreviewPhoto = () => setPreviewPhoto(null);

  const displaySessions = useMemo(() => mergeDisplaySessions(sessions), [sessions]);

  const filteredSessions = useMemo(
    () => filterCriteriaSessions(displaySessions, evidenceFilter, searchQuery),
    [displaySessions, evidenceFilter, searchQuery]
  );

  const stats = useMemo(() => computeCriteriaStats(displaySessions), [displaySessions]);

  return {
    expandedCriteria,
    expandedDeepDives,
    showGlossary,
    evidenceFilter,
    searchQuery,
    previewPhoto,
    filteredSessions,
    stats,
    toggleCriterion,
    expandAllCriteria,
    collapseAllCriteria,
    toggleDeepDive,
    toggleGlossary,
    setEvidenceFilter,
    setSearchQuery,
    setPreviewPhoto,
    closePreviewPhoto,
  };
}
