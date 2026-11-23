'use client';

import React, { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { AppIcon, DataTable, PageHeader, SectionCard } from '../../../components/ui';
import { BranchDetailDrawer } from './components/BranchDetailDrawer';
import { BranchFormDrawer } from './components/BranchFormDrawer';
import { BRANCH_PAGE_SIZE_OPTIONS } from './branches-page-modules/branchesPageTypes';
import { renderStoreTypeBadge } from './branches-page-modules/BranchStoreTypeBadge';
import { buildBranchesTableColumns } from './branches-page-modules/branchesTableColumns';
import { BranchesFilterToolbar } from './branches-page-modules/BranchesFilterToolbar';
import { BranchesGridView } from './branches-page-modules/BranchesGridView';
import { BranchesHeaderActions } from './branches-page-modules/BranchesHeaderActions';
import { BranchesKpiGrid } from './branches-page-modules/BranchesKpiGrid';
import { useBranchesPage } from './branches-page-modules/useBranchesPage';

export default function BranchesPage() {
  const {
    canManage,
    viewMode,
    handleViewModeChange,
    loading,
    statsLoading,
    branches,
    stats,
    search,
    storeTypeFilter,
    statusFilter,
    page,
    pageSize,
    total,
    detailVisible,
    setDetailVisible,
    detailLoading,
    selectedBranch,
    activeDrawerTab,
    setActiveDrawerTab,
    editDrawerVisible,
    setEditDrawerVisible,
    editDrawerMode,
    submitting,
    form,
    handleRefresh,
    handleSearchChange,
    handleStoreTypeFilterChange,
    handleStatusFilterChange,
    handlePaginationChange,
    handleOpenDetail,
    handleOpenCreate,
    handleOpenEdit,
    handleSubmitForm,
    handleToggleActive,
    activeSalonsCount,
    activeAcademiesCount,
    activeOfficesCount,
  } = useBranchesPage();

  const columns = useMemo(
    () =>
      buildBranchesTableColumns({
        canManage,
        onOpenDetail: handleOpenDetail,
        onOpenEdit: handleOpenEdit,
        onToggleActive: handleToggleActive,
      }),
    [canManage, handleOpenDetail, handleOpenEdit, handleToggleActive]
  );

  return (
    <div className="p-4 sm:p-6 min-h-screen space-y-6 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <PageHeader
        title="Danh Sách Chi Nhánh"
        subtitle="Hệ thống chi nhánh Salon làm đẹp, Học viện đào tạo và Trụ sở văn phòng Wings / mOS Lab"
        icon={<AppIcon icon={Building2} size="lg" className="text-emerald-500" />}
        extra={
          <BranchesHeaderActions
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            loading={loading}
            onRefresh={handleRefresh}
            canManage={canManage}
            onOpenCreate={handleOpenCreate}
          />
        }
      />

      {/* KPI Cards */}
      <BranchesKpiGrid
        stats={stats}
        statsLoading={statsLoading}
        branchesCount={branches.length}
        activeSalonsCount={activeSalonsCount}
        activeAcademiesCount={activeAcademiesCount}
        activeOfficesCount={activeOfficesCount}
      />

      {/* Toolbar: Search, Filters, Count */}
      <BranchesFilterToolbar
        search={search}
        onSearchChange={handleSearchChange}
        storeTypeFilter={storeTypeFilter}
        onStoreTypeFilterChange={handleStoreTypeFilterChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        visibleCount={branches.length}
        total={total}
      />

      {/* Content: Grid vs Table */}
      {viewMode === 'grid' ? (
        <BranchesGridView
          loading={loading}
          branches={branches}
          canManage={canManage}
          onOpenDetail={handleOpenDetail}
          onOpenEdit={handleOpenEdit}
          onToggleActive={handleToggleActive}
        />
      ) : (
        <SectionCard className="p-0 overflow-hidden">
          <DataTable
            rowKey="id"
            columns={columns}
            dataSource={branches}
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: handlePaginationChange,
              showSizeChanger: true,
              pageSizeOptions: BRANCH_PAGE_SIZE_OPTIONS,
              showTotal: (totalCount) => `Tổng cộng ${totalCount} chi nhánh`,
            }}
          />
        </SectionCard>
      )}

      {/* Detail Drawer */}
      <BranchDetailDrawer
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
        branch={selectedBranch}
        loading={detailLoading}
        activeTab={activeDrawerTab}
        onTabChange={setActiveDrawerTab}
        renderStoreTypeBadge={renderStoreTypeBadge}
      />

      {/* Create / Edit Drawer */}
      <BranchFormDrawer
        open={editDrawerVisible}
        onClose={() => setEditDrawerVisible(false)}
        mode={editDrawerMode}
        branch={selectedBranch}
        form={form}
        submitting={submitting}
        onSubmit={handleSubmitForm}
      />
    </div>
  );
}
