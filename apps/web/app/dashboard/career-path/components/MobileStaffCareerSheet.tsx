'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { normalizeCvFeatherRole } from '@mos-lab/shared';
import { buildCareerBranchOptions, matchesCareerBranchFilter, matchesCareerRoleFilter } from '../career-path.constants';
import { MobileStaffCareerCard } from './mobile-staff-career-sheet/MobileStaffCareerCard';
import { MobileStaffSheetControls } from './mobile-staff-career-sheet/MobileStaffSheetControls';
import {
  type MobileStaffCareerSheetProps,
  computeMobileStaffCardMetrics,
  resolveMobileThresholds,
} from './mobile-staff-career-sheet/mobileStaffSheetTypesAndHelpers';

export type { MobileStaffCareerSheetProps };

export const MobileStaffCareerSheet: React.FC<MobileStaffCareerSheetProps> = ({
  staffList,
  selectedStaffId,
  onSelectStaff,
  config,
  activeBranchFilter,
  onBranchFilterChange,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoleFilter, setActiveRoleFilter] = useState('ALL');
  const [internalBranchFilter, setInternalBranchFilter] = useState<string>('ALL');
  const [highlightedId, setHighlightedId] = useState<number | null>(selectedStaffId);
  const selectedRef = useRef<HTMLDivElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  const currentBranchFilter: string =
    onBranchFilterChange && activeBranchFilter !== undefined ? activeBranchFilter : internalBranchFilter;
  const setBranchFilter = (branch: string) => {
    if (onBranchFilterChange) onBranchFilterChange(branch);
    else setInternalBranchFilter(branch);
  };

  const thresholds = useMemo(() => resolveMobileThresholds(config), [config]);

  // Base staff list (sắp xếp theo số bộ mi ordersCount giảm dần)
  const baseStaffList = useMemo(() => {
    return [...staffList].sort((a, b) => {
      const diff = (b.ordersCount || 0) - (a.ordersCount || 0);
      if (diff !== 0) return diff;
      return (a.displayName || '').localeCompare(b.displayName || '');
    });
  }, [staffList]);

  const branchOptions = useMemo(
    () => buildCareerBranchOptions(baseStaffList, activeRoleFilter),
    [baseStaffList, activeRoleFilter]
  );

  // Counts by role (scoped by active branch filter)
  const roleCounts = useMemo(() => {
    const branchScoped = baseStaffList.filter((s) => matchesCareerBranchFilter(s, currentBranchFilter));
    const counts: Record<string, number> = {
      ALL: branchScoped.length,
      KTV: 0,
      CV: 0,
      CV_PLUS: 0,
      CV_PLUS_PLUS: 0,
      CC: 0,
      FM: 0,
    };
    branchScoped.forEach((s) => {
      if (s.careerRole === 'CV') counts.CV++;
      else if (s.careerRole === 'CV_PLUS') counts.CV_PLUS++;
      else if (s.careerRole === 'CV_PLUS_PLUS') counts.CV_PLUS_PLUS++;
      else if (s.careerRole === 'KTV') counts.KTV++;
      else if (s.careerRole === 'CC' || (s.role || '').toLowerCase() === 'cc') counts.CC++;
      else if (s.careerRole === 'FM' || ['manager', 'fm'].includes((s.role || '').toLowerCase())) counts.FM++;
    });
    return counts;
  }, [baseStaffList, currentBranchFilter]);

  // Filtered by Search, Role & Branch (bảo đảm luôn order by số bộ mi ordersCount giảm dần)
  const filteredStaff = useMemo(() => {
    let result = baseStaffList.filter(
      (s) => matchesCareerRoleFilter(s, activeRoleFilter) && matchesCareerBranchFilter(s, currentBranchFilter)
    );

    if (searchQuery.trim()) {
      const featherRole = normalizeCvFeatherRole(searchQuery);
      if (featherRole === 'CVL') {
        result = result.filter((s) => s.careerRole === 'CV_PLUS');
      } else if (featherRole === 'CVLL') {
        result = result.filter((s) => s.careerRole === 'CV_PLUS_PLUS');
      } else {
        const q = searchQuery.toLowerCase().trim();
        result = result.filter((s) => {
          const nameMatch = (s.displayName || '').toLowerCase().includes(q);
          const userMatch = (s.username || '').toLowerCase().includes(q);
          const branchMatch = (s.branchName || '').toLowerCase().includes(q);
          return nameMatch || userMatch || branchMatch;
        });
      }
    }

    return [...result].sort((a, b) => {
      const diff = (b.ordersCount || 0) - (a.ordersCount || 0);
      if (diff !== 0) return diff;
      return (a.displayName || '').localeCompare(b.displayName || '');
    });
  }, [baseStaffList, activeRoleFilter, currentBranchFilter, searchQuery]);

  // Auto-scroll to selected staff when sheet opens
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleCardClick = (staffId: number) => {
    setHighlightedId(staffId);
    onSelectStaff(staffId);
    // Smooth auto-close after 250ms feedback
    setTimeout(() => {
      onClose();
    }, 250);
  };

  return (
    <div className="flex flex-col h-full -mx-4 -mt-3 text-slate-800 dark:text-slate-100">
      <MobileStaffSheetControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeRoleFilter={activeRoleFilter}
        onRoleFilterChange={setActiveRoleFilter}
        roleCounts={roleCounts}
        branchOptions={branchOptions}
        currentBranchFilter={currentBranchFilter}
        onBranchFilterChange={setBranchFilter}
      />

      {/* SCROLLABLE VERTICAL CARDS LIST */}
      <div ref={listContainerRef} className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 space-y-2.5 pb-10">
        {filteredStaff.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 m-0">Không tìm thấy Chuyên Viên nào</p>
            <p className="text-[11px] text-slate-400 m-0 mt-1">Thử tìm kiếm với từ khóa khác hoặc chuyển tab cấp bậc</p>
          </div>
        ) : (
          filteredStaff.map((staff) => (
            <MobileStaffCareerCard
              key={staff.id}
              staff={staff}
              metrics={computeMobileStaffCardMetrics(staff, thresholds, config)}
              isSelected={staff.id === selectedStaffId}
              isHighlighted={staff.id === highlightedId}
              selectedRef={selectedRef}
              onClick={handleCardClick}
            />
          ))
        )}
      </div>
    </div>
  );
};
