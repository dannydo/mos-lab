import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DashboardHeaderBar } from '../DashboardHeaderBar';
import { DashboardSidebarShell } from '../DashboardSidebarShell';
import { openMosChatWindow } from '../useDashboardChatShell';

vi.mock('../SidebarNav', () => ({
  default: ({ collapsed }: { collapsed: boolean }) => (
    <div data-testid="mock-sidebar-nav">{collapsed ? 'collapsed' : 'expanded'}</div>
  ),
}));

vi.mock('../MosAppLauncher', () => ({
  default: () => <div data-testid="mock-app-launcher" />,
}));

vi.mock('../HeaderRoleQuickSwitch', () => ({
  default: () => <div data-testid="mock-role-quick-switch" />,
}));

vi.mock('../UserProfileDropdown', () => ({
  default: () => <div data-testid="mock-user-profile-dropdown" />,
}));

vi.mock('../../notification-center/HeaderNotificationCenter', () => ({
  HeaderNotificationCenter: () => <div data-testid="mock-header-notifications" />,
}));

describe('DashboardLayoutShell extracted components', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('opens /chat window with expected query parameters via openMosChatWindow', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    openMosChatWindow({
      conversationId: 'conv-12',
      messageId: 'msg-99',
      openTab: 'tasks',
      taskId: 'task-5',
      aiSessionId: 'ai-7',
    });

    expect(openSpy).toHaveBeenCalledTimes(1);
    const [url, target] = openSpy.mock.calls[0];
    expect(target).toBe('mOS_Chat_Window');
    expect(url).toContain('/chat?');
    expect(url).toContain('convId=conv-12');
    expect(url).toContain('msgId=msg-99');
    expect(url).toContain('tab=tasks');
    expect(url).toContain('taskId=task-5');
    expect(url).toContain('sessionId=ai-7');
  });

  it('renders DashboardSidebarShell in expanded desktop mode and triggers toggle', () => {
    const onToggleSidebar = vi.fn();
    render(
      <DashboardSidebarShell
        isMobileTier={false}
        collapsed={false}
        persistentNavWidth={232}
        isMobileNavigationOpen={false}
        onCloseMobileNavigation={vi.fn()}
        onToggleSidebar={onToggleSidebar}
        themeMode="dark"
        user={{ id: 1, role: 'admin', username: 'danny' }}
        mosChatUnreadCount={3}
        deployedAt="2026-11-22T07:00:00+07:00"
        onOpenChat={vi.fn()}
      />
    );

    expect(screen.getByText('WINGS LASHES')).toBeInTheDocument();
    expect(screen.getByTestId('mock-sidebar-nav')).toHaveTextContent('expanded');
    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn thanh điều hướng' }));
    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
  });

  it('enforces CV role privacy in DashboardHeaderBar while showing admin controls', () => {
    const baseProps = {
      themeMode: 'light' as const,
      onToggleTheme: vi.fn(),
      desktopDensity: 'standard' as const,
      setDesktopDensity: vi.fn(),
      isMobileTier: false,
      isImpersonating: false,
      routeVisibility: {},
      onlineMembers: [
        {
          id: '42',
          initials: 'ND',
          name: 'Ngọc Điệp',
          avatarUrl: null,
          color: 'linear-gradient(135deg, #D4A84B, #B8902F)',
        },
      ],
      workingCvCount: 4,
      pendingAllocationCount: 2,
      dailyCallsCount: 5,
      bugAttentionCount: 1,
      effectiveCanAccessMosChat: true,
      chatDisplayMode: 'embedded' as const,
      isMosChatOpen: false,
      mosChatUnreadCount: 2,
      mosChatTaskCount: 1,
      isProfileSheetOpen: false,
      onProfileSheetOpenChange: vi.fn(),
      onToggleSidebar: vi.fn(),
      onOpenQuickSearch: vi.fn(),
      onOpenCvDrawer: vi.fn(),
      onOpenBookingWizard: vi.fn(),
      onOpenPendingAllocation: vi.fn(),
      onOpenDailyCalls: vi.fn(),
      onOpenTelesalesMember: vi.fn(),
      onExitImpersonation: vi.fn().mockResolvedValue(undefined),
      onLogout: vi.fn(),
      onAvatarUpdated: vi.fn(),
      onOpenChatWithMode: vi.fn(),
      onSetChatDisplayMode: vi.fn(),
      onToggleEmbeddedChat: vi.fn(),
    };

    const { rerender } = render(
      <DashboardHeaderBar {...baseProps} user={{ id: 1, role: 'admin', displayName: 'Danny' }} isCvAccount={false} />
    );

    expect(document.querySelector('[data-header-action="quick-search"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Mở KPI đội telesales của Ngọc Điệp' })).toBeInTheDocument();

    rerender(
      <DashboardHeaderBar
        {...baseProps}
        user={{ id: 88, role: 'cv_plus', displayName: 'Thảo Ly' }}
        isCvAccount={true}
      />
    );

    expect(document.querySelector('[data-header-action="quick-search"]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mở KPI đội telesales của Ngọc Điệp' })).toBeNull();
  });
});
