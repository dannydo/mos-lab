'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Appointment, MissedSummaryStats } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import type { AppointmentTabKey } from './appointmentsPageConstants';

interface UseAppointmentsMissedSummaryOptions {
  activeTab: AppointmentTabKey;
  dateFromStr: string;
  dateToStr: string;
}

export function useAppointmentsMissedSummary({
  activeTab,
  dateFromStr,
  dateToStr,
}: UseAppointmentsMissedSummaryOptions) {
  const [missedReasonModalVisible, setMissedReasonModalVisible] = useState(false);
  const [selectedMissedAppointment, setSelectedMissedAppointment] = useState<Appointment | null>(null);
  const [missedSummary, setMissedSummary] = useState<MissedSummaryStats | null>(null);
  const [missedSummaryLoading, setMissedSummaryLoading] = useState(false);

  const fetchMissedSummary = useCallback(async () => {
    if (!dateFromStr || !dateToStr) return;
    setMissedSummaryLoading(true);
    try {
      const res = await apiClient.customers.getMissedSummary({ dateFrom: dateFromStr, dateTo: dateToStr });
      setMissedSummary(res);
    } catch {
      // ignore
    } finally {
      setMissedSummaryLoading(false);
    }
  }, [dateFromStr, dateToStr]);

  useEffect(() => {
    if (activeTab === 'missed' && dateFromStr && dateToStr) {
      fetchMissedSummary();
    }
  }, [activeTab, dateFromStr, dateToStr, fetchMissedSummary]);

  const openMissedReasonModal = useCallback((record: Appointment) => {
    setSelectedMissedAppointment(record);
    setMissedReasonModalVisible(true);
  }, []);

  const closeMissedReasonModal = useCallback(() => {
    setMissedReasonModalVisible(false);
    setSelectedMissedAppointment(null);
  }, []);

  return {
    missedReasonModalVisible,
    selectedMissedAppointment,
    missedSummary,
    missedSummaryLoading,
    fetchMissedSummary,
    openMissedReasonModal,
    closeMissedReasonModal,
  };
}
