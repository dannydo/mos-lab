'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Menu, Popover, Tooltip, message } from 'antd';
import {
  ChevronDown,
  ChevronRight,
  Pin,
  PinOff,
  Plus,
  ExternalLink,
  GripVertical,
  Bookmark,
  Sparkles,
  Heart,
  Rocket,
  Target,
  Globe,
  FileText,
  Clock,
  Layers,
  Zap,
  BarChart2,
  Calendar,
  Compass,
} from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { isCanonicalSuperAdminIdentity, isSuperAdminRole, SafeAny, PinnedLinkItem } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import {
  getSidebarGroups,
  getSelectedMenuKey,
  SidebarItemConfig,
  SidebarGroupConfig,
} from '../../config/sidebar.config';
import { AppIcon } from '../ui/AppIcon';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';
import { usePinnedLinks } from '../../hooks/usePinnedLinks';
import { AddPinnedLinkModal } from './AddPinnedLinkModal';

interface SidebarNavProps {
  collapsed: boolean;
  themeMode: string;
  token: SafeAny;
  userRole?: string;
  userId?: number | string;
  userIdentity?: { username?: string | null; email?: string | null };
  onNavigate?: () => void;
}

function getPinnedIconComponent(iconName?: string) {
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

const SIDEBAR_COLLAPSED_GROUPS_STORAGE_KEY = 'mos_sidebar_collapsed_groups_v1';
const LEGACY_SIDEBAR_COLLAPSED_GROUPS_STORAGE_KEY = 'mos_sidebar_collapsed_groups';
const SIDEBAR_COLLAPSED_GROUPS_CHANGED_EVENT = 'mos_sidebar_collapsed_groups_changed';
const BUG_INBOX_UPDATED_EVENT = 'mos-bug-inbox-updated';

function readCollapsedGroupKeys(): string[] {
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

function countLeafItems(items: SidebarItemConfig[]): number {
  return items.reduce((total, item) => total + (item.children?.length ? countLeafItems(item.children) : 1), 0);
}

function containsSelectedItem(item: SidebarItemConfig, selectedKey: string): boolean {
  return item.key === selectedKey || item.children?.some((child) => containsSelectedItem(child, selectedKey)) === true;
}

export default function SidebarNav({
  collapsed,
  themeMode,
  token,
  userRole,
  userId,
  userIdentity,
  onNavigate,
}: SidebarNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const assignedStaffId = searchParams.get('assignedStaffId');

  const { pinnedLinks, isPinned, pinLink, unpinLink, reorderLinks } = usePinnedLinks(userId || userIdentity?.username);

  const [isAddPinnedModalOpen, setIsAddPinnedModalOpen] = useState(false);
  const [draggedPinId, setDraggedPinId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedPinId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedPinId;
    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = pinnedLinks.findIndex((p) => p.id === sourceId);
    const targetIndex = pinnedLinks.findIndex((p) => p.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const nextItems = [...pinnedLinks];
    const [removed] = nextItems.splice(sourceIndex, 1);
    nextItems.splice(targetIndex, 0, removed);
    reorderLinks(nextItems);
    setDraggedPinId(null);
  };

  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<SafeAny[]>([]);
  const [academySidebarCampaigns, setAcademySidebarCampaigns] = useState<SafeAny[]>([]);
  const [academyAccess, setAcademyAccess] = useState(false);
  const [menuVisibility, setMenuVisibility] = useState<Record<string, boolean>>({});
  const [categoryVisibility, setCategoryVisibility] = useState<Record<string, boolean>>({});
  const [bugInboxApprovalCount, setBugInboxApprovalCount] = useState(0);
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<string[]>([]);
  const [openRailMenuKey, setOpenRailMenuKey] = useState<string | null>(null);
  const [showCustomCampaigns, setShowCustomCampaigns] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_sidebar_show_custom_campaigns');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  const [campaignVisibility, setCampaignVisibility] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_sidebar_campaign_visibility');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (_) {}
      }
    }
    return {};
  });

  const fetchActiveCampaigns = useCallback(() => {
    apiClient.campaigns
      .list({ pageSize: 100 })
      .then((res: SafeAny) => {
        const list = Array.isArray(res) ? res : res?.items || res?.data || [];
        setActiveCampaigns(list);
      })
      .catch((err) => {
        console.error('Fetch campaigns for sidebar error:', err);
      });
  }, []);

  const fetchAcademySidebarCampaigns = useCallback(() => {
    if (!academyAccess) {
      setAcademySidebarCampaigns([]);
      return;
    }
    apiClient.academySales.campaigns
      .sidebar()
      .then((campaigns) => setAcademySidebarCampaigns(Array.isArray(campaigns) ? campaigns : []))
      .catch(() => setAcademySidebarCampaigns([]));
  }, [academyAccess]);

  const fetchAcademyAccess = useCallback(() => {
    apiClient.academySales
      .getAccess()
      .then((response) => setAcademyAccess(response.data.canAccess === true))
      .catch(() => {
        setAcademyAccess(false);
        setAcademySidebarCampaigns([]);
      });
  }, []);

  const fetchMenuVisibility = useCallback(() => {
    apiClient.menuAccess
      .getSidebarVisibility()
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
      .list({ page: 1, limit: 10, requestType: 'ALL', status: 'ALL', priority: 'ALL', clarification: 'ALL' })
      .then((response) => setBugInboxApprovalCount(response.summary?.readyForDannyCount ?? 0))
      .catch(() => setBugInboxApprovalCount(0));
  }, [canTriageBugInbox]);

  useEffect(() => {
    const handleToggle = () => {
      const saved = localStorage.getItem('mos_sidebar_show_custom_campaigns');
      setShowCustomCampaigns(saved !== null ? saved === 'true' : true);
      const savedVis = localStorage.getItem('mos_sidebar_campaign_visibility');
      if (savedVis) {
        try {
          setCampaignVisibility(JSON.parse(savedVis));
        } catch (_) {}
      }
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
    fetchActiveCampaigns();
  }, [fetchActiveCampaigns]);

  useEffect(() => {
    fetchAcademySidebarCampaigns();
  }, [fetchAcademySidebarCampaigns]);

  useEffect(() => {
    fetchAcademyAccess();
  }, [fetchAcademyAccess, userRole]);

  useEffect(() => {
    const handleMenuAccessUpdated = () => fetchMenuVisibility();
    window.addEventListener('menu-access-updated', handleMenuAccessUpdated);
    return () => window.removeEventListener('menu-access-updated', handleMenuAccessUpdated);
  }, [fetchMenuVisibility]);

  useEffect(() => {
    fetchMenuVisibility();
  }, [fetchMenuVisibility, userRole]);

  useEffect(() => {
    fetchBugInboxApprovalCount();
    if (!canTriageBugInbox) return;
    const refresh = () => fetchBugInboxApprovalCount();
    const interval = window.setInterval(refresh, 30_000);
    window.addEventListener(BUG_INBOX_UPDATED_EVENT, refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(BUG_INBOX_UPDATED_EVENT, refresh);
    };
  }, [canTriageBugInbox, fetchBugInboxApprovalCount]);

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
    const savedOpenKeys = localStorage.getItem('mos_menu_openKeys');
    let keys: string[] = savedOpenKeys ? JSON.parse(savedOpenKeys) : [];
    let didOpenActiveParent = false;
    const legacyAcademyIndex = keys.indexOf('wings-academy');
    if (legacyAcademyIndex >= 0) {
      keys[legacyAcademyIndex] = 'academy';
      didOpenActiveParent = true;
    }
    if (pathname.includes('/dashboard/customers') || pathname.includes('/dashboard/referrals')) {
      if (!keys.includes('customers-parent')) {
        keys.push('customers-parent');
        didOpenActiveParent = true;
      }
    }
    if (pathname.includes('/dashboard/nyc')) {
      if (!keys.includes('nyc-parent')) {
        keys.push('nyc-parent');
        didOpenActiveParent = true;
      }
    }
    if (pathname.includes('/dashboard/academy-leads')) {
      if (!keys.includes('academy')) {
        keys.push('academy');
        didOpenActiveParent = true;
      }
    }
    if (pathname.includes('/dashboard/staff')) {
      if (!keys.includes('staff')) {
        keys.push('staff');
        didOpenActiveParent = true;
      }
    }
    if (
      pathname.includes('/dashboard/labs') ||
      pathname.includes('/dashboard/career-path') ||
      pathname.includes('/dashboard/pilot-dark-lashes') ||
      pathname.includes('/dashboard/payroll-pilot')
    ) {
      if (!keys.includes('labs-parent')) {
        keys.push('labs-parent');
        didOpenActiveParent = true;
      }
    }
    if (didOpenActiveParent) localStorage.setItem('mos_menu_openKeys', JSON.stringify(keys));
    setOpenKeys(keys);
  }, [pathname]);

  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
    localStorage.setItem('mos_menu_openKeys', JSON.stringify(keys));
  };

  const handleGroupCollapse = useCallback((groupKey: string) => {
    setCollapsedGroupKeys((currentKeys) => {
      const nextKeys = currentKeys.includes(groupKey)
        ? currentKeys.filter((key) => key !== groupKey)
        : [...currentKeys, groupKey];
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_GROUPS_STORAGE_KEY, JSON.stringify(nextKeys));
      } catch {
        // The in-memory state still works when browser storage is unavailable.
      }
      window.queueMicrotask(() => window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_GROUPS_CHANGED_EVENT)));
      return nextKeys;
    });
  }, []);

  const selectedKey = getSelectedMenuKey(pathname, assignedStaffId, academySidebarCampaigns, searchParams.get('tab'));
  const sidebarGroups = getSidebarGroups(
    userRole,
    activeCampaigns,
    showCustomCampaigns,
    campaignVisibility,
    academySidebarCampaigns,
    academyAccess,
    menuVisibility,
    categoryVisibility,
    userIdentity,
    bugInboxApprovalCount
  );

  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';

  const displayedGroups = isMobile
    ? sidebarGroups
        .filter((group) => group.groupKey !== 'grp-system' && group.groupKey !== 'grp-diagrams')
        .map((group) => ({
          ...group,
          items: group.items.filter(
            (item) =>
              item.key !== 'catalog' &&
              item.key !== 'architecture' &&
              item.key !== 'diagrams' &&
              item.key !== 'menu-access' &&
              item.key !== 'design-system' &&
              item.key !== 'teams'
          ),
        }))
        .filter((group) => group.items.length > 0)
    : sidebarGroups;

  const menuItemLookup = useMemo(() => {
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

    for (const group of sidebarGroups) {
      traverse(group.items);
    }

    return { byKey, byPath };
  }, [sidebarGroups]);

  const getResolvedPinnedIcon = useCallback(
    (item: PinnedLinkItem, isExpanded = false) => {
      // 1. Try finding in sidebar menu config (by menuKey first, then url)
      const matched =
        (item.menuKey ? menuItemLookup.byKey.get(item.menuKey) : undefined) ||
        (item.url
          ? menuItemLookup.byPath.get(item.url) || menuItemLookup.byPath.get(item.url.split('?')[0])
          : undefined);

      if (matched?.icon) {
        return matched.icon;
      }

      // 2. Custom icon selected from AddPinnedLinkModal
      if (item.icon && item.icon !== 'Pin') {
        const CustomIconComp = getPinnedIconComponent(item.icon);
        return <AppIcon icon={CustomIconComp} size="sm" className={isExpanded ? 'text-pink-500' : undefined} />;
      }

      // 3. Fallback to Pin
      return <AppIcon icon={Pin} size="sm" className="text-pink-500" />;
    },
    [menuItemLookup]
  );

  const pinnedGroup: SidebarGroupConfig = {
    groupKey: 'grp-pinned',
    groupTitle: 'ĐÃ GHIM',
    items: pinnedLinks.map(
      (item) =>
        ({
          key: `pinned-${item.id}`,
          label: item.title,
          path: item.url,
          icon: getResolvedPinnedIcon(item, true),
          isExternal: item.isExternal,
          pinnedId: item.id,
          menuKey: item.menuKey,
        }) as SidebarItemConfig & { isExternal?: boolean; pinnedId?: string; menuKey?: string }
    ),
  };

  const allDisplayedGroups: SidebarGroupConfig[] = [pinnedGroup, ...displayedGroups];

  const createMenuItem = (item: SidebarItemConfig, depth = 0): SafeAny => {
    const customItem = item as SafeAny;
    const isPinnedEntry = Boolean(customItem.pinnedId);

    if (item.children && item.children.length > 0) {
      const childItems = item.children.map((child) => createMenuItem(child, depth + 1));

      return {
        key: item.key,
        icon: item.icon,
        label: <span className="sidebar-menu-parent-label">{item.label}</span>,
        className: depth === 0 ? 'sidebar-menu-parent' : 'sidebar-menu-parent sidebar-menu-parent--nested',
        popupClassName: collapsed ? 'sidebar-rail-flyout' : undefined,
        children: childItems,
      };
    }

    const hasBadge = (item.badgeCount ?? 0) > 0;
    const itemLabel =
      item.key.startsWith('nyc-campaign-') || item.key.startsWith('academy-campaign-') ? (
        <span className="sidebar-menu-live-label">
          <span>{item.label}</span>
          <span className="sidebar-menu-live-dot" aria-hidden />
        </span>
      ) : (
        item.label
      );

    const isItemPinned = isPinnedEntry || isPinned(item.key) || (item.path ? isPinned(item.path) : false);

    // If it is an item in the Pinned group
    if (isPinnedEntry) {
      return {
        key: item.key,
        icon: item.icon,
        title: item.label,
        className:
          depth === 0
            ? 'sidebar-menu-entry sidebar-menu-entry--root group/pin'
            : 'sidebar-menu-entry sidebar-menu-entry--nested group/pin',
        label: (
          <span
            className="sidebar-menu-label sidebar-menu-label--root flex items-center justify-between w-full"
            draggable
            onDragStart={(e) => handleDragStart(e, customItem.pinnedId)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, customItem.pinnedId)}
          >
            <span className="sidebar-menu-label__content flex items-center gap-1.5 flex-1 min-w-0">
              <span className="truncate">{itemLabel}</span>
              {customItem.isExternal && <AppIcon icon={ExternalLink} size={11} className="text-neutral-400 shrink-0" />}
            </span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <span
                className="opacity-0 group-hover/pin:opacity-100 cursor-grab active:cursor-grabbing text-neutral-500 hover:text-neutral-300 transition-opacity p-0.5"
                title="Kéo thả để sắp xếp"
              >
                <AppIcon icon={GripVertical} size={12} />
              </span>
              <button
                type="button"
                aria-label="Bỏ ghim"
                title="Bỏ ghim liên kết này"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  unpinLink(customItem.pinnedId);
                  message.info(`Đã bỏ ghim "${typeof item.label === 'string' ? item.label : item.key}"`);
                }}
                className="sidebar-pin-btn inline-flex items-center justify-center p-0.5 rounded text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <AppIcon icon={PinOff} size={13} />
              </button>
            </span>
          </span>
        ),
        onClick: () => {
          if (item.path) {
            if (customItem.isExternal) {
              window.open(item.path, '_blank', 'noopener,noreferrer');
            } else {
              router.push(item.path);
              onNavigate?.();
            }
          }
        },
      };
    }

    return {
      key: item.key,
      icon: item.icon,
      title: hasBadge ? `${item.label} — ${item.badgeCount} ticket đang chờ Danny duyệt` : item.label,
      className:
        depth === 0
          ? 'sidebar-menu-entry sidebar-menu-entry--root group/pin'
          : 'sidebar-menu-entry sidebar-menu-entry--nested group/pin',
      label: item.path ? (
        <span
          className={`sidebar-menu-label ${hasBadge ? 'sidebar-menu-label--with-badge' : ''} ${
            depth > 0 ? 'sidebar-menu-label--nested' : 'sidebar-menu-label--root'
          } flex items-center justify-between w-full`}
          onMouseEnter={() => item.path && router.prefetch(item.path)}
        >
          <span className="sidebar-menu-label__content flex-1 min-w-0 truncate">{itemLabel}</span>
          <span className="inline-flex items-center gap-1 shrink-0">
            {hasBadge ? (
              <span
                className="sidebar-menu-label__badge"
                aria-label={`${item.badgeCount} ticket đang chờ Danny duyệt`}
                style={{ backgroundColor: token.colorWarning, color: token.colorTextLightSolid }}
              >
                {item.badgeCount}
              </span>
            ) : null}
            <button
              type="button"
              aria-label={isItemPinned ? 'Bỏ ghim khỏi menu' : 'Ghim lên đầu menu'}
              title={isItemPinned ? 'Bỏ ghim khỏi menu' : 'Ghim lên đầu menu'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isItemPinned) {
                  unpinLink(item.key);
                  message.info(`Đã bỏ ghim "${typeof item.label === 'string' ? item.label : item.key}"`);
                } else {
                  pinLink({
                    title: typeof item.label === 'string' ? item.label : String(item.key),
                    url: item.path || '',
                    menuKey: item.key,
                  });
                  message.success(`Đã ghim "${typeof item.label === 'string' ? item.label : item.key}" lên đầu menu`);
                }
              }}
              className={`sidebar-pin-btn inline-flex items-center justify-center p-1 rounded transition-all duration-150 ${
                isItemPinned
                  ? 'text-pink-500 hover:text-pink-400 opacity-100'
                  : 'text-neutral-400 hover:text-pink-500 opacity-0 group-hover/pin:opacity-100 hover:bg-neutral-800/30'
              }`}
            >
              <AppIcon icon={Pin} size={13} className={isItemPinned ? 'fill-current' : ''} />
            </button>
          </span>
        </span>
      ) : (
        item.label
      ),
      onClick: () => {
        if (item.path) {
          router.push(item.path);
          onNavigate?.();
        }
      },
    };
  };

  const expandedMenuItems: SafeAny[] = allDisplayedGroups.map((group) => {
    const isGroupCollapsed = collapsedGroupKeys.includes(group.groupKey);
    const isAcademyGroup = group.groupKey === 'grp-academy';
    const isPinnedGroup = group.groupKey === 'grp-pinned';
    const collapseAction = isGroupCollapsed ? 'Mở rộng' : 'Thu gọn';
    const visibleItemCount = countLeafItems(group.items);

    return {
      type: 'group',
      key: group.groupKey,
      label: (
        <div
          role="button"
          tabIndex={0}
          aria-expanded={!isGroupCollapsed}
          aria-label={`${collapseAction} nhóm ${group.groupTitle}`}
          title={`${collapseAction} nhóm ${group.groupTitle}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleGroupCollapse(group.groupKey);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleGroupCollapse(group.groupKey);
            }
          }}
          className={`sidebar-group-title flex w-full items-center justify-between text-left font-bold uppercase transition-colors duration-200 select-none ${
            isAcademyGroup || isPinnedGroup
              ? 'min-h-7 gap-2 rounded-[var(--mos-control-radius)] px-2 hover:bg-[var(--ant-color-fill-quaternary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mos-focus-ring)]'
              : ''
          } ${collapsed ? 'hidden' : ''}`}
          style={{
            background: 'transparent',
            border: 0,
            color: isPinnedGroup
              ? token.colorPrimary || '#ec4899'
              : themeMode === 'dark'
                ? 'rgba(255, 255, 255, 0.5)'
                : 'rgba(0, 0, 0, 0.55)',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          <div className="sidebar-group-title__label flex items-center gap-1.5 min-w-0">
            {isPinnedGroup && <AppIcon icon={Pin} size={12} className="text-pink-500 fill-current shrink-0" />}
            <span className="truncate">{group.groupTitle}</span>
          </div>
          <div className="inline-flex items-center gap-1 shrink-0">
            {isPinnedGroup && (
              <button
                type="button"
                aria-label="Thêm link ghim mới"
                title="Thêm link ghim mới"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsAddPinnedModalOpen(true);
                }}
                className="inline-flex items-center justify-center h-5 w-5 rounded text-neutral-400 hover:text-pink-500 hover:bg-pink-500/10 transition-colors"
              >
                <AppIcon icon={Plus} size={13} strokeWidth={2.5} />
              </button>
            )}
            <span
              className={`sidebar-group-title__meta inline-flex shrink-0 items-center gap-1 leading-none ${
                isAcademyGroup || isPinnedGroup ? 'text-[var(--ant-color-text-description)]' : ''
              }`}
              aria-hidden
            >
              <span
                className={`sidebar-group-title__count tabular-nums ${
                  isAcademyGroup || isPinnedGroup
                    ? 'inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--ant-color-fill-quaternary)] px-1 text-xs leading-none'
                    : ''
                }`}
              >
                {visibleItemCount}
              </span>
              <AppIcon icon={isGroupCollapsed ? ChevronRight : ChevronDown} size="disclosure" />
            </span>
          </div>
        </div>
      ),
      children: isGroupCollapsed
        ? []
        : isPinnedGroup && group.items.length === 0
          ? [
              {
                key: 'pinned-empty-placeholder',
                className: 'sidebar-menu-entry sidebar-menu-entry--root opacity-60 pointer-events-none cursor-default',
                label: (
                  <span className="text-xs text-neutral-400 italic px-2 py-1 select-none flex items-center gap-1.5">
                    <AppIcon icon={Pin} size={11} className="text-pink-500/60" />
                    <span>Rê chuột vào menu để ghim</span>
                  </span>
                ),
              },
            ]
          : group.items.map(createMenuItem),
    };
  });

  if (collapsed) {
    return (
      <nav aria-label="Main Navigation" className="sidebar-nav-container sidebar-compact-nav">
        <ul className="sidebar-compact-list" role="menu">
          {pinnedLinks.length > 0 && (
            <>
              {pinnedLinks.map((item) => {
                const isActive =
                  pathname === item.url || Boolean(item.url && !item.isExternal && pathname === item.url.split('?')[0]);
                const realIcon = getResolvedPinnedIcon(item, false);
                return (
                  <li className="sidebar-compact-item" key={`rail-pinned-${item.id}`}>
                    <Tooltip
                      placement="right"
                      title={
                        <div>
                          <div className="font-semibold text-pink-400">{item.title}</div>
                          <div className="text-[10px] opacity-75">{item.isExternal ? 'Liên kết ngoài' : 'Đã ghim'}</div>
                        </div>
                      }
                      mouseEnterDelay={0.2}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        aria-label={item.title}
                        className={`sidebar-rail-action ${isActive ? 'sidebar-rail-action--active' : ''}`}
                        onMouseEnter={() => !item.isExternal && item.url && router.prefetch(item.url)}
                        onClick={() => {
                          if (item.isExternal) {
                            window.open(item.url, '_blank', 'noopener,noreferrer');
                          } else {
                            router.push(item.url);
                            onNavigate?.();
                          }
                        }}
                      >
                        <span className="sidebar-rail-action__icon relative" aria-hidden>
                          {realIcon}
                          <span
                            className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-pink-500 pointer-events-none"
                            style={{
                              boxShadow: `0 0 0 1.5px ${themeMode === 'dark' ? '#141414' : '#ffffff'}`,
                            }}
                            aria-hidden
                          />
                        </span>
                      </button>
                    </Tooltip>
                  </li>
                );
              })}
              <li aria-hidden className="sidebar-rail-divider !border-pink-500/30" role="separator" />
            </>
          )}
          {displayedGroups.map((group, groupIndex) => (
            <React.Fragment key={group.groupKey}>
              {groupIndex > 0 && <li aria-hidden className="sidebar-rail-divider" role="separator" />}
              {group.items.map((item) => {
                const isActive = containsSelectedItem(item, selectedKey);
                const hasChildren = Boolean(item.children?.length);
                const railAction = (
                  <button
                    type="button"
                    role="menuitem"
                    aria-current={isActive && !hasChildren ? 'page' : undefined}
                    aria-haspopup={hasChildren ? 'menu' : undefined}
                    aria-expanded={hasChildren ? openRailMenuKey === item.key : undefined}
                    aria-label={item.label}
                    className={`sidebar-rail-action ${isActive ? 'sidebar-rail-action--active' : ''}`}
                    onMouseEnter={() => item.path && router.prefetch(item.path)}
                    onClick={
                      hasChildren
                        ? undefined
                        : () => {
                            if (item.path) {
                              router.push(item.path);
                              onNavigate?.();
                            }
                          }
                    }
                  >
                    <span className="sidebar-rail-action__icon" aria-hidden>
                      {item.icon}
                    </span>
                    {hasChildren && (
                      <AppIcon
                        icon={ChevronRight}
                        className="sidebar-rail-action__submenu-indicator"
                        size={9}
                        strokeWidth={2.5}
                      />
                    )}
                    <span className="sr-only">{item.label}</span>
                  </button>
                );

                return (
                  <li className="sidebar-compact-item" key={item.key}>
                    {hasChildren ? (
                      <Popover
                        placement="rightTop"
                        trigger={['hover', 'click']}
                        mouseEnterDelay={0.12}
                        mouseLeaveDelay={0.16}
                        rootClassName="sidebar-rail-flyout"
                        getPopupContainer={() => document.body}
                        open={openRailMenuKey === item.key}
                        onOpenChange={(open) => setOpenRailMenuKey(open ? item.key : null)}
                        content={
                          <Menu
                            className="sidebar-rail-flyout-menu"
                            theme={themeMode === 'dark' ? 'dark' : 'light'}
                            mode="vertical"
                            selectable
                            selectedKeys={[selectedKey]}
                            getPopupContainer={() => document.body}
                            onClick={() => setOpenRailMenuKey(null)}
                            items={[
                              {
                                type: 'group',
                                key: `${item.key}-rail-group`,
                                className: 'sidebar-rail-flyout-group',
                                label: <span className="sidebar-rail-flyout-heading">{item.label}</span>,
                                children: item.children?.map((child) => createMenuItem(child, 1)) || [],
                              },
                            ]}
                          />
                        }
                      >
                        {railAction}
                      </Popover>
                    ) : (
                      <Tooltip placement="right" title={item.label} mouseEnterDelay={0.35}>
                        {railAction}
                      </Tooltip>
                    )}
                  </li>
                );
              })}
            </React.Fragment>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <>
      <nav aria-label="Main Navigation" className="sidebar-nav-container">
        <Menu
          theme={themeMode === 'dark' ? 'dark' : 'light'}
          mode="inline"
          inlineCollapsed={false}
          inlineIndent={16}
          selectedKeys={[selectedKey]}
          openKeys={openKeys}
          onOpenChange={handleOpenChange}
          triggerSubMenuAction="hover"
          subMenuOpenDelay={0.12}
          subMenuCloseDelay={0.16}
          getPopupContainer={() => document.body}
          expandIcon={({ isOpen }: SafeAny) =>
            isOpen ? (
              <AppIcon icon={ChevronDown} className="sidebar-menu-chevron" size="disclosure" />
            ) : (
              <AppIcon icon={ChevronRight} className="sidebar-menu-chevron" size="disclosure" />
            )
          }
          items={expandedMenuItems}
          style={{
            background: 'transparent',
            paddingTop: '4px',
            borderRight: 0,
          }}
          className="antd-custom-menu"
        />
      </nav>
      <AddPinnedLinkModal
        open={isAddPinnedModalOpen}
        onClose={() => setIsAddPinnedModalOpen(false)}
        onAdd={pinLink}
        currentPath={pathname}
        themeMode={themeMode}
      />
    </>
  );
}
