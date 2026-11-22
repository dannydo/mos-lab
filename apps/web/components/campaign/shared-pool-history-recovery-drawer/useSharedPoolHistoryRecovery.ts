'use client';

import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import type { CampaignSharedPoolDetailedLog, SharedPoolRecoveryAction, SharedPoolRecoveryDto } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import type { DriftConfirmationState, SharedPoolApiError } from './sharedPoolHistoryTypes';

interface UseSharedPoolHistoryRecoveryParams {
  open: boolean;
  campaignId: number;
  onDataChanged?: () => void;
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  const apiError = err as SharedPoolApiError;
  return apiError?.response?.data?.message || fallback;
}

/** Manages Shared Pool audit history pagination/filtering and safe recovery modals. */
export function useSharedPoolHistoryRecovery({ open, campaignId, onDataChanged }: UseSharedPoolHistoryRecoveryParams) {
  // History state
  const [loading, setLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<CampaignSharedPoolDetailedLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Recovery Modal state
  const [recoveryModalOpen, setRecoveryModalOpen] = useState<boolean>(false);
  const [recoveryLoading, setRecoveryLoading] = useState<boolean>(false);
  const [selectedLog, setSelectedLog] = useState<CampaignSharedPoolDetailedLog | null>(null);
  const [recoveryAction, setRecoveryAction] = useState<SharedPoolRecoveryAction>('ROLLBACK_TO_LOG');
  const [targetPoolStatus, setTargetPoolStatus] = useState<string>('AVAILABLE');
  const [recoveryReason, setRecoveryReason] = useState<string>('');
  const [driftConfirmed, setDriftConfirmed] = useState<boolean>(false);
  const [driftConfirm, setDriftConfirm] = useState<DriftConfirmationState | null>(null);
  const [driftConfirmLoading, setDriftConfirmLoading] = useState<boolean>(false);

  // Quick recovery modal state
  const [quickModalOpen, setQuickModalOpen] = useState<boolean>(false);
  const [quickCustomerId, setQuickCustomerId] = useState<string>('');
  const [quickAction, setQuickAction] = useState<SharedPoolRecoveryAction>('FORCE_UNLOCK');
  const [quickTargetStatus, setQuickTargetStatus] = useState<string>('AVAILABLE');
  const [quickReason, setQuickReason] = useState<string>('');
  const [quickLoading, setQuickLoading] = useState<boolean>(false);

  const fetchHistory = useCallback(async () => {
    if (!campaignId || !open) return;
    setLoading(true);
    try {
      const res = await apiClient.campaigns.getSharedPoolHistory(campaignId, {
        page: currentPage,
        pageSize,
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
        search: searchQuery.trim() || undefined,
      });
      setLogs(res.items || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      console.error('Fetch shared pool history error:', err);
      message.error(getApiErrorMessage(err, 'Không thể tải lịch sử thao tác Shared Pool'));
    } finally {
      setLoading(false);
    }
  }, [campaignId, open, currentPage, pageSize, actionFilter, searchQuery]);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, fetchHistory]);

  const handleFilterChange = useCallback((value: string) => {
    setActionFilter(value);
    setCurrentPage(1);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    setCurrentPage(1);
    fetchHistory();
  }, [fetchHistory]);

  const handlePaginationChange = useCallback((page: number, nextPageSize: number) => {
    setCurrentPage(page);
    setPageSize(nextPageSize);
  }, []);

  const handleOpenRecovery = useCallback((record: CampaignSharedPoolDetailedLog) => {
    setSelectedLog(record);
    setRecoveryAction('ROLLBACK_TO_LOG');
    setTargetPoolStatus('AVAILABLE');
    setRecoveryReason('');
    setDriftConfirmed(false);
    setDriftConfirm(null);
    setRecoveryModalOpen(true);
  }, []);

  const handleSubmitRecovery = useCallback(async () => {
    if (!selectedLog || !campaignId) return;
    const trimmedReason = recoveryReason.trim();
    if (!trimmedReason) {
      message.error('Bắt buộc nhập lý do khi thực hiện khôi phục theo nguyên tắc an toàn mOS.');
      return;
    }

    const targetCustomerId = selectedLog.campaignCustomerId || selectedLog.legacyUserId;
    if (!targetCustomerId) {
      message.error('Không tìm thấy thông tin khách hàng trong bản ghi log này.');
      return;
    }

    setRecoveryLoading(true);
    try {
      const dto: SharedPoolRecoveryDto = {
        customerId: targetCustomerId,
        action: recoveryAction,
        logId: selectedLog.id,
        targetPoolStatus: recoveryAction === 'RESET_POOL_STATUS' ? targetPoolStatus : undefined,
        reason: trimmedReason,
        forceOverride: driftConfirmed,
      };

      const res = await apiClient.campaigns.recoverSharedPoolCustomer(campaignId, dto);

      if (res.requiresConfirmation) {
        setDriftConfirm({
          dto,
          message: res.message,
          currentStatus: res.currentStatus,
          targetPreviousStatus: res.targetPreviousStatus,
        });
        return;
      }

      message.success(res.message || 'Khôi phục trạng thái thành công!');
      setRecoveryModalOpen(false);
      fetchHistory();
      onDataChanged?.();
    } catch (err: unknown) {
      console.error('Recovery error:', err);
      message.error(getApiErrorMessage(err, 'Khôi phục dữ liệu thất bại'));
    } finally {
      setRecoveryLoading(false);
    }
  }, [
    selectedLog,
    campaignId,
    recoveryReason,
    recoveryAction,
    targetPoolStatus,
    driftConfirmed,
    fetchHistory,
    onDataChanged,
  ]);

  const handleConfirmDriftOverride = useCallback(async () => {
    if (!driftConfirm || !campaignId) return;
    setDriftConfirmed(true);
    setDriftConfirmLoading(true);
    try {
      const retryRes = await apiClient.campaigns.recoverSharedPoolCustomer(campaignId, {
        ...driftConfirm.dto,
        forceOverride: true,
      });
      message.success(retryRes.message || 'Khôi phục trạng thái thành công!');
      setDriftConfirm(null);
      setRecoveryModalOpen(false);
      fetchHistory();
      onDataChanged?.();
    } catch (retryErr: unknown) {
      message.error(getApiErrorMessage(retryErr, 'Khôi phục thất bại'));
      setDriftConfirm(null);
    } finally {
      setDriftConfirmLoading(false);
    }
  }, [driftConfirm, campaignId, fetchHistory, onDataChanged]);

  const handleCancelDriftOverride = useCallback(() => {
    setDriftConfirm(null);
  }, []);

  const handleSubmitQuickRecovery = useCallback(async () => {
    if (!campaignId) return;
    const cid = parseInt(quickCustomerId.trim(), 10);
    if (isNaN(cid) || cid <= 0) {
      message.error('Vui lòng nhập ID khách hàng hợp lệ.');
      return;
    }
    const trimmedReason = quickReason.trim();
    if (!trimmedReason) {
      message.error('Bắt buộc nhập lý do khi thực hiện khôi phục.');
      return;
    }

    setQuickLoading(true);
    try {
      const dto: SharedPoolRecoveryDto = {
        customerId: cid,
        action: quickAction,
        targetPoolStatus: quickAction === 'RESET_POOL_STATUS' ? quickTargetStatus : undefined,
        reason: trimmedReason,
        forceOverride: true,
      };

      const res = await apiClient.campaigns.recoverSharedPoolCustomer(campaignId, dto);
      message.success(res.message || 'Đã khôi phục trạng thái khách hàng thành công!');
      setQuickModalOpen(false);
      setQuickCustomerId('');
      setQuickReason('');
      fetchHistory();
      onDataChanged?.();
    } catch (err: unknown) {
      console.error('Quick recovery error:', err);
      message.error(getApiErrorMessage(err, 'Khôi phục thất bại'));
    } finally {
      setQuickLoading(false);
    }
  }, [campaignId, quickCustomerId, quickReason, quickAction, quickTargetStatus, fetchHistory, onDataChanged]);

  return {
    loading,
    logs,
    total,
    currentPage,
    pageSize,
    actionFilter,
    searchQuery,
    setSearchQuery,
    fetchHistory,
    handleFilterChange,
    handleSearchSubmit,
    handlePaginationChange,
    recoveryModalOpen,
    setRecoveryModalOpen,
    recoveryLoading,
    selectedLog,
    recoveryAction,
    setRecoveryAction,
    targetPoolStatus,
    setTargetPoolStatus,
    recoveryReason,
    setRecoveryReason,
    driftConfirm,
    driftConfirmLoading,
    handleOpenRecovery,
    handleSubmitRecovery,
    handleConfirmDriftOverride,
    handleCancelDriftOverride,
    quickModalOpen,
    setQuickModalOpen,
    quickCustomerId,
    setQuickCustomerId,
    quickAction,
    setQuickAction,
    quickTargetStatus,
    setQuickTargetStatus,
    quickReason,
    setQuickReason,
    quickLoading,
    handleSubmitQuickRecovery,
  };
}
