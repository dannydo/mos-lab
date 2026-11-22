'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Menu } from 'antd';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { isCvRole, type SafeAny } from '@mos-lab/shared';
import { buildEcosystemNavModel } from '../../config/ecosystem-nav';
import { getSelectedMenuKey, getSidebarGroups } from '../../config/sidebar.config';
import { usePinnedLinks } from '../../hooks/usePinnedLinks';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';
import { openBugReport } from '../../lib/bug-diagnostics';
import { openMosBible } from '../../lib/mos-bible-launcher';
import { AppIcon } from '../ui/AppIcon';
import { AddPinnedLinkModal } from './AddPinnedLinkModal';
import { SidebarCollapsedRail } from './sidebar-nav/SidebarCollapsedRail';
import { SidebarEcosystemSwitcher } from './sidebar-nav/SidebarEcosystemSwitcher';
import { buildExpandedMenuItems } from './sidebar-nav/sidebarMenuItems';
import type {
  EcosystemNavigateHandler,
  SidebarMenuItemBuilderContext,
  SidebarNavProps,
} from './sidebar-nav/sidebarNavTypes';
import { buildMenuItemLookup, buildPinnedGroup, filterMobileSidebarGroups } from './sidebar-nav/sidebarNavUtils';
import { resolvePinnedIconNode } from './sidebar-nav/SidebarPinnedIcon';
import { usePinnedDragAndDrop } from './sidebar-nav/usePinnedDragAndDrop';
import { useSidebarData } from './sidebar-nav/useSidebarData';
import { useSidebarMenuExpansion } from './sidebar-nav/useSidebarMenuExpansion';

export type { SidebarNavProps };

function SidebarNavComponent({
  collapsed,
  themeMode,
  token: _token,
  userRole,
  teamCodes,
  userId,
  userIdentity,
  unreadChatCount = 0,
  onOpenChat,
  onNavigate,
}: SidebarNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const assignedStaffId = searchParams.get('assignedStaffId');
  const isCvAccount = isCvRole(userRole);

  const { pinnedLinks, isPinned, pinLink, unpinLink, reorderLinks } = usePinnedLinks(
    isCvAccount ? undefined : userId || userIdentity?.username
  );
  const [isAddPinnedModalOpen, setIsAddPinnedModalOpen] = useState(false);

  const { handleDragStart, handleDragOver, handleDrop } = usePinnedDragAndDrop(pinnedLinks, reorderLinks);
  const {
    activeCampaigns,
    academySidebarCampaigns,
    academyAccess,
    menuVisibility,
    categoryVisibility,
    bugInboxApprovalCount,
    showCustomCampaigns,
    campaignVisibility,
  } = useSidebarData({ userRole, userIdentity, isCvAccount });

  const { openKeys, handleOpenChange, collapsedGroupKeys, handleGroupCollapse, openRailMenuKey, setOpenRailMenuKey } =
    useSidebarMenuExpansion(pathname);

  const ecosystemModel = useMemo(
    () =>
      buildEcosystemNavModel({
        userRole,
        teamCodes,
        unreadChatCount,
        missionBadgeCount: bugInboxApprovalCount,
        menuVisibility,
      }),
    [userRole, teamCodes, unreadChatCount, bugInboxApprovalCount, menuVisibility]
  );

  const handleNavigateInternal = useCallback(
    (path: string) => {
      router.push(path);
      onNavigate?.();
    },
    [onNavigate, router]
  );

  const handlePrefetchPath = useCallback(
    (path: string) => {
      router.prefetch(path);
    },
    [router]
  );

  const handleEcosystemNavigate: EcosystemNavigateHandler = useCallback(
    (key, href, action, comingSoon) => {
      if (comingSoon) return;
      if (action === 'open-bible') {
        openMosBible();
        onNavigate?.();
        return;
      }
      if (action === 'open-feedback') {
        openBugReport(undefined, { preferHistoryIfPending: true });
        onNavigate?.();
        return;
      }
      if (key === 'chat' && onOpenChat) {
        onOpenChat();
        onNavigate?.();
        return;
      }
      router.push(href);
      onNavigate?.();
    },
    [onNavigate, onOpenChat, router]
  );

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
  const displayedGroups = tier === 'mobile' ? filterMobileSidebarGroups(sidebarGroups) : sidebarGroups;

  const menuItemLookup = useMemo(() => buildMenuItemLookup(sidebarGroups), [sidebarGroups]);

  const pinnedGroup = buildPinnedGroup(pinnedLinks, (item) => resolvePinnedIconNode(item, menuItemLookup, true));
  const allDisplayedGroups = isCvAccount ? displayedGroups : [pinnedGroup, ...displayedGroups];

  const menuContext: SidebarMenuItemBuilderContext = useMemo(
    () => ({
      collapsed,
      isCvAccount,
      isPinned,
      pinLink,
      unpinLink,
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
      onPrefetchPath: handlePrefetchPath,
      onNavigateInternal: handleNavigateInternal,
    }),
    [
      collapsed,
      handleDragOver,
      handleDragStart,
      handleDrop,
      handleNavigateInternal,
      handlePrefetchPath,
      isCvAccount,
      isPinned,
      pinLink,
      unpinLink,
    ]
  );

  const expandedMenuItems = buildExpandedMenuItems({
    groups: allDisplayedGroups,
    collapsedGroupKeys,
    collapsed,
    themeMode,
    onGroupCollapse: handleGroupCollapse,
    onOpenAddPinnedModal: () => setIsAddPinnedModalOpen(true),
    menuContext,
  });

  if (collapsed) {
    return (
      <SidebarCollapsedRail
        ecosystemModel={ecosystemModel}
        pathname={pathname}
        themeMode={themeMode}
        isCvAccount={isCvAccount}
        pinnedLinks={pinnedLinks}
        menuItemLookup={menuItemLookup}
        displayedGroups={displayedGroups}
        selectedKey={selectedKey}
        openRailMenuKey={openRailMenuKey}
        onOpenRailMenuKeyChange={setOpenRailMenuKey}
        onEcosystemNavigate={handleEcosystemNavigate}
        onPrefetchPath={handlePrefetchPath}
        onNavigateInternal={handleNavigateInternal}
        menuContext={menuContext}
      />
    );
  }

  return (
    <>
      <nav aria-label="Main Navigation" className="sidebar-nav-container">
        <SidebarEcosystemSwitcher
          ecosystemModel={ecosystemModel}
          pathname={pathname}
          themeMode={themeMode}
          onEcosystemNavigate={handleEcosystemNavigate}
        />
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

const SidebarNav = React.memo(SidebarNavComponent);
SidebarNav.displayName = 'SidebarNav';
export default SidebarNav;
