'use client';

import type React from 'react';
import { Pin } from 'lucide-react';
import type { PinnedLinkItem } from '@mos-lab/shared';
import { AppIcon } from '../../ui/AppIcon';
import type { MenuItemLookup } from './sidebarNavTypes';
import { getPinnedIconComponent } from './sidebarNavUtils';

export function resolvePinnedIconNode(
  item: PinnedLinkItem,
  menuItemLookup: MenuItemLookup,
  isExpanded = false
): React.ReactNode {
  // 1. Try finding in sidebar menu config (by menuKey first, then url)
  const matched =
    (item.menuKey ? menuItemLookup.byKey.get(item.menuKey) : undefined) ||
    (item.url ? menuItemLookup.byPath.get(item.url) || menuItemLookup.byPath.get(item.url.split('?')[0]) : undefined);

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
}
