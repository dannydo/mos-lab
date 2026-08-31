'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Badge, Menu, Popover, Tooltip } from 'antd';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { isCanonicalSuperAdminIdentity, isSuperAdminRole, SafeAny } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { getSidebarGroups, getSelectedMenuKey, SidebarItemConfig } from '../../config/sidebar.config';
import { AppIcon } from '../ui/AppIcon';

interface SidebarNavProps {
  collapsed: boolean;
  themeMode: string;
  token: SafeAny;
  userRole?: string;
  userIdentity?: { username?: string | null; email?: string | null };
  onNavigate?: () => void;
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
  userIdentity,
  onNavigate,
}: SidebarNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const assignedStaffId = searchParams.get('assignedStaffId');

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

  const selectedKey = getSelectedMenuKey(pathname, assignedStaffId, academySidebarCampaigns);
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

  const createMenuItem = (item: SidebarItemConfig, depth = 0): SafeAny => {
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

    return {
      key: item.key,
      icon:
        item.badgeCount && item.badgeCount > 0 ? (
          <Badge count={item.badgeCount} color={token.colorWarning} overflowCount={99} offset={[3, 0]} size="small">
            <span className="inline-flex">{item.icon}</span>
          </Badge>
        ) : (
          item.icon
        ),
      title:
        item.badgeCount && item.badgeCount > 0
          ? `${item.label} — ${item.badgeCount} ticket đang chờ Danny duyệt`
          : item.label,
      className:
        depth === 0 ? 'sidebar-menu-entry sidebar-menu-entry--root' : 'sidebar-menu-entry sidebar-menu-entry--nested',
      label: item.path ? (
        <span
          className={`sidebar-menu-label ${depth > 0 ? 'sidebar-menu-label--nested' : 'sidebar-menu-label--root'}`}
          onMouseEnter={() => item.path && router.prefetch(item.path)}
          style={{ display: 'inline-block', width: '100%' }}
        >
          {item.key.startsWith('nyc-campaign-') || item.key.startsWith('academy-campaign-') ? (
            <span className="sidebar-menu-live-label">
              <span>{item.label}</span>
              <span className="sidebar-menu-live-dot" aria-hidden />
            </span>
          ) : (
            item.label
          )}
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

  const expandedMenuItems: SafeAny[] = sidebarGroups.map((group) => {
    const isGroupCollapsed = collapsedGroupKeys.includes(group.groupKey);
    const isAcademyGroup = group.groupKey === 'grp-academy';
    const collapseAction = isGroupCollapsed ? 'Mở rộng' : 'Thu gọn';
    const visibleItemCount = countLeafItems(group.items);

    return {
      type: 'group',
      key: group.groupKey,
      label: (
        <button
          type="button"
          aria-expanded={!isGroupCollapsed}
          aria-label={`${collapseAction} nhóm ${group.groupTitle}`}
          title={`${collapseAction} nhóm ${group.groupTitle}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleGroupCollapse(group.groupKey);
          }}
          className={`sidebar-group-title flex w-full items-center justify-between text-left font-bold uppercase transition-colors duration-200 ${
            isAcademyGroup
              ? 'min-h-7 gap-2 rounded-[var(--mos-control-radius)] px-2 hover:bg-[var(--ant-color-fill-quaternary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mos-focus-ring)]'
              : ''
          } ${collapsed ? 'hidden' : ''}`}
          style={{
            background: 'transparent',
            border: 0,
            color: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.55)',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          <span className="sidebar-group-title__label">{group.groupTitle}</span>
          <span
            className={`sidebar-group-title__meta inline-flex shrink-0 items-center gap-1 leading-none ${
              isAcademyGroup ? 'text-[var(--ant-color-text-description)]' : ''
            }`}
            aria-hidden
          >
            <span
              className={`sidebar-group-title__count tabular-nums ${
                isAcademyGroup
                  ? 'inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--ant-color-fill-quaternary)] px-1 text-xs leading-none'
                  : ''
              }`}
            >
              {visibleItemCount}
            </span>
            <AppIcon icon={isGroupCollapsed ? ChevronRight : ChevronDown} size="disclosure" />
          </span>
        </button>
      ),
      children: isGroupCollapsed ? [] : group.items.map(createMenuItem),
    };
  });

  if (collapsed) {
    return (
      <nav aria-label="Main Navigation" className="sidebar-nav-container sidebar-compact-nav">
        <ul className="sidebar-compact-list" role="menu">
          {sidebarGroups.map((group, groupIndex) => (
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
          background: themeMode === 'dark' ? '#000000' : token.colorBgContainer,
          paddingTop: '4px',
          borderRight: 0,
        }}
        className="antd-custom-menu"
      />
    </nav>
  );
}
