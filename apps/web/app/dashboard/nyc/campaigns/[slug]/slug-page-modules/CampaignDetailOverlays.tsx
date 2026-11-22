'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { FormInstance } from 'antd';
import type {
  Campaign,
  CampaignSharedPoolLog,
  CustomerCampaignPromotionInfo,
  SharedPoolOverviewStats,
  Staff,
} from '@mos-lab/shared';
import { CampaignEditModal } from '~/components/campaign/CampaignEditModal';
import { SharedPoolAuditDrawer } from '~/components/campaign/SharedPoolAuditDrawer';
import { SharedPoolExcludedDrawer } from '~/components/campaign/SharedPoolExcludedDrawer';
import { SharedPoolHistoryRecoveryDrawer } from '~/components/campaign/SharedPoolHistoryRecoveryDrawer';
import { BatchAllocationModal, RandomSelectModal } from '~/components/campaign/modals/CampaignBatchModals';
import { AdaptiveModal } from '~/components/ui';
import type { FixedFinalPriceServiceCategory, FixedFinalPriceServiceOption } from '~/lib/campaign-fixed-price';
import type { CampaignEditFormValues, CampaignRemovalConfirmState } from './campaignDetailTypes';

const CustomerDetailDrawer = dynamic(() => import('~/components/CustomerDetailDrawer'), { ssr: false });
const BookingWizardDrawer = dynamic(() => import('~/components/BookingWizardDrawer'), { ssr: false });
const SMSModal = dynamic(() => import('~/components/sms/SMSModal').then((m) => m.SMSModal), { ssr: false });

export interface CampaignDetailOverlaysProps {
  campaign: Campaign;
  isAdmin: boolean;
  themeMode: 'light' | 'dark';
  selectedRowCount: number;
  selectedCustomer: any | null;
  selectedCustomerId: number | null;
  detailDrawerVisible: boolean;
  onCloseDetailDrawer: () => void;
  bookingWizardVisible: boolean;
  onCloseBookingWizard: () => void;
  bookingInitialCustomer: any | null;
  initialCampaignPromotionContext: CustomerCampaignPromotionInfo[];
  onBookingSuccess: () => void;
  smsModalVisible: boolean;
  onCloseSmsModal: () => void;
  batchAllocationModalVisible: boolean;
  onCancelBatchAllocation: () => void;
  onConfirmBatchAllocation: () => void;
  allocating: boolean;
  targetBookerId?: number;
  onTargetBookerChange: (val: number | undefined) => void;
  bookerStaffList: Staff[];
  editCampaignModalVisible: boolean;
  onCancelEditModal: () => void;
  onSubmitEditModal: (values: CampaignEditFormValues) => void;
  editForm: FormInstance;
  editingSubmitting: boolean;
  editModalTab: string;
  onEditModalTabChange: (tab: string) => void;
  staffList: Staff[];
  campaignFormOptionsLoading: boolean;
  campaignFormOptionsError: string | null;
  fixedFinalPriceCategories: FixedFinalPriceServiceCategory[];
  fixedFinalPriceServices: FixedFinalPriceServiceOption[];
  randomModalVisible: boolean;
  onCancelRandomModal: () => void;
  onSubmitRandomSelect: () => void;
  randomLoading: boolean;
  randomCount: number | '';
  onRandomCountChange: (val: number | '') => void;
  excludeAssigned: boolean;
  onExcludeAssignedChange: (checked: boolean) => void;
  excludeUnconfirmedAllocation: boolean;
  onExcludeUnconfirmedAllocationChange: (checked: boolean) => void;
  excludeFutureBooking: boolean;
  onExcludeFutureBookingChange: (checked: boolean) => void;
  auditDrawerOpen: boolean;
  onCloseAuditDrawer: () => void;
  auditCustomer: any | null;
  auditLogs: CampaignSharedPoolLog[];
  auditLogsLoading: boolean;
  onRefreshAuditLogs: () => void;
  historyRecoveryOpen: boolean;
  onCloseHistoryRecovery: () => void;
  excludedDrawerOpen: boolean;
  onCloseExcludedDrawer: () => void;
  sharedPoolOverview: SharedPoolOverviewStats | null;
  onSharedPoolDataChanged: () => void;
  confirmRemovalState: CampaignRemovalConfirmState;
  removalSubmitting: boolean;
  onConfirmRemoval: () => void;
  onCancelRemoval: () => void;
}

