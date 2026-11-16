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

  it('opens V1 9-dot MosAppLauncher with all 3 apps and CC quick links for Manager in CC team', () => {
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
    expect(screen.getByText('Hôm nay')).toBeDefined();
    expect(screen.getByText('KPI CC')).toBeDefined();

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

  it('routes Manager+CC to first allowed general page (/dashboard/cc), filters restricted links, and closes embedded chat', () => {
    const onAfterNavigate = vi.fn();
    const closeListener = vi.fn();
    window.addEventListener('mos-chat:close', closeListener);

    render(
      <MosAppLauncher
        currentApp="chat"
        userRole="manager"
        teamCodes={['CC']}
        displayName="Đào Trần Vũ Vy"
        menuVisibility={{ dashboard: false, today: false, cc: true, 'career-path': true }}
        onAfterNavigate={onAfterNavigate}
      />
    );

    fireEvent.click(screen.getByTestId('mos-app-launcher-btn'));
    const panel = screen.getByTestId('mos-app-launcher-panel');

    // Restricted "Hôm nay" must not appear; allowed "KPI CC" and "Lộ trình" appear
    expect(screen.queryByText('Hôm nay')).toBeNull();
    expect(screen.getByText('KPI CC')).toBeDefined();
    expect(screen.getByText('Lộ trình')).toBeDefined();

    // Clicking mOS General closes embedded chat and routes to /dashboard/cc
    fireEvent.click(panel.querySelector('[data-launcher-app="general"]')!);
    expect(onAfterNavigate).toHaveBeenCalledTimes(1);
    expect(closeListener).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/dashboard/cc');

    window.removeEventListener('mos-chat:close', closeListener);
  });
});
