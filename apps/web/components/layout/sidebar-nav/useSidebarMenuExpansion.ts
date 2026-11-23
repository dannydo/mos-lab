'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  persistOpenMenuKeys,
  readCollapsedGroupKeys,
  SIDEBAR_COLLAPSED_GROUPS_CHANGED_EVENT,
  syncOpenKeysForPathname,
  writeCollapsedGroupKeys,
} from './sidebarNavUtils';

export function useSidebarMenuExpansion(pathname: string) {
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<string[]>([]);
  const [openRailMenuKey, setOpenRailMenuKey] = useState<string | null>(null);

  useEffect(() => {
    const syncCollapsedGroups = () => setCollapsedGroupKeys(readCollapsedGroupKeys());
    syncCollapsedGroups();
    window.addEventListener('storage', syncCollapsedGroups);
    window.addEventListener(SIDEBAR_COLLAPSED_GROUPS_CHANGED_EVENT, syncCollapsedGroups);
    return () => {
      window.removeEventListener('storage', syncCollapsedGroups);
      window.removeEventListener(SIDEBAR_COLLAPSED_GROUPS_CHANGED_EVENT, syncCollapsedGroups);
    };
  }, []);

  useEffect(() => {
    setOpenRailMenuKey(null);
  }, [pathname]);

  useEffect(() => {
    setOpenKeys(syncOpenKeysForPathname(pathname));
  }, [pathname]);

  const handleOpenChange = useCallback((keys: string[]) => {
    setOpenKeys(keys);
    persistOpenMenuKeys(keys);
  }, []);

  const handleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroupKeys((currentKeys) => {
      const nextKeys = currentKeys.includes(groupKey)
        ? currentKeys.filter((key) => key !== groupKey)
        : [...currentKeys, groupKey];
      writeCollapsedGroupKeys(nextKeys);
      window.queueMicrotask(() => window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_GROUPS_CHANGED_EVENT)));
      return nextKeys;
    });
  }, []);

  return {
    openKeys,
    handleOpenChange,
    collapsedGroupKeys,
    handleGroupCollapse,
    openRailMenuKey,
    setOpenRailMenuKey,
  };
}
