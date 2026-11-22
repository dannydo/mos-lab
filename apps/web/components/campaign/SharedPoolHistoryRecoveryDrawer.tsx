'use client';

import React, { useMemo } from 'react';
import { Button } from 'antd';
import { History, RefreshCw, Zap } from 'lucide-react';
import type { CampaignSharedPoolDetailedLog } from '@mos-lab/shared';
import { AdaptiveDrawer, DataTable } from '~/components/ui';
import { createSharedPoolHistoryColumns } from './shared-pool-history-recovery-drawer/SharedPoolHistoryColumns';
import { SharedPoolHistoryToolbar } from './shared-pool-history-recovery-drawer/SharedPoolHistoryToolbar';
import { SharedPoolLogRecoveryModal } from './shared-pool-history-recovery-drawer/SharedPoolLogRecoveryModal';
import { SharedPoolQuickRecoveryModal } from './shared-pool-history-recovery-drawer/SharedPoolQuickRecoveryModal';
import type { SharedPoolHistoryRecoveryDrawerProps } from './shared-pool-history-recovery-drawer/sharedPoolHistoryTypes';
import { useSharedPoolHistoryRecovery } from './shared-pool-history-recovery-drawer/useSharedPoolHistoryRecovery';

export type { SharedPoolHistoryRecoveryDrawerProps } from './shared-pool-history-recovery-drawer/sharedPoolHistoryTypes';

export const SharedPoolHistoryRecoveryDrawer: React.FC<SharedPoolHistoryRecoveryDrawerProps> = ({
  open,
  onClose,
  campaignId,
  isAdmin,
  onDataChanged,
}) => {
  const {
    loading,
    logs,
    total,
    currentPage,
    pageSize,
    actionFilter,
    searchQuery,
    setSearchQuery,
    fetchHistory,
    handleFilterChange,
    handleSearchSubmit,
    handlePaginationChange,
    recoveryModalOpen,
    setRecoveryModalOpen,
    recoveryLoading,
    selectedLog,
    recoveryAction,
    setRecoveryAction,
    targetPoolStatus,
    setTargetPoolStatus,
    recoveryReason,
    setRecoveryReason,
    driftConfirm,
    driftConfirmLoading,
    handleOpenRecovery,
    handleSubmitRecovery,
    handleConfirmDriftOverride,
    handleCancelDriftOverride,
    quickModalOpen,
    setQuickModalOpen,
    quickCustomerId,
    setQuickCustomerId,
    quickAction,
    setQuickAction,
    quickTargetStatus,
    setQuickTargetStatus,
    quickReason,
    setQuickReason,
    quickLoading,
    handleSubmitQuickRecovery,
  } = useSharedPoolHistoryRecovery({ open, campaignId, onDataChanged });

  const columns = useMemo(
    () =>
      createSharedPoolHistoryColumns({
        isAdmin,
        onOpenRecovery: handleOpenRecovery,
      }),
    [isAdmin, handleOpenRecovery]
  );

  return (
    <>
      <AdaptiveDrawer
        intent="data"
        title={
          <div className="flex items-center justify-between w-full pr-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <History size={18} className="text-purple-600 dark:text-purple-400 shrink-0" />
              <div>
                <span className="font-bold text-base text-slate-800 dark:text-slate-100">
                  Lịch Sử Thao Tác & Khôi Phục Shared Pool
                </span>
                <span className="ml-2 text-xs font-normal text-purple-600 dark:text-purple-400 font-mono">
                  (Realtime Audit & Safe Recovery)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  size="small"
                  type="primary"
                  icon={<Zap size={13} />}
                  onClick={() => setQuickModalOpen(true)}
                  className="inline-flex items-center gap-1 bg-purple-600 hover:bg-purple-500 font-semibold"
                >
                  Khôi phục nhanh Data
                </Button>
              )}
              <Button
                size="small"
                icon={<RefreshCw size={13} />}
                onClick={fetchHistory}
                loading={loading}
                className="inline-flex items-center gap-1"
              >
                Làm mới
              </Button>
            </div>
          </div>
        }
        open={open}
        onClose={onClose}
        width="min(92vw, 1400px)"
        destroyOnHidden
      >
        <SharedPoolHistoryToolbar
          total={total}
          actionFilter={actionFilter}
          searchQuery={searchQuery}
          onActionFilterChange={handleFilterChange}
          onSearchQueryChange={setSearchQuery}
          onSearch={handleSearchSubmit}
        />

        <DataTable<CampaignSharedPoolDetailedLog>
          size="small"
          loading={loading}
          dataSource={logs}
          columns={columns}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: handlePaginationChange,
            showTotal: (tot) => `Tổng cộng ${tot} bản ghi`,
          }}
          scroll={{ x: 1000 }}
          className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800"
        />
      </AdaptiveDrawer>

      <SharedPoolLogRecoveryModal
        open={recoveryModalOpen}
        loading={recoveryLoading}
        selectedLog={selectedLog}
        recoveryAction={recoveryAction}
        targetPoolStatus={targetPoolStatus}
        recoveryReason={recoveryReason}
        driftConfirm={driftConfirm}
        driftConfirmLoading={driftConfirmLoading}
        onCancel={() => setRecoveryModalOpen(false)}
        onSubmit={handleSubmitRecovery}
        onChangeRecoveryAction={setRecoveryAction}
        onChangeTargetPoolStatus={setTargetPoolStatus}
        onChangeRecoveryReason={setRecoveryReason}
        onConfirmDrift={handleConfirmDriftOverride}
        onCancelDrift={handleCancelDriftOverride}
      />

      <SharedPoolQuickRecoveryModal
        open={quickModalOpen}
        loading={quickLoading}
        customerId={quickCustomerId}
        action={quickAction}
        targetStatus={quickTargetStatus}
        reason={quickReason}
        onCancel={() => setQuickModalOpen(false)}
        onSubmit={handleSubmitQuickRecovery}
        onChangeCustomerId={setQuickCustomerId}
        onChangeAction={setQuickAction}
        onChangeTargetStatus={setQuickTargetStatus}
        onChangeReason={setQuickReason}
      />
    </>
  );
};
