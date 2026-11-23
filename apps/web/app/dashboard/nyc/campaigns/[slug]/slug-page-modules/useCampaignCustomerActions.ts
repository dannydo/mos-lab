'use client';

import type React from 'react';
import { useCallback, useState } from 'react';
import { message } from 'antd';
import type { Campaign, CampaignBookingStatusFilter, CampaignStatsResponse, TouchpointStatus } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import type { CampaignDetailUser, CampaignRemovalConfirmState } from './campaignDetailTypes';
import { filterRandomSelectionCandidates, getCampaignCustomerKey, pickRandomCandidates } from './campaignDetailUtils';

export interface UseCampaignCustomerActionsParams {
  campaign: Campaign | null;
  currentUser: CampaignDetailUser | null;
  selectedBookerId: string;
  selectedTouchpointKey: string;
  searchQuery: string;
  bookingStatusFilter: CampaignBookingStatusFilter;
  selectedRowKeys: React.Key[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<React.Key[]>>;
  setSelectedCustomersByKey: React.Dispatch<React.SetStateAction<Map<React.Key, any>>>;
  setCustomers: React.Dispatch<React.SetStateAction<any[]>>;
  setStats: React.Dispatch<React.SetStateAction<CampaignStatsResponse | null>>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  fetchCampaignCustomers: (isBackground?: boolean) => Promise<void>;
}

export function useCampaignCustomerActions({
  campaign,
  currentUser,
  selectedBookerId,
  selectedTouchpointKey,
  searchQuery,
  bookingStatusFilter,
  selectedRowKeys,
  setSelectedRowKeys,
  setSelectedCustomersByKey,
  setCustomers,
  setStats,
  setCurrentPage,
  fetchCampaignCustomers,
}: UseCampaignCustomerActionsParams) {
  const [randomModalVisible, setRandomModalVisible] = useState<boolean>(false);
  const [randomCount, setRandomCount] = useState<number | ''>(20);
  const [randomLoading, setRandomLoading] = useState<boolean>(false);
  const [excludeAssigned, setExcludeAssigned] = useState<boolean>(true);
  const [excludeUnconfirmedAllocation, setExcludeUnconfirmedAllocation] = useState<boolean>(true);
  const [excludeFutureBooking, setExcludeFutureBooking] = useState<boolean>(true);
  const [showSelectedOnly, setShowSelectedOnly] = useState<boolean>(false);

  const [batchAllocationModalVisible, setBatchAllocationModalVisible] = useState<boolean>(false);
  const [targetBookerId, setTargetBookerId] = useState<number | undefined>(undefined);
  const [allocating, setAllocating] = useState<boolean>(false);

  const [confirmRemovalState, setConfirmRemovalState] = useState<CampaignRemovalConfirmState>(null);
  const [removalSubmitting, setRemovalSubmitting] = useState<boolean>(false);

  const handleToggleTouchpoint = useCallback(
    async (
      customerId: number,
      touchpointId: number,
      isChecked: boolean,
      note?: string,
      status?: TouchpointStatus | null,
      callbackDate?: string
    ) => {
      const campId = campaign?.id;
      if (!campId) return;
      const staffName = currentUser?.displayName || currentUser?.username || 'Staff';

      setCustomers((prevCustomers) =>
        prevCustomers.map((cust: any) => {
          const cId = cust.legacyUserId || cust.id;
          if (cId === customerId || cust.id === customerId) {
            const logs = cust.touchpointLogs || [];
            const existingIdx = logs.findIndex((l: any) => l.touchpointId === touchpointId);
            let newLogs;
            if (existingIdx >= 0) {
              newLogs = [...logs];
              newLogs[existingIdx] = {
                ...newLogs[existingIdx],
                isChecked,
                status: status !== undefined ? status : isChecked ? 'SUCCESS' : null,
                completedAt: isChecked ? new Date().toISOString() : newLogs[existingIdx].completedAt,
                completedByStaffName: isChecked ? staffName : newLogs[existingIdx].completedByStaffName,
                note: note !== undefined ? note : newLogs[existingIdx].note,
              };
            } else {
              newLogs = [
                ...logs,
                {
                  touchpointId,
                  isChecked,
                  status: status !== undefined ? status : isChecked ? 'SUCCESS' : null,
                  completedAt: isChecked ? new Date().toISOString() : null,
                  completedByStaffName: isChecked ? staffName : null,
                  note: note || null,
                },
              ];
            }
            return { ...cust, callbackDate: callbackDate || cust.callbackDate, touchpointLogs: newLogs };
          }
          return cust;
        })
      );

      try {
        await apiClient.campaigns.toggleTouchpointLog(campId, customerId, touchpointId, {
          isChecked,
          status,
          note,
          callbackDate,
        });
        message.success(isChecked ? 'Đã cập nhật trạng thái điểm chạm' : 'Đã bỏ chọn điểm chạm');
        apiClient.campaigns.getStats(campId).then(setStats).catch(console.error);
      } catch (err) {
        console.error('Toggle touchpoint log error:', err);
        message.error('Không thể cập nhật trạng thái điểm chạm');
        void fetchCampaignCustomers();
      }
    },
    [campaign?.id, currentUser?.displayName, currentUser?.username, fetchCampaignCustomers, setCustomers, setStats]
  );

  const handleRemoveCustomer = useCallback(
    (customerId: number, customerName: string) => {
      if (!campaign?.id) return;
      setConfirmRemovalState({
        mode: 'single',
        customerId,
        customerName,
      });
    },
    [campaign?.id]
  );

  const handleBatchRemoveCustomers = useCallback(() => {
    if (!campaign?.id || selectedRowKeys.length === 0) return;
    const customerIds = selectedRowKeys.map((key) => Number(key)).filter((id) => !isNaN(id));
    setConfirmRemovalState({
      mode: 'batch',
      customerIds,
      count: selectedRowKeys.length,
    });
  }, [campaign?.id, selectedRowKeys]);

  const handleCancelRemoval = useCallback(() => {
    if (!removalSubmitting) {
      setConfirmRemovalState(null);
    }
  }, [removalSubmitting]);

  const handleConfirmRemoval = useCallback(async () => {
    const campId = campaign?.id;
    if (!campId || !confirmRemovalState) return;
    setRemovalSubmitting(true);
    try {
      if (confirmRemovalState.mode === 'single') {
        const { customerId } = confirmRemovalState;
        await apiClient.campaigns.removeCustomer(campId, customerId);
        message.success('Đã xóa khách hàng khỏi chiến dịch');
        setCustomers((prev) =>
          prev.filter((c: any) => {
            const id = Number(c.legacyUserId || c.customerId || c.id);
            return id !== Number(customerId) && c.id !== Number(customerId);
          })
        );
      } else {
        const { customerIds, count } = confirmRemovalState;
        const res = await apiClient.campaigns.removeCustomersBatch(campId, { customerIds });
        message.success(res.message || `Đã xóa ${count} khách hàng khỏi chiến dịch`);
        const targetSet = new Set(customerIds);
        setCustomers((prev) =>
          prev.filter((c: any) => {
            const cId = Number(c.legacyUserId || c.customerId || c.id);
            return !targetSet.has(cId) && !targetSet.has(Number(c.id));
          })
        );
        setSelectedRowKeys([]);
        setSelectedCustomersByKey(new Map());
      }
      setConfirmRemovalState(null);
      void fetchCampaignCustomers();
      apiClient.campaigns.getStats(campId).then(setStats).catch(console.error);
    } catch (err: any) {
      if (confirmRemovalState.mode === 'single') {
        console.error('Remove customer error:', err);
        message.error(err?.response?.data?.message || err?.message || 'Không thể xóa khách hàng');
      } else {
        console.error('Batch remove customers error:', err);
        message.error(err?.response?.data?.message || err?.message || 'Không thể xóa hàng loạt khách hàng');
      }
    } finally {
      setRemovalSubmitting(false);
    }
  }, [
    campaign?.id,
    confirmRemovalState,
    fetchCampaignCustomers,
    setCustomers,
    setSelectedCustomersByKey,
    setSelectedRowKeys,
    setStats,
  ]);

  const handleRandomSelect = useCallback(async () => {
    const campId = campaign?.id;
    if (!campId) return;
    setRandomLoading(true);
    const countNum = typeof randomCount === 'number' && randomCount > 0 ? randomCount : 20;

    try {
      const poolRes: any = await apiClient.campaigns.getCustomers(campId, {
        page: 1,
        pageSize: 1000,
        ...(selectedBookerId !== 'ALL' ? { assignedStaffId: selectedBookerId } : {}),
        ...(selectedTouchpointKey !== 'ALL' ? { touchpointKey: selectedTouchpointKey } : {}),
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
        ...(bookingStatusFilter !== 'ALL' ? { bookingStatus: bookingStatusFilter } : {}),
      });
      const basePool = Array.isArray(poolRes) ? poolRes : poolRes?.items || poolRes?.data || [];

      const candidates = filterRandomSelectionCandidates(basePool, {
        excludeAssigned,
        excludeUnconfirmedAllocation,
        excludeFutureBooking,
      });

      if (candidates.length === 0) {
        message.warning('Không tìm thấy khách hàng nào phù hợp với các điều kiện đã chọn.');
        setRandomLoading(false);
        return;
      }

      const selectedItems = pickRandomCandidates(candidates, countNum);
      const selectedKeys = selectedItems.map(getCampaignCustomerKey);

      setSelectedRowKeys(selectedKeys);
      setSelectedCustomersByKey(new Map(selectedItems.map((item: any) => [getCampaignCustomerKey(item), item])));
      setShowSelectedOnly(true);
      setCurrentPage(1);
      setRandomModalVisible(false);
      message.success(`Đã chọn ngẫu nhiên ${selectedKeys.length} khách hàng (Đã bật hiển thị duy nhất KH được chọn)!`);
    } catch (err) {
      console.error('Random select error:', err);
      message.error('Có lỗi xảy ra khi chọn ngẫu nhiên.');
    } finally {
      setRandomLoading(false);
    }
  }, [
    bookingStatusFilter,
    campaign?.id,
    excludeAssigned,
    excludeFutureBooking,
    excludeUnconfirmedAllocation,
    randomCount,
    searchQuery,
    selectedBookerId,
    selectedTouchpointKey,
    setCurrentPage,
    setSelectedCustomersByKey,
    setSelectedRowKeys,
  ]);

  const handleOpenAddCustomersDrawer = useCallback(async () => {
    const campId = campaign?.id;
    try {
      await Promise.all([
        apiClient.customers.list({ bucket: 'NOT_COMBO_LIVE', limit: 100 }),
        campId ? apiClient.campaigns.getCustomers(campId, { page: 1, pageSize: 1000 }) : Promise.resolve([]),
      ]);
    } catch (err) {
      console.error('Fetch NYC candidates error:', err);
      message.error('Không thể tải danh sách khách hàng NYC chưa tham gia');
    }
  }, [campaign?.id]);

  const handleBatchAllocate = useCallback(async () => {
    const campId = campaign?.id;
    const campName = campaign?.name;
    if (!campId || !targetBookerId || selectedRowKeys.length === 0) {
      message.warning('Vui lòng chọn Booker và ít nhất 1 khách hàng');
      return;
    }
    setAllocating(true);
    try {
      const selectedLegacyUserIds = Array.from(
        new Set(selectedRowKeys.map((key) => Number(key)).filter((id) => Number.isFinite(id) && id > 0))
      );

      await apiClient.allocation.createBatch({
        bookerId: targetBookerId,
        customerIds: selectedLegacyUserIds,
        sourceType: 'MANUAL',
        sourceFilterSummary: `Chiến dịch ${campName || ''} (${selectedLegacyUserIds.length} KH)`,
        campaignId: campId,
      });
      message.success(`Tạo đợt phân bổ ${selectedLegacyUserIds.length} KH thành công! Chờ Booker xác nhận 24h.`);
      setBatchAllocationModalVisible(false);
      setSelectedRowKeys([]);
      setSelectedCustomersByKey(new Map());
      setTargetBookerId(undefined);
      void fetchCampaignCustomers();
    } catch (err) {
      console.error('Batch allocate error:', err);
      message.error('Có lỗi xảy ra khi tạo đợt phân bổ');
    } finally {
      setAllocating(false);
    }
  }, [
    campaign?.id,
    campaign?.name,
    fetchCampaignCustomers,
    selectedRowKeys,
    setSelectedCustomersByKey,
    setSelectedRowKeys,
    targetBookerId,
  ]);

  return {
    randomModalVisible,
    setRandomModalVisible,
    randomCount,
    setRandomCount,
    randomLoading,
    excludeAssigned,
    setExcludeAssigned,
    excludeUnconfirmedAllocation,
    setExcludeUnconfirmedAllocation,
    excludeFutureBooking,
    setExcludeFutureBooking,
    showSelectedOnly,
    setShowSelectedOnly,
    batchAllocationModalVisible,
    setBatchAllocationModalVisible,
    targetBookerId,
    setTargetBookerId,
    allocating,
    confirmRemovalState,
    removalSubmitting,
    handleToggleTouchpoint,
    handleRemoveCustomer,
    handleBatchRemoveCustomers,
    handleConfirmRemoval,
    handleCancelRemoval,
    handleRandomSelect,
    handleOpenAddCustomersDrawer,
    handleBatchAllocate,
  };
}
