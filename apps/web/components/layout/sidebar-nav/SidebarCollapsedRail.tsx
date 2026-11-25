'use client';

import React from 'react';
import { Menu, Popover, Tooltip } from 'antd';
import { ChevronRight } from 'lucide-react';
import type { PinnedLinkItem } from '@mos-lab/shared';
import {
  isLabPathname,
  isMissionPathname,
  isReportPathname,
  isWingsGardenPathname,
} from '../../../config/ecosystem-nav';
import type { SidebarGroupConfig } from '../../../config/sidebar.config';
import { AppIcon } from '../../ui/AppIcon';
import { createSidebarMenuItem } from './sidebarMenuItems';
import type {
  EcosystemNavigateHandler,
  MenuItemLookup,
  SidebarEcosystemModel,
  SidebarMenuItemBuilderContext,
} from './sidebarNavTypes';
import { containsSelectedItem } from './sidebarNavUtils';
import { resolvePinnedIconNode } from './SidebarPinnedIcon';

interface SidebarCollapsedRailProps {
  ecosystemModel: SidebarEcosystemModel;
  pathname: string;
  themeMode: string;
  isCvAccount: boolean;
  pinnedLinks: PinnedLinkItem[];
  menuItemLookup: MenuItemLookup;
  displayedGroups: SidebarGroupConfig[];
  selectedKey: string;
  openRailMenuKey: string | null;
  onOpenRailMenuKeyChange: (key: string | null) => void;
  onEcosystemNavigate: EcosystemNavigateHandler;
  onPrefetchPath: (path: string) => void;
  onNavigateInternal: (path: string) => void;
  menuContext: SidebarMenuItemBuilderContext;
}

export const SidebarCollapsedRail: React.FC<SidebarCollapsedRailProps> = ({
  ecosystemModel,
  pathname,
  themeMode,
  isCvAccount,
  pinnedLinks,
  menuItemLookup,
  displayedGroups,
  selectedKey,
  openRailMenuKey,
  onOpenRailMenuKeyChange,
  onEcosystemNavigate,
  onPrefetchPath,
  onNavigateInternal,
  menuContext,
}) => {
  const isDark = themeMode === 'dark';

  return (
    <nav aria-label="Main Navigation" className="sidebar-nav-container sidebar-compact-nav">
      <ul className="sidebar-compact-list" role="menu" data-testid="sidebar-ecosystem-switcher">
        {ecosystemModel.coreApps.map((app) => {
          const Icon = app.icon;
          const isActive =
            app.key === 'general' &&
            !isReportPathname(pathname) &&
            !isMissionPathname(pathname) &&
            !isLabPathname(pathname) &&
            !isWingsGardenPathname(pathname);
          return (
            <li className="sidebar-compact-item" key={`eco-rail-${app.key}`}>
              <Tooltip placement="right" title={app.label} mouseEnterDelay={0.2}>
                <button
                  type="button"
                  role="menuitem"
                  data-sidebar-eco-app={app.key}
                  aria-label={app.label}
                  className={`sidebar-rail-action ${isActive ? 'sidebar-rail-action--active' : ''}`}
                  onClick={() => onEcosystemNavigate(app.key, app.href)}
                >
                  <span className="sidebar-rail-action__icon relative" aria-hidden>
                    <AppIcon icon={Icon} size="sm" />
                    {app.badgeCount && app.badgeCount > 0 ? (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 pointer-events-none"
                        aria-hidden
                      />
                    ) : null}
                  </span>
                </button>
              </Tooltip>
            </li>
          );
        })}

        {[...ecosystemModel.suiteApps, ...(ecosystemModel.footerActions ?? [])].map((suite) => {
          const Icon = suite.icon;
          const isActive =
            !suite.comingSoon &&
            ((suite.key === 'reports' && isReportPathname(pathname)) ||
              (suite.key === 'mission' && isMissionPathname(pathname)) ||
              (suite.key === 'lab' && isLabPathname(pathname)) ||
              (suite.key === 'wings-garden' && isWingsGardenPathname(pathname)));
          return (
            <li className="sidebar-compact-item" key={`eco-rail-suite-${suite.key}`}>
              <Tooltip
                placement="right"
                title={suite.comingSoon ? `${suite.label} · Coming soon` : suite.label}
                mouseEnterDelay={0.2}
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={Boolean(suite.comingSoon)}
                  aria-disabled={suite.comingSoon || undefined}
                  data-sidebar-eco-suite={suite.key}
                  data-coming-soon={suite.comingSoon ? 'true' : undefined}
                  aria-label={suite.comingSoon ? `${suite.label} · Coming soon` : suite.label}
                  className={`sidebar-rail-action ${isActive ? 'sidebar-rail-action--active' : ''} ${
                    suite.comingSoon ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => onEcosystemNavigate(suite.key, suite.href, suite.action, suite.comingSoon)}
                >
                  <span className="sidebar-rail-action__icon relative" aria-hidden>
                    <AppIcon icon={Icon} size="sm" />
                    {suite.badgeCount && suite.badgeCount > 0 ? (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 pointer-events-none"
                        aria-hidden
                      />
                    ) : null}
                  </span>
                </button>
              </Tooltip>
            </li>
          );
        })}

        <li aria-hidden className="sidebar-rail-divider" role="separator" />

        {!isCvAccount && pinnedLinks.length > 0 && (
          <>
            {pinnedLinks.map((item) => {
              const isActive =
                pathname === item.url || Boolean(item.url && !item.isExternal && pathname === item.url.split('?')[0]);
              const realIcon = resolvePinnedIconNode(item, menuItemLookup, false);
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
                      onMouseEnter={() => !item.isExternal && item.url && onPrefetchPath(item.url)}
                      onClick={() => {
                        if (item.isExternal) {
                          window.open(item.url, '_blank', 'noopener,noreferrer');
                        } else {
                          onNavigateInternal(item.url);
                        }
                      }}
                    >
                      <span className="sidebar-rail-action__icon relative" aria-hidden>
                        {realIcon}
                        <span
                          className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-pink-500 pointer-events-none ring-[1.5px] ${
                            isDark ? 'ring-neutral-900' : 'ring-white'
                          }`}
                          aria-hidden
                        />
                      </span>
                    </button>
                  </Tooltip>
                </li>
              );
            })}
            <li aria-hidden className="sidebar-rail-divider border-pink-500/30" role="separator" />
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
                  onMouseEnter={() => item.path && onPrefetchPath(item.path)}
                  onClick={
                    hasChildren
                      ? undefined
                      : () => {
                          if (item.path) {
                            onNavigateInternal(item.path);
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
                      onOpenChange={(open) => onOpenRailMenuKeyChange(open ? item.key : null)}
                      content={
                        <Menu
                          className="sidebar-rail-flyout-menu"
                          theme={isDark ? 'dark' : 'light'}
                          mode="vertical"
                          selectable
                          selectedKeys={[selectedKey]}
                          getPopupContainer={() => document.body}
                          onClick={() => onOpenRailMenuKeyChange(null)}
                          items={[
                            {
                              type: 'group',
                              key: `${item.key}-rail-group`,
                              className: 'sidebar-rail-flyout-group',
                              label: <span className="sidebar-rail-flyout-heading">{item.label}</span>,
                              children:
                                item.children?.map((child) => createSidebarMenuItem(child, 1, menuContext)) || [],
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
};
