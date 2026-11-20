import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import UserProfileDropdown from '../UserProfileDropdown';
import { OPEN_BUG_REPORT_EVENT, setBugReportBadgeSummary } from '../../../lib/bug-diagnostics';

vi.mock('../../../context/OmiCallContext', () => ({
  useOmiCall: () => ({
    isRegistered: false,
    callState: 'idle',
    omicallReady: false,
    setOmicallReady: vi.fn(),
    floatingLauncherVisible: false,
    setFloatingLauncherVisible: vi.fn(),
    canAccessOmiCall: false,
    isGrowthMember: false,
    isAdmin: true,
    adminOmiCallEnabled: false,
    setAdminOmiCallEnabled: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useResponsiveTier', () => ({
  useResponsiveTier: () => 'mobile',
}));

vi.mock('../../../lib/api-client', () => ({
  resolveMediaUrl: (url: string) => url,
}));

vi.mock('../../avatar/AvatarCropModal', () => ({
  default: () => null,
}));

vi.mock('../../theme/ThemeSelector', () => ({
  ThemeSelector: () => null,
}));

describe('UserProfileDropdown bug report integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setBugReportBadgeSummary({ actionRequiredCount: 0, unreadCount: 0 });
  });

  afterEach(() => {
    setBugReportBadgeSummary({ actionRequiredCount: 0, unreadCount: 0 });
    vi.restoreAllMocks();
  });

  it('shows bug report entry with unread indicator and opens reporter in smart history mode', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    act(() => {
      setBugReportBadgeSummary({ actionRequiredCount: 2, unreadCount: 1 });
    });

    render(
      <UserProfileDropdown
        user={{ id: 1, displayName: 'Danny', username: 'danny', role: 'super_admin' }}
        desktopDensity="compact"
        setDesktopDensity={vi.fn()}
        onOpenTelesalesDashboard={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    const trigger = screen.getByRole('button', {
      name: 'Mở menu người dùng, có 2 phản hồi báo lỗi cần xem',
    });
    expect(document.querySelector('.mos-header-action-indicator__status')).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(screen.queryByText('Nút phản hồi / báo lỗi')).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Hiển thị nút phản hồi mOS' })).toBeNull();

    const bugReportBtn = screen.getByRole('button', { name: /Báo lỗi \/ Góp ý/i });
    expect(bugReportBtn).toBeInTheDocument();
    expect(screen.getByText('2 mới')).toBeInTheDocument();

    fireEvent.click(bugReportBtn);

    const matchingEvents = dispatchSpy.mock.calls
      .map((call) => call[0])
      .filter((event): event is CustomEvent => event instanceof CustomEvent && event.type === OPEN_BUG_REPORT_EVENT);
    expect(matchingEvents).toHaveLength(1);
    expect(matchingEvents[0].detail).toEqual({ preferHistoryIfPending: true });
  });

  it('hides status dot when there are no pending bug reports and hides entry for CV role', () => {
    const { rerender } = render(
      <UserProfileDropdown
        user={{ id: 1, displayName: 'Danny', username: 'danny', role: 'super_admin' }}
        desktopDensity="compact"
        setDesktopDensity={vi.fn()}
        onOpenTelesalesDashboard={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(document.querySelector('.mos-header-action-indicator__status')).not.toBeInTheDocument();

    rerender(
      <UserProfileDropdown
        user={{ id: 2, displayName: 'CV User', username: 'cv', role: 'cv' }}
        desktopDensity="compact"
        setDesktopDensity={vi.fn()}
        onOpenTelesalesDashboard={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mở menu người dùng' }));
    expect(screen.queryByText('Báo lỗi / Góp ý')).toBeNull();
    expect(screen.queryByRole('switch', { name: 'Hiển thị nút phản hồi mOS' })).toBeNull();
  });

  it('hides top-right avatar trigger on mobile when hideTrigger is true and supports externalOpen with General controls', () => {
    const onExternalOpenChange = vi.fn();
    const onOpenDailyCalls = vi.fn();
    const onOpenTelesalesDashboard = vi.fn();

    const { rerender } = render(
      <UserProfileDropdown
        user={{ id: 88, displayName: 'Đào Trần Vũ Vy', username: 'vy.dao', role: 'manager', teamCodes: ['CC'] }}
        desktopDensity="standard"
        setDesktopDensity={vi.fn()}
        onOpenTelesalesDashboard={onOpenTelesalesDashboard}
        onLogout={vi.fn()}
        dailyCallsCount={7}
        onOpenDailyCalls={onOpenDailyCalls}
        hideTrigger={true}
        externalOpen={false}
        onExternalOpenChange={onExternalOpenChange}
      />
    );

    expect(screen.queryByRole('button', { name: /Mở menu người dùng/i })).toBeNull();
    expect(screen.queryByRole('dialog', { name: /Hồ sơ & Cài đặt cá nhân/i })).toBeNull();

    rerender(
      <UserProfileDropdown
        user={{ id: 88, displayName: 'Đào Trần Vũ Vy', username: 'vy.dao', role: 'manager', teamCodes: ['CC'] }}
        desktopDensity="standard"
        setDesktopDensity={vi.fn()}
        onOpenTelesalesDashboard={onOpenTelesalesDashboard}
        onLogout={vi.fn()}
        dailyCallsCount={7}
        onOpenDailyCalls={onOpenDailyCalls}
        hideTrigger={true}
        externalOpen={true}
        onExternalOpenChange={onExternalOpenChange}
      />
    );

    const dialog = screen.getByRole('dialog', { name: /Hồ sơ & Cài đặt cá nhân/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('MANAGER · Nhóm CC')).toBeInTheDocument();
    expect(screen.getByText('Quản lý vận hành & Tư vấn chi nhánh (CC)')).toBeInTheDocument();
    expect(screen.getByText('Cuộc gọi hôm nay')).toBeInTheDocument();
    expect(screen.getByText('7 cuộc')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /KPI Đội Telesales/i }));
    expect(onOpenTelesalesDashboard).toHaveBeenCalledTimes(1);
    expect(onExternalOpenChange).toHaveBeenCalledWith(false);
  });
});
