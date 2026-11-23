'use client';

import { useState, useCallback, type Dispatch, type RefObject, type SetStateAction } from 'react';
import dayjs from 'dayjs';
import type { Customer, Staff, TouchpointStatus } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import type { UseLocaDataOptions } from './types';

export interface UseLocaCustomerActionsParams {
  currentUser: Staff | null;
  optionsRef: RefObject<UseLocaDataOptions | undefined>;
  setCustomers: Dispatch<SetStateAction<Customer[]>>;
  setDailyPlanList: Dispatch<SetStateAction<number[]>>;
  fetchCustomerList: () => Promise<void>;
  fetchOverallStats: () => Promise<void>;
}

export function useLocaCustomerActions({
  currentUser,
  optionsRef,
  setCustomers,
  setDailyPlanList,
  fetchCustomerList,
  fetchOverallStats,
}: UseLocaCustomerActionsParams) {
  const [addingIds, setAddingIds] = useState<number[]>([]);

  const handleAddToPlan = async (customerId: number) => {
    if (addingIds.includes(customerId)) return;
    setAddingIds((prev) => [...prev, customerId]);
    try {
      await apiClient.plans.create({
        legacyUserId: customerId,
        date: dayjs().format('YYYY-MM-DD'),
      });
      optionsRef.current?.onSuccess?.('Đã thêm khách hàng vào kế hoạch gọi hôm nay!');
      setDailyPlanList((prev) => [...prev, customerId]);
    } catch (err) {
      console.error('Failed to add to call plan:', err);
      if ((err as SafeAny).response?.status === 409) {
        optionsRef.current?.onWarning?.(
          (err as SafeAny).response?.data?.message || 'Khách hàng này đã có trong kế hoạch gọi.'
        );
        setDailyPlanList((prev) => [...prev, customerId]);
      } else {
        optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Không thể thêm khách hàng.');
      }
    } finally {
      setAddingIds((prev) => prev.filter((id) => id !== customerId));
    }
  };

  const handleAssignTelesales = async (customerIds: number[], staffId: number) => {
    try {
      await apiClient.customers.assign({
        customerIds,
        staffId,
      });
      optionsRef.current?.onSuccess?.('Phân bổ Telesales thành công!');
      fetchCustomerList();
      fetchOverallStats();
    } catch (err) {
      console.error('Failed to assign staff:', err);
      optionsRef.current?.onError?.('Lỗi khi phân bổ nhân viên chăm sóc.');
    }
  };

  const handleToggleTouchpoint = useCallback(
    async (
      customerId: number,
      touchpointKey: string,
      isChecked: boolean,
      note?: string,
      status?: TouchpointStatus | null,
      _hasReferredDiamond?: boolean,
      callbackDate?: string
    ) => {
      // 1. Optimistically update local customer state
      setCustomers((prevCustomers) =>
        prevCustomers.map((cust) => {
          if (cust.id === customerId) {
            const currentTps = cust.touchpoints || {};
            const staffName = currentUser?.displayName || currentUser?.username || 'Staff';
            return {
              ...cust,
              callbackDate: callbackDate || cust.callbackDate,
              touchpoints: {
                ...currentTps,
                [touchpointKey]: {
                  isChecked,
                  status: status !== undefined ? status : isChecked ? 'SUCCESS' : null,
                  checkedAt: isChecked ? new Date().toISOString() : currentTps[touchpointKey]?.checkedAt || null,
                  checkedByStaffId: isChecked
                    ? currentUser?.id || null
                    : currentTps[touchpointKey]?.checkedByStaffId || null,
                  checkedByStaffName: isChecked ? staffName : currentTps[touchpointKey]?.checkedByStaffName || null,
                  note: note !== undefined ? note : currentTps[touchpointKey]?.note || null,
                },
              },
            };
          }
          return cust;
        })
      );

      // 2. Call API endpoint
      try {
        await apiClient.customers.toggleTouchpoint({
          customerId,
          touchpointKey,
          isChecked,
          status,
          note,
          callbackDate,
        });
      } catch (err) {
        console.error('Failed to toggle touchpoint:', err);
        optionsRef.current?.onError?.('Không thể lưu trạng thái Chạm. Vui lòng thử lại.');
        fetchCustomerList();
      }
    },
    [currentUser, fetchCustomerList, optionsRef, setCustomers]
  );

  return {
    addingIds,
    handleAddToPlan,
    handleAssignTelesales,
    handleToggleTouchpoint,
  };
}
