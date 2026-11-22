'use client';

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { Staff, StaffAuditLog } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

export interface UseStaffPageExtrasOptions {
  isDrawerOpen: boolean;
  selectedStaffId?: number;
  staffList: Staff[];
  selectedRowKeys: React.Key[];
}

export function useStaffPageExtras({
  isDrawerOpen,
  selectedStaffId,
  staffList,
  selectedRowKeys,
}: UseStaffPageExtrasOptions) {
  const [auditLogs, setAuditLogs] = useState<StaffAuditLog[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [isOnboardingEmailModalOpen, setIsOnboardingEmailModalOpen] = useState(false);
  const [emailModalStaff, setEmailModalStaff] = useState<Staff | null>(null);
  const [emailModalBulkList, setEmailModalBulkList] = useState<Staff[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (isDrawerOpen && selectedStaffId) {
      setLoadingAuditLogs(true);
      apiClient.staff
        .getAuditLogs(selectedStaffId)
        .then((res: SafeAny) => {
          if (cancelled) return;
          if (res?.success && Array.isArray(res?.data)) {
            setAuditLogs(res.data);
          } else {
            setAuditLogs([]);
          }
        })
        .catch(() => {
          if (!cancelled) setAuditLogs([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingAuditLogs(false);
        });
    } else {
      setAuditLogs([]);
    }

    return () => {
      cancelled = true;
    };
  }, [isDrawerOpen, selectedStaffId]);

  const handleOpenSingleEmailModal = useCallback((record: Staff) => {
    setEmailModalStaff(record);
    setEmailModalBulkList([]);
    setIsOnboardingEmailModalOpen(true);
  }, []);

  const handleOpenBulkEmailModal = useCallback(() => {
    const selectedStaffList = staffList.filter((s) => selectedRowKeys.includes(s.id));
    setEmailModalStaff(null);
    setEmailModalBulkList(selectedStaffList);
    setIsOnboardingEmailModalOpen(true);
  }, [staffList, selectedRowKeys]);

  const handleCloseOnboardingEmailModal = useCallback(() => {
    setIsOnboardingEmailModalOpen(false);
    setEmailModalStaff(null);
    setEmailModalBulkList([]);
  }, []);

  return {
    auditLogs,
    loadingAuditLogs,
    isOnboardingEmailModalOpen,
    emailModalStaff,
    emailModalBulkList,
    handleOpenSingleEmailModal,
    handleOpenBulkEmailModal,
    handleCloseOnboardingEmailModal,
  };
}
