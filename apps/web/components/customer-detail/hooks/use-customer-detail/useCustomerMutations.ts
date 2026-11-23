'use client';

import type { RefObject } from 'react';
import { useState } from 'react';
import dayjs from 'dayjs';
import { apiClient } from '../../../../lib/api-client';
import type { UseCustomerDetailProps } from './types';

interface UseCustomerMutationsParams {
  customerId: number | null;
  customer: SafeAny;
  editForm: SafeAny;
  optionsRef: RefObject<UseCustomerDetailProps>;
  refreshAllDetails: () => Promise<void>;
}

function dispatchCustomerMutationEvents(detailType: string, includeBookingEvent = false) {
  if (includeBookingEvent) {
    window.dispatchEvent(new CustomEvent('mos-booking-updated'));
  }
  window.dispatchEvent(new CustomEvent('mos-customer-updated'));
  window.dispatchEvent(new CustomEvent('mos-data-updated', { detail: { type: detailType } }));
}

export function useCustomerMutations({
  customerId,
  customer,
  editForm,
  optionsRef,
  refreshAllDetails,
}: UseCustomerMutationsParams) {
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [unpinLoading, setUnpinLoading] = useState(false);

  const handleOpenEditModal = () => {
    if (!customer) return;
    editForm.setFieldsValue({
      name: customer.name,
      email: customer.email,
      gender: customer.gender,
      isForeign: Boolean(customer.isForeign),
      dob: customer.dob ? dayjs(customer.dob) : null,
      phones:
        customer.phones && customer.phones.length > 0
          ? customer.phones.map((p: SafeAny) => ({ id: p.id, phone_number: p.phone_number, is_active: !p.is_disabled }))
          : [{ phone_number: customer.phone, is_active: true }],
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      const values = await editForm.validateFields();
      setSaveLoading(true);

      const originalPhones = customer.phones || [];
      const currentPhones = values.phones || [];
      const phonesPayload = [];

      for (const orig of originalPhones) {
        const isStillHere = currentPhones.some((curr: SafeAny) => curr.id === orig.id);
        if (!isStillHere) {
          phonesPayload.push({
            id: orig.id,
            phone_number: orig.phone_number,
            is_deleted: true,
          });
        }
      }

      for (const curr of currentPhones) {
        phonesPayload.push({
          id: curr.id,
          phone_number: curr.phone_number,
          is_disabled: !curr.is_active,
        });
      }

      const targetId = Number(customer?.legacyUserId || customer?.id || customerId);
      await apiClient.customers.update(targetId, {
        name: values.name,
        email: values.email || null,
        gender: values.gender || null,
        isForeign: values.isForeign,
        dob: values.dob ? values.dob.format('YYYY-MM-DD') : null,
        phones: phonesPayload,
      });

      optionsRef.current?.onSuccess?.('Cập nhật thông tin khách hàng thành công!');
      setIsEditModalOpen(false);
      dispatchCustomerMutationEvents('customer-edit');
      await refreshAllDetails();
    } catch (err) {
      console.error('Update customer failed:', err);
      optionsRef.current?.onError?.(
        (err as SafeAny).response?.data?.message || 'Không thể cập nhật thông tin khách hàng.'
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const handleToggleForeign = async () => {
    if (!customerId || !customer) return;
    try {
      setSaveLoading(true);
      const newStatus = !customer.isForeign;
      const targetId = Number(customer?.legacyUserId || customer?.id || customerId);
      await apiClient.customers.update(targetId, {
        name: customer.name,
        email: customer.email || null,
        gender: customer.gender || null,
        isForeign: newStatus,
        dob: customer.dob ? dayjs(customer.dob).format('YYYY-MM-DD') : null,
        phones: (customer.phones || []).map((p: SafeAny) => ({
          id: p.id,
          phone_number: p.phone_number,
          is_disabled: Boolean(p.is_disabled),
        })),
      });

      optionsRef.current?.onSuccess?.(
        newStatus ? 'Đã đổi thành Khách nước ngoài 🌐' : 'Đã đổi thành Khách Việt Nam 🇻🇳'
      );
      dispatchCustomerMutationEvents('customer-edit');
      await refreshAllDetails();
    } catch (err) {
      console.error('Toggle foreign status failed:', err);
      optionsRef.current?.onError?.('Không thể đổi trạng thái quốc tịch khách hàng.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerId) return;
    setDeleteLoading(true);
    try {
      await apiClient.customers.delete(customerId);
      optionsRef.current?.onSuccess?.('Xóa khách hàng thành công!');
      dispatchCustomerMutationEvents('customer-delete');
      optionsRef.current?.onDeleteSuccess?.();
    } catch (err) {
      console.error('Delete customer error:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Không thể xóa khách hàng.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRestoreCustomer = async () => {
    if (!customerId) return;
    setRestoreLoading(true);
    try {
      await apiClient.customers.restore(customerId);
      optionsRef.current?.onSuccess?.('Khôi phục khách hàng thành công!');
      dispatchCustomerMutationEvents('customer-restore');
      optionsRef.current?.onDeleteSuccess?.();
    } catch (err) {
      console.error('Restore customer error:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Không thể khôi phục khách hàng.');
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleCancelBooking = async (orderId: number) => {
    try {
      await apiClient.customers.deleteBooking(orderId);
      optionsRef.current?.onSuccess?.('Hủy lịch hẹn thành công!');
      dispatchCustomerMutationEvents('cancel-booking', true);
      await refreshAllDetails();
    } catch (err) {
      console.error('[Cancel] Failed to cancel booking:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Có lỗi xảy ra khi hủy lịch hẹn.');
    }
  };

  const handleUnpinNote = async (noteId: number) => {
    if (!customerId) return;
    setUnpinLoading(true);
    try {
      const res = await apiClient.customers.unpinNote(customerId, noteId);
      optionsRef.current?.onSuccess?.(res.message || 'Bỏ ghim ghi chú thành công!');
      dispatchCustomerMutationEvents('unpin-note');
      await refreshAllDetails();
    } catch (err) {
      console.error('Failed to unpin note:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Không thể bỏ ghim ghi chú.');
    } finally {
      setUnpinLoading(false);
    }
  };

  const handlePinToggle = async (noteId: number, currentSticky: boolean) => {
    if (!customerId) return;
    setUnpinLoading(true);
    try {
      if (currentSticky) {
        const res = await apiClient.customers.unpinNote(customerId, noteId);
        optionsRef.current?.onSuccess?.(res.message || 'Bỏ ghim ghi chú thành công!');
      } else {
        const res = await apiClient.customers.pinNote(customerId, noteId);
        optionsRef.current?.onSuccess?.(res.message || 'Ghim ghi chú thành công!');
      }
      await refreshAllDetails();
    } catch (err) {
      console.error('Failed to toggle pin state:', err);
      optionsRef.current?.onError?.(
        (err as SafeAny).response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái ghim.'
      );
    } finally {
      setUnpinLoading(false);
    }
  };

  return {
    deleteLoading,
    isEditModalOpen,
    setIsEditModalOpen,
    saveLoading,
    restoreLoading,
    unpinLoading,
    handleOpenEditModal,
    handleSaveEdit,
    handleToggleForeign,
    handleDeleteCustomer,
    handleRestoreCustomer,
    handleCancelBooking,
    handleUnpinNote,
    handlePinToggle,
  };
}
