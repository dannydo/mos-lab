'use client';

import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import type { SafeAny } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { pollWithAbort, pollingCoordinator } from '../../lib/api/base';

export interface DashboardOnlineMember {
  id: string;
  initials: string;
  name: string;
  avatarUrl: string | null;
  color: string;
}

const ONLINE_MEMBER_COLOR_MAP: Record<string, string> = {
  TN: 'linear-gradient(135deg, #EC4899, #DB2777)',
  HM: 'linear-gradient(135deg, #A855F7, #9333EA)',
  VT: 'linear-gradient(135deg, #06B6D4, #0891B2)',
  KL: 'linear-gradient(135deg, #10B981, #059669)',
  TH: 'linear-gradient(135deg, #F97316, #EA580C)',
  DD: 'linear-gradient(135deg, #D4A84B, #B8902F)',
};

const isDocumentVisible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

export function useDashboardHeaderPolling(hasAuthenticatedUser: boolean, isCvAccount: boolean) {
  const [onlineMembers, setOnlineMembers] = useState<DashboardOnlineMember[]>([]);
  const [dailyCallsCount, setDailyCallsCount] = useState(0);
  const [pendingAllocationCount, setPendingAllocationCount] = useState(0);
  const [workingCvCount, setWorkingCvCount] = useState(0);
  const [deployedAt, setDeployedAt] = useState<string | null>(null);

  const fetchWorkingCvCount = useCallback(async () => {
    await pollWithAbort('layout:workingCv', async (signal) => {
      const res = await apiClient.customers.getCvRealtimeStatus({ countOnly: true }, { signal, isPolling: true });
      if (res?.workingCvCount !== undefined) {
        setWorkingCvCount((prev) => (prev === res.workingCvCount ? prev : res.workingCvCount!));
      } else if (res?.staffStatuses) {
        setWorkingCvCount((prev) => (prev === res.staffStatuses.length ? prev : res.staffStatuses.length));
      }
      return res;
    });
  }, []);

  useEffect(() => {
    if (!hasAuthenticatedUser || isCvAccount) return;
    const initialTimer = setTimeout(() => {
      if (isDocumentVisible()) fetchWorkingCvCount();
    }, 350);
    const interval = setInterval(() => {
      if (isDocumentVisible()) fetchWorkingCvCount();
    }, 30000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [fetchWorkingCvCount, hasAuthenticatedUser, isCvAccount]);

  const fetchReleaseMarker = useCallback(async () => {
    await pollWithAbort('layout:releaseMarker', async (signal) => {
      const release = await apiClient.release.get({ signal, isPolling: true });
      setDeployedAt(release.deployedAt);
      return release;
    });
  }, []);

  useEffect(() => {
    if (!hasAuthenticatedUser) return;
    const initialTimer = setTimeout(() => {
      if (isDocumentVisible()) fetchReleaseMarker();
    }, 1200);
    const interval = setInterval(() => {
      if (isDocumentVisible()) fetchReleaseMarker();
    }, 60000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [fetchReleaseMarker, hasAuthenticatedUser]);

  const fetchPendingAllocationsCount = useCallback(async () => {
    await pollWithAbort('layout:pendingAllocations', async (signal) => {
      const list = await apiClient.allocation.getPendingBatches({ signal, isPolling: true });
      setPendingAllocationCount(list?.length || 0);
      return list;
    });
  }, []);

  useEffect(() => {
    if (!hasAuthenticatedUser || isCvAccount) return;
    const initialTimer = setTimeout(() => {
      if (isDocumentVisible()) fetchPendingAllocationsCount();
    }, 550);
    const interval = setInterval(() => {
      if (isDocumentVisible()) fetchPendingAllocationsCount();
    }, 35000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [fetchPendingAllocationsCount, hasAuthenticatedUser, isCvAccount]);

  const fetchDailyCallsCount = useCallback(async () => {
    await pollWithAbort('layout:dailyCalls', async (signal) => {
      const todayStr = dayjs().format('YYYY-MM-DD');
      const res = await apiClient.calls.listDaily({ date: todayStr, scope: 'me' }, { signal, isPolling: true });
      setDailyCallsCount(res?.length || 0);
      return res;
    });
  }, []);

  useEffect(() => {
    if (!hasAuthenticatedUser || isCvAccount) return;
    const initialTimer = setTimeout(() => {
      if (isDocumentVisible()) fetchDailyCallsCount();
    }, 750);
    const interval = setInterval(() => {
      if (isDocumentVisible()) fetchDailyCallsCount();
    }, 40000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [fetchDailyCallsCount, hasAuthenticatedUser, isCvAccount]);

  const fetchOnlineStaff = useCallback(async () => {
    await pollWithAbort('layout:onlineStaff', async (signal) => {
      const list = await apiClient.staff.list(undefined, { signal, isPolling: true });
      if (!Array.isArray(list)) return [];
      const now = dayjs();
      const storedUserStr = typeof window !== 'undefined' ? localStorage.getItem('mos_user') : null;
      let currentUserId = '';
      if (storedUserStr) {
        try {
          currentUserId = JSON.parse(storedUserStr).id;
        } catch {}
      }

      const filtered = list.filter((m: SafeAny) => {
        const isUserActive = m.isActive === true || m.isActive === 1 || m.isActive === '1';
        const isOnline = !!(m.lastActiveAt && now.diff(dayjs(m.lastActiveAt), 'minute') < 5);
        return isUserActive && isOnline && m.id !== currentUserId;
      });

      const mapped: DashboardOnlineMember[] = filtered.map((m: SafeAny) => {
        const initials = m.displayName
          ? m.displayName
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()
          : m.username?.slice(0, 2).toUpperCase() || '??';

        const rawAvatar = m.avatarUrl || m.avatar || null;
        const formattedAvatar = rawAvatar
          ? rawAvatar.replace(/^https?:\/\/(s|api|www)?\.?wingslashes\.com/, 'https://cdn.wingslashes.com')
          : null;

        return {
          id: String(m.id),
          initials,
          name: m.displayName || m.username,
          avatarUrl: formattedAvatar,
          color: ONLINE_MEMBER_COLOR_MAP[initials] || 'linear-gradient(135deg, #6B7280, #4B5563)',
        };
      });

      setOnlineMembers((prev) => {
        try {
          return JSON.stringify(prev) === JSON.stringify(mapped) ? prev : mapped;
        } catch {
          return mapped;
        }
      });
      return mapped;
    });
  }, []);

  useEffect(() => {
    if (!hasAuthenticatedUser || isCvAccount) return;
    const initialTimer = setTimeout(() => {
      if (isDocumentVisible()) fetchOnlineStaff();
    }, 950);
    const interval = setInterval(() => {
      if (isDocumentVisible()) fetchOnlineStaff();
    }, 45000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [fetchOnlineStaff, hasAuthenticatedUser, isCvAccount]);

  useEffect(() => {
    if (!hasAuthenticatedUser || isCvAccount) return;
    let t1: ReturnType<typeof setTimeout> | undefined;
    let t2: ReturnType<typeof setTimeout> | undefined;
    let t3: ReturnType<typeof setTimeout> | undefined;

    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'hidden') {
        pollingCoordinator.abortAll('TAB_HIDDEN');
      } else if (document.visibilityState === 'visible') {
        fetchWorkingCvCount();
        t1 = setTimeout(() => {
          if (isDocumentVisible()) fetchPendingAllocationsCount();
        }, 200);
        t2 = setTimeout(() => {
          if (isDocumentVisible()) fetchDailyCallsCount();
        }, 400);
        t3 = setTimeout(() => {
          if (isDocumentVisible()) fetchOnlineStaff();
        }, 600);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      pollingCoordinator.abortAll('UNMOUNT');
    };
  }, [
    fetchWorkingCvCount,
    fetchPendingAllocationsCount,
    fetchDailyCallsCount,
    fetchOnlineStaff,
    hasAuthenticatedUser,
    isCvAccount,
  ]);

  return {
    onlineMembers,
    dailyCallsCount,
    pendingAllocationCount,
    workingCvCount,
    deployedAt,
    fetchDailyCallsCount,
    fetchPendingAllocationsCount,
  };
}
