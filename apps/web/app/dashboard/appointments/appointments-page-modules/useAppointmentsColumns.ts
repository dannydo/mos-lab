'use client';

import { useMemo } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { Appointment } from '@mos-lab/shared';
import { formatVND } from '~/lib/format-utils';
import { getCompletedColumns, getMissedColumns, getPendingColumns } from '../components/AppointmentColumns';
import {
  buildAppointmentTableColumns,
  type AppointmentColumnConfigMap,
  type AppointmentTabKey,
} from './appointmentsPageConstants';

interface UseAppointmentsColumnsOptions {
  activeTab: AppointmentTabKey;
  themeMode: 'light' | 'dark';
  token: SafeAny;
  columnConfig: AppointmentColumnConfigMap;
  saveColumnConfig: (nextConfig: AppointmentColumnConfigMap) => void;
  openDetailModal: (customerId: number) => void;
  makeCall: (phone: string, name: string, id: number, avatar?: string) => void;
  setSelectedBookingForReschedule: (booking: SafeAny) => void;
  setRescheduleModalVisible: (visible: boolean) => void;
  handleCancelBooking: (orderId: number) => void;
  setBookingInitialCustomer: (customer: SafeAny) => void;
  setBookingWizardVisible: (visible: boolean) => void;
  onOpenMissedReasonModal: (record: Appointment) => void;
}

export function useAppointmentsColumns({
  activeTab,
  themeMode,
  token,
  columnConfig,
  saveColumnConfig,
  openDetailModal,
  makeCall,
  setSelectedBookingForReschedule,
  setRescheduleModalVisible,
  handleCancelBooking,
  setBookingInitialCustomer,
  setBookingWizardVisible,
  onOpenMissedReasonModal,
}: UseAppointmentsColumnsOptions) {
  const pendingColumns = useMemo(
    () =>
      getPendingColumns({
        themeMode,
        token,
        formatVND,
        openDetailModal,
        makeCall,
        setSelectedBookingForReschedule,
        setRescheduleModalVisible,
        handleCancelBooking,
      }),
    [
      themeMode,
      token,
      openDetailModal,
      makeCall,
      setSelectedBookingForReschedule,
      setRescheduleModalVisible,
      handleCancelBooking,
    ]
  );

  const missedColumns = useMemo(
    () =>
      getMissedColumns({
        themeMode,
        token,
        formatVND,
        openDetailModal,
        makeCall,
        setBookingInitialCustomer,
        setBookingWizardVisible,
        onOpenMissedReasonModal,
      }),
    [
      themeMode,
      token,
      openDetailModal,
      makeCall,
      setBookingInitialCustomer,
      setBookingWizardVisible,
      onOpenMissedReasonModal,
    ]
  );

  const completedColumns = useMemo(
    () =>
      getCompletedColumns({
        themeMode,
        token,
        formatVND,
        openDetailModal,
        makeCall,
      }),
    [themeMode, token, openDetailModal, makeCall]
  );

  const baseColumns =
    activeTab === 'completed' ? completedColumns : activeTab === 'missed' ? missedColumns : pendingColumns;

  const columns = useMemo<ColumnsType<Appointment>>(
    () => buildAppointmentTableColumns(baseColumns, columnConfig, saveColumnConfig),
    [baseColumns, columnConfig, saveColumnConfig]
  );

  const totalWidth = useMemo(() => columns.reduce((sum, col) => sum + (Number(col.width) || 120), 0), [columns]);

  return { columns, totalWidth };
}
