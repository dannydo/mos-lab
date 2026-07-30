import { useState, useCallback } from 'react';
import { apiClient } from '../../../../lib/api-client';

export const useCustomerAssignment = (
  optionsRef: React.MutableRefObject<SafeAny>,
  onRefresh: () => void,
  clearRandomSelection: () => void,
  getFilterCriteria?: () => SafeAny,
  buildFilterSummary?: (sourceType: 'MANUAL' | 'RANDOM', count: number) => string
) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [targetStaffId, setTargetStaffId] = useState<number | undefined>(undefined);
  const [durationDays, setDurationDays] = useState<number | undefined>(7);
  const [assigning, setAssigning] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [lastSourceType, setLastSourceType] = useState<'MANUAL' | 'RANDOM'>('MANUAL');

  const handleAssignCustomers = useCallback(
    async (sourceTypeOverride?: unknown, randomBatchId?: string | null) => {
      if (!targetStaffId) {
        optionsRef.current?.onError?.('Vui lòng chọn nhân viên Booker');
        return;
      }
      setAssigning(true);
      try {
        const sourceType: 'MANUAL' | 'RANDOM' =
          typeof sourceTypeOverride === 'string' && (sourceTypeOverride === 'MANUAL' || sourceTypeOverride === 'RANDOM')
            ? sourceTypeOverride
            : lastSourceType || 'MANUAL';

        const currentCriteria = getFilterCriteria ? getFilterCriteria() : {};
        const sourceFilterSummary = buildFilterSummary
          ? buildFilterSummary(sourceType, selectedRowKeys.length)
          : `${sourceType === 'RANDOM' ? '🎲 Ngẫu nhiên' : 'Chọn thủ công'} ${selectedRowKeys.length} KH`;

        // Ensure clean JSON string without circular references
        const sourceFilterJson = JSON.stringify(currentCriteria || {});

        await apiClient.allocation.createBatch({
          bookerId: targetStaffId,
          customerIds: selectedRowKeys.map((k) => Number(k)),
          sourceType,
          sourceFilterSummary,
          sourceFilterJson,
          parentBatchId: randomBatchId || undefined,
        });
        optionsRef.current?.onSuccess?.(
          `Đã tạo đợt phân bổ thành công cho Booker! (${selectedRowKeys.length} KH) - Chờ Booker xác nhận 24h.`
        );
        setSelectedRowKeys([]);
        clearRandomSelection();
        setAssignModalVisible(false);
        setTargetStaffId(undefined);
        setLastSourceType('MANUAL');
        onRefresh();
      } catch (error) {
        console.error('Assign error:', error);
        optionsRef.current?.onError?.((error as SafeAny).response?.data?.message || 'Có lỗi xảy ra khi phân bổ');
      } finally {
        setAssigning(false);
      }
    },
    [
      targetStaffId,
      selectedRowKeys,
      durationDays,
      lastSourceType,
      getFilterCriteria,
      buildFilterSummary,
      clearRandomSelection,
      onRefresh,
      optionsRef,
    ]
  );

  const handleUnassignCustomers = useCallback(async () => {
    if (selectedRowKeys.length === 0) return;
    setUnassigning(true);
    try {
      await apiClient.customers.unassign({
        customerIds: selectedRowKeys.map((k) => Number(k)),
        reason: 'Hủy phân bổ thủ công',
      });
      optionsRef.current?.onSuccess?.(`Đã hủy phân bổ thành công ${selectedRowKeys.length} khách hàng!`);
      setSelectedRowKeys([]);
      clearRandomSelection();
      setAssignModalVisible(false);
      onRefresh();
    } catch (error) {
      console.error('Unassign error:', error);
      optionsRef.current?.onError?.((error as SafeAny).response?.data?.message || 'Có lỗi xảy ra khi hủy phân bổ');
    } finally {
      setUnassigning(false);
    }
  }, [selectedRowKeys, clearRandomSelection, onRefresh, optionsRef]);

  const handleBulkDeleteCustomers = useCallback(async () => {
    if (selectedRowKeys.length === 0) return;
    setBulkDeleteLoading(true);
    try {
      const ids = selectedRowKeys.map((k) => Number(k));
      const res = await apiClient.customers.bulkDelete(ids);
      if (res.success) {
        optionsRef.current?.onSuccess?.(`Đã xóa thành công ${res.count} khách hàng!`);
        setSelectedRowKeys([]);
        clearRandomSelection();
        onRefresh();
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      optionsRef.current?.onError?.((error as SafeAny).response?.data?.message || 'Có lỗi xảy ra khi xóa hàng loạt');
    } finally {
      setBulkDeleteLoading(false);
    }
  }, [selectedRowKeys, clearRandomSelection, onRefresh, optionsRef]);

  return {
    selectedRowKeys,
    setSelectedRowKeys,
    assignModalVisible,
    setAssignModalVisible,
    targetStaffId,
    setTargetStaffId,
    durationDays,
    setDurationDays,
    lastSourceType,
    setLastSourceType,
    assigning,
    unassigning,
    bulkDeleteLoading,
    handleAssignCustomers,
    handleUnassignCustomers,
    handleBulkDeleteCustomers,
  };
};
export default useCustomerAssignment;
