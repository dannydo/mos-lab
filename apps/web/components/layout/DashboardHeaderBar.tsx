'use client';

import React, { Suspense, useMemo } from 'react';
import { Button, Dropdown, Layout, Tag, theme, type MenuProps } from 'antd';
import {
  BarChart3,
  CalendarPlus,
  Clock3,
  EllipsisVertical,
  ExternalLink,
  LogOut,
  Menu,
  MessageSquare,
  PanelRightOpen,
  Search,
  UserRound,
  Users,
} from 'lucide-react';
import type { SafeAny } from '@mos-lab/shared';
import HeaderRoleQuickSwitch from './HeaderRoleQuickSwitch';
import MosAppLauncher from './MosAppLauncher';
import UserProfileDropdown from './UserProfileDropdown';
import { HeaderNotificationCenter } from '../notification-center/HeaderNotificationCenter';
import { HeaderActionIndicator } from '../ui/HeaderActionIndicator';
import { HeaderIconButton } from '../ui/HeaderIconButton';
import { ChatDeepLinkWatcher, type MosChatNavOptions } from './useDashboardChatShell';
import type { DashboardOnlineMember } from './useDashboardHeaderPolling';

const { Header } = Layout;

export interface DashboardHeaderBarProps {
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  desktopDensity: 'compact' | 'standard' | 'comfortable';
  setDesktopDensity: (density: 'compact' | 'standard' | 'comfortable') => void;
  isMobileTier: boolean;
  user: SafeAny;
  isCvAccount: boolean;
  isImpersonating: boolean;
  routeVisibility: Record<string, boolean>;
  onlineMembers: DashboardOnlineMember[];
  workingCvCount: number;
  pendingAllocationCount: number;
  dailyCallsCount: number;
  bugAttentionCount: number;
  effectiveCanAccessMosChat: boolean;
  chatDisplayMode: 'embedded' | 'tab';
  isMosChatOpen: boolean;
  mosChatUnreadCount: number;
  mosChatTaskCount: number;
  isProfileSheetOpen: boolean;
  onProfileSheetOpenChange: (open: boolean) => void;
  onToggleSidebar: () => void;
  onOpenQuickSearch: () => void;
  onOpenCvDrawer: () => void;
  onOpenBookingWizard: () => void;
  onOpenPendingAllocation: () => void;
  onOpenDailyCalls: () => void;
  onOpenTelesalesMember: (memberId: string) => void;
  onExitImpersonation: () => Promise<void>;
  onLogout: () => void;
  onAvatarUpdated: (newAvatarUrl: string) => void;
  onOpenChatWithMode: (modeOverride?: 'embedded' | 'tab', navOptions?: MosChatNavOptions) => void;
  onSetChatDisplayMode: (mode: 'embedded' | 'tab') => void;
  onToggleEmbeddedChat: () => void;
}

