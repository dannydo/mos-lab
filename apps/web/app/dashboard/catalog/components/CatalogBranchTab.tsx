'use client';

import React, { useMemo } from 'react';
import type { CrmBranch } from '@mos-lab/shared';
import { DataTable } from '~/components/ui';
import { BranchDetailDrawer } from './catalog-branch-tab/BranchDetailDrawer';
import { BranchFilterToolbar } from './catalog-branch-tab/BranchFilterToolbar';
import { BranchStatsRow } from './catalog-branch-tab/BranchStatsRow';
import { buildBranchColumns } from './catalog-branch-tab/branchColumns';
import type { BranchDrawerMode, BranchDrawerTabKey, BranchFormValues } from './catalog-branch-tab/branchHelpers';
import { useCatalogBranchTab } from './catalog-branch-tab/useCatalogBranchTab';

export type { BranchDrawerMode, BranchDrawerTabKey, BranchFormValues };

export interface CatalogBranchTabProps {
  onRegisterCreate?: (fn: () => void) => void;
}

export default function CatalogBranchTab({ onRegisterCreate }: CatalogBranchTabProps = {}) {
  const {
    loading,
    statsLoading,
    branches,
    stats,
    search,
    onlyHidden,
    page,
    pageSize,
    total,
    drawerVisible,
    drawerMode,
    selectedBranch,
    detailLoading,
    submitting,
    activeDrawerTab,
    setActiveDrawerTab,
    form,
    handleTableChange,
    handleSearch,
    handleOnlyHiddenToggle,
    handleOpenEditOrView,
    handleCloseDrawer,
    handleSubmitForm,
    handleToggleActive,
    handleRefresh,
  } = useCatalogBranchTab({ onRegisterCreate });

  const columns = useMemo(
    () =>
      buildBranchColumns({
        loading,
        onOpenDetail: handleOpenEditOrView,
        onToggleActive: handleToggleActive,
      }),
    [loading, handleOpenEditOrView, handleToggleActive]
  );

  return (
    <div className="space-y-4">
      <BranchStatsRow stats={stats} loading={statsLoading} />

      <BranchFilterToolbar
        search={search}
        onlyHidden={onlyHidden}
        loading={loading}
        onSearchChange={handleSearch}
        onOnlyHiddenChange={handleOnlyHiddenToggle}
        onRefresh={handleRefresh}
      />

      <DataTable<CrmBranch>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={branches}
        className="shadow-sm"
        scroll={{ x: 'max-content' }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (totalCount) => `Tổng cộng ${totalCount} chi nhánh`,
        }}
        onChange={handleTableChange}
        locale={{ emptyText: onlyHidden ? 'Không có chi nhánh nào bị ẩn' : 'Không tìm thấy chi nhánh nào' }}
      />

      <BranchDetailDrawer
        open={drawerVisible}
        mode={drawerMode}
        selectedBranch={selectedBranch}
        detailLoading={detailLoading}
        submitting={submitting}
        activeTab={activeDrawerTab}
        form={form}
        onTabChange={setActiveDrawerTab}
        onClose={handleCloseDrawer}
        onSubmit={handleSubmitForm}
      />
    </div>
  );
}
