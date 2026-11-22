'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Form } from 'antd';
import { isAdminOrSuperAdminRole, shouldMaskCustomerPhone } from '@mos-lab/shared';
import { useTheme } from '~/context/ThemeContext';
import { useOmiCall } from '~/context/OmiCallContext';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';
import { BOOKING_HISTORY_UPDATED_EVENT, type BookingMutationEventDetail } from '~/lib/booking-events';
import { apiClient } from '~/lib/api-client';
import { useCustomerDetail } from '../customer-detail/hooks/useCustomerDetail';
import {
  buildLegacyProfileUrl,
  getActiveCustomerPhone,
  getStoredCurrentUser,
  getStoredCustomerDetailTab,
  persistCustomerDetailTab,
} from './customerDetailDrawerHelpers';
import type { CustomerDetailDrawerProps, RescheduleAlertState } from './types';

export function useCustomerDetailDrawerState({
  open,
  customerId,
  onClose,
  onDeleteSuccess,
  onUpdate,
}: Pick<CustomerDetailDrawerProps, 'open' | 'customerId' | 'onClose' | 'onDeleteSuccess' | 'onUpdate'>) {
  const { themeMode } = useTheme();
  const { makeCall, canAccessOmiCall, isAdmin, adminOmiCallEnabled } = useOmiCall();
  const canMakeCall = canAccessOmiCall && (!isAdmin || adminOmiCallEnabled);
  const responsiveTier = useResponsiveTier();
  const isCompactTier = responsiveTier === 'mobile' || responsiveTier === 'tablet';

  const [currentCustomerId, setCurrentCustomerId] = useState<number | null>(customerId);
  useEffect(() => {
    setCurrentCustomerId(customerId);
  }, [customerId]);

  const [editForm] = Form.useForm();

  const detail = useCustomerDetail({
    open,
    customerId: currentCustomerId,
    onClose,
    onDeleteSuccess,
    onUpdate,
    editForm,
  });

  const {
    tabDataMap,
    handleTabChange: hookTabChange,
    bookings,
    customer,
    setRescheduleModalVisible,
    setSelectedBookingForReschedule,
    refreshBookingHistory,
  } = detail;

  const currentUser = useMemo(() => getStoredCurrentUser(), []);

  const isManagerOrAdmin = useMemo(() => {
    const role = currentUser?.role?.toLowerCase();
    return isAdminOrSuperAdminRole(role) || role === 'manager';
  }, [currentUser]);

  const isMaskedRole = useMemo(() => shouldMaskCustomerPhone(currentUser?.role), [currentUser]);

  const [rescheduleAlert, setRescheduleAlert] = useState<RescheduleAlertState | null>(null);

  const closeRescheduleAlert = useCallback(() => {
    setRescheduleAlert(null);
  }, []);

  const handleRescheduleRequest = useCallback(
    async (booking: SafeAny) => {
      const orderId = Number(booking?.id);
      if (!Number.isInteger(orderId) || orderId <= 0) {
        setRescheduleAlert({
          open: true,
          type: 'error',
          title: 'Không thể dời lịch',
          content: 'Lịch hẹn không hợp lệ. Vui lòng tải lại thông tin khách hàng và thử lại.',
        });
        return;
      }

      try {
        const eligibility = await apiClient.customers.getRescheduleEligibility(orderId);
        if (!eligibility.allowed) {
          setRescheduleAlert({
            open: true,
            type: 'warning',
            title: 'Không thể dời lịch',
            content: eligibility.message,
          });
          return;
        }

        setSelectedBookingForReschedule({
          ...booking,
          customerName: customer?.name || 'Khách Hàng',
          customerPhone: customer?.phone || '',
          customerId: customer?.id,
        });
        setRescheduleModalVisible(true);
      } catch (err) {
        setRescheduleAlert({
          open: true,
          type: 'error',
          title: 'Không thể kiểm tra quyền dời lịch',
          content: (err as SafeAny).response?.data?.message || 'Vui lòng tải lại trang hoặc thử lại sau.',
        });
      }
    },
    [customer, setRescheduleModalVisible, setSelectedBookingForReschedule]
  );

  const [activeTabKey, setActiveTabKey] = useState<string>('bookings');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const hookTabChangeRef = useRef(hookTabChange);
  hookTabChangeRef.current = hookTabChange;

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current && typeof window !== 'undefined') {
      const saved = getStoredCustomerDetailTab();
      setActiveTabKey(saved);
      if (saved !== 'bookings') {
        hookTabChangeRef.current?.(saved);
      }
    }
    prevOpenRef.current = open;
  }, [open]);

  const handleTabChange = useCallback(
    (key: string) => {
      setActiveTabKey(key);
      hookTabChange?.(key);
      persistCustomerDetailTab(key);
    },
    [hookTabChange]
  );

  const returnToBookingHistory = useCallback(() => {
    setActiveTabKey('bookings');
    persistCustomerDetailTab('bookings');
    void refreshBookingHistory?.();
  }, [refreshBookingHistory]);

  useEffect(() => {
    const handleBookingHistoryUpdated = (event: Event) => {
      const detailEvent = (event as CustomEvent<BookingMutationEventDetail>).detail;
      if (!open || !customerId || detailEvent?.customerId !== customerId) return;
      returnToBookingHistory();
    };

    window.addEventListener(BOOKING_HISTORY_UPDATED_EVENT, handleBookingHistoryUpdated);
    return () => window.removeEventListener(BOOKING_HISTORY_UPDATED_EVENT, handleBookingHistoryUpdated);
  }, [customerId, open, returnToBookingHistory]);

  const activePhone = useMemo(() => getActiveCustomerPhone(customer), [customer]);
  const legacyProfileUrl = useMemo(() => buildLegacyProfileUrl(customer, activePhone), [customer, activePhone]);
  const activeBookings = useMemo(() => tabDataMap?.['bookings']?.items || bookings || [], [tabDataMap, bookings]);

  return {
    ...detail,
    editForm,
    themeMode,
    makeCall,
    canMakeCall,
    responsiveTier,
    isCompactTier,
    setCurrentCustomerId,
    currentUser,
    isManagerOrAdmin,
    isMaskedRole,
    activeTabKey,
    handleTabChange,
    isNoteModalOpen,
    setIsNoteModalOpen,
    rescheduleAlert,
    closeRescheduleAlert,
    handleRescheduleRequest,
    legacyProfileUrl,
    activeBookings,
  };
}
