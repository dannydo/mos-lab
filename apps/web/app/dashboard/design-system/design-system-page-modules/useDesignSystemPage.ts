'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { themeTokens } from '@mos-lab/shared';
import { UI_CATALOG_ITEMS } from '~/components/design-system/catalog.manifest';
import { useTheme } from '~/context/ThemeContext';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';
import { apiClient } from '~/lib/api-client';
import type { DesignSystemUser } from './designSystemPageTypes';
import {
  computeCatalogAuditStats,
  filterCatalogItems,
  groupCatalogItemsByCategory,
  isDesignSystemAdmin,
} from './designSystemPageUtils';

function readStoredUser(): DesignSystemUser | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('mos_user');
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return (parsed?.user || parsed) as DesignSystemUser;
  } catch {
    return null;
  }
}

export function useDesignSystemPage() {
  const {
    coreThemeId,
    availableCoreThemes,
    setCoreThemeId,
    themeMode,
    toggleTheme,
    desktopDensity,
    effectiveDensity,
    setDesktopDensity,
    canManageThemes,
  } = useTheme();
  const router = useRouter();
  const responsiveTier = useResponsiveTier();

  const [user, setUser] = useState<DesignSystemUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ready-kits');
  const [auditFilter, setAuditFilter] = useState<string>('ALL');
  const [studioOpen, setStudioOpen] = useState(false);

  // Interactive Modals / Drawers for Demo
  const [activeDemoModal, setActiveDemoModal] = useState<string | null>(null);
  const [adaptiveModalOpen, setAdaptiveModalOpen] = useState(false);
  const [adaptiveDrawerOpen, setAdaptiveDrawerOpen] = useState(false);

  // Tabular Nums Counter Test State
  const [counter, setCounter] = useState(123456);

  useEffect(() => {
    const timer = setInterval(() => {
      setCounter((prev) => prev + Math.floor(Math.random() * 5) + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await apiClient.auth.me();
        const wrapped = res as ({ user?: DesignSystemUser } & DesignSystemUser) | null;
        let rawUser: DesignSystemUser | null = wrapped?.user || wrapped;
        if (!rawUser || !rawUser.role) {
          const fallbackUser = readStoredUser();
          if (fallbackUser) {
            rawUser = fallbackUser;
          }
        }
        setUser(rawUser);
      } catch (err) {
        console.error('Auth check error:', err);
        const fallbackUser = readStoredUser();
        if (fallbackUser) {
          setUser(fallbackUser);
        }
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const isAdmin = useMemo(() => isDesignSystemAdmin(user), [user]);
  const currentTokens = themeMode === 'dark' ? themeTokens.colors.dark : themeTokens.colors.light;

  const auditStats = useMemo(() => computeCatalogAuditStats(UI_CATALOG_ITEMS), []);
  const filteredComponents = useMemo(() => filterCatalogItems(UI_CATALOG_ITEMS, auditFilter), [auditFilter]);
  const groupedCategories = useMemo(() => groupCatalogItemsByCategory(filteredComponents), [filteredComponents]);

  const navigateToArchitecture = useCallback(() => {
    router.push('/dashboard/architecture');
  }, [router]);

  return {
    coreThemeId,
    availableCoreThemes,
    setCoreThemeId,
    themeMode,
    toggleTheme,
    desktopDensity,
    effectiveDensity,
    setDesktopDensity,
    canManageThemes,
    responsiveTier,
    user,
    loading,
    isAdmin,
    activeTab,
    setActiveTab,
    auditFilter,
    setAuditFilter,
    studioOpen,
    setStudioOpen,
    activeDemoModal,
    setActiveDemoModal,
    adaptiveModalOpen,
    setAdaptiveModalOpen,
    adaptiveDrawerOpen,
    setAdaptiveDrawerOpen,
    counter,
    currentTokens,
    auditStats,
    filteredComponents,
    groupedCategories,
    navigateToArchitecture,
  };
}
