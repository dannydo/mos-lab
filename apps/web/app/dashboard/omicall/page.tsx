'use client';

import React, { useMemo } from 'react';
import { Tabs } from 'antd';
import { Mic, Settings } from 'lucide-react';
import dynamic from 'next/dynamic';
import { AppIcon, PageHeader, SectionCard } from '~/components/ui';
import { OmicallConfigModal } from './omicall-page-modules/OmicallConfigModal';
import { OmicallConfigsTabContent } from './omicall-page-modules/OmicallConfigsTabContent';
import { OmicallLogsTabContent } from './omicall-page-modules/OmicallLogsTabContent';
import { buildOmicallConfigsColumns, buildOmicallLogsColumns } from './omicall-page-modules/omicallColumns';
import { useOmicallLogsPage } from './omicall-page-modules/useOmicallLogsPage';

const QAPlayerDrawer = dynamic(() => import('../../../components/QAPlayerDrawer').then((m) => m.QAPlayerDrawer), {
  ssr: false,
});

export default function OmicallLogsPage() {
  const {
    isAdmin,
    canReviewQa,
    activeTab,
    logs,
    loadingLogs,
    currentPage,
    pageSize,
    totalLogs,
    dateRange,
    setDateRange,
    directionFilter,
    setDirectionFilter,
    statusFilter,
    setStatusFilter,
    happyFilter,
    setHappyFilter,
    aiFilter,
    setAiFilter,
    staffFilter,
    setStaffFilter,
    searchQuery,
    setSearchQuery,
    onlyWithRecording,
    setOnlyWithRecording,
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
  } = useOmicallLogsPage();

  const logsColumns = useMemo(
    () =>
      buildOmicallLogsColumns({
        playingLogId,
        reanalyzingLogId,
        canReviewQa,
        onCopyUuid: handleCopyUuid,
        onTogglePlay: handleTogglePlay,
        onReanalyze: handleReanalyze,
        onOpenQaDrawer: openQADrawer,
      }),
    [playingLogId, reanalyzingLogId, canReviewQa, handleCopyUuid, handleTogglePlay, handleReanalyze, openQADrawer]
  );

  const configsColumns = useMemo(
    () =>
      buildOmicallConfigsColumns({
        onOpenConfigModal: handleOpenConfigModal,
        onDeleteConfig: handleDeleteConfig,
      }),
    [handleOpenConfigModal, handleDeleteConfig]
  );

  return (
    <div className="responsive-page responsive-workspace omicall-page">
      <PageHeader
        title={<span className="text-[var(--color-primary)]">Lịch sử &amp; Thẩm định OmiCall</span>}
        subtitle="Xem, nghe lại trực tiếp file ghi âm cuộc gọi OmiCall, phân tích AI theo CSKH / Telesales và phê duyệt Happy Call."
      />

      <SectionCard bodyPadding={20}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: 'logs',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <AppIcon icon={Mic} size={15} />
                  Lịch sử cuộc gọi OmiCall
                </span>
              ),
              children: (
                <OmicallLogsTabContent
                  isAdmin={isAdmin}
                  canReviewQa={canReviewQa}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  directionFilter={directionFilter}
                  onDirectionFilterChange={setDirectionFilter}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  happyFilter={happyFilter}
                  onHappyFilterChange={setHappyFilter}
                  aiFilter={aiFilter}
                  onAiFilterChange={setAiFilter}
                  staffFilter={staffFilter}
                  onStaffFilterChange={setStaffFilter}
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  onlyWithRecording={onlyWithRecording}
                  onOnlyWithRecordingChange={setOnlyWithRecording}
                  staffList={staffList}
                  syncingLogs={syncingLogs}
                  onSearch={handleSearchLogs}
                  onReset={handleResetFilters}
                  onSync={handleSyncFromOmicall}
                  columns={logsColumns}
                  logs={logs}
                  loadingLogs={loadingLogs}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalLogs={totalLogs}
                  onPageChange={handlePageChange}
                />
              ),
            },
            ...(isAdmin
              ? [
                  {
                    key: 'configs',
                    label: (
                      <span className="inline-flex items-center gap-1.5">
                        <AppIcon icon={Settings} size={15} />
                        Cấu hình Extension nhân viên
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
                ]
              : []),
          ]}
        />
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
