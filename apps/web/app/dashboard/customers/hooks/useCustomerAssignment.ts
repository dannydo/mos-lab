import { useState, useCallback } from 'react';
import { apiClient } from '../../../../lib/api-client';

export const useCustomerAssignment = (
  optionsRef: React.MutableRefObject<SafeAny>,
  onRefresh: () => void,
  clearRandomSelection: () => void
) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [targetStaffId, setTargetStaffId] = useState<number | undefined>(undefined);
  const [assigning, setAssigning] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const handleAssignCustomers = useCallback(async () => {
    if (!targetStaffId) {
      optionsRef.current?.onError?.('Vui lòng chọn nhân viên Booker');
      return;
    }
    setAssigning(true);
    try {
      await apiClient.customers.assign({
        customerIds: selectedRowKeys.map((k) => Number(k)),
        staffId: targetStaffId,
      });
      optionsRef.current?.onSuccess?.(`Đã phân bổ thành công ${selectedRowKeys.length} khách hàng!`);
      setSelectedRowKeys([]);
      clearRandomSelection();
      setAssignModalVisible(false);
      setTargetStaffId(undefined);
      onRefresh();
    } catch (error) {
      console.error('Assign error:', error);
      optionsRef.current?.onError?.((error as SafeAny).response?.data?.message || 'Có lỗi xảy ra khi phân bổ');
    } finally {
      setAssigning(false);
    }
  }, [targetStaffId, selectedRowKeys, clearRandomSelection, onRefresh, optionsRef]);

  const handleUnassignCustomers = useCallback(async () => {
    if (selectedRowKeys.length === 0) return;
    setUnassigning(true);
    try {
      await apiClient.customers.unassign({
        customerIds: selectedRowKeys.map((k) => Number(k)),
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
    assigning,
    unassigning,
    bulkDeleteLoading,
    handleAssignCustomers,
    handleUnassignCustomers,
    handleBulkDeleteCustomers,
  };
};
export default useCustomerAssignment;
