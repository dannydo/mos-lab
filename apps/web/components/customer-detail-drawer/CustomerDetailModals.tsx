'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Button } from 'antd';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { AdaptiveModal } from '~/components/ui';
import type { RescheduleAlertState } from './types';

const RescheduleBookingModal = dynamic(
  () => import('../RescheduleBookingModal').then((m) => m.RescheduleBookingModal),
  { ssr: false }
);
const BookingWizardDrawer = dynamic(() => import('../BookingWizardDrawer'), { ssr: false });

const GemHistoryModal = dynamic(
  () => import('../customer-detail/components/GemHistoryModal').then((m) => m.GemHistoryModal),
  { ssr: false }
);
const ComboHistoryModal = dynamic(
  () => import('../customer-detail/components/ComboHistoryModal').then((m) => m.ComboHistoryModal),
  { ssr: false }
);
const EditCustomerModal = dynamic(
  () => import('../customer-detail/components/EditCustomerModal').then((m) => m.EditCustomerModal),
  { ssr: false }
);
const CreateNoteModal = dynamic(
  () => import('../customer-detail/components/CreateNoteModal').then((m) => m.CreateNoteModal),
  { ssr: false }
);
const TipHistoryModal = dynamic(
  () => import('../customer-detail/components/TipHistoryModal').then((m) => m.TipHistoryModal),
  { ssr: false }
);
const RevenueHistoryModal = dynamic(
  () => import('../customer-detail/components/RevenueHistoryModal').then((m) => m.RevenueHistoryModal),
  { ssr: false }
);

export interface CustomerDetailModalsProps {
  themeMode: 'light' | 'dark';
  customer: SafeAny;
  detailData: SafeAny;
  comboBalances: SafeAny[];
  editForm: SafeAny;
  rescheduleModalVisible: boolean;
  selectedBookingForReschedule: SafeAny;
  onCloseRescheduleModal: () => void;
  rescheduleAlert: RescheduleAlertState | null;
  onCloseRescheduleAlert: () => void;
  isGemModalOpen: boolean;
  onCloseGemModal: () => void;
  gemModalWidth: number;
  handleGemModalDragStart: (e: React.MouseEvent, direction: 'left' | 'right') => void;
  isTipModalOpen: boolean;
  onCloseTipModal: () => void;
  tipModalWidth: number;
  handleTipModalDragStart: (e: React.MouseEvent, direction: 'left' | 'right') => void;
  isRevenueModalOpen: boolean;
  onCloseRevenueModal: () => void;
  revenueModalWidth: number;
  handleRevenueModalDragStart: (e: React.MouseEvent, direction: 'left' | 'right') => void;
  isComboModalOpen: boolean;
  onCloseComboModal: () => void;
  modalWidth: number;
  handleModalDragStart: (e: React.MouseEvent, direction: 'left' | 'right') => void;
  isEditModalOpen: boolean;
  onCloseEditModal: () => void;
  onSaveEdit: () => void;
  saveLoading: boolean;
  isNoteModalOpen: boolean;
  onCloseNoteModal: () => void;
  bookingWizardOpen: boolean;
  onCloseBookingWizard: () => void;
  onRefreshAllDetails: () => Promise<void>;
}

export const CustomerDetailModals: React.FC<CustomerDetailModalsProps> = ({
  themeMode,
  customer,
  detailData,
  comboBalances,
  editForm,
  rescheduleModalVisible,
  selectedBookingForReschedule,
  onCloseRescheduleModal,
  rescheduleAlert,
  onCloseRescheduleAlert,
  isGemModalOpen,
  onCloseGemModal,
  gemModalWidth,
  handleGemModalDragStart,
  isTipModalOpen,
  onCloseTipModal,
  tipModalWidth,
  handleTipModalDragStart,
  isRevenueModalOpen,
  onCloseRevenueModal,
  revenueModalWidth,
  handleRevenueModalDragStart,
  isComboModalOpen,
  onCloseComboModal,
  modalWidth,
  handleModalDragStart,
  isEditModalOpen,
  onCloseEditModal,
  onSaveEdit,
  saveLoading,
  isNoteModalOpen,
  onCloseNoteModal,
  bookingWizardOpen,
  onCloseBookingWizard,
  onRefreshAllDetails,
}) => {
  const isDark = themeMode === 'dark';

  return (
    <>
      {rescheduleModalVisible && (
        <RescheduleBookingModal
          open={rescheduleModalVisible}
          booking={selectedBookingForReschedule}
          onClose={onCloseRescheduleModal}
          onSuccess={() => {
            void onRefreshAllDetails();
          }}
        />
      )}

      {rescheduleAlert?.open && (
        <AdaptiveModal
          intent="confirm"
          open={rescheduleAlert.open}
          onCancel={onCloseRescheduleAlert}
          title={
            <span className="inline-flex items-center gap-2 font-semibold">
              {rescheduleAlert.type === 'warning' ? (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-500" />
              )}
              <span>{rescheduleAlert.title}</span>
            </span>
          }
          footer={
            <Button type="primary" onClick={onCloseRescheduleAlert}>
              Đã hiểu
            </Button>
          }
          wrapClassName={isDark ? 'dark-theme' : 'light-theme'}
        >
          <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {rescheduleAlert.content}
          </p>
        </AdaptiveModal>
      )}

      {isGemModalOpen && (
        <GemHistoryModal
          open={isGemModalOpen}
          onCancel={onCloseGemModal}
          customer={customer}
          gemTransactions={detailData?.gemTransactions || []}
          gemModalWidth={gemModalWidth}
          handleGemModalDragStart={handleGemModalDragStart}
        />
      )}

      {isTipModalOpen && (
        <TipHistoryModal
          open={isTipModalOpen}
          onCancel={onCloseTipModal}
          customer={customer}
          tipTransactions={detailData?.tipTransactions || []}
          modalWidth={tipModalWidth}
          handleModalDragStart={handleTipModalDragStart}
        />
      )}

      {isRevenueModalOpen && (
        <RevenueHistoryModal
          open={isRevenueModalOpen}
          onCancel={onCloseRevenueModal}
          customer={customer}
          revenueTransactions={detailData?.revenueTransactions || []}
          modalWidth={revenueModalWidth}
          handleModalDragStart={handleRevenueModalDragStart}
        />
      )}

      {isComboModalOpen && (
        <ComboHistoryModal
          open={isComboModalOpen}
          onCancel={onCloseComboModal}
          customer={customer}
          comboBalances={detailData?.comboBalances || comboBalances}
          modalWidth={modalWidth}
          handleModalDragStart={handleModalDragStart}
        />
      )}

      {isEditModalOpen && (
        <EditCustomerModal
          open={isEditModalOpen}
          onCancel={onCloseEditModal}
          onOk={onSaveEdit}
          confirmLoading={saveLoading}
          form={editForm}
        />
      )}

      {isNoteModalOpen && (
        <CreateNoteModal
          open={isNoteModalOpen}
          customerId={customer ? customer.id : null}
          onCancel={onCloseNoteModal}
          onSuccess={() => {
            onCloseNoteModal();
            void onRefreshAllDetails();
          }}
        />
      )}

      {bookingWizardOpen && customer && (
        <BookingWizardDrawer
          open={bookingWizardOpen}
          onClose={onCloseBookingWizard}
          onSuccess={onCloseBookingWizard}
          initialCustomer={{
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            bucket: customer.bucket,
            lastVisit: customer.lastVisit,
            lastCompletedVisit: (customer as SafeAny)?.lastCompletedVisit || customer.lastVisit,
          }}
        />
      )}
    </>
  );
};
