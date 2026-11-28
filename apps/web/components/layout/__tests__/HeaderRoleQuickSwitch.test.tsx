import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HeaderRoleQuickSwitch from '../HeaderRoleQuickSwitch';
import MosAppLauncher from '../MosAppLauncher';
import { setBugReportBadgeSummary } from '../../../lib/bug-diagnostics';

const mockPush = vi.fn();

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/cv',
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock useResponsiveTier to return 'desktop'
vi.mock('../../../hooks/useResponsiveTier', () => ({
  useResponsiveTier: () => 'desktop',
}));

describe('HeaderRoleQuickSwitch & MosAppLauncher', () => {
  beforeEach(() => {
    mockPush.mockReset();
    window.localStorage.clear();
    setBugReportBadgeSummary({ actionRequiredCount: 0, unreadCount: 0 });
  });

  it('does not render duplicate "Tư vấn KH" button for CVL on desktop header', () => {
    render(<HeaderRoleQuickSwitch userRole="cv_plus" variant="header-icon" />);

    // 1. Should render the HeaderIconButton for customer-consultation
    const consultIconBtn = document.querySelector('[data-header-action="customer-consultation"]');
    expect(consultIconBtn).not.toBeNull();

    // 2. Should NOT render any quick-link button with text "Tư vấn KH"
    const consultQuickLink = document.querySelector('[data-header-quick-link="consult"]');
    expect(consultQuickLink).toBeNull();
    expect(screen.queryByText('Tư vấn KH')).toBeNull();

    // 3. Should render "Thu nhập" and "Lộ trình" buttons
    expect(screen.getByText('Thu nhập')).toBeDefined();
    expect(screen.getByText('Lộ trình')).toBeDefined();
  });

  it('renders "Thu nhập" and "Lộ trình" for CVLL without duplicate "Tư vấn KH"', () => {
    render(<HeaderRoleQuickSwitch userRole="cv_plus_plus" variant="header-icon" />);

    expect(document.querySelector('[data-header-quick-link="consult"]')).toBeNull();
    expect(screen.queryByText('Tư vấn KH')).toBeNull();
    expect(screen.getByText('Thu nhập')).toBeDefined();
    expect(screen.getByText('Lộ trình')).toBeDefined();
  });

  it('grants /ios-app quick-switch & CC links to a Manager belonging to the CC team (e.g. Đào Trần Vũ Vy)', () => {
    render(<HeaderRoleQuickSwitch userRole="manager" teamCodes={['CC']} variant="header-icon" />);

    const consultIconBtn = document.querySelector('[data-header-action="customer-consultation"]');
    expect(consultIconBtn).not.toBeNull();
    expect(screen.getByText('Hôm nay')).toBeDefined();
    expect(screen.getByText('KPI CC')).toBeDefined();
    expect(screen.getByText('Lộ trình')).toBeDefined();
  });

  it('opens unified 9-dot MosAppLauncher with Core Apps and Báo cáo CC for Manager in CC team', () => {
    render(
      <MosAppLauncher
        currentApp="general"
        userRole="manager"
        teamCodes={['CC']}
        displayName="Đào Trần Vũ Vy"
        unreadChatCount={5}
      />
    );

    const trigger = screen.getByTestId('mos-app-launcher-btn');
    fireEvent.click(trigger);

    const panel = screen.getByTestId('mos-app-launcher-panel');
    expect(panel).toBeDefined();
    expect(screen.getByText('Đào Trần Vũ Vy')).toBeDefined();
    expect(screen.getByText('MANAGER · Nhóm CC')).toBeDefined();
    expect(screen.getByText('mOS General')).toBeDefined();
    expect(screen.getByText('mOS Chat')).toBeDefined();
    expect(screen.getByText('iOS-App')).toBeDefined();

    // Suite row for un-granted Manager+CC shows Báo cáo CC, mOS Bible, hides Zero-Trust Mission, Lab & Wings Garden; feedback is in footer
    const reportsBtn = panel.querySelector('[data-launcher-suite="reports"]');
    expect(reportsBtn).not.toBeNull();
    expect(reportsBtn?.textContent).toContain('Báo cáo CC');
    expect(panel.querySelector('[data-launcher-suite="bible"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-footer="feedback"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-suite="mission"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-suite="lab"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-suite="wings-garden"]')).toBeNull();

    fireEvent.click(panel.querySelector('[data-launcher-app="ios"]')!);
    expect(mockPush).toHaveBeenCalledWith('/ios-app?role=CC');
  });

  it('triggers onOpenProfile when tapping identity row inside MosAppLauncher', () => {
    const onOpenProfile = vi.fn();
    render(
      <MosAppLauncher
        currentApp="general"
        userRole="manager"
        teamCodes={['CC']}
        displayName="Đào Trần Vũ Vy"
        onOpenProfile={onOpenProfile}
      />
    );

    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    const identityBtn = screen.getByTestId('mos-launcher-profile-btn');
    fireEvent.click(identityBtn);

    expect(onOpenProfile).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('mos-app-launcher-panel')).toBeNull();
  });

  it('shows all 3 Core Apps + 6 Suites + Footer Feedback (no duplicate badge) for Super Admin', () => {
    const bibleSpy = vi.fn();
    window.addEventListener('open-mos-bible', bibleSpy);
    setBugReportBadgeSummary({ actionRequiredCount: 3, unreadCount: 3 });

    render(<MosAppLauncher currentApp="general" userRole="super_admin" displayName="Danny Do" missionBadgeCount={4} />);

    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    const panel = screen.getByTestId('mos-app-launcher-panel');

    expect(panel.querySelector('[data-launcher-app="general"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-app="chat"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-app="ios"]')).not.toBeNull();

    const reportsBtn = panel.querySelector('[data-launcher-suite="reports"]');
    expect(reportsBtn?.textContent).toContain('mOS Reports');
    const missionBtn = panel.querySelector('[data-launcher-suite="mission"]');
    expect(missionBtn).not.toBeNull();
    expect(missionBtn?.textContent).toContain('4');
    expect(panel.querySelector('[data-launcher-suite="bible"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-suite="lab"]')).not.toBeNull();
    const gardenBtn = panel.querySelector('[data-launcher-suite="wings-garden"]');
    expect(gardenBtn).not.toBeNull();
    expect(gardenBtn?.className).not.toContain('col-span-2');
    const inventoryBtn = panel.querySelector('[data-launcher-suite="inventory"]');
    const inventoryQrBtn = panel.querySelector('[data-launcher-suite-secondary="inventory"]');
    expect(inventoryBtn).not.toBeNull();
    expect(inventoryBtn?.textContent).toContain('mOS Kho');
    expect(inventoryQrBtn).not.toBeNull();

    // Footer feedback must NOT repeat bug badge when mOS Mission is already shown
    const feedbackFooter = panel.querySelector('[data-launcher-footer="feedback"]');
    expect(feedbackFooter).not.toBeNull();
    expect(feedbackFooter?.textContent).not.toContain('3');

    fireEvent.click(reportsBtn!);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/kpi');

    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    fireEvent.click(screen.getByTestId('mos-app-launcher-panel').querySelector('[data-launcher-suite="bible"]')!);
    expect(bibleSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    fireEvent.click(screen.getByTestId('mos-app-launcher-panel').querySelector('[data-launcher-suite="lab"]')!);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/labs');

    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    fireEvent.click(
      screen.getByTestId('mos-app-launcher-panel').querySelector('[data-launcher-suite="wings-garden"]')!
    );
    expect(mockPush).toHaveBeenCalledWith('/wings-garden');

    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    fireEvent.click(screen.getByTestId('mos-app-launcher-panel').querySelector('[data-launcher-suite="inventory"]')!);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/inventory/items');

    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    fireEvent.click(
      screen.getByTestId('mos-app-launcher-panel').querySelector('[data-launcher-suite-secondary="inventory"]')!
    );
    expect(mockPush).toHaveBeenCalledWith('/ios-app?role=INVENTORY');

    window.removeEventListener('open-mos-bible', bibleSpy);
  });

  it('hides mOS General, Mission, Lab, Wings Garden, mOS Kho, and Feedback for CVL while showing Báo cáo CV (/dashboard/cv)', () => {
    render(
      <MosAppLauncher
        currentApp="ios"
        userRole="cv_plus"
        displayName="Thảo Ly"
        menuVisibility={{ cv: true, 'career-path': true, 'mos-bible': true }}
      />
    );

    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    const panel = screen.getByTestId('mos-app-launcher-panel');

    expect(panel.querySelector('[data-launcher-app="general"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-app="chat"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-app="ios"]')).not.toBeNull();

    const reportsBtn = panel.querySelector('[data-launcher-suite="reports"]');
    expect(reportsBtn).not.toBeNull();
    expect(reportsBtn?.textContent).toContain('Báo cáo CV');
    expect(panel.querySelector('[data-launcher-suite="bible"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-suite="mission"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-suite="lab"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-suite="wings-garden"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-suite="inventory"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-suite-secondary="inventory"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-suite="feedback"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-footer="feedback"]')).toBeNull();

    fireEvent.click(reportsBtn!);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/cv');
  });

  it('dedupes mOS General for CC when no operational general menus are granted and routes Báo cáo CC to /dashboard/cc', () => {
    const onAfterNavigate = vi.fn();
    const closeListener = vi.fn();
    window.addEventListener('mos-chat:close', closeListener);

    const { rerender } = render(
      <MosAppLauncher
        currentApp="chat"
        userRole="manager"
        teamCodes={['CC']}
        displayName="Đào Trần Vũ Vy"
        menuVisibility={{ dashboard: false, today: false, cc: true, 'career-path': true, 'mos-bible': true }}
        onAfterNavigate={onAfterNavigate}
      />
    );

    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    const panel = screen.getByTestId('mos-app-launcher-panel');

    // No operational general menu granted -> mOS General hidden so it doesn't duplicate Báo cáo CC
    expect(panel.querySelector('[data-launcher-app="general"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-suite="mission"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-suite="lab"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-suite="wings-garden"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-footer="feedback"]')).not.toBeNull();
    const reportsBtn = panel.querySelector('[data-launcher-suite="reports"]');
    expect(reportsBtn?.textContent).toContain('Báo cáo CC');
    expect(panel.querySelector('[data-launcher-suite="bible"]')).not.toBeNull();

    // Clicking Báo cáo CC goes straight to /dashboard/cc
    fireEvent.click(reportsBtn!);
    expect(onAfterNavigate).toHaveBeenCalledTimes(1);
    expect(closeListener).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/cc');

    // Granting 'today' reveals mOS General (/dashboard/today), while unlocking bug-reports & labs-hub reveals Mission and Lab
    rerender(
      <MosAppLauncher
        currentApp="chat"
        userRole="manager"
        teamCodes={['CC']}
        displayName="Đào Trần Vũ Vy"
        menuVisibility={{
          dashboard: false,
          today: true,
          cc: true,
          'career-path': true,
          'bug-reports': true,
          'labs-hub': true,
          'mos-bible': true,
        }}
        onAfterNavigate={onAfterNavigate}
      />
    );

    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    const grantedPanel = screen.getByTestId('mos-app-launcher-panel');
    expect(grantedPanel.querySelector('[data-launcher-app="general"]')).not.toBeNull();
    expect(grantedPanel.querySelector('[data-launcher-suite="mission"]')).not.toBeNull();
    expect(grantedPanel.querySelector('[data-launcher-suite="lab"]')).not.toBeNull();

    fireEvent.click(grantedPanel.querySelector('[data-launcher-app="general"]')!);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/today');

    window.removeEventListener('mos-chat:close', closeListener);
  });

  it('routes BK (telesales, booker, bk role, BK/TELESALES team) to Báo cáo BK (/dashboard/bk) with Zero-Trust menuVisibility', () => {
    const { rerender } = render(
      <MosAppLauncher currentApp="general" userRole="telesales" displayName="Tư vấn viên BK" />
    );

    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    let panel = screen.getByTestId('mos-app-launcher-panel');
    let reportsBtn = panel.querySelector('[data-launcher-suite="reports"]');
    expect(reportsBtn?.textContent).toContain('Báo cáo BK');
    fireEvent.click(reportsBtn!);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/bk');

    mockPush.mockClear();
    rerender(<MosAppLauncher currentApp="general" userRole="booker" displayName="Booker A" />);
    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    panel = screen.getByTestId('mos-app-launcher-panel');
    expect(panel.querySelector('[data-launcher-suite="reports"]')?.textContent).toContain('Báo cáo BK');
    fireEvent.click(panel.querySelector('[data-launcher-suite="reports"]')!);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/bk');

    mockPush.mockClear();
    rerender(<MosAppLauncher currentApp="general" userRole="bk" displayName="BK Role" />);
    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    panel = screen.getByTestId('mos-app-launcher-panel');
    expect(panel.querySelector('[data-launcher-suite="reports"]')?.textContent).toContain('Báo cáo BK');
    fireEvent.click(panel.querySelector('[data-launcher-suite="reports"]')!);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/bk');

    mockPush.mockClear();
    rerender(
      <MosAppLauncher
        currentApp="general"
        userRole="staff"
        teamCodes={['TELESALES']}
        displayName="Team Telesales"
        menuVisibility={{ bk: true }}
      />
    );
    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    panel = screen.getByTestId('mos-app-launcher-panel');
    expect(panel.querySelector('[data-launcher-app="general"]')).toBeNull();
    reportsBtn = panel.querySelector('[data-launcher-suite="reports"]');
    expect(reportsBtn?.textContent).toContain('Báo cáo BK');
    fireEvent.click(reportsBtn!);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/bk');

    // Zero-Trust: when bk & kpi are false, reports tile is hidden; when today + bk are true, both show with distinct routes
    mockPush.mockClear();
    rerender(
      <MosAppLauncher
        currentApp="general"
        userRole="telesales"
        teamCodes={['BK']}
        displayName="BK ZeroTrust"
        menuVisibility={{ bk: false, kpi: false }}
      />
    );
    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    panel = screen.getByTestId('mos-app-launcher-panel');
    expect(panel.querySelector('[data-launcher-suite="reports"]')).toBeNull();

    rerender(
      <MosAppLauncher
        currentApp="general"
        userRole="telesales"
        teamCodes={['BK']}
        displayName="BK Operational"
        menuVisibility={{ today: true, bk: true }}
      />
    );
    panel = screen.getByTestId('mos-app-launcher-panel');
    expect(panel.querySelector('[data-launcher-app="general"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-suite="reports"]')?.textContent).toContain('Báo cáo BK');
    fireEvent.click(panel.querySelector('[data-launcher-app="general"]')!);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/today');
  });

  it('enforces Zero-Trust on Wings Garden (Admin-only) and shows feedback badge only when mOS Mission is absent', () => {
    setBugReportBadgeSummary({ actionRequiredCount: 2, unreadCount: 2 });

    const { rerender } = render(<MosAppLauncher currentApp="general" userRole="admin" displayName="Hân Huỳnh" />);

    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    const adminPanel = screen.getByTestId('mos-app-launcher-panel');
    const adminGarden = adminPanel.querySelector('[data-launcher-suite="wings-garden"]') as HTMLButtonElement | null;
    expect(adminGarden).not.toBeNull();
    expect(adminPanel.querySelector('[data-launcher-suite="mission"]')?.textContent).toContain('2');
    expect(adminPanel.querySelector('[data-launcher-footer="feedback"]')?.textContent).not.toContain('2');
    fireEvent.click(adminGarden!);
    expect(mockPush).toHaveBeenCalledWith('/wings-garden');

    mockPush.mockClear();

    // Non-admin without mOS Mission: Wings Garden hidden, Feedback shows badge 2
    rerender(<MosAppLauncher currentApp="general" userRole="telesales" displayName="Tư vấn viên BK" />);
    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    const salesPanel = screen.getByTestId('mos-app-launcher-panel');
    expect(salesPanel.querySelector('[data-launcher-suite="wings-garden"]')).toBeNull();
    expect(salesPanel.querySelector('[data-launcher-suite="mission"]')).toBeNull();
    expect(salesPanel.querySelector('[data-launcher-footer="feedback"]')?.textContent).toContain('2');

    rerender(<MosAppLauncher currentApp="general" userRole="cc" displayName="Tư vấn CC" />);
    const ccPanel = screen.getByTestId('mos-app-launcher-panel');
    expect(ccPanel.querySelector('[data-launcher-suite="wings-garden"]')).toBeNull();
    expect(ccPanel.querySelector('[data-launcher-suite="reports"]')?.textContent).toContain('Báo cáo CC');

    rerender(<MosAppLauncher currentApp="general" userRole="cv" displayName="Chuyên viên Mi" />);
    const cvPanel = screen.getByTestId('mos-app-launcher-panel');
    expect(cvPanel.querySelector('[data-launcher-suite="wings-garden"]')).toBeNull();
    expect(cvPanel.querySelector('[data-launcher-footer="feedback"]')).toBeNull();
  });
});