export const DashboardHeaderBar: React.FC<DashboardHeaderBarProps> = ({
  themeMode,
  onToggleTheme,
  desktopDensity,
  setDesktopDensity,
  isMobileTier,
  user,
  isCvAccount,
  isImpersonating,
  routeVisibility,
  onlineMembers,
  workingCvCount,
  pendingAllocationCount,
  dailyCallsCount,
  bugAttentionCount,
  effectiveCanAccessMosChat,
  chatDisplayMode,
  isMosChatOpen,
  mosChatUnreadCount,
  mosChatTaskCount,
  isProfileSheetOpen,
  onProfileSheetOpenChange,
  onToggleSidebar,
  onOpenQuickSearch,
  onOpenCvDrawer,
  onOpenBookingWizard,
  onOpenPendingAllocation,
  onOpenDailyCalls,
  onOpenTelesalesMember,
  onExitImpersonation,
  onLogout,
  onAvatarUpdated,
  onOpenChatWithMode,
  onSetChatDisplayMode,
  onToggleEmbeddedChat,
}) => {
  const { token } = theme.useToken();

  const utilityMenu = useMemo<MenuProps>(
    () => ({
      items: [
        ...(isMobileTier
          ? [
              {
                key: 'profile-sheet',
                icon: <UserRound size={16} aria-hidden />,
                label: (
                  <span className="flex items-center justify-between gap-3">
                    <span>Hồ sơ & Giao diện</span>
                    {bugAttentionCount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-amber-500 leading-none">
                        {bugAttentionCount}
                      </span>
                    )}
                  </span>
                ),
                onClick: () => onProfileSheetOpenChange(true),
              },
            ]
          : []),
        ...(!isCvAccount
          ? [
              {
                key: 'cv-schedule',
                icon: <Users size={16} aria-hidden />,
                label: (
                  <span className="flex items-center justify-between gap-3">
                    <span>Lịch CV & Hàng chờ tua</span>
                    {workingCvCount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-500 leading-none">
                        {workingCvCount}
                      </span>
                    )}
                  </span>
                ),
                onClick: onOpenCvDrawer,
              },
              {
                key: 'book-appointment',
                icon: <CalendarPlus size={16} aria-hidden />,
                label: 'Book lịch hẹn',
                onClick: onOpenBookingWizard,
              },
            ]
          : []),
        ...(!isCvAccount && pendingAllocationCount > 0
          ? [
              {
                key: 'pending-allocation',
                icon: <Clock3 size={16} aria-hidden />,
                label: (
                  <span className="flex items-center justify-between gap-3">
                    <span>Đợt data chờ xác nhận</span>
                    <span className="inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-amber-500 leading-none">
                      {pendingAllocationCount}
                    </span>
                  </span>
                ),
                onClick: onOpenPendingAllocation,
              },
            ]
          : []),
        ...(!isCvAccount
          ? [
              {
                key: 'telesales-dashboard',
                icon: <BarChart3 size={16} aria-hidden />,
                label: 'KPI Đội Telesales',
                onClick: () => onOpenTelesalesMember('DD'),
              },
            ]
          : []),
        ...(isImpersonating
          ? [
              {
                key: 'exit-impersonation',
                icon: <LogOut size={16} aria-hidden />,
                danger: true,
                label: 'Thoát giả lập',
                onClick: onExitImpersonation,
              },
            ]
          : []),
      ],
    }),
    [
      isMobileTier,
      bugAttentionCount,
      isCvAccount,
      workingCvCount,
      pendingAllocationCount,
      isImpersonating,
      onProfileSheetOpenChange,
      onOpenCvDrawer,
      onOpenBookingWizard,
      onOpenPendingAllocation,
      onOpenTelesalesMember,
      onExitImpersonation,
    ]
  );

  return (
    <Header
      className="dashboard-header"
      style={{
        backgroundColor: token.colorBgContainer,
        backgroundImage: 'var(--mos-seasonal-header-gradient, none)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomColor: 'var(--mos-seasonal-border, var(--mos-surface-border))',
        borderBottomStyle: 'solid',
        borderBottomWidth: 1,
      }}
    >
      <div className="dashboard-header-left">
        <MosAppLauncher
          currentApp="general"
          userRole={user?.role}
          teamCodes={user?.teamCodes}
          displayName={user?.displayName}
          unreadChatCount={mosChatUnreadCount}
          menuVisibility={routeVisibility}
          onOpenChat={() => onOpenChatWithMode()}
          onOpenProfile={() => onProfileSheetOpenChange(true)}
        />
        {isMobileTier && (
          <HeaderIconButton action="navigation" label="Mở điều hướng" icon={Menu} onClick={onToggleSidebar} />
        )}
        {!isCvAccount && (
          <HeaderIconButton
            action="quick-search"
            label="Tìm nhanh KH hoặc SĐT"
            icon={Search}
            onClick={onOpenQuickSearch}
          />
        )}
        {!isMobileTier && (
          <HeaderRoleQuickSwitch
            userRole={user?.role}
            teamCodes={user?.teamCodes}
            unreadChatCount={mosChatUnreadCount}
            menuVisibility={routeVisibility}
          />
        )}
      </div>
      <div className="dashboard-header-right">
        {isImpersonating && (
          <Tag
            className="dashboard-desktop-only"
            color="warning"
            style={{
              marginRight: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid #D4A84B',
              background: themeMode === 'dark' ? '#2b2111' : '#fffbe6',
            }}
          >
            <span style={{ color: themeMode === 'dark' ? '#ffd666' : '#d46b08', fontSize: '13px' }}>
              Đang giả lập: <strong>{user?.displayName}</strong>
            </span>
            <Button
              type="primary"
              danger
              size="small"
              onClick={onExitImpersonation}
              style={{
                height: '22px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '11px',
                padding: '0 8px',
              }}
            >
              Thoát
            </Button>
          </Tag>
        )}

        {!isCvAccount && onlineMembers.length > 0 && (
          <div className="dashboard-online-member-stack dashboard-desktop-only">
            {onlineMembers.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                className="dashboard-online-member-action"
                aria-label={`Mở KPI đội telesales của ${m.name}`}
                title={m.name}
                onClick={() => onOpenTelesalesMember(m.id || m.initials)}
                style={{
                  position: 'relative',
                  marginLeft: idx > 0 ? '-10px' : '0',
                  zIndex: 20 - idx,
                }}
              >
                <div
                  className="dashboard-online-member-avatar avatar-breath select-none"
                  style={{
                    width: '32px',
                    height: '32px',
                    minWidth: '32px',
                    minHeight: '32px',
                    maxWidth: '32px',
                    maxHeight: '32px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                    maskImage: 'radial-gradient(white, black)',
                    WebkitTransform: 'translateZ(0)',
                    transform: 'translateZ(0)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    background: m.color,
                    borderColor: themeMode === 'dark' ? '#000000' : '#ffffff',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    boxSizing: 'border-box',
                  }}
                >
                  {m.avatarUrl ? (
                    <img
                      src={m.avatarUrl}
                      alt={m.name}
                      style={{
                        width: '32px',
                        height: '32px',
                        minWidth: '32px',
                        minHeight: '32px',
                        maxWidth: '32px',
                        maxHeight: '32px',
                        objectFit: 'cover',
                        borderRadius: '50%',
                        display: 'block',
                      }}
                    />
                  ) : (
                    m.initials
                  )}
                </div>
                <span
                  style={{
                    position: 'absolute',
                    bottom: '0px',
                    right: '0px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#22c55e',
                    borderRadius: '50%',
                    border: `2px solid ${themeMode === 'dark' ? '#000000' : '#ffffff'}`,
                    zIndex: 10,
                    pointerEvents: 'none',
                  }}
                />
              </button>
            ))}
          </div>
        )}

        {(utilityMenu.items?.length || 0) > 0 && (
          <Dropdown menu={utilityMenu} placement="bottomRight" arrow>
            <HeaderActionIndicator
              variant="status"
              active={pendingAllocationCount > 0 || (isMobileTier && bugAttentionCount > 0)}
              color={token.colorWarning}
            >
              <HeaderIconButton
                action="utilities"
                label={
                  pendingAllocationCount > 0
                    ? `Menu tiện ích, ${pendingAllocationCount} đợt data chờ xác nhận`
                    : isMobileTier && bugAttentionCount > 0
                      ? `Menu tiện ích, ${bugAttentionCount} phản hồi báo lỗi cần xem`
                      : 'Menu tiện ích'
                }
                icon={EllipsisVertical}
                showTooltip={false}
              />
            </HeaderActionIndicator>
          </Dropdown>
        )}

        <Suspense fallback={null}>
          <ChatDeepLinkWatcher
            onOpenChat={({ conversationId, messageId, aiSessionId }) => {
              onOpenChatWithMode(undefined, { conversationId, messageId, aiSessionId });
            }}
          />
        </Suspense>

        <HeaderNotificationCenter
          themeMode={themeMode}
          onOpenChat={(convId, msgId, payload) => {
            onOpenChatWithMode(undefined, {
              conversationId: convId,
              messageId: msgId,
              openTab: (payload?.openTab as 'chat' | 'tasks' | 'pinned') || undefined,
              taskId: (payload?.taskId as string) || undefined,
            });
          }}
        />

        {effectiveCanAccessMosChat && (
          <Dropdown
            trigger={['contextMenu']}
            placement="bottomRight"
            menu={{
              items: [
                {
                  key: 'open-embedded',
                  label: 'Mở cửa sổ nhúng (Trượt phải)',
                  icon: <PanelRightOpen size={16} />,
                  onClick: () => {
                    onSetChatDisplayMode('embedded');
                    onOpenChatWithMode('embedded');
                  },
                },
                {
                  key: 'open-tab',
                  label: 'Mở tab trình duyệt mới (/chat)',
                  icon: <ExternalLink size={16} />,
                  onClick: () => {
                    onSetChatDisplayMode('tab');
                    onOpenChatWithMode('tab');
                  },
                },
                { type: 'divider' },
                {
                  key: 'current-mode',
                  disabled: true,
                  label: (
                    <span className="text-xs text-slate-400">
                      Mặc định: {chatDisplayMode === 'embedded' ? 'Cửa sổ nhúng' : 'Tab mới'} (Click phải để đổi)
                    </span>
                  ),
                },
              ],
            }}
          >
            <div>
              <HeaderActionIndicator variant="count" count={mosChatUnreadCount}>
                <HeaderIconButton
                  action="mos-chat"
                  label={
                    mosChatUnreadCount > 0
                      ? `mOS Google Chat (${chatDisplayMode === 'embedded' ? 'Nhúng' : 'Tab'} · ⌘J) · ${mosChatUnreadCount} tin chưa đọc · ${mosChatTaskCount} nhắc hẹn`
                      : `mOS Google Chat (${chatDisplayMode === 'embedded' ? 'Nhúng' : 'Tab'} · ⌘J)`
                  }
                  icon={MessageSquare}
                  tone={isMosChatOpen ? 'accent' : 'quiet'}
                  aria-pressed={isMosChatOpen}
                  onClick={() => {
                    if (chatDisplayMode === 'embedded') {
                      onToggleEmbeddedChat();
                    } else {
                      onOpenChatWithMode('tab');
                    }
                  }}
                />
              </HeaderActionIndicator>
            </div>
          </Dropdown>
        )}

        <UserProfileDropdown
          user={user}
          isImpersonating={isImpersonating}
          onExitImpersonation={onExitImpersonation}
          desktopDensity={desktopDensity}
          setDesktopDensity={setDesktopDensity}
          onOpenTelesalesDashboard={() => onOpenTelesalesMember('DD')}
          onLogout={onLogout}
          onAvatarUpdated={onAvatarUpdated}
          themeMode={themeMode}
          onToggleTheme={onToggleTheme}
          dailyCallsCount={dailyCallsCount}
          onOpenDailyCalls={onOpenDailyCalls}
          hideTrigger={isMobileTier}
          externalOpen={isProfileSheetOpen}
          onExternalOpenChange={onProfileSheetOpenChange}
        />
      </div>
    </Header>
  );
};
