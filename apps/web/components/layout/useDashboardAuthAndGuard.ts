'use client';

import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import { useRouter } from 'next/navigation';
import {
  getDefaultRouteForRole,
  isAdminOrSuperAdminRole,
  isCvAllowedPath,
  isCvRole,
  isNonAdminAllowedDashboardPath,
  MENU_ACCESS_DEFINITIONS,
  type SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';

function clearDashboardSessionStorage() {
  localStorage.removeItem('mos_token');
  localStorage.removeItem('mos_user');
  localStorage.removeItem('mos_omicall_auto_init');
  clearImpersonationStorage();
}

function clearImpersonationStorage() {
  localStorage.removeItem('mos_original_token');
  localStorage.removeItem('mos_original_user');
  localStorage.removeItem('mos_original_omicall_auto_init');
  localStorage.removeItem('mos_impersonation_audit_id');
}

export function useDashboardAuthAndGuard(pathname: string) {
  const router = useRouter();
  const [user, setUser] = useState<SafeAny>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [routeVisibility, setRouteVisibility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const tokenStr = localStorage.getItem('mos_token');
    const storedUser = localStorage.getItem('mos_user');
    const originalToken = localStorage.getItem('mos_original_token');
    const originalUser = localStorage.getItem('mos_original_user');
    const hasOriginal = Boolean(originalToken && originalUser);

    if (!hasOriginal) {
      clearImpersonationStorage();
    }

    if (!tokenStr || !storedUser) {
      if (process.env.NODE_ENV !== 'production') {
        apiClient.auth
          .google({ isMock: true, email: 'danny.do@wingslashes.com', name: 'Danny Do' })
          .then((data: SafeAny) => {
            const { token, user: freshUser, resolvedOmicallAutoInit } = data;
            localStorage.setItem('mos_token', token);
            localStorage.setItem('mos_user', JSON.stringify(freshUser));
            localStorage.setItem('mos_omicall_auto_init', String(!!resolvedOmicallAutoInit));
            setUser(freshUser);
            setLoading(false);
          })
          .catch(() => {
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
              window.location.href = '/login';
            }
          });
        return;
      }

      clearDashboardSessionStorage();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid user payload in storage');
      }
      setUser(parsed);
      setIsImpersonating(hasOriginal);
      setLoading(false);

      if (isCvRole(parsed.role) && !isCvAllowedPath(pathname)) {
        router.replace('/dashboard/cv');
        return;
      }

      apiClient.auth
        .me()
        .then((freshUser: SafeAny) => {
          if (freshUser?.id) {
            localStorage.setItem('mos_user', JSON.stringify(freshUser));
            setUser(freshUser);
          }
        })
        .catch((err) => {
          console.error('Failed to sync profile in background:', err);
        });
    } catch (err) {
      console.error('Failed to parse stored user JSON:', err);
      clearDashboardSessionStorage();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!user?.id || isAdminOrSuperAdminRole(user.role)) return;
    const syncVisibility = (force = false) => {
      apiClient.menuAccess
        .getSidebarVisibility(force ? { force: true } : undefined)
        .then((res) => {
          setRouteVisibility(res?.data?.visibility || {});
        })
        .catch(() => {});
    };
    const handleMenuAccessUpdated = () => syncVisibility(true);
    syncVisibility(false);
    window.addEventListener('menu-access-updated', handleMenuAccessUpdated);
    return () => window.removeEventListener('menu-access-updated', handleMenuAccessUpdated);
  }, [user?.id, user?.role]);

  // Zero-Trust Admin-Only Default Route Guard (Layer 2)
  useEffect(() => {
    if (!user) return;
    if (isCvRole(user.role) && !isCvAllowedPath(pathname, routeVisibility, user.role, user.teamCodes)) {
      router.replace('/dashboard/cv');
      return;
    }
    if (
      !isAdminOrSuperAdminRole(user.role) &&
      Object.keys(routeVisibility).length > 0 &&
      !isNonAdminAllowedDashboardPath(pathname, routeVisibility, user.role, user.teamCodes)
    ) {
      const firstAllowedPath =
        MENU_ACCESS_DEFINITIONS.find(
          (def) => routeVisibility[def.key] === true && def.path.startsWith('/')
        )?.path.split('?')[0] || getDefaultRouteForRole(user.role);
      if (firstAllowedPath && firstAllowedPath !== pathname) {
        router.replace(firstAllowedPath);
      }
    }
  }, [user, pathname, routeVisibility, router]);

  const handleAvatarUpdated = useCallback((newAvatarUrl: string) => {
    setUser((prev: SafeAny) => (prev ? { ...prev, avatarUrl: newAvatarUrl, avatar: newAvatarUrl } : prev));
  }, []);

  const handleLogout = useCallback(() => {
    clearDashboardSessionStorage();
    setUser(null);
    setIsImpersonating(false);
    window.location.replace('/login');
  }, []);

  const handleExitImpersonation = useCallback(async () => {
    const origToken = localStorage.getItem('mos_original_token');
    const origUser = localStorage.getItem('mos_original_user');
    if (origToken && origUser) {
      const auditId = Number(localStorage.getItem('mos_impersonation_audit_id'));
      const originalOmicallAutoInit = localStorage.getItem('mos_original_omicall_auto_init');
      localStorage.setItem('mos_token', origToken);
      localStorage.setItem('mos_user', origUser);
      if (originalOmicallAutoInit !== null) {
        localStorage.setItem('mos_omicall_auto_init', originalOmicallAutoInit);
      } else {
        localStorage.removeItem('mos_omicall_auto_init');
      }
      clearImpersonationStorage();
      if (Number.isInteger(auditId) && auditId > 0) {
        await apiClient.auth.endImpersonation(auditId).catch((err) => {
          console.error('Failed to record impersonation exit:', err);
        });
      }
      message.success('Đã quay lại tài khoản Admin');
      window.location.href = '/dashboard/staff';
    }
  }, []);

  const hasAuthenticatedUser = !loading && Boolean(user?.id);
  const isCvAccount = isCvRole(user?.role);

  return {
    user,
    loading,
    isImpersonating,
    routeVisibility,
    hasAuthenticatedUser,
    isCvAccount,
    handleAvatarUpdated,
    handleLogout,
    handleExitImpersonation,
  };
}
