'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import type { CustomerWeeklyProgress } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { useOmiCall } from '~/context/OmiCallContext';
import type { PlansSuggestionsState } from './plansPageTypes';
import {
  INITIAL_SUGGESTIONS_STATE,
  buildWeekDays,
  extractApiErrorMessage,
  formatWeekRangeString,
  getMondayOfWeek,
  shiftWeekByDays,
} from './plansPageUtils';

/**
 * Manages weekly call plan grid state, suggestion drawer loading, and call/confirmation actions.
 */
export function usePlansPage() {
  const [loading, setLoading] = useState(false);
  const [weeklyProgress, setWeeklyProgress] = useState<CustomerWeeklyProgress[]>([]);
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() => getMondayOfWeek());
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [suggests, setSuggests] = useState<PlansSuggestionsState>(INITIAL_SUGGESTIONS_STATE);
  const [suggestsLoading, setSuggestsLoading] = useState(false);

  const { openCallLogModal } = useOmiCall();

  const weekDays = useMemo(() => buildWeekDays(currentWeekMonday), [currentWeekMonday]);
  const weekRangeLabel = useMemo(() => formatWeekRangeString(currentWeekMonday), [currentWeekMonday]);

  const fetchWeeklyPlans = useCallback(async () => {
    setLoading(true);
    try {
      const weekStartStr = currentWeekMonday.toISOString().split('T')[0];
      const data = await apiClient.plans.getWeekly({ weekStart: weekStartStr });
      setWeeklyProgress(data);
    } catch (error) {
      console.error('Fetch weekly plans error:', error);
      message.error('Không thể tải kế hoạch tuần.');
    } finally {
      setLoading(false);
    }
  }, [currentWeekMonday]);

  const fetchSuggestions = useCallback(async () => {
    setSuggestsLoading(true);
    try {
      const data = (await apiClient.plans.getSuggestions()) as PlansSuggestionsState;
      setSuggests(data ?? INITIAL_SUGGESTIONS_STATE);
    } catch (error) {
      console.error('Fetch suggestions error:', error);
    } finally {
      setSuggestsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeeklyPlans();
  }, [fetchWeeklyPlans]);

  useEffect(() => {
    const handleLogSaved = () => {
      fetchWeeklyPlans();
    };
    window.addEventListener('mos-data-updated', handleLogSaved);
    window.addEventListener('mos-call-log-saved', handleLogSaved);
    window.addEventListener('mos-customer-updated', handleLogSaved);
    window.addEventListener('mos-booking-updated', handleLogSaved);
    return () => {
      window.removeEventListener('mos-data-updated', handleLogSaved);
      window.removeEventListener('mos-call-log-saved', handleLogSaved);
      window.removeEventListener('mos-customer-updated', handleLogSaved);
      window.removeEventListener('mos-booking-updated', handleLogSaved);
    };
  }, [fetchWeeklyPlans]);

  const handlePrevWeek = useCallback(() => {
    setCurrentWeekMonday((prev) => shiftWeekByDays(prev, -7));
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentWeekMonday((prev) => shiftWeekByDays(prev, 7));
  }, []);

  const handleCurrentWeek = useCallback(() => {
    setCurrentWeekMonday(getMondayOfWeek());
  }, []);

  const addToPlan = useCallback(
    async (customerId: number, planDate?: Date) => {
      const targetDate = planDate || new Date();
      try {
        await apiClient.plans.create({
          legacyUserId: customerId,
          date: targetDate.toISOString().split('T')[0],
        });
        message.success('Đã thêm khách hàng vào kế hoạch gọi!');
        fetchWeeklyPlans();
        fetchSuggestions();
      } catch (error) {
        console.error('Add to plan error:', error);
        message.error(extractApiErrorMessage(error, 'Không thể thêm khách hàng.'));
      }
    },
    [fetchSuggestions, fetchWeeklyPlans]
  );

  const handleConfirmToggle = useCallback(
    async (planId: number, checked: boolean) => {
      try {
        await apiClient.plans.confirm(planId, {
          isConfirmed: checked,
        });
        message.success(checked ? 'Đã chốt đặt lịch hẹn thành công!' : 'Đã hủy trạng thái đặt lịch.');
        fetchWeeklyPlans();
      } catch (error) {
        console.error('Toggle confirm error:', error);
        message.error('Không thể cập nhật trạng thái chốt.');
      }
    },
    [fetchWeeklyPlans]
  );

  const openCallLog = useCallback(
    (record: CustomerWeeklyProgress, _dayDate: Date) => {
      openCallLogModal({
        legacyUserId: record.customer.id,
        customerName: record.customer.name,
        planId: record.planId,
      });
    },
    [openCallLogModal]
  );

  const openSuggestionsDrawer = useCallback(() => {
    setDrawerVisible(true);
    fetchSuggestions();
  }, [fetchSuggestions]);

  const closeSuggestionsDrawer = useCallback(() => {
    setDrawerVisible(false);
  }, []);

  return {
    loading,
    weeklyProgress,
    weekDays,
    weekRangeLabel,
    drawerVisible,
    suggests,
    suggestsLoading,
    handlePrevWeek,
    handleNextWeek,
    handleCurrentWeek,
    addToPlan,
    handleConfirmToggle,
    openCallLog,
    openSuggestionsDrawer,
    closeSuggestionsDrawer,
  };
}
