'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import type { Campaign, CampaignSharedPoolLog, SharedPoolOverviewStats } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import type { CampaignDetailUser } from './campaignDetailTypes';
import { resolveSharedPoolWsUrl } from './campaignDetailUtils';

export interface UseCampaignSharedPoolParams {
  campaign: Campaign | null;
  currentUser: CampaignDetailUser | null;
  selectedBatch: number | 'ALL';
  setSelectedBatch: React.Dispatch<React.SetStateAction<number | 'ALL'>>;
  selectedPoolStatus: string;
  setCustomers: React.Dispatch<React.SetStateAction<any[]>>;
  fetchCampaignCustomers: (isBackground?: boolean) => Promise<void>;
  makeCall: (phone: string, name?: string, customerId?: number) => Promise<void> | void;
}

export function useCampaignSharedPool({
  campaign,
  currentUser,
  selectedBatch,
  setSelectedBatch,
  selectedPoolStatus,
  setCustomers,
  fetchCampaignCustomers,
  makeCall,
}: UseCampaignSharedPoolParams) {
  const [sharedPoolOverview, setSharedPoolOverview] = useState<SharedPoolOverviewStats | null>(null);
  const [sharedPoolLoading, setSharedPoolLoading] = useState<boolean>(false);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState<boolean>(false);
  const [auditCustomer, setAuditCustomer] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<CampaignSharedPoolLog[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [historyRecoveryOpen, setHistoryRecoveryOpen] = useState<boolean>(false);
  const [excludedDrawerOpen, setExcludedDrawerOpen] = useState<boolean>(false);

  const hasInitializedBatchRef = useRef(false);
  const selectedPoolStatusRef = useRef(selectedPoolStatus);
  selectedPoolStatusRef.current = selectedPoolStatus;
  const auditCustomerRef = useRef(auditCustomer);
  auditCustomerRef.current = auditCustomer;

  const fetchSharedPoolOverview = useCallback(
    async (batchToFetch?: number | 'ALL', isBackground = false) => {
      const campId = campaign?.id;
      if (!campId || campaign?.operationMode !== 'SHARED_POOL') return;
      try {
        if (!isBackground) setSharedPoolLoading(true);
        const batchParam = batchToFetch !== undefined ? batchToFetch : selectedBatch;
        const res = await apiClient.campaigns.getSharedPoolOverview(campId, batchParam);
        setSharedPoolOverview(res);
        if (!hasInitializedBatchRef.current && res?.activeBatchNumber) {
          setSelectedBatch(res.activeBatchNumber);
          hasInitializedBatchRef.current = true;
        }
      } catch (err) {
        console.error('Fetch shared pool overview error:', err);
      } finally {
        if (!isBackground) setSharedPoolLoading(false);
      }
    },
    [campaign?.id, campaign?.operationMode, selectedBatch, setSelectedBatch]
  );

  const handleClaimExpiredLocally = useCallback(
    (record: any) => {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === record.id || (record.legacyUserId && c.legacyUserId === record.legacyUserId)) {
            return {
              ...c,
              poolStatus: 'AVAILABLE',
              claimedByStaffId: null,
              claimedByStaffName: null,
              claimExpiresAt: null,
              canClaim: true,
              isClaimedByMe: false,
            };
          }
          return c;
        })
      );
    },
    [setCustomers]
  );

  useEffect(() => {
    if (campaign?.operationMode !== 'SHARED_POOL' || !campaign?.id) return;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;

    const connectWs = () => {
      if (isDisposed) return;
      try {
        const wsUrl = resolveSharedPoolWsUrl(campaign.id);
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'CUSTOMER_CLAIMED') {
              setCustomers((prev) =>
                prev.map((c) => {
                  if (c.id === data.customerId || (data.legacyUserId && c.legacyUserId === data.legacyUserId)) {
                    const isMe = currentUser?.id && data.claimedByStaffId === currentUser.id;
                    return {
                      ...c,
                      poolStatus: 'CLAIMED',
                      claimedByStaffId: data.claimedByStaffId,
                      claimedByStaffName: data.claimedByStaffName,
                      claimExpiresAt: data.claimExpiresAt,
                      canClaim: false,
                      isClaimedByMe: !!isMe,
                    };
                  }
                  return c;
                })
              );
            } else if (data.type === 'CUSTOMER_RELEASED') {
              setCustomers((prev) =>
                prev.map((c) => {
                  if (c.id === data.customerId || (data.legacyUserId && c.legacyUserId === data.legacyUserId)) {
                    return {
                      ...c,
                      poolStatus: 'AVAILABLE',
                      claimedByStaffId: null,
                      claimedByStaffName: null,
                      claimExpiresAt: null,
                      canClaim: true,
                      isClaimedByMe: false,
                    };
                  }
                  return c;
                })
              );
            } else if (data.type === 'CUSTOMERS_RELEASED') {
              const releasedIds: number[] = data.customerIds || [];
              setCustomers((prev) =>
                prev.map((c) => {
                  if (releasedIds.includes(c.id)) {
                    return {
                      ...c,
                      poolStatus: 'AVAILABLE',
                      claimedByStaffId: null,
                      claimedByStaffName: null,
                      claimExpiresAt: null,
                      canClaim: true,
                      isClaimedByMe: false,
                    };
                  }
                  return c;
                })
              );
            } else if (data.type === 'CUSTOMER_STATUS_UPDATED') {
              setCustomers((prev) => {
                const currentFilter = selectedPoolStatusRef.current;
                const updated = prev.map((c) => {
                  if (c.id === data.customerId || (data.legacyUserId && c.legacyUserId === data.legacyUserId)) {
                    return {
                      ...c,
                      poolStatus: data.poolStatus,
                      claimedByStaffId: null,
                      claimedByStaffName: null,
                      claimExpiresAt: null,
                      canClaim: false,
                      isClaimedByMe: false,
                    };
                  }
                  return c;
                });
                if (currentFilter && currentFilter !== 'ALL') {
                  return updated.filter((c) => c.poolStatus === currentFilter);
                }
                return updated;
              });
              void fetchSharedPoolOverview(undefined, true);
              if (
                auditCustomerRef.current &&
                (auditCustomerRef.current.id === data.customerId ||
                  auditCustomerRef.current.legacyUserId === data.legacyUserId)
              ) {
                const targetId = auditCustomerRef.current.id || auditCustomerRef.current.legacyUserId;
                if (campaign?.id && targetId) {
                  apiClient.campaigns
                    .getSharedPoolLogs(campaign.id, targetId)
                    .then((logs) => {
                      setAuditLogs(logs);
                    })
                    .catch(() => {});
                }
              }
            } else if (['BATCH_ADVANCED', 'POOL_PAUSED', 'POOL_RESUMED', 'OVERVIEW_UPDATED'].includes(data.type)) {
              void fetchSharedPoolOverview(undefined, true);
              void fetchCampaignCustomers(true);
            }
          } catch (e) {
            console.error('Failed to parse shared pool ws message:', e);
          }
        };

        ws.onclose = () => {
          if (!isDisposed) {
            reconnectTimeout = setTimeout(connectWs, 3000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (err) {
        console.error('Failed to create shared pool ws:', err);
      }
    };

    connectWs();

    const interval = setInterval(() => {
      void fetchSharedPoolOverview(undefined, true);
      void fetchCampaignCustomers(true);
    }, 15000);

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
      clearInterval(interval);
    };
  }, [
    campaign?.id,
    campaign?.operationMode,
    currentUser?.id,
    fetchCampaignCustomers,
    fetchSharedPoolOverview,
    setCustomers,
  ]);

  const handleClaimCustomer = useCallback(
    async (record: any) => {
      const campId = campaign?.id;
      if (!campId) return;
      const targetId = record.id || record.legacyUserId;
      const staffId = currentUser?.id;
      const staffName = currentUser?.displayName || currentUser?.username;
      setActionLoadingId(targetId);
      try {
        const res = await apiClient.campaigns.claimSharedCustomer(campId, { customerId: targetId });
        message.success(res.message || 'Đã nhận khách vào xử lý!');
        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id === targetId || (record.legacyUserId && c.legacyUserId === record.legacyUserId)) {
              return {
                ...c,
                poolStatus: 'CLAIMED',
                claimedByStaffId: staffId,
                claimedByStaffName: staffName,
                claimedAt: new Date().toISOString(),
                claimExpiresAt:
                  (res as any)?.customer?.claimExpiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                isClaimedByMe: true,
                canClaim: false,
                canCall: true,
              };
            }
            return c;
          })
        );
        await Promise.all([fetchCampaignCustomers(true), fetchSharedPoolOverview(undefined, true)]);
      } catch (err: any) {
        console.error('Claim customer error:', err);
        message.error(err?.response?.data?.message || 'Không thể nhận khách hàng');
      } finally {
        setActionLoadingId(null);
      }
    },
    [
      campaign?.id,
      currentUser?.displayName,
      currentUser?.id,
      currentUser?.username,
      fetchCampaignCustomers,
      fetchSharedPoolOverview,
      setCustomers,
    ]
  );

  const handleCallClaimedCustomer = useCallback(
    (record: any) => {
      const phone = record.customerPhone || record.phone || record.phones?.[0]?.phone_number;
      if (!phone) {
        message.warning('Khách hàng không có số điện thoại để gọi.');
        return;
      }
      const customerName = record.customerName || record.name || `Khách hàng #${record.legacyUserId}`;
      void makeCall(phone, customerName, record.legacyUserId);
    },
    [makeCall]
  );

  const handleReleaseCustomer = useCallback(
    async (record: any) => {
      const campId = campaign?.id;
      if (!campId) return;
      const targetId = record.id || record.legacyUserId;
      setActionLoadingId(targetId);
      try {
        const res = await apiClient.campaigns.releaseSharedCustomer(campId, { customerId: targetId });
        message.success(res.message || 'Đã nhả khách về Shared Pool!');
        await Promise.all([fetchCampaignCustomers(), fetchSharedPoolOverview()]);
      } catch (err: any) {
        console.error('Release customer error:', err);
        message.error(err?.response?.data?.message || 'Không thể nhả khách hàng');
      } finally {
        setActionLoadingId(null);
      }
    },
    [campaign?.id, fetchCampaignCustomers, fetchSharedPoolOverview]
  );

  const handleOpenAuditLogs = useCallback(
    async (record: any) => {
      const campId = campaign?.id;
      if (!campId) return;
      setAuditCustomer(record);
      setAuditDrawerOpen(true);
      setAuditLogsLoading(true);
      try {
        const targetId = record.id || record.legacyUserId;
        const logs = await apiClient.campaigns.getSharedPoolLogs(campId, targetId);
        setAuditLogs(logs);
      } catch (err) {
        console.error('Fetch audit logs error:', err);
        message.error('Không thể tải lịch sử tương tác');
      } finally {
        setAuditLogsLoading(false);
      }
    },
    [campaign?.id]
  );

  const handleAdvanceBatch = useCallback(async () => {
    const campId = campaign?.id;
    if (!campId) return;
    try {
      const res = await apiClient.campaigns.advanceSharedPoolBatch(campId);
      message.success(res.message || 'Đã mở Batch tiếp theo!');
      await Promise.all([fetchSharedPoolOverview(), fetchCampaignCustomers()]);
    } catch (err: any) {
      console.error('Advance batch error:', err);
      message.error(err?.response?.data?.message || 'Không thể chuyển Batch');
    }
  }, [campaign?.id, fetchCampaignCustomers, fetchSharedPoolOverview]);

  const handleTogglePause = useCallback(
    async (isPaused: boolean) => {
      const campId = campaign?.id;
      if (!campId) return;
      try {
        const res = await apiClient.campaigns.toggleSharedPoolPause(campId, { isPaused });
        message.success(res.message || 'Đã cập nhật trạng thái Shared Pool!');
        await Promise.all([fetchSharedPoolOverview(), fetchCampaignCustomers()]);
      } catch (err: any) {
        console.error('Toggle pause error:', err);
        message.error(err?.response?.data?.message || 'Không thể cập nhật trạng thái');
      }
    },
    [campaign?.id, fetchCampaignCustomers, fetchSharedPoolOverview]
  );

  const handleManagerCustomerAction = useCallback(
    async (record: any, action: 'RELEASE_CLAIM' | 'RETURN_TO_POOL' | 'EXCLUDE') => {
      const campId = campaign?.id;
      if (!campId) return;
      const targetId = record.id || record.legacyUserId;
      setActionLoadingId(targetId);
      try {
        const res = await apiClient.campaigns.managerSharedPoolAction(campId, {
          customerId: targetId,
          action,
        });
        message.success(res.message || 'Thao tác quản lý thành công!');
        await Promise.all([fetchCampaignCustomers(), fetchSharedPoolOverview()]);
      } catch (err: any) {
        console.error('Manager pool action error:', err);
        message.error(err?.response?.data?.message || 'Thao tác thất bại');
      } finally {
        setActionLoadingId(null);
      }
    },
    [campaign?.id, fetchCampaignCustomers, fetchSharedPoolOverview]
  );

  return {
    sharedPoolOverview,
    setSharedPoolOverview,
    sharedPoolLoading,
    auditDrawerOpen,
    setAuditDrawerOpen,
    auditCustomer,
    setAuditCustomer,
    auditLogs,
    auditLogsLoading,
    actionLoadingId,
    historyRecoveryOpen,
    setHistoryRecoveryOpen,
    excludedDrawerOpen,
    setExcludedDrawerOpen,
    fetchSharedPoolOverview,
    handleClaimExpiredLocally,
    handleClaimCustomer,
    handleCallClaimedCustomer,
    handleReleaseCustomer,
    handleOpenAuditLogs,
    handleAdvanceBatch,
    handleTogglePause,
    handleManagerCustomerAction,
  };
}
