import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../../../../lib/api-client';

export const useAssignmentHistory = (optionsRef: React.MutableRefObject<SafeAny>, onRefresh: () => void) => {
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<SafeAny[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [batchDetailsLoading, setBatchDetailsLoading] = useState(false);
  const [batchDetails, setBatchDetails] = useState<SafeAny[]>([]);
  const [undoingBatchId, setUndoingBatchId] = useState<string | null>(null);

  const fetchAssignmentHistory = useCallback(
    async (page = 1) => {
      setHistoryLoading(true);
      try {
        const data = await apiClient.customers.getAssignmentHistory({ page, limit: 10 });
        setHistoryData(data.data);
        setHistoryTotal(data.pagination.total);
        setHistoryPage(page);
      } catch (error) {
        console.error('Fetch assignment history error:', error);
        optionsRef.current?.onError?.('Không thể lấy lịch sử phân bổ');
      } finally {
        setHistoryLoading(false);
      }
    },
    [optionsRef]
  );

  const fetchBatchDetails = useCallback(
    async (batchId: string) => {
      setBatchDetailsLoading(true);
      setExpandedBatchId(batchId);
      try {
        const data = await apiClient.customers.getAssignmentHistoryDetails(batchId);
        setBatchDetails(data.data);
      } catch (error) {
        console.error('Fetch batch details error:', error);
        optionsRef.current?.onError?.('Không thể lấy chi tiết đợt phân bổ');
      } finally {
        setBatchDetailsLoading(false);
      }
    },
    [optionsRef]
  );

  const handleUndoAssignment = useCallback(
    async (batchId: string) => {
      setUndoingBatchId(batchId);
      try {
        const data = await apiClient.customers.undoAssignment(batchId);
        const { revertedCount, totalCount, skippedCount } = data;

        let msg = `Đã hoàn tác thành công ${revertedCount}/${totalCount} khách hàng!`;
        if (skippedCount > 0) {
          msg += ` (${skippedCount} khách hàng bỏ qua do đã có phân bổ mới hơn)`;
        }
        optionsRef.current?.onSuccess?.(msg);

        fetchAssignmentHistory(historyPage);

        if (expandedBatchId === batchId) {
          fetchBatchDetails(batchId);
        }

        onRefresh();
      } catch (error) {
        console.error('Undo assignment error:', error);
        optionsRef.current?.onError?.((error as SafeAny).response?.data?.message || 'Không thể hoàn tác phân bổ');
      } finally {
        setUndoingBatchId(null);
      }
    },
    [expandedBatchId, fetchBatchDetails, fetchAssignmentHistory, historyPage, onRefresh, optionsRef]
  );

  useEffect(() => {
    if (historyDrawerVisible) {
      fetchAssignmentHistory(1);
    }
  }, [historyDrawerVisible, fetchAssignmentHistory]);

  return {
    historyDrawerVisible,
    setHistoryDrawerVisible,
    historyLoading,
    historyData,
    historyTotal,
    historyPage,
    setHistoryPage,
    expandedBatchId,
    setExpandedBatchId,
    batchDetailsLoading,
    batchDetails,
    setBatchDetails,
    undoingBatchId,
    fetchAssignmentHistory,
    fetchBatchDetails,
    handleUndoAssignment,
  };
};
export default useAssignmentHistory;
