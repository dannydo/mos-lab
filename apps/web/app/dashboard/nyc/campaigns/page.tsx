'use client';

import '../../../suppress-warnings';
import React, { useMemo } from 'react';
import { DataTable } from '~/components/ui';
import { CampaignFormModal } from './campaigns-page-modules/CampaignFormModal';
import { CampaignHeaderAndFilters } from './campaigns-page-modules/CampaignHeaderAndFilters';
import { buildCampaignTableColumns } from './campaigns-page-modules/CampaignTableColumns';
import { CAMPAIGN_PAGE_SIZE_OPTIONS } from './campaigns-page-modules/campaignManagementTypes';
import { useCampaignManagement } from './campaigns-page-modules/useCampaignManagement';

export type {
  CampaignFormPromotion,
  CampaignFormTouchpoint,
  CampaignFormValues,
} from './campaigns-page-modules/campaignManagementTypes';

export default function CampaignManagementPage() {
  const {
    form,
    loading,
    statusFilter,
    searchQuery,
    isAdmin,
    showInSidebar,
    campaignVisibilityMap,
    isModalOpen,
    editingCampaign,
    submitting,
    staffList,
    campaignFormOptionsLoading,
    campaignFormOptionsError,
    fixedFinalPriceServices,
    fixedFinalPriceCategories,
    filteredCampaigns,
    setStatusFilter,
    setSearchQuery,
    handleToggleSidebar,
    handleToggleCampaignSidebar,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseModal,
    handleDeleteCampaign,
    handlePauseCampaign,
    handleResumeCampaign,
    handleCompleteCampaign,
    handleArchiveCampaign,
    handleUnarchiveCampaign,
    handleReopenCampaign,
    handleCloneCampaign,
    handleRestoreCampaign,
    handleSubmit,
    handleViewCampaign,
  } = useCampaignManagement();

  const columns = useMemo(
    () =>
      buildCampaignTableColumns({
        isAdmin,
        campaignVisibilityMap,
        onViewCampaign: handleViewCampaign,
        onEditCampaign: handleOpenEdit,
        onToggleCampaignSidebar: handleToggleCampaignSidebar,
        onPauseCampaign: handlePauseCampaign,
        onResumeCampaign: handleResumeCampaign,
        onCompleteCampaign: handleCompleteCampaign,
        onArchiveCampaign: handleArchiveCampaign,
        onUnarchiveCampaign: handleUnarchiveCampaign,
        onReopenCampaign: handleReopenCampaign,
        onRestoreCampaign: handleRestoreCampaign,
        onCloneCampaign: handleCloneCampaign,
        onDeleteCampaign: handleDeleteCampaign,
      }),
    [
      campaignVisibilityMap,
      handleArchiveCampaign,
      handleCloneCampaign,
      handleCompleteCampaign,
      handleDeleteCampaign,
      handleOpenEdit,
      handlePauseCampaign,
      handleReopenCampaign,
      handleRestoreCampaign,
      handleResumeCampaign,
      handleToggleCampaignSidebar,
      handleUnarchiveCampaign,
      handleViewCampaign,
      isAdmin,
    ]
  );

  return (
    <div className="responsive-page responsive-workspace nyc-campaigns-page">
      <CampaignHeaderAndFilters
        showInSidebar={showInSidebar}
        isAdmin={isAdmin}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        filteredCount={filteredCampaigns.length}
        onToggleSidebar={handleToggleSidebar}
        onOpenCreate={handleOpenCreate}
        onSearchChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
      />

      <DataTable
        columns={columns}
        dataSource={filteredCampaigns}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: CAMPAIGN_PAGE_SIZE_OPTIONS,
          showTotal: (total) => `Tổng số: ${total} chiến dịch`,
        }}
        className="antd-custom-table"
        stickyPrimaryColumn
      />

      <CampaignFormModal
        open={isModalOpen}
        editingCampaign={editingCampaign}
        submitting={submitting}
        form={form}
        staffList={staffList}
        campaignFormOptionsLoading={campaignFormOptionsLoading}
        campaignFormOptionsError={campaignFormOptionsError}
        fixedFinalPriceCategories={fixedFinalPriceCategories}
        fixedFinalPriceServices={fixedFinalPriceServices}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
