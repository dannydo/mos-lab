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
    async (page = 1, search?: string, actionType?: string) => {
      setHistoryLoading(true);
      try {
        const params: Record<string, unknown> = { page, limit: 10 };
        if (search && search.trim()) params.search = search.trim();
        if (actionType && actionType !== 'ALL') params.actionType = actionType;

        const data = await apiClient.customers.getAssignmentHistory(params);
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
    async (batchId: string, reason: string) => {
      setUndoingBatchId(batchId);
      try {
        const data = await apiClient.customers.undoAssignment(batchId, reason);
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

  const [revokingBatchId, setRevokingBatchId] = useState<string | null>(null);

  const handleOpenRevokeBatchModal = useCallback(
    async (batchId: string, onOpenModal: (customerIds: number[]) => void) => {
      setRevokingBatchId(batchId);
      try {
        const details = await apiClient.customers.getAssignmentHistoryDetails(batchId);
        const customerIds = (details.data || [])
          .map((item: SafeAny) => Number(item.legacyUserId || item.id))
          .filter((id: number) => !isNaN(id) && id > 0);
        if (customerIds.length === 0) {
          optionsRef.current?.onWarning?.('Không tìm thấy danh sách khách hàng của đợt phân bổ này.');
          return;
        }
        onOpenModal(customerIds);
      } catch (err) {
        console.error('Fetch batch details for revoke error:', err);
        optionsRef.current?.onError?.('Không thể tải danh sách khách hàng để thu hồi.');
      } finally {
        setRevokingBatchId(null);
      }
    },
    [optionsRef]
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
    revokingBatchId,
    fetchAssignmentHistory,
    fetchBatchDetails,
    handleUndoAssignment,
    handleOpenRevokeBatchModal,
  };
};
export default useAssignmentHistory;
