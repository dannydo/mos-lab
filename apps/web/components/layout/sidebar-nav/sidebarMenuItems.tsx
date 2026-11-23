'use client';

import React from 'react';
import { message } from 'antd';
import { ChevronDown, ChevronRight, ExternalLink, GripVertical, Pin, PinOff, Plus } from 'lucide-react';
import type { SafeAny } from '@mos-lab/shared';
import type { SidebarGroupConfig, SidebarItemConfig } from '../../../config/sidebar.config';
import { AppIcon } from '../../ui/AppIcon';
import type { PinnedSidebarItemConfig, SidebarMenuItemBuilderContext } from './sidebarNavTypes';
import { countLeafItems, PINNED_EMPTY_PLACEHOLDER_KEY } from './sidebarNavUtils';

function renderPinnedMenuEntry(
  customItem: PinnedSidebarItemConfig,
  itemLabel: React.ReactNode,
  depth: number,
  ctx: SidebarMenuItemBuilderContext
): SafeAny {
  const pinnedId = customItem.pinnedId || customItem.key;

  return {
    key: customItem.key,
    icon: customItem.icon,
    title: customItem.label,
    className:
      depth === 0
        ? 'sidebar-menu-entry sidebar-menu-entry--root group/pin'
        : 'sidebar-menu-entry sidebar-menu-entry--nested group/pin',
    label: (
      <span
        className="sidebar-menu-label sidebar-menu-label--root flex items-center justify-between w-full"
        draggable
        onDragStart={(e) => ctx.onDragStart(e, pinnedId)}
        onDragOver={ctx.onDragOver}
        onDrop={(e) => ctx.onDrop(e, pinnedId)}
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
              ctx.unpinLink(pinnedId);
              message.info(`Đã bỏ ghim "${typeof customItem.label === 'string' ? customItem.label : customItem.key}"`);
            }}
            className="sidebar-pin-btn inline-flex items-center justify-center p-0.5 rounded text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <AppIcon icon={PinOff} size={13} />
          </button>
        </span>
      </span>
    ),
    onClick: () => {
      if (!customItem.path) return;
      if (customItem.isExternal) {
        if (ctx.onOpenExternal) {
          ctx.onOpenExternal(customItem.path);
        } else {
          window.open(customItem.path, '_blank', 'noopener,noreferrer');
        }
      } else {
        ctx.onNavigateInternal(customItem.path);
      }
    },
  };
}

export function createSidebarMenuItem(item: SidebarItemConfig, depth = 0, ctx: SidebarMenuItemBuilderContext): SafeAny {
  const customItem = item as PinnedSidebarItemConfig;
  const isPinnedEntry = Boolean(customItem.pinnedId);

  if (item.children && item.children.length > 0) {
    const childItems = item.children.map((child) => createSidebarMenuItem(child, depth + 1, ctx));

    return {
      key: item.key,
      icon: item.icon,
      label: <span className="sidebar-menu-parent-label">{item.label}</span>,
      className: depth === 0 ? 'sidebar-menu-parent' : 'sidebar-menu-parent sidebar-menu-parent--nested',
      popupClassName: ctx.collapsed ? 'sidebar-rail-flyout' : undefined,
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

  if (isPinnedEntry) {
    return renderPinnedMenuEntry(customItem, itemLabel, depth, ctx);
  }

  const isItemPinned = ctx.isPinned(item.key) || (item.path ? ctx.isPinned(item.path) : false);

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
        onMouseEnter={() => item.path && ctx.onPrefetchPath(item.path)}
      >
        <span className="sidebar-menu-label__content flex-1 min-w-0 truncate">{itemLabel}</span>
        <span className="inline-flex items-center gap-1 shrink-0">
          {hasBadge ? (
            <span
              className="sidebar-menu-label__badge bg-amber-500 text-white"
              aria-label={`${item.badgeCount} ticket đang chờ Danny duyệt`}
            >
              {item.badgeCount}
            </span>
          ) : null}
          {!ctx.isCvAccount && (
            <button
              type="button"
              aria-label={isItemPinned ? 'Bỏ ghim khỏi menu' : 'Ghim lên đầu menu'}
              title={isItemPinned ? 'Bỏ ghim khỏi menu' : 'Ghim lên đầu menu'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isItemPinned) {
                  ctx.unpinLink(item.key);
                  message.info(`Đã bỏ ghim "${typeof item.label === 'string' ? item.label : item.key}"`);
                } else {
                  ctx.pinLink({
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
          )}
        </span>
      </span>
    ) : (
      item.label
    ),
    onClick: () => {
      if (item.path) {
        ctx.onNavigateInternal(item.path);
      }
    },
  };
}

interface BuildExpandedMenuItemsParams {
  groups: SidebarGroupConfig[];
  collapsedGroupKeys: string[];
  collapsed: boolean;
  themeMode: string;
  onGroupCollapse: (groupKey: string) => void;
  onOpenAddPinnedModal: () => void;
  menuContext: SidebarMenuItemBuilderContext;
}

export function buildExpandedMenuItems({
  groups,
  collapsedGroupKeys,
  collapsed,
  themeMode,
  onGroupCollapse,
  onOpenAddPinnedModal,
  menuContext,
}: BuildExpandedMenuItemsParams): SafeAny[] {
  const isDark = themeMode === 'dark';

  return groups.map((group) => {
    const isGroupCollapsed = collapsedGroupKeys.includes(group.groupKey);
    const isAcademyGroup = group.groupKey === 'grp-academy';
    const isPinnedGroup = group.groupKey === 'grp-pinned';
    const collapseAction = isGroupCollapsed ? 'Mở rộng' : 'Thu gọn';
    const visibleItemCount = countLeafItems(group.items);

    const toneClass = isPinnedGroup
      ? 'text-[var(--mos-accent,var(--color-gold))]'
      : isDark
        ? 'text-white/50'
        : 'text-black/55';

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
            onGroupCollapse(group.groupKey);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onGroupCollapse(group.groupKey);
            }
          }}
          className={`sidebar-group-title flex w-full items-center justify-between text-left font-bold uppercase transition-colors duration-200 select-none bg-transparent border-0 cursor-pointer ${toneClass} ${
            isAcademyGroup || isPinnedGroup
              ? 'min-h-7 gap-2 rounded-[var(--mos-control-radius)] px-2 hover:bg-[var(--ant-color-fill-quaternary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mos-focus-ring)]'
              : ''
          } ${collapsed ? 'hidden' : ''}`}
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
                  onOpenAddPinnedModal();
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
                key: PINNED_EMPTY_PLACEHOLDER_KEY,
                className: 'sidebar-menu-entry sidebar-menu-entry--root opacity-60 pointer-events-none cursor-default',
                label: (
                  <span className="text-xs text-neutral-400 italic px-2 py-1 select-none flex items-center gap-1.5">
                    <AppIcon icon={Pin} size={11} className="text-pink-500/60" />
                    <span>Rê chuột vào menu để ghim</span>
                  </span>
                ),
              },
            ]
          : group.items.map((item) => createSidebarMenuItem(item, 0, menuContext)),
    };
  });
}
