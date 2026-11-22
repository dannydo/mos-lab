'use client';

import '../../../../suppress-warnings';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CampaignKpiHeaderBar } from '~/components/campaign/CampaignKpiHeaderBar';
import { useCampaignCustomerColumns } from '~/components/campaign/CampaignCustomerTableColumns';
import { SharedPoolOverviewBanner } from '~/components/campaign/SharedPoolOverviewBanner';
import { CampaignCustomerTableSection } from './slug-page-modules/CampaignCustomerTableSection';
import { CampaignCustomerToolbar } from './slug-page-modules/CampaignCustomerToolbar';
import { CampaignDetailOverlays } from './slug-page-modules/CampaignDetailOverlays';
import { CampaignDetailLoadingState, CampaignDetailNotFoundState } from './slug-page-modules/CampaignDetailStates';
import { CampaignZeroTouchpointsAlert } from './slug-page-modules/CampaignZeroTouchpointsAlert';
import { useCampaignDetailPage } from './slug-page-modules/useCampaignDetailPage';

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const detail = useCampaignDetailPage(slug);

  const columns = useCampaignCustomerColumns({
    currentPage: detail.currentPage,
    pageSize: detail.pageSize,
    themeMode: detail.themeMode,
    token: detail.token,
    displayTouchpoints: detail.displayTouchpoints,
    campaign: detail.campaign,
    isAdmin: detail.isAdmin,
    actionLoadingId: detail.actionLoadingId,
    onSelectCustomer: detail.setSelectedCustomer,
    onOpenCustomerDetail: () => detail.setDetailDrawerVisible(true),
    onMakeCall: detail.makeCall,
    onToggleTouchpoint: detail.handleToggleTouchpoint,
    onOpenBooking: detail.handleOpenBookingWizard,
    onOpenSMS: detail.handleOpenSmsModal,
    onClaimCustomer: detail.handleClaimCustomer,
    onCallClaimedCustomer: detail.handleCallClaimedCustomer,
    onReleaseCustomer: detail.handleReleaseCustomer,
    onOpenAuditLogs: detail.handleOpenAuditLogs,
    onManagerCustomerAction: detail.handleManagerCustomerAction,
    onRemoveCustomer: detail.handleRemoveCustomer,
    onClaimExpiredLocally: detail.handleClaimExpiredLocally,
  });

  if (detail.loading) {
    return <CampaignDetailLoadingState />;
  }

  if (!detail.campaign) {
    return <CampaignDetailNotFoundState slug={slug} onBack={() => router.push('/dashboard/nyc/campaigns')} />;
  }

  const handleBackToList = () => router.push('/dashboard/nyc/campaigns');

  return (
    <div className="responsive-page responsive-workspace nyc-campaign-detail-page">
      <CampaignKpiHeaderBar
        campaign={{
          name: detail.campaign.name,
          slug: detail.campaign.slug,
          status: detail.campaign.status,
          startDate: detail.campaign.startDate,
          endDate: detail.campaign.endDate,
        }}
        stats={detail.stats}
        customersCount={detail.customers.length}
        promotions={detail.promotions}
        themeMode={detail.themeMode}
        isAdmin={detail.isAdmin}
        onBack={handleBackToList}
        onEdit={detail.handleOpenEditModal}
      />

      {detail.campaign.operationMode === 'SHARED_POOL' && (
        <SharedPoolOverviewBanner
          overview={detail.sharedPoolOverview}
          loading={detail.sharedPoolLoading}
          isAdmin={detail.isAdmin}
          onAdvanceBatch={detail.handleAdvanceBatch}
          onTogglePause={detail.handleTogglePause}
          onAddCustomers={detail.handleOpenAddCustomersDrawer}
          onOpenHistoryRecovery={() => detail.setHistoryRecoveryOpen(true)}
          onOpenExcludedDrawer={() => detail.setExcludedDrawerOpen(true)}
          selectedBatch={detail.selectedBatch}
          onSelectBatch={detail.handleSelectBatch}
          selectedPoolStatus={detail.selectedPoolStatus}
          onSelectPoolStatus={detail.handleSelectPoolStatus}
          selectedStaffId={detail.selectedBookerId === 'ALL' ? null : detail.selectedBookerId}
          onSelectStaff={detail.handleToggleStaffFilter}
        />
      )}

      {detail.touchpoints.length === 0 && (
        <CampaignZeroTouchpointsAlert onConfigureTouchpoints={() => detail.handleOpenEditModal('touchpoints')} />
      )}

      <CampaignCustomerToolbar
        bookingStatusFilter={detail.bookingStatusFilter}
        onBookingStatusFilterChange={detail.setBookingStatusFilter}
        searchQuery={detail.searchQuery}
        onSearchChange={detail.setSearchQuery}
        isAdmin={detail.isAdmin}
        selectedBookerId={detail.selectedBookerId}
        onBookerChange={detail.setSelectedBookerId}
        bookerStaffList={detail.bookerStaffList}
        onOpenRandomModal={() => detail.setRandomModalVisible(true)}
        selectedCount={detail.selectedRowKeys.length}
        showSelectedOnly={detail.showSelectedOnly}
        onToggleShowSelectedOnly={() => {
          detail.setShowSelectedOnly((prev) => !prev);
          detail.setCurrentPage(1);
        }}
        onOpenBatchAllocationModal={() => detail.setBatchAllocationModalVisible(true)}
        onBatchRemoveCustomers={detail.handleBatchRemoveCustomers}
      />

      <CampaignCustomerTableSection
        isAdmin={detail.isAdmin}
        selectedRowKeys={detail.selectedRowKeys}
        onRowSelectionChange={detail.handleRowSelectionChange}
        columns={columns}
        tableCustomers={detail.tableCustomers}
        loading={detail.customersLoading}
        currentPage={detail.currentPage}
        pageSize={detail.pageSize}
        total={detail.showSelectedOnly ? detail.selectedCustomersByKey.size : detail.customersTotal}
        onPageChange={detail.handlePageChange}
        themeMode={detail.themeMode}
        onOpenCustomerDetail={detail.handleOpenCustomerDetailDrawer}
        onMakeCall={detail.makeCall}
        onOpenBooking={detail.handleOpenBookingWizard}
      />

      <CampaignDetailOverlays
        campaign={detail.campaign}
        isAdmin={detail.isAdmin}
        themeMode={detail.themeMode}
        selectedRowCount={detail.selectedRowKeys.length}
        selectedCustomer={detail.selectedCustomer}
        selectedCustomerId={detail.selectedCustomerId}
        detailDrawerVisible={detail.detailDrawerVisible}
        onCloseDetailDrawer={() => detail.setDetailDrawerVisible(false)}
        bookingWizardVisible={detail.bookingWizardVisible}
        onCloseBookingWizard={() => detail.setBookingWizardVisible(false)}
        bookingInitialCustomer={detail.bookingInitialCustomer}
        initialCampaignPromotionContext={detail.initialCampaignPromotionContext}
        onBookingSuccess={() => {
          detail.setBookingWizardVisible(false);
          void detail.fetchCampaignCustomers();
        }}
        smsModalVisible={detail.smsModalVisible}
        onCloseSmsModal={() => detail.setSmsModalVisible(false)}
        batchAllocationModalVisible={detail.batchAllocationModalVisible}
        onCancelBatchAllocation={() => detail.setBatchAllocationModalVisible(false)}
        onConfirmBatchAllocation={detail.handleBatchAllocate}
        allocating={detail.allocating}
        targetBookerId={detail.targetBookerId}
        onTargetBookerChange={detail.setTargetBookerId}
        bookerStaffList={detail.bookerStaffList}
        editCampaignModalVisible={detail.editCampaignModalVisible}
        onCancelEditModal={() => detail.setEditCampaignModalVisible(false)}
        onSubmitEditModal={detail.handleEditSubmit}
        editForm={detail.editForm}
        editingSubmitting={detail.editingSubmitting}
        editModalTab={detail.editModalTab}
        onEditModalTabChange={detail.setEditModalTab}
        staffList={detail.staffList}
        campaignFormOptionsLoading={detail.campaignFormOptionsLoading}
        campaignFormOptionsError={detail.campaignFormOptionsError}
        fixedFinalPriceCategories={detail.fixedFinalPriceCategories}
        fixedFinalPriceServices={detail.fixedFinalPriceServices}
        randomModalVisible={detail.randomModalVisible}
        onCancelRandomModal={() => detail.setRandomModalVisible(false)}
        onSubmitRandomSelect={detail.handleRandomSelect}
        randomLoading={detail.randomLoading}
        randomCount={detail.randomCount}
        onRandomCountChange={detail.setRandomCount}
        excludeAssigned={detail.excludeAssigned}
        onExcludeAssignedChange={detail.setExcludeAssigned}
        excludeUnconfirmedAllocation={detail.excludeUnconfirmedAllocation}
        onExcludeUnconfirmedAllocationChange={detail.setExcludeUnconfirmedAllocation}
        excludeFutureBooking={detail.excludeFutureBooking}
        onExcludeFutureBookingChange={detail.setExcludeFutureBooking}
        auditDrawerOpen={detail.auditDrawerOpen}
        onCloseAuditDrawer={() => {
          detail.setAuditDrawerOpen(false);
          detail.setAuditCustomer(null);
        }}
        auditCustomer={detail.auditCustomer}
        auditLogs={detail.auditLogs}
        auditLogsLoading={detail.auditLogsLoading}
        onRefreshAuditLogs={() => {
          if (detail.auditCustomer) {
            void detail.handleOpenAuditLogs(detail.auditCustomer);
          }
        }}
        historyRecoveryOpen={detail.historyRecoveryOpen}
        onCloseHistoryRecovery={() => detail.setHistoryRecoveryOpen(false)}
        excludedDrawerOpen={detail.excludedDrawerOpen}
        onCloseExcludedDrawer={() => detail.setExcludedDrawerOpen(false)}
        sharedPoolOverview={detail.sharedPoolOverview}
        onSharedPoolDataChanged={() => {
          void detail.fetchCampaignCustomers();
          void detail.fetchSharedPoolOverview();
        }}
        confirmRemovalState={detail.confirmRemovalState}
        removalSubmitting={detail.removalSubmitting}
        onConfirmRemoval={() => {
          void detail.handleConfirmRemoval();
        }}
        onCancelRemoval={detail.handleCancelRemoval}
      />
    </div>
  );
}
