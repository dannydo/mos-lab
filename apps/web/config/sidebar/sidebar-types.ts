import type React from 'react';

export interface SidebarItemConfig {
  key: string;
  label: string;
  icon?: React.ReactNode;
  badgeCount?: number;
  path?: string;
  allowedRoles?: string[];
  children?: SidebarItemConfig[];
}

export interface SidebarGroupConfig {
  groupKey: string;
  groupTitle: string;
  items: SidebarItemConfig[];
}
