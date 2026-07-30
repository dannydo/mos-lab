import { useState, useCallback } from 'react';
import { apiClient } from '../../../../lib/api-client';

export const useRandomSelector = (
  filterParams: SafeAny,
  optionsRef: React.MutableRefObject<SafeAny>,
  onSelected: (ids: number[]) => void
) => {
  const [randomModalVisible, setRandomModalVisible] = useState(false);
  const [randomCount, setRandomCount] = useState<number | ''>(20);
  const [randomLoading, setRandomLoading] = useState(false);
  const [randomSelectedIds, setRandomSelectedIds] = useState<number[] | null>(null);
  const [randomBatchId, setRandomBatchId] = useState<string | null>(null);
  const [excludeAssigned, setExcludeAssigned] = useState<boolean>(true);
  const [excludeFutureBooking, setExcludeFutureBooking] = useState<boolean>(true);
  const [excludeUnconfirmedAllocation, setExcludeUnconfirmedAllocation] = useState<boolean>(true);

  const handleRandomSelect = useCallback(async () => {
    setRandomLoading(true);
    const countNum = typeof randomCount === 'number' && randomCount > 0 ? randomCount : 20;
    try {
      const params: SafeAny = {
        limit: countNum.toString(),
        bucket: filterParams.activeTab !== 'ALL' ? filterParams.activeTab : undefined,
        search: filterParams.searchQuery || undefined,
        daysSinceLastVisitMin: filterParams.daysSinceLastVisitMin?.toString(),
        daysSinceLastVisitMax: filterParams.daysSinceLastVisitMax?.toString(),
        totalSpentMin: filterParams.totalSpentMin?.toString(),
        totalSpentMax: filterParams.totalSpentMax?.toString(),
        totalVisitsMin: filterParams.totalVisitsMin?.toString(),
        totalVisitsMax: filterParams.totalVisitsMax?.toString(),
        promoUsed: filterParams.promoUsed !== 'all' ? filterParams.promoUsed : undefined,
        promoCountMin: filterParams.promoCountMin?.toString(),
        promoCountMax: filterParams.promoCountMax?.toString(),
        referralUsed: filterParams.referralUsed !== 'all' ? filterParams.referralUsed : undefined,
        referralCountMin: filterParams.referralCountMin?.toString(),
        referralCountMax: filterParams.referralCountMax?.toString(),
        assignedStaffId: filterParams.assignedStaffId !== 'all' ? filterParams.assignedStaffId : undefined,
        assignedDaysMin: filterParams.assignedDaysMin?.toString(),
        assignedDaysMax: filterParams.assignedDaysMax?.toString(),
        retainedOnly: filterParams.retainedOnly ? 'true' : undefined,
        excludeAssigned: excludeAssigned ? 'true' : 'false',
        excludeFutureBooking: excludeFutureBooking ? 'true' : 'false',
        excludeUnconfirmedAllocation: excludeUnconfirmedAllocation ? 'true' : 'false',
      };

      const data = await apiClient.customers.getRandomIds(params);
      const selectedIds = Array.isArray(data) ? data : (data as SafeAny).ids || [];
      const batchId = Array.isArray(data) ? null : (data as SafeAny).batchId || null;

      if (selectedIds.length === 0) {
        optionsRef.current?.onWarning?.('Không tìm thấy khách hàng nào phù hợp với bộ lọc hiện tại.');
      } else {
        setRandomSelectedIds(selectedIds);
        setRandomBatchId(batchId);
        onSelected(selectedIds);
        optionsRef.current?.onSuccess?.(`Đã chọn ngẫu nhiên ${selectedIds.length} khách hàng!`);
      }
      setRandomModalVisible(false);
    } catch (err) {
      console.error('Random select error:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Có lỗi xảy ra khi chọn ngẫu nhiên.');
    } finally {
      setRandomLoading(false);
    }
  }, [
    randomCount,
    excludeAssigned,
    excludeFutureBooking,
    excludeUnconfirmedAllocation,
    filterParams,
    onSelected,
    optionsRef,
  ]);

  return {
    randomModalVisible,
    setRandomModalVisible,
    randomCount,
    setRandomCount,
    randomLoading,
    randomSelectedIds,
    setRandomSelectedIds,
    randomBatchId,
    setRandomBatchId,
    excludeAssigned,
    setExcludeAssigned,
    excludeFutureBooking,
    setExcludeFutureBooking,
    excludeUnconfirmedAllocation,
    setExcludeUnconfirmedAllocation,
    handleRandomSelect,
  };
};
export default useRandomSelector;
