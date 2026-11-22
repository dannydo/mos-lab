import type React from 'react';
import type { SafeAny } from '@mos-lab/shared';
import type { EcosystemAppItem, EcosystemSuiteItem } from '../../../config/ecosystem-nav';
import type { SidebarItemConfig } from '../../../config/sidebar.config';

export interface SidebarNavProps {
  collapsed: boolean;
  themeMode: string;
  token: SafeAny;
  userRole?: string;
  teamCodes?: readonly string[] | null;
  userId?: number | string;
  userIdentity?: { username?: string | null; email?: string | null };
  unreadChatCount?: number;
  onOpenChat?: () => void;
  onNavigate?: () => void;
}

export interface PinnedSidebarItemConfig extends SidebarItemConfig {
  isExternal?: boolean;
  pinnedId?: string;
  menuKey?: string;
}

export interface MenuItemLookup {
  byKey: Map<string, SidebarItemConfig>;
  byPath: Map<string, SidebarItemConfig>;
}

export interface SidebarEcosystemModel {
  coreApps: EcosystemAppItem[];
  suiteApps: EcosystemSuiteItem[];
}

export type EcosystemNavigateHandler = (
  key: string,
  href: string,
  action?: 'open-bible' | 'open-feedback',
  comingSoon?: boolean
) => void;

export interface SidebarMenuItemBuilderContext {
  collapsed: boolean;
  isCvAccount: boolean;
  isPinned: (keyOrUrl: string) => boolean;
  pinLink: (payload: {
    title: string;
    url: string;
    icon?: string;
    isExternal?: boolean;
    menuKey?: string;
  }) => Promise<void>;
  unpinLink: (idOrMenuKey: string) => Promise<void>;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  onPrefetchPath: (path: string) => void;
  onNavigateInternal: (path: string) => void;
  onOpenExternal?: (path: string) => void;
}
