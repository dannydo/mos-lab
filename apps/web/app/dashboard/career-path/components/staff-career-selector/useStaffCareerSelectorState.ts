import { useEffect, useMemo, useRef, useState } from 'react';
import type { CareerBranchFilter, CareerStaffSummary } from '@mos-lab/shared';
import { buildCareerBranchOptions } from '../../career-path.constants';
import type { CareerSelectorMode } from './staffCareerSelectorTypes';
import { filterAndSortCareerStaff } from './staffCareerMetrics';

interface UseStaffCareerSelectorStateParams {
  staffList: CareerStaffSummary[];
  selectedStaffId: number | null;
  activeRoleFilter: string;
  onRoleFilterChange?: (role: string) => void;
  activeBranchFilter: CareerBranchFilter | string;
  onBranchFilterChange?: (branch: string) => void;
  isCollapsedHorizontal: boolean;
  onCollapseHorizontal?: () => void;
  onExpandHorizontal?: () => void;
  selectorMode?: CareerSelectorMode;
  onSelectorModeChange?: (mode: CareerSelectorMode) => void;
}

export function useStaffCareerSelectorState({
  staffList,
  selectedStaffId,
  activeRoleFilter,
  onRoleFilterChange,
  activeBranchFilter,
  onBranchFilterChange,
  isCollapsedHorizontal,
  onCollapseHorizontal,
  onExpandHorizontal,
  selectorMode,
  onSelectorModeChange,
}: UseStaffCareerSelectorStateParams) {
  const [internalRoleFilter, setInternalRoleFilter] = useState('ALL');
  const [internalBranchFilter, setInternalBranchFilter] = useState<string>('ALL');
  const [viewMode] = useState<'table' | 'grid'>('table');
  const [internalMode, setInternalMode] = useState<CareerSelectorMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('mos_career_selector_mode') as CareerSelectorMode | null;
        if (saved === 'ultra_compact' || saved === 'cards' || saved === 'table') {
          return saved;
        }
      } catch {
        // Ignore storage read errors
      }
    }
    return isCollapsedHorizontal ? 'cards' : 'table';
  });

  const currentMode: CareerSelectorMode = selectorMode ?? internalMode;

  const handleModeChange = (mode: CareerSelectorMode) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mos_career_selector_mode', mode);
      } catch {
        // Ignore storage write errors
      }
    }
    if (onSelectorModeChange) {
      onSelectorModeChange(mode);
    } else {
      setInternalMode(mode);
      if (mode === 'table') {
        onExpandHorizontal?.();
      } else {
        onCollapseHorizontal?.();
      }
    }
  };

  const currentFilter = onRoleFilterChange ? activeRoleFilter : internalRoleFilter;
  const setFilter = (role: string) => {
    if (onRoleFilterChange) onRoleFilterChange(role);
    else setInternalRoleFilter(role);
  };

  const currentBranchFilter: string = onBranchFilterChange ? activeBranchFilter : internalBranchFilter;
  const setBranchFilter = (branch: string) => {
    if (onBranchFilterChange) onBranchFilterChange(branch);
    else setInternalBranchFilter(branch);
  };

  const scrollRailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedStaffId && scrollRailRef.current) {
      const activeEl = scrollRailRef.current.querySelector<HTMLElement>(`[data-staff-id="${selectedStaffId}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedStaffId, currentMode]);

  const scrollRail = (direction: 'left' | 'right') => {
    if (scrollRailRef.current) {
      scrollRailRef.current.scrollBy({
        left: direction === 'left' ? -350 : 350,
        behavior: 'smooth',
      });
    }
  };

  const branchOptions = useMemo(() => buildCareerBranchOptions(staffList, currentFilter), [staffList, currentFilter]);

  const filteredStaff = useMemo(
    () => filterAndSortCareerStaff(staffList, currentFilter, currentBranchFilter),
    [staffList, currentFilter, currentBranchFilter]
  );

  const selectedStaff = useMemo(
    () => staffList.find((s) => s.id === selectedStaffId) || null,
    [staffList, selectedStaffId]
  );

  return {
    viewMode,
    currentMode,
    handleModeChange,
    currentFilter,
    setFilter,
    currentBranchFilter,
    setBranchFilter,
    branchOptions,
    scrollRailRef,
    scrollRail,
    filteredStaff,
    selectedStaff,
  };
}
