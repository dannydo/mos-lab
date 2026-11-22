import {
  BarChart2,
  Bookmark,
  Calendar,
  Clock,
  Compass,
  FileText,
  Globe,
  Heart,
  Layers,
  Pin,
  Rocket,
  Sparkles,
  Target,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { PinnedLinkItem } from '@mos-lab/shared';
import type { SidebarGroupConfig, SidebarItemConfig } from '../../../config/sidebar.config';
import type { MenuItemLookup, PinnedSidebarItemConfig } from './sidebarNavTypes';
import type React from 'react';

export const SIDEBAR_COLLAPSED_GROUPS_STORAGE_KEY = 'mos_sidebar_collapsed_groups_v1';
export const LEGACY_SIDEBAR_COLLAPSED_GROUPS_STORAGE_KEY = 'mos_sidebar_collapsed_groups';
export const SIDEBAR_COLLAPSED_GROUPS_CHANGED_EVENT = 'mos_sidebar_collapsed_groups_changed';
export const BUG_INBOX_UPDATED_EVENT = 'mos-bug-inbox-updated';
export const SHOW_CUSTOM_CAMPAIGNS_STORAGE_KEY = 'mos_sidebar_show_custom_campaigns';
export const CAMPAIGN_VISIBILITY_STORAGE_KEY = 'mos_sidebar_campaign_visibility';
export const MENU_OPEN_KEYS_STORAGE_KEY = 'mos_menu_openKeys';
export const PINNED_EMPTY_PLACEHOLDER_KEY = 'pinned-empty-placeholder';

const MOBILE_EXCLUDED_GROUP_KEYS = new Set(['grp-system', 'grp-diagrams']);
const MOBILE_EXCLUDED_ITEM_KEYS = new Set([
  'catalog',
  'architecture',
  'diagrams',
  'menu-access',
  'design-system',
  'teams',
]);

export function getPinnedIconComponent(iconName?: string): LucideIcon {
  switch (iconName) {
    case 'Bookmark':
      return Bookmark;
    case 'Sparkles':
      return Sparkles;
    case 'Heart':
      return Heart;
    case 'Rocket':
      return Rocket;
    case 'Target':
      return Target;
    case 'Globe':
      return Globe;
    case 'BarChart2':
      return BarChart2;
    case 'Calendar':
      return Calendar;
    case 'FileText':
      return FileText;
    case 'Clock':
      return Clock;
    case 'Layers':
      return Layers;
    case 'Zap':
      return Zap;
    case 'Compass':
      return Compass;
    default:
      return Pin;
  }
}

export function readCollapsedGroupKeys(): string[] {
  try {
    const currentValue = window.localStorage.getItem(SIDEBAR_COLLAPSED_GROUPS_STORAGE_KEY);
    const raw = currentValue ?? window.localStorage.getItem(LEGACY_SIDEBAR_COLLAPSED_GROUPS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const keys = Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : [];
    if (currentValue === null && raw !== null) {
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_GROUPS_STORAGE_KEY, JSON.stringify(keys));
      } catch {
        // Keep the parsed legacy state even when the migration write is unavailable.
      }
    }
    return keys;
  } catch {
    return [];
  }
}

export function writeCollapsedGroupKeys(keys: string[]): void {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_GROUPS_STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // The in-memory state still works when browser storage is unavailable.
  }
}

export function readShowCustomCampaigns(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(SHOW_CUSTOM_CAMPAIGNS_STORAGE_KEY);
  return saved !== null ? saved === 'true' : true;
}

export function readCampaignVisibility(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  const saved = localStorage.getItem(CAMPAIGN_VISIBILITY_STORAGE_KEY);
  if (!saved) return {};
  try {
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function syncOpenKeysForPathname(pathname: string): string[] {
  let keys: string[] = [];
  try {
    const savedOpenKeys = localStorage.getItem(MENU_OPEN_KEYS_STORAGE_KEY);
    const parsed = savedOpenKeys ? JSON.parse(savedOpenKeys) : [];
    if (Array.isArray(parsed)) {
      keys = parsed.filter((key): key is string => typeof key === 'string');
    }
  } catch {
    keys = [];
  }

  let didOpenActiveParent = false;
  const legacyAcademyIndex = keys.indexOf('wings-academy');
  if (legacyAcademyIndex >= 0) {
    keys[legacyAcademyIndex] = 'academy';
    didOpenActiveParent = true;
  }

  const routeParentPairs: Array<[string[], string]> = [
    [['/dashboard/customers', '/dashboard/referrals'], 'customers-parent'],
    [['/dashboard/nyc'], 'nyc-parent'],
    [['/dashboard/academy-leads'], 'academy'],
    [['/dashboard/staff'], 'staff'],
  ];

  for (const [segments, parentKey] of routeParentPairs) {
    if (segments.some((segment) => pathname.includes(segment)) && !keys.includes(parentKey)) {
      keys.push(parentKey);
      didOpenActiveParent = true;
    }
  }

  if (didOpenActiveParent) {
    try {
      localStorage.setItem(MENU_OPEN_KEYS_STORAGE_KEY, JSON.stringify(keys));
    } catch {
      // Ignore storage write failures when browser storage is restricted.
    }
  }

  return keys;
}

export function persistOpenMenuKeys(keys: string[]): void {
  try {
    localStorage.setItem(MENU_OPEN_KEYS_STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // Ignore storage write failures when browser storage is restricted.
  }
}

export function countLeafItems(items: SidebarItemConfig[]): number {
  return items.reduce((total, item) => total + (item.children?.length ? countLeafItems(item.children) : 1), 0);
}

export function containsSelectedItem(item: SidebarItemConfig, selectedKey: string): boolean {
  return item.key === selectedKey || item.children?.some((child) => containsSelectedItem(child, selectedKey)) === true;
}

export function filterMobileSidebarGroups(groups: SidebarGroupConfig[]): SidebarGroupConfig[] {
  return groups
    .filter((group) => !MOBILE_EXCLUDED_GROUP_KEYS.has(group.groupKey))
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !MOBILE_EXCLUDED_ITEM_KEYS.has(item.key)),
    }))
    .filter((group) => group.items.length > 0);
}

export function buildMenuItemLookup(groups: SidebarGroupConfig[]): MenuItemLookup {
  const byKey = new Map<string, SidebarItemConfig>();
  const byPath = new Map<string, SidebarItemConfig>();

  const traverse = (items: SidebarItemConfig[]) => {
    for (const item of items) {
      if (item.key) byKey.set(item.key, item);
      if (item.path) {
        byPath.set(item.path, item);
        const clean = item.path.split('?')[0];
        if (clean && !byPath.has(clean)) {
          byPath.set(clean, item);
        }
      }
      if (item.children?.length) {
        traverse(item.children);
      }
    }
  };

  for (const group of groups) {
    traverse(group.items);
  }

  return { byKey, byPath };
}

export function buildPinnedGroup(
  pinnedLinks: PinnedLinkItem[],
  resolveIcon: (item: PinnedLinkItem) => React.ReactNode
): SidebarGroupConfig {
  return {
    groupKey: 'grp-pinned',
    groupTitle: 'ĐÃ GHIM',
    items: pinnedLinks.map((item): PinnedSidebarItemConfig => ({
      key: `pinned-${item.id}`,
      label: item.title === 'mOS Inbox' ? 'mOS Mission' : item.title,
      path: item.url,
      icon: resolveIcon(item),
      isExternal: item.isExternal,
      pinnedId: item.id,
      menuKey: item.menuKey,
    })),
  };
}
