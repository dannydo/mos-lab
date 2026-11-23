'use client';

import { useCallback, useEffect, useState } from 'react';
import { isCanonicalSuperAdminIdentity, isSuperAdminRole, type SafeAny } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { BUG_INBOX_UPDATED_EVENT, readCampaignVisibility, readShowCustomCampaigns } from './sidebarNavUtils';

interface UseSidebarDataParams {
  userRole?: string;
  userIdentity?: { username?: string | null; email?: string | null };
  isCvAccount: boolean;
}

export function useSidebarData({ userRole, userIdentity, isCvAccount }: UseSidebarDataParams) {
  const [activeCampaigns, setActiveCampaigns] = useState<SafeAny[]>([]);
  const [academySidebarCampaigns, setAcademySidebarCampaigns] = useState<SafeAny[]>([]);
  const [academyAccess, setAcademyAccess] = useState(false);
  const [menuVisibility, setMenuVisibility] = useState<Record<string, boolean>>({});
  const [categoryVisibility, setCategoryVisibility] = useState<Record<string, boolean>>({});
  const [bugInboxApprovalCount, setBugInboxApprovalCount] = useState(0);
  const [showCustomCampaigns, setShowCustomCampaigns] = useState<boolean>(readShowCustomCampaigns);
  const [campaignVisibility, setCampaignVisibility] = useState<Record<string, boolean>>(readCampaignVisibility);

  const fetchActiveCampaigns = useCallback(() => {
    if (isCvAccount) {
      setActiveCampaigns([]);
      return;
    }
    apiClient.campaigns
      .list({ pageSize: 100 })
      .then((res: SafeAny) => {
        const list = Array.isArray(res) ? res : res?.items || res?.data || [];
        setActiveCampaigns(list);
      })
      .catch((err) => {
        console.error('Fetch campaigns for sidebar error:', err);
      });
  }, [isCvAccount]);

  const fetchAcademySidebarCampaigns = useCallback(() => {
    if (isCvAccount || !academyAccess) {
      setAcademySidebarCampaigns([]);
      return;
    }
    apiClient.academySales.campaigns
      .sidebar()
      .then((campaigns) => setAcademySidebarCampaigns(Array.isArray(campaigns) ? campaigns : []))
      .catch(() => setAcademySidebarCampaigns([]));
  }, [academyAccess, isCvAccount]);

  const fetchAcademyAccess = useCallback(() => {
    if (isCvAccount) {
      setAcademyAccess(false);
      setAcademySidebarCampaigns([]);
      return;
    }
    apiClient.academySales
      .getAccess()
      .then((response) => setAcademyAccess(response.data.canAccess === true))
      .catch(() => {
        setAcademyAccess(false);
        setAcademySidebarCampaigns([]);
      });
  }, [isCvAccount]);

  const fetchMenuVisibility = useCallback((force = false) => {
    apiClient.menuAccess
      .getSidebarVisibility(force ? { force: true } : undefined)
      .then((response) => {
        setMenuVisibility(response.data.visibility || {});
        setCategoryVisibility(response.data.categoryVisibility || {});
      })
      // Preserve the base sidebar when the policy service is temporarily unavailable.
      .catch(() => {
        setMenuVisibility({});
        setCategoryVisibility({});
      });
  }, []);

  const canTriageBugInbox = isSuperAdminRole(userRole) && isCanonicalSuperAdminIdentity(userIdentity ?? {});

  const fetchBugInboxApprovalCount = useCallback(() => {
    if (!canTriageBugInbox) {
      setBugInboxApprovalCount(0);
      return;
    }
    apiClient.bugReports
      .badgeSummary({ isPolling: true })
      .then((response) => setBugInboxApprovalCount(response?.readyForDannyCount ?? 0))
      .catch(() => setBugInboxApprovalCount(0));
  }, [canTriageBugInbox]);

  useEffect(() => {
    const handleToggle = () => {
      setShowCustomCampaigns(readShowCustomCampaigns());
      setCampaignVisibility(readCampaignVisibility());
      fetchActiveCampaigns();
      fetchAcademyAccess();
      fetchAcademySidebarCampaigns();
      fetchMenuVisibility();
    };

    window.addEventListener('storage', handleToggle);
    window.addEventListener('mos_sidebar_toggle', handleToggle);
    window.addEventListener('academy-campaign-sidebar-updated', fetchAcademySidebarCampaigns);
    return () => {
      window.removeEventListener('storage', handleToggle);
      window.removeEventListener('mos_sidebar_toggle', handleToggle);
      window.removeEventListener('academy-campaign-sidebar-updated', fetchAcademySidebarCampaigns);
    };
  }, [fetchAcademyAccess, fetchActiveCampaigns, fetchAcademySidebarCampaigns, fetchMenuVisibility]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchActiveCampaigns();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [fetchActiveCampaigns]);

  useEffect(() => {
    fetchAcademySidebarCampaigns();
  }, [fetchAcademySidebarCampaigns]);

  useEffect(() => {
    if (!userRole) return;
    const timer = window.setTimeout(() => {
      fetchAcademyAccess();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [fetchAcademyAccess, userRole]);

  useEffect(() => {
    const handleMenuAccessUpdated = () => fetchMenuVisibility(true);
    window.addEventListener('menu-access-updated', handleMenuAccessUpdated);
    return () => window.removeEventListener('menu-access-updated', handleMenuAccessUpdated);
  }, [fetchMenuVisibility]);

  useEffect(() => {
    if (!userRole) return;
    fetchMenuVisibility();
  }, [fetchMenuVisibility, userRole]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      fetchBugInboxApprovalCount();
    }, 300);
    if (!canTriageBugInbox) return () => window.clearTimeout(initialTimer);
    const refresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      fetchBugInboxApprovalCount();
    };
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener(BUG_INBOX_UPDATED_EVENT, refresh);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      window.removeEventListener(BUG_INBOX_UPDATED_EVENT, refresh);
    };
  }, [canTriageBugInbox, fetchBugInboxApprovalCount]);

  return {
    activeCampaigns,
    academySidebarCampaigns,
    academyAccess,
    menuVisibility,
    categoryVisibility,
    bugInboxApprovalCount,
    showCustomCampaigns,
    campaignVisibility,
  };
}
