'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { AppIcon } from '~/components/ui/AppIcon';
import type { PilotSopDetailViewProps } from './pilot-sop-detail-view/pilot-sop-detail-helpers';
import { usePilotSopDetail } from './pilot-sop-detail-view/usePilotSopDetail';
import { PilotSopHeaderBanner } from './pilot-sop-detail-view/PilotSopHeaderBanner';
import { PilotSopGlossarySection } from './pilot-sop-detail-view/PilotSopGlossarySection';
import { PilotSopPrinciplesAndMetrics } from './pilot-sop-detail-view/PilotSopPrinciplesAndMetrics';
import { PilotSopNavigatorBar } from './pilot-sop-detail-view/PilotSopNavigatorBar';
import { PilotSopComparisonTable } from './pilot-sop-detail-view/PilotSopComparisonTable';
import { PilotSopStepCard } from './pilot-sop-detail-view/PilotSopStepCard';
import { PilotSopPhotoModal } from './pilot-sop-detail-view/PilotSopPhotoModal';

export type { PilotSopDetailViewProps };

export function PilotSopDetailView({ onBack, onOpenSopModal, onViewSessionId }: PilotSopDetailViewProps) {
  const {
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
  } = usePilotSopDetail();

  return (
    <div className="space-y-5 antialiased" data-testid="pilot-sop-detail-view">
      {/* 1. HEADER & DRAFT STATUS BANNER */}
      <PilotSopHeaderBanner
        showGlossary={showGlossary}
        loading={loading}
        onBack={onBack}
        onToggleGlossary={toggleGlossary}
        onOpenSopModal={onOpenSopModal}
        onRefresh={fetchEmpiricalStats}
      />

      {/* TỪ ĐIỂN THUẬT NGỮ KỸ THUẬT (DỄ HIỂU CHO HỌC VIÊN) */}
      {showGlossary && <PilotSopGlossarySection />}

      {/* 2. CORE PRINCIPLES & 3. BENCHMARK SUMMARY METRICS */}
      <PilotSopPrinciplesAndMetrics
        totalTargetMinutes={totalTargetMinutes}
        totalEmpiricalAvgSeconds={totalEmpiricalAvgSeconds}
        stepsWithStats={stepsWithStats}
        totalSessions={totalSessions}
      />

      {/* 4. 7-STEP NAVIGATOR BAR, EXPAND/COLLAPSE & FILTERS */}
      <PilotSopNavigatorBar
        selectedStepOrder={selectedStepOrder}
        stats={stats}
        filterQuery={filterQuery}
        onSelectAll={() => setSelectedStepOrder('all')}
        onSelectStep={selectAndExpandStep}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onFilterQueryChange={setFilterQuery}
      />

      {/* 5. BENCHMARK COMPARISON TABLE */}
      {selectedStepOrder === 'all' && <PilotSopComparisonTable stats={stats} onSelectStep={selectAndExpandStep} />}

      {/* 6. DETAILED CARDS FOR EACH STEP (7 BƯỚC CHI TIẾT - ACCORDION COLLAPSIBLE) */}
      {filteredSteps.length === 0 ? (
        <div className="py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
          <AppIcon icon={Search} size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
            Không tìm thấy bước kỹ thuật phù hợp với từ khóa.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredSteps.map((step) => (
            <PilotSopStepCard
              key={step.stepOrder}
              step={step}
              stat={stats[step.stepOrder]}
              isExpanded={expandedStepOrders.has(step.stepOrder)}
              isDeepDiveOpen={Boolean(expandedDeepDives[step.stepOrder])}
              onToggleExpand={toggleStepExpand}
              onToggleDeepDive={toggleDeepDive}
              onOpenPreviewMedia={openPreviewMedia}
              onViewSessionId={onViewSessionId}
            />
          ))}
        </div>
      )}

      {/* MODAL XEM ẢNH MINH CHỨNG PILOT PHÓNG TO */}
      <PilotSopPhotoModal previewMedia={previewMedia} onClose={closePreviewMedia} />
    </div>
  );
}

export default PilotSopDetailView;
