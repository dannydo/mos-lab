'use client';

import React, { Suspense } from 'react';
import { Button, Drawer, Layout, theme } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { SafeAny } from '@mos-lab/shared';
import SidebarNav from './SidebarNav';

const { Sider } = Layout;

export interface DashboardSidebarShellProps {
  isMobileTier: boolean;
  collapsed: boolean;
  persistentNavWidth: number;
  isMobileNavigationOpen: boolean;
  onCloseMobileNavigation: () => void;
  onToggleSidebar: () => void;
  themeMode: 'light' | 'dark';
  user: SafeAny;
  mosChatUnreadCount: number;
  deployedAt: string | null;
  onOpenChat: () => void;
}

export const DashboardSidebarShell: React.FC<DashboardSidebarShellProps> = ({
  isMobileTier,
  collapsed,
  persistentNavWidth,
  isMobileNavigationOpen,
  onCloseMobileNavigation,
  onToggleSidebar,
  themeMode,
  user,
  mosChatUnreadCount,
  deployedAt,
  onOpenChat,
}) => {
  const { token } = theme.useToken();

  const renderSidebarContent = (navCollapsed: boolean) => (
    <>
      <h1 className="sr-only">WINGS LASHES Management System</h1>
      <div
        className="flex items-center justify-center transition-all duration-200"
        style={{
          height: navCollapsed ? '44px' : '52px',
          background: themeMode === 'dark' ? '#000000' : token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          color: token.colorPrimary,
          fontSize: navCollapsed ? '13px' : '17px',
          fontWeight: 'bold',
          letterSpacing: '1px',
        }}
      >
        {navCollapsed ? 'WL' : 'WINGS LASHES'}
      </div>
      <Suspense fallback={null}>
        <div className="sidebar-nav-scroll-region">
          <SidebarNav
            collapsed={navCollapsed}
            themeMode={themeMode}
            token={token}
            userRole={user?.role}
            teamCodes={user?.teamCodes}
            userId={user?.id}
            userIdentity={{ username: user?.username, email: user?.email }}
            unreadChatCount={mosChatUnreadCount}
            onOpenChat={onOpenChat}
            onNavigate={onCloseMobileNavigation}
          />
        </div>
      </Suspense>
      {deployedAt && (
        <div
          title={`Updated: ${dayjs(deployedAt).format('DD/MM/YYYY · HH:mm')}`}
          style={{
            flexShrink: 0,
            padding: navCollapsed ? '10px 0' : '10px 12px',
            textAlign: navCollapsed ? 'center' : 'left',
            color: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            fontSize: '11px',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {navCollapsed ? '●' : `Updated: ${dayjs(deployedAt).format('DD/MM · HH:mm')}`}
        </div>
      )}
    </>
  );

  return (
    <>
      {isMobileTier ? (
        <Drawer
          className="dashboard-mobile-nav"
          closable={false}
          open={isMobileNavigationOpen}
          onClose={onCloseMobileNavigation}
          placement="left"
          width="min(86vw, 344px)"
          styles={{
            body: {
              backgroundColor: themeMode === 'dark' ? '#000000' : token.colorBgContainer,
              backgroundImage: 'var(--mos-seasonal-sidebar-gradient, none)',
            },
          }}
        >
          {renderSidebarContent(false)}
        </Drawer>
      ) : (
        <Sider
          className="dashboard-sider"
          trigger={null}
          collapsible
          collapsed={collapsed}
          collapsedWidth={56}
          width={persistentNavWidth}
          suppressHydrationWarning
          style={{
            backgroundColor: 'var(--mos-surface, ' + token.colorBgContainer + ')',
            backgroundImage: 'var(--mos-seasonal-sidebar-gradient, none)',
            borderRightColor: 'var(--mos-seasonal-border, var(--mos-surface-border))',
            borderRightStyle: 'solid',
            borderRightWidth: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {renderSidebarContent(collapsed)}
        </Sider>
      )}

      <div className="sidebar-toggle-container">
        <Button
          aria-label={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          title={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
          onClick={onToggleSidebar}
          icon={
            collapsed ? <RightOutlined style={{ fontSize: '10px' }} /> : <LeftOutlined style={{ fontSize: '10px' }} />
          }
          className="sidebar-toggle-btn"
          style={{
            position: 'absolute',
            top: '10px',
            left: collapsed ? '40px' : `${persistentNavWidth - 16}px`,
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            background: 'var(--mos-surface-raised, ' + (themeMode === 'dark' ? '#141414' : '#ffffff') + ')',
            border: '1px solid var(--mos-surface-border, ' + (themeMode === 'dark' ? '#303030' : '#d9d9d9') + ')',
            color: 'var(--mos-accent, ' + (themeMode === 'dark' ? '#D4A84B' : '#855b0e') + ')',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            cursor: 'pointer',
            transition: 'left 0.2s ease, opacity 0.2s ease, background 0.2s, transform 0.2s ease',
            zIndex: 1010,
            opacity: collapsed ? 1 : 0.72,
            pointerEvents: 'auto',
          }}
        />
      </div>
    </>
  );
};
