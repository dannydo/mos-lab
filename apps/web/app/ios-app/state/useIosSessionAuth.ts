'use client';

import { useEffect } from 'react';
import {
  canAccessIosConsultationApp,
  isAdminOrSuperAdminRole,
  isCvRole,
  resolveLockedIosRoleForUser,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import type { IosUserRole } from './useIosAppState';

/**
 * Authorizes `/ios-app` access using both primary role and active CRM team membership (`CC`),
 * refreshing `/auth/me` once when a cached session predates `teamCodes`.
 */
export function useIosSessionAuth(
  roleParam: IosUserRole | undefined,
  setRole: (role: IosUserRole) => void,
  setAuthorized: (authorized: boolean) => void
) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;

    const applyAuthorizedUser = (userObj: any) => {
      const userRole = String(userObj?.role || '').trim();
      const teamCodes = Array.isArray(userObj?.teamCodes) ? userObj.teamCodes : undefined;
      const userIsAdmin = isAdminOrSuperAdminRole(userRole);
      const savedRole = userIsAdmin
        ? (window.localStorage.getItem('mos_ios_selected_role') as IosUserRole | null)
        : null;
      const allowedRoles: readonly IosUserRole[] = ['CVL', 'CVLL', 'CC', 'CV', 'STORE', 'INVENTORY'];
      const effectiveRoleParam =
        roleParam || (userIsAdmin && savedRole && allowedRoles.includes(savedRole) ? savedRole : undefined);
      const lockedRole = resolveLockedIosRoleForUser(userRole, effectiveRoleParam, teamCodes);
      setRole(lockedRole);
      setAuthorized(true);
    };

    try {
      const token = window.localStorage.getItem('mos_token');
      const rawUser = window.localStorage.getItem('mos_user');
      if (!token || !rawUser) {
        const nextPath = `${window.location.pathname}${window.location.search}`;
        window.location.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }
      const parsed = JSON.parse(rawUser);
      const userRole = String(parsed?.role || '').trim();
      const teamCodes = Array.isArray(parsed?.teamCodes) ? parsed.teamCodes : undefined;

      if (canAccessIosConsultationApp(userRole, teamCodes)) {
        applyAuthorizedUser(parsed);
        return;
      }

      void Promise.resolve(apiClient.auth.me())
        .then((freshUser) => {
          if (cancelled) return;
          const freshRole = String(freshUser?.role || userRole).trim();
          const freshTeamCodes = Array.isArray(freshUser?.teamCodes) ? freshUser.teamCodes : undefined;
          if (freshUser?.id && canAccessIosConsultationApp(freshRole, freshTeamCodes)) {
            try {
              window.localStorage.setItem('mos_user', JSON.stringify({ ...parsed, ...freshUser }));
            } catch {}
            applyAuthorizedUser(freshUser);
            return;
          }
          window.location.replace(isCvRole(freshRole) ? '/dashboard/cv' : '/dashboard');
        })
        .catch(() => {
          if (!cancelled) {
            window.location.replace(isCvRole(userRole) ? '/dashboard/cv' : '/dashboard');
          }
        });
    } catch {
      window.location.replace('/login');
    }

    return () => {
      cancelled = true;
    };
  }, [roleParam, setRole, setAuthorized]);
}