export function CampaignDetailOverlays({
  campaign,
  isAdmin,
  themeMode,
  selectedRowCount,
  selectedCustomer,
  selectedCustomerId,
  detailDrawerVisible,
  onCloseDetailDrawer,
  bookingWizardVisible,
  onCloseBookingWizard,
  bookingInitialCustomer,
  initialCampaignPromotionContext,
  onBookingSuccess,
  smsModalVisible,
  onCloseSmsModal,
  batchAllocationModalVisible,
  onCancelBatchAllocation,
  onConfirmBatchAllocation,
  allocating,
  targetBookerId,
  onTargetBookerChange,
  bookerStaffList,
  editCampaignModalVisible,
  onCancelEditModal,
  onSubmitEditModal,
  editForm,
  editingSubmitting,
  editModalTab,
  onEditModalTabChange,
  staffList,
  campaignFormOptionsLoading,
  campaignFormOptionsError,
  fixedFinalPriceCategories,
  fixedFinalPriceServices,
  randomModalVisible,
  onCancelRandomModal,
  onSubmitRandomSelect,
  randomLoading,
  randomCount,
  onRandomCountChange,
  excludeAssigned,
  onExcludeAssignedChange,
  excludeUnconfirmedAllocation,
  onExcludeUnconfirmedAllocationChange,
  excludeFutureBooking,
  onExcludeFutureBookingChange,
  auditDrawerOpen,
  onCloseAuditDrawer,
  auditCustomer,
  auditLogs,
  auditLogsLoading,
  onRefreshAuditLogs,
  historyRecoveryOpen,
  onCloseHistoryRecovery,
  excludedDrawerOpen,
  onCloseExcludedDrawer,
  sharedPoolOverview,
  onSharedPoolDataChanged,
  confirmRemovalState,
  removalSubmitting,
  onConfirmRemoval,
  onCancelRemoval,
}: CampaignDetailOverlaysProps) {
  return (
    <>
      <BatchAllocationModal
        open={batchAllocationModalVisible}
        onCancel={onCancelBatchAllocation}
        onOk={onConfirmBatchAllocation}
        confirmLoading={allocating}
        selectedCount={selectedRowCount}
        targetBookerId={targetBookerId}
        onTargetBookerChange={onTargetBookerChange}
        bookerStaffList={bookerStaffList}
      />

      <CustomerDetailDrawer open={detailDrawerVisible} customerId={selectedCustomerId} onClose={onCloseDetailDrawer} />

      <BookingWizardDrawer
        open={bookingWizardVisible}
        onClose={onCloseBookingWizard}
        initialCustomer={bookingInitialCustomer}
        initialCampaignPromotions={initialCampaignPromotionContext}
        onSuccess={onBookingSuccess}
      />

      <SMSModal open={smsModalVisible} onClose={onCloseSmsModal} customer={selectedCustomer} />

      <CampaignEditModal
        open={editCampaignModalVisible}
        onCancel={onCancelEditModal}
        onSubmit={onSubmitEditModal}
        form={editForm}
        campaign={campaign}
        submitting={editingSubmitting}
        activeTab={editModalTab}
        onTabChange={onEditModalTabChange}
        staffList={staffList}
        campaignFormOptionsLoading={campaignFormOptionsLoading}
        campaignFormOptionsError={campaignFormOptionsError}
        fixedFinalPriceCategories={fixedFinalPriceCategories}
        fixedFinalPriceServices={fixedFinalPriceServices}
      />

      <RandomSelectModal
        open={randomModalVisible}
        onCancel={onCancelRandomModal}
        onSubmit={onSubmitRandomSelect}
        loading={randomLoading}
        randomCount={randomCount}
        onRandomCountChange={onRandomCountChange}
        excludeAssigned={excludeAssigned}
        onExcludeAssignedChange={onExcludeAssignedChange}
        excludeUnconfirmedAllocation={excludeUnconfirmedAllocation}
        onExcludeUnconfirmedAllocationChange={onExcludeUnconfirmedAllocationChange}
        excludeFutureBooking={excludeFutureBooking}
        onExcludeFutureBookingChange={onExcludeFutureBookingChange}
        themeMode={themeMode}
      />

      <SharedPoolAuditDrawer
        open={auditDrawerOpen}
        onClose={onCloseAuditDrawer}
        customer={auditCustomer}
        logs={auditLogs}
        loading={auditLogsLoading}
        onRefresh={onRefreshAuditLogs}
      />

      <SharedPoolHistoryRecoveryDrawer
        open={historyRecoveryOpen}
        onClose={onCloseHistoryRecovery}
        campaignId={campaign.id || 0}
        isAdmin={isAdmin}
        onDataChanged={onSharedPoolDataChanged}
      />

      <SharedPoolExcludedDrawer
        open={excludedDrawerOpen}
        onClose={onCloseExcludedDrawer}
        campaignId={campaign.id || 0}
        totalBatches={sharedPoolOverview?.totalBatches}
        activeBatchNumber={sharedPoolOverview?.activeBatchNumber}
        isAdmin={isAdmin}
        onDataChanged={onSharedPoolDataChanged}
      />

      <AdaptiveModal
        intent="confirm"
        open={Boolean(confirmRemovalState)}
        title={confirmRemovalState?.mode === 'batch' ? 'Xóa hàng loạt khỏi chiến dịch' : 'Xóa khỏi chiến dịch'}
        okText={confirmRemovalState?.mode === 'batch' ? `Xóa ${confirmRemovalState.count} khách hàng` : 'Xóa'}
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        confirmLoading={removalSubmitting}
        onOk={onConfirmRemoval}
        onCancel={onCancelRemoval}
      >
        <p className="m-0 text-sm text-slate-700 dark:text-slate-300">
          {confirmRemovalState?.mode === 'batch'
            ? `Bạn có chắc chắn muốn xóa ${confirmRemovalState.count} khách hàng đã chọn khỏi chiến dịch này và thu hồi phân bổ Booker?`
            : confirmRemovalState
              ? `Bạn có chắc chắn muốn xóa khách hàng "${confirmRemovalState.customerName}" khỏi chiến dịch này và trả về Pool NYC?`
              : ''}
        </p>
      </AdaptiveModal>
    </>
  );
}
