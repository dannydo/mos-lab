import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HeaderRoleQuickSwitch from '../HeaderRoleQuickSwitch';
import MosAppLauncher from '../MosAppLauncher';

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

  it('opens unified 9-dot MosAppLauncher with Core Apps and CC suites for Manager in CC team', () => {
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
    // Suite row for un-granted Manager+CC shows mOS Reports (CC KPI) & mOS Bible, hides Zero-Trust Mission & Lab
    expect(panel.querySelector('[data-launcher-suite="reports"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-suite="bible"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-suite="mission"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-suite="lab"]')).toBeNull();

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

  it('shows all 3 Core Apps + 4 Suites for Super Admin and opens mOS Bible in-place via event', () => {
    const bibleSpy = vi.fn();
    window.addEventListener('open-mos-bible', bibleSpy);

    render(<MosAppLauncher currentApp="general" userRole="super_admin" displayName="Danny Do" missionBadgeCount={4} />);

    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    const panel = screen.getByTestId('mos-app-launcher-panel');

    expect(panel.querySelector('[data-launcher-app="general"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-app="chat"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-app="ios"]')).not.toBeNull();

    expect(panel.querySelector('[data-launcher-suite="reports"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-suite="mission"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-suite="bible"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-suite="lab"]')).not.toBeNull();
    expect(screen.getByText('4')).toBeDefined();

    fireEvent.click(panel.querySelector('[data-launcher-suite="bible"]')!);
    expect(bibleSpy).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    const reopened = screen.getByTestId('mos-app-launcher-panel');
    fireEvent.click(reopened.querySelector('[data-launcher-suite="lab"]')!);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/labs');

    window.removeEventListener('open-mos-bible', bibleSpy);
  });

  it('hides mOS General, mOS Mission, and mOS Lab for CVL while keeping Chat, iOS-App, Reports (/dashboard/cv), and Bible', () => {
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

    expect(panel.querySelector('[data-launcher-suite="reports"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-suite="bible"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-suite="mission"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-suite="lab"]')).toBeNull();

    fireEvent.click(panel.querySelector('[data-launcher-suite="reports"]')!);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/cv');
  });

  it('routes Manager+CC via menuVisibility, hides ungranted suites, and reveals Mission/Lab when explicitly granted', () => {
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

    expect(panel.querySelector('[data-launcher-suite="mission"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-suite="lab"]')).toBeNull();
    expect(panel.querySelector('[data-launcher-suite="reports"]')).not.toBeNull();
    expect(panel.querySelector('[data-launcher-suite="bible"]')).not.toBeNull();

    // Clicking mOS Reports goes straight to /dashboard/cc
    fireEvent.click(panel.querySelector('[data-launcher-suite="reports"]')!);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/cc');

    // Clicking mOS General closes embedded chat and routes to /dashboard/cc
    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    const panelGeneral = screen.getByTestId('mos-app-launcher-panel');
    fireEvent.click(panelGeneral.querySelector('[data-launcher-app="general"]')!);
    expect(onAfterNavigate).toHaveBeenCalledTimes(2);
    expect(closeListener).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/cc');

    // Explicitly unlocking bug-reports & labs-hub reveals Mission and Lab
    rerender(
      <MosAppLauncher
        currentApp="chat"
        userRole="manager"
        teamCodes={['CC']}
        displayName="Đào Trần Vũ Vy"
        menuVisibility={{
          dashboard: false,
          today: false,
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
    expect(grantedPanel.querySelector('[data-launcher-suite="mission"]')).not.toBeNull();
    expect(grantedPanel.querySelector('[data-launcher-suite="lab"]')).not.toBeNull();

    window.removeEventListener('mos-chat:close', closeListener);
  });
});
