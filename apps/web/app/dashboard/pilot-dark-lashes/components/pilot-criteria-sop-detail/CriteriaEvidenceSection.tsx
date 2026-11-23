'use client';

import React from 'react';
import { Search } from 'lucide-react';
import type { PilotSession } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui/AppIcon';
import { CriteriaEvidenceCard } from './CriteriaEvidenceCard';
import type { EvidenceFilterType, PilotCriteriaStats, PreviewPhotoState } from './pilot-criteria-sop.types';

interface CriteriaEvidenceSectionProps {
  filteredSessions: PilotSession[];
  stats: PilotCriteriaStats;
  evidenceFilter: EvidenceFilterType;
  searchQuery: string;
  onFilterChange: (filter: EvidenceFilterType) => void;
  onSearchChange: (query: string) => void;
  onPreviewPhoto: (photo: PreviewPhotoState) => void;
  onOpenSessionFlow?: (session: PilotSession) => void;
}

export function CriteriaEvidenceSection({
  filteredSessions,
  stats,
  evidenceFilter,
  searchQuery,
  onFilterChange,
  onSearchChange,
  onPreviewPhoto,
  onOpenSessionFlow,
}: CriteriaEvidenceSectionProps) {
  return (
    <div className="space-y-4" data-testid="sop-evidence-section">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Bằng Chứng Thực Nghiệm Chi Nhánh Đề Thám
            </span>
            <span className="inline-flex items-center justify-center leading-none text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums">
              {filteredSessions.length} / {stats.total} ca hiển thị
            </span>
            <span className="inline-flex items-center justify-center leading-none text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 tabular-nums">
              Tỷ lệ đạt: {stats.passRate}% ({stats.passCount} PASS)
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 m-0">
            Bảng Minh Chứng Thực Tế 17 Ca Pilot (Liên Kết Ca Gốc mOS)
          </h2>
        </div>

        {/* Ô tìm kiếm & Bộ lọc filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-48 sm:w-56">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <AppIcon icon={Search} size={13} />
            </span>
            <input
              type="text"
              placeholder="Tìm khách hàng, ca #, lý do..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              data-testid="search-evidence-input"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shrink-0">
            <button
              type="button"
              onClick={() => onFilterChange('ALL')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all tabular-nums ${
                evidenceFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Tất cả ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('FAIL')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all tabular-nums ${
                evidenceFilter === 'FAIL'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              }`}
            >
              Chỉ ca FAIL ({stats.failCount})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('PASS')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all tabular-nums ${
                evidenceFilter === 'PASS'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
            >
              Chỉ ca PASS ({stats.passCount})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('HAS_PHOTO')}
              className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all tabular-nums ${
                evidenceFilter === 'HAS_PHOTO'
                  ? 'bg-violet-500 text-white shadow-sm'
                  : 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30'
              }`}
            >
              Có ảnh ({stats.withPhotosCount})
            </button>
          </div>
        </div>
      </div>

      {/* Danh sách các ca minh chứng dạng Cards */}
      {filteredSessions.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
          Không tìm thấy ca pilot nào khớp với bộ lọc hiện tại.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredSessions.map((session) => (
            <CriteriaEvidenceCard
              key={session.id}
              session={session}
              onPreviewPhoto={onPreviewPhoto}
              onOpenSessionFlow={onOpenSessionFlow}
            />
          ))}
        </div>
      )}
    </div>
  );
}
