'use client';

import React, { Suspense, useMemo } from 'react';
import { Button, Tabs } from 'antd';
import { Mic, Settings, UserRound, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { AppIcon, PageHeader, SectionCard } from '~/components/ui';
import { OmicallConfigModal } from './omicall-page-modules/OmicallConfigModal';
import { OmicallConfigsTabContent } from './omicall-page-modules/OmicallConfigsTabContent';
import { OmicallLogsTabContent } from './omicall-page-modules/OmicallLogsTabContent';
import { buildOmicallConfigsColumns, buildOmicallLogsColumns } from './omicall-page-modules/omicallColumns';
import { buildOmicallFilterChips } from './omicall-page-modules/omicallPageTypes';
import { useOmicallLogsPage } from './omicall-page-modules/useOmicallLogsPage';

const QAPlayerDrawer = dynamic(() => import('../../../components/QAPlayerDrawer').then((m) => m.QAPlayerDrawer), {
  ssr: false,
});

function parsePositiveIntParam(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function OmicallLogsPageContent() {
  const searchParams = useSearchParams();
  const initialLegacyUserId = parsePositiveIntParam(searchParams.get('legacyUserId'));
  const initialLogId = parsePositiveIntParam(searchParams.get('logId'));
  const initialCustomerName = searchParams.get('customerName') || '';
  const initialSearch = searchParams.get('search') || '';

  const {
    isAdmin,
    canReviewQa,
    activeTab,
    logs,
    branches,
    summary,
    loadingLogs,
    currentPage,
    pageSize,
    totalLogs,
    dateMode,
    selectedDate,
    dateRange,
    handleDateModeChange,
    handleSelectDate,
    handlePrevDay,
    handleNextDay,
    handleToday,
    handleDateRangeChange,
    handleQuickFilterAll,
    handleQuickFilterAnswered,
    handleQuickFilterHappyApproved,
    handleQuickFilterHappyPending,
    handleQuickFilterComplaints,
    handleQuickFilterMismatch,
    legacyUserIdFilter,
    customerFilterLabel,
    handleClearCustomerFilter,
    branchFilter,
    setBranchFilter,
    directionFilter,
    setDirectionFilter,
    statusFilter,
    setStatusFilter,
    happyFilter,
    setHappyFilter,
    aiFilter,
    setAiFilter,
    aiSatisfactionFilter,
    setAiSatisfactionFilter,
    ratingSourceFilter,
    setRatingSourceFilter,
    ratingLevelFilter,
    setRatingLevelFilter,
    staffFilter,
    setStaffFilter,
    searchQuery,
    setSearchQuery,
    onlyWithRecording,
    setOnlyWithRecording,
    hasComplaintOnly,
    setHasComplaintOnly,
    staffList,
    playingLogId,
    reanalyzingLogId,
    syncingLogs,
    configs,
    loadingConfigs,
    configModalOpen,
    configForm,
    selectedStaffForConfig,
    submittingConfig,
    qaDrawerOpen,
    selectedLogId,
    fetchLogs,
    handleTabChange,
    handlePageChange,
    handleSearchLogs,
    handleResetFilters,
    handleTogglePlay,
    handleReanalyze,
    handleSyncFromOmicall,
    handleCopyUuid,
    openQADrawer,
    closeQADrawer,
    handleOpenConfigModal,
    closeConfigModal,
    handleSaveConfig,
    handleDeleteConfig,
  } = useOmicallLogsPage({
    initialLegacyUserId,
    initialCustomerName,
    initialSearch,
    initialLogId,
  });

  const logsColumns = useMemo(
    () =>
      buildOmicallLogsColumns({
        dateMode,
        playingLogId,
        reanalyzingLogId,
        canReviewQa,
        onCopyUuid: handleCopyUuid,
        onTogglePlay: handleTogglePlay,
        onReanalyze: handleReanalyze,
        onOpenQaDrawer: openQADrawer,
      }),
    [
      dateMode,
      playingLogId,
      reanalyzingLogId,
      canReviewQa,
      handleCopyUuid,
      handleTogglePlay,
      handleReanalyze,
      openQADrawer,
    ]
  );

  const activeChips = useMemo(
    () =>
      buildOmicallFilterChips({
        branchFilter,
        branches,
        staffFilter,
        staffList,
        happyFilter,
        statusFilter,
        directionFilter,
        aiFilter,
        aiSatisfactionFilter,
        ratingSourceFilter,
        ratingLevelFilter,
        onlyWithRecording,
        hasComplaintOnly,
        searchQuery,
        onClearBranch: () => setBranchFilter('ALL'),
        onClearStaff: () => setStaffFilter('ALL'),
        onClearHappy: () => setHappyFilter('ALL'),
        onClearStatus: () => setStatusFilter('ALL'),
        onClearDirection: () => setDirectionFilter('ALL'),
        onClearAi: () => setAiFilter('ALL'),
        onClearAiSatisfaction: () => setAiSatisfactionFilter('ALL'),
        onClearRating: () => {
          setRatingSourceFilter('ANY');
          setRatingLevelFilter('ALL');
        },
        onClearRecording: () => setOnlyWithRecording(false),
        onClearComplaint: () => setHasComplaintOnly(false),
        onClearSearch: () => setSearchQuery(''),
      }),
    [
      branchFilter,
      branches,
      staffFilter,
      staffList,
      happyFilter,
      statusFilter,
      directionFilter,
      aiFilter,
      aiSatisfactionFilter,
      ratingSourceFilter,
      ratingLevelFilter,
      onlyWithRecording,
      hasComplaintOnly,
      searchQuery,
      setBranchFilter,
      setStaffFilter,
      setHappyFilter,
      setStatusFilter,
      setDirectionFilter,
      setAiFilter,
      setAiSatisfactionFilter,
      setRatingSourceFilter,
      setRatingLevelFilter,
      setOnlyWithRecording,
      setHasComplaintOnly,
      setSearchQuery,
    ]
  );

  const configsColumns = useMemo(
    () =>
      buildOmicallConfigsColumns({
        onOpenConfigModal: handleOpenConfigModal,
        onDeleteConfig: handleDeleteConfig,
      }),
    [handleOpenConfigModal, handleDeleteConfig]
  );

  const logsTabNode = (
    <OmicallLogsTabContent
      isAdmin={isAdmin}
      canReviewQa={canReviewQa}
      dateMode={dateMode}
      selectedDate={selectedDate}
      dateRange={dateRange}
      summary={summary}
      onDateModeChange={handleDateModeChange}
      onSelectDate={handleSelectDate}
      onPrevDay={handlePrevDay}
      onNextDay={handleNextDay}
      onToday={handleToday}
      onDateRangeChange={handleDateRangeChange}
      onQuickFilterAll={handleQuickFilterAll}
      onQuickFilterAnswered={handleQuickFilterAnswered}
      onQuickFilterHappyApproved={handleQuickFilterHappyApproved}
      onQuickFilterHappyPending={handleQuickFilterHappyPending}
      onQuickFilterComplaints={handleQuickFilterComplaints}
      onQuickFilterMismatch={handleQuickFilterMismatch}
      branchFilter={branchFilter}
      onBranchFilterChange={setBranchFilter}
      branches={branches}
      directionFilter={directionFilter}
      onDirectionFilterChange={setDirectionFilter}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      happyFilter={happyFilter}
      onHappyFilterChange={setHappyFilter}
      aiFilter={aiFilter}
      onAiFilterChange={setAiFilter}
      aiSatisfactionFilter={aiSatisfactionFilter}
      onAiSatisfactionFilterChange={setAiSatisfactionFilter}
      ratingSourceFilter={ratingSourceFilter}
      onRatingSourceFilterChange={setRatingSourceFilter}
      ratingLevelFilter={ratingLevelFilter}
      onRatingLevelFilterChange={setRatingLevelFilter}
      staffFilter={staffFilter}
      onStaffFilterChange={setStaffFilter}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      onlyWithRecording={onlyWithRecording}
      onOnlyWithRecordingChange={setOnlyWithRecording}
      hasComplaintOnly={hasComplaintOnly}
      onHasComplaintOnlyChange={setHasComplaintOnly}
      activeChips={activeChips}
      staffList={staffList}
      syncingLogs={syncingLogs}
      onSearch={handleSearchLogs}
      onReset={handleResetFilters}
      onSync={handleSyncFromOmicall}
      columns={logsColumns}
      logs={logs}
      loadingLogs={loadingLogs}
      playingLogId={playingLogId}
      onTogglePlay={handleTogglePlay}
      onOpenQaDrawer={openQADrawer}
      currentPage={currentPage}
      pageSize={pageSize}
      totalLogs={totalLogs}
      onPageChange={handlePageChange}
    />
  );

  return (
    <div className="responsive-page responsive-workspace omicall-page">
      <PageHeader title={<span className="text-[var(--color-primary)]">OmiCall · Happy Call</span>} />

      {legacyUserIdFilter && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 font-medium text-[var(--mos-text-primary)]">
            <AppIcon icon={UserRound} size={14} className="text-amber-500" />
            <span>
              Khách hàng: <strong>{customerFilterLabel || `KH #${legacyUserIdFilter}`}</strong>
            </span>
          </div>
          <Button size="small" icon={<AppIcon icon={X} size={13} />} onClick={handleClearCustomerFilter}>
            Tất cả KH
          </Button>
        </div>
      )}

      <SectionCard bodyPadding={16}>
        {isAdmin ? (
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            size="small"
            items={[
              {
                key: 'logs',
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <AppIcon icon={Mic} size={14} />
                    Cuộc gọi &amp; Happy Call
                  </span>
                ),
                children: logsTabNode,
              },
              {
                key: 'configs',
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <AppIcon icon={Settings} size={14} />
                    Extension
                  </span>
                ),
                children: (
                  <OmicallConfigsTabContent
                    columns={configsColumns}
                    configs={configs}
                    loadingConfigs={loadingConfigs}
                  />
                ),
              },
            ]}
          />
        ) : (
          logsTabNode
        )}
      </SectionCard>

      <OmicallConfigModal
        open={configModalOpen}
        selectedStaff={selectedStaffForConfig}
        form={configForm}
        submitting={submittingConfig}
        onCancel={closeConfigModal}
        onOk={handleSaveConfig}
      />

      <QAPlayerDrawer
        open={qaDrawerOpen}
        omicallLogId={selectedLogId}
        onClose={closeQADrawer}
        onVerifySuccess={fetchLogs}
      />
    </div>
  );
}

export default function OmicallLogsPage() {
  return (
    <Suspense fallback={null}>
      <OmicallLogsPageContent />
    </Suspense>
  );
}
