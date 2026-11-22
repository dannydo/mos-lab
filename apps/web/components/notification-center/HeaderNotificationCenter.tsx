'use client';

import React from 'react';
import { Popover } from 'antd';
import { Bell } from 'lucide-react';
import { HeaderActionIndicator } from '../ui/HeaderActionIndicator';
import { HeaderIconButton } from '../ui/HeaderIconButton';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';
import { NotificationDesktopPopoverPanel } from './header-notification-center/NotificationDesktopPopoverPanel';
import { NotificationMobileDrawer } from './header-notification-center/NotificationMobileDrawer';
import type { HeaderNotificationCenterProps } from './header-notification-center/notificationTypes';
import { useHeaderNotifications } from './header-notification-center/useHeaderNotifications';

export type { HeaderNotificationCenterProps } from './header-notification-center/notificationTypes';

export const HeaderNotificationCenter: React.FC<HeaderNotificationCenterProps> = ({
  onOpenChat,
  themeMode = 'dark',
}) => {
  const responsiveTier = useResponsiveTier();
  const isMobileTier = responsiveTier === 'mobile';
  const isDark = themeMode === 'dark';

  const {
    isOpen,
    setIsOpen,
    activeTab,
    setActiveTab,
    statusFilter,
    setStatusFilter,
    feed,
    loading,
    markingAll,
    fetchFeed,
    handleMarkAllRead,
    handleToggleRead,
    handleItemClick,
    navigateToMission,
    categoryFiltered,
    unreadItems,
    readItems,
    tabCounts,
    totalUnreadCount,
    totalReadCount,
    urgentCount,
  } = useHeaderNotifications({ onOpenChat, themeMode });

  const triggerButton = (
    <HeaderActionIndicator
      variant="count"
      count={totalUnreadCount}
      color={urgentCount > 0 ? 'rgb(239, 68, 68)' : 'rgb(245, 158, 11)'}
    >
      <HeaderIconButton
        action="notifications"
        label={
          totalUnreadCount > 0
            ? `Thông báo & Việc cần làm (⌘I) · ${totalUnreadCount} việc cần xử lý`
            : 'Thông báo & Việc cần làm (⌘I)'
        }
        icon={Bell}
        tone={isOpen ? 'accent' : 'quiet'}
        aria-pressed={isOpen}
        showTooltip={!isOpen}
        onClick={
          isMobileTier
            ? () => {
                const nextState = !isOpen;
                setIsOpen(nextState);
                if (nextState) {
                  void fetchFeed(true);
                }
              }
            : undefined
        }
      />
    </HeaderActionIndicator>
  );

  if (isMobileTier) {
    return (
      <>
        {triggerButton}
        <NotificationMobileDrawer
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          isDark={isDark}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          totalItemsCount={feed?.items.length || 0}
          totalUnreadCount={totalUnreadCount}
          totalReadCount={totalReadCount}
          tabCounts={tabCounts}
          unreadItems={unreadItems}
          readItems={readItems}
          categoryFilteredCount={categoryFiltered.length}
          loading={loading}
          hasFeed={Boolean(feed)}
          markingAll={markingAll}
          onMarkAllRead={handleMarkAllRead}
          onItemClick={handleItemClick}
          onToggleRead={handleToggleRead}
          onNavigateMission={navigateToMission}
        />
      </>
    );
  }

  return (
    <Popover
      content={
        <NotificationDesktopPopoverPanel
          isDark={isDark}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          totalUnreadCount={totalUnreadCount}
          totalReadCount={totalReadCount}
          tabCounts={tabCounts}
          unreadItems={unreadItems}
          readItems={readItems}
          categoryFilteredCount={categoryFiltered.length}
          loading={loading}
          hasFeed={Boolean(feed)}
          markingAll={markingAll}
          onMarkAllRead={handleMarkAllRead}
          onItemClick={handleItemClick}
          onToggleRead={handleToggleRead}
          onNavigateMission={navigateToMission}
        />
      }
      trigger="click"
      open={isOpen}
      onOpenChange={(v) => {
        setIsOpen(v);
        if (v) {
          void fetchFeed(true);
        }
      }}
      placement="bottomRight"
      arrow={false}
      classNames={{
        root: `mos-notification-popover ${isDark ? 'dark-theme' : 'light-theme'}`,
        body: 'p-0 max-w-[calc(100vw-24px)]',
      }}
    >
      {triggerButton}
    </Popover>
  );
};
