import { useState, useCallback } from 'react';
import { apiClient } from '../../../../lib/api-client';

export const useRandomSelector = (
  filterParams: SafeAny,
  optionsRef: React.MutableRefObject<SafeAny>,
  onSelected: (ids: number[]) => void
) => {
  const [randomModalVisible, setRandomModalVisible] = useState(false);
  const [randomCount, setRandomCount] = useState<number>(20);
  const [randomLoading, setRandomLoading] = useState(false);
  const [randomSelectedIds, setRandomSelectedIds] = useState<number[] | null>(null);
  const [excludeAssigned, setExcludeAssigned] = useState<boolean>(true);

  const handleRandomSelect = useCallback(async () => {
    setRandomLoading(true);
    try {
      const params: SafeAny = {
        limit: randomCount.toString(),
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
        excludeAssigned: excludeAssigned ? 'true' : 'false',
      };

      const data = await apiClient.customers.getRandomIds(params);
      const selectedIds = (data as SafeAny).ids;

      if (selectedIds.length === 0) {
        optionsRef.current?.onWarning?.('Không tìm thấy khách hàng chưa phân bổ nào phù hợp với bộ lọc hiện tại.');
      } else {
        setRandomSelectedIds(selectedIds);
        onSelected(selectedIds);
        setRandomModalVisible(false);
        optionsRef.current?.onSuccess?.(`Đã chọn ngẫu nhiên ${selectedIds.length} khách hàng chưa phân bổ!`);
      }
    } catch (err) {
      console.error('Random select error:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Có lỗi xảy ra khi chọn ngẫu nhiên.');
    } finally {
      setRandomLoading(false);
    }
  }, [randomCount, excludeAssigned, filterParams, onSelected, optionsRef]);

  return {
    randomModalVisible,
    setRandomModalVisible,
    randomCount,
    setRandomCount,
    randomLoading,
    randomSelectedIds,
    setRandomSelectedIds,
    excludeAssigned,
    setExcludeAssigned,
    handleRandomSelect,
  };
};
export default useRandomSelector;
