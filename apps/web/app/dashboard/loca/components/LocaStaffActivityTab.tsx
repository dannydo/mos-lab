'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { buildLocaStaffActivityColumns } from './loca-staff-activity-tab/LocaStaffActivityColumns';
import { LocaStaffActivityFiltersBar } from './loca-staff-activity-tab/LocaStaffActivityFiltersBar';
import { LocaStaffActivityLogTableCard } from './loca-staff-activity-tab/LocaStaffActivityLogTableCard';
import { LocaStaffActivitySummaryBar } from './loca-staff-activity-tab/LocaStaffActivitySummaryBar';
import type { LocaStaffActivityTabProps } from './loca-staff-activity-tab/types';

export type { LocaActivityViewMode, LocaStaffActivityTabProps } from './loca-staff-activity-tab/types';

export const LocaStaffActivityTab: React.FC<LocaStaffActivityTabProps> = ({
  staffList,
  selectedStaffId,
  onSelectStaff,
  viewMode,
  onViewModeChange,
  referenceDate,
  onNavigateDate,
  onReferenceDateChange,
  searchQuery,
  onSearchChange,
  actionTypeFilter,
  onActionTypeChange,
  selectedTouchpointKey = 'ALL',
  onTouchpointKeyChange,
  stats,
  logs,
  loading,
  total,
  currentPage,
  pageSize,
  onPageChange,
  onOpenCustomerDetail,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const toggleAudio = useCallback(
    (id: string, url?: string | null) => {
      if (!url) return;
      if (playingAudioId === id) {
        setPlayingAudioId(null);
      } else {
        setPlayingAudioId(id);
        window.open(url, '_blank');
      }
    },
    [playingAudioId]
  );

  const handleClearFilters = useCallback(() => {
    onActionTypeChange('ALL');
    onTouchpointKeyChange?.('ALL');
  }, [onActionTypeChange, onTouchpointKeyChange]);

  const columns = useMemo(
    () =>
      buildLocaStaffActivityColumns({
        isDark,
        currentPage,
        pageSize,
        playingAudioId,
        onToggleAudio: toggleAudio,
        onOpenCustomerDetail,
      }),
    [isDark, currentPage, pageSize, playingAudioId, toggleAudio, onOpenCustomerDetail]
  );

  return (
    <div className="space-y-6">
      <LocaStaffActivityFiltersBar
        isDark={isDark}
        staffList={staffList}
        selectedStaffId={selectedStaffId}
        onSelectStaff={onSelectStaff}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        referenceDate={referenceDate}
        onNavigateDate={onNavigateDate}
        onReferenceDateChange={onReferenceDateChange}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        actionTypeFilter={actionTypeFilter}
        onActionTypeChange={onActionTypeChange}
      />

      <LocaStaffActivitySummaryBar
        isDark={isDark}
        stats={stats}
        actionTypeFilter={actionTypeFilter}
        onActionTypeChange={onActionTypeChange}
        selectedTouchpointKey={selectedTouchpointKey}
        onTouchpointKeyChange={onTouchpointKeyChange}
      />

      <LocaStaffActivityLogTableCard
        columns={columns}
        logs={logs}
        loading={loading}
        total={total}
        currentPage={currentPage}
        pageSize={pageSize}
        actionTypeFilter={actionTypeFilter}
        selectedTouchpointKey={selectedTouchpointKey}
        onClearFilters={handleClearFilters}
        onPageChange={onPageChange}
      />
    </div>
  );
};
